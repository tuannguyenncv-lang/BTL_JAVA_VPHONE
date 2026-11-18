import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

interface JavaSourceItem {
  path: string;
  name: string;
  category: string;
  language: string;
  content: string;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipArchive(entries: { name: string; data: Buffer }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressed = entry.data;
    const compressed = zlib.deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(8, 8); // Deflate
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x5421, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(fileNameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, fileNameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(fileNameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, fileNameBuf);
    offset += localHeader.length + fileNameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDir.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, endRecord]);
}

function classifyJavaFile(relPath: string): { category: string; language: string } {
  if (relPath.endsWith('.sql')) return { category: 'Oracle SQL', language: 'sql' };
  if (relPath.includes('/model/')) return { category: 'Models (POJO)', language: 'java' };
  if (relPath.includes('/dao/')) return { category: 'DAOs (JDBC)', language: 'java' };
  if (relPath.includes('/util/')) return { category: 'Utils (SHA-256 & JSON)', language: 'java' };
  if (relPath.endsWith('.java')) return { category: 'Web Server & DB', language: 'java' };
  if (relPath.startsWith('web/')) return { category: 'Giao diện Web Java', language: relPath.split('.').pop() || 'text' };
  return { category: 'Hướng dẫn & Script chạy', language: relPath.endsWith('.md') ? 'markdown' : 'bash' };
}

function collectJavaFiles(baseDir: string, currentDir = baseDir): JavaSourceItem[] {
  if (!fs.existsSync(currentDir)) return [];
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const results: JavaSourceItem[] = [];

  for (const entry of entries) {
    if (entry.name === 'bin' || entry.name === '.DS_Store') continue;
    const full = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJavaFiles(baseDir, full));
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      const { category, language } = classifyJavaFile(rel);
      const content = fs.readFileSync(full, 'utf8');
      results.push({
        path: rel,
        name: entry.name,
        category,
        language,
        content,
      });
    }
  }

  const order = [
    'Web Server & DB',
    'Models (POJO)',
    'DAOs (JDBC)',
    'Utils (SHA-256 & JSON)',
    'Oracle SQL',
    'Hướng dẫn & Script chạy',
    'Giao diện Web Java',
  ];

  return results.sort((a, b) => {
    const oa = order.indexOf(a.category);
    const ob = order.indexOf(b.category);
    if (oa !== ob) return oa - ob;
    return a.path.localeCompare(b.path);
  });
}

async function deliverEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{
  sent: boolean;
  configured: boolean;
  sandboxRestricted?: boolean;
  error?: string;
}> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'VPHONE <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
        }),
      });
      if (resp.ok) {
        return { sent: true, configured: true };
      }
      const errBody = await resp.text();
      const sandboxRestricted =
        resp.status === 403 && errBody.toLowerCase().includes('testing emails');
      return {
        sent: false,
        configured: true,
        sandboxRestricted,
        error: errBody.slice(0, 200),
      };
    } catch (err) {
      return {
        sent: false,
        configured: true,
        error: err instanceof Error ? err.message : 'Resend request failed',
      };
    }
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      return { sent: true, configured: true };
    } catch (err) {
      return {
        sent: false,
        configured: true,
        error: err instanceof Error ? err.message : 'SMTP delivery failed',
      };
    }
  }

  return { sent: false, configured: false };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const javaDir = path.resolve(__dirname, 'java-backend');

  app.get('/api/java-sources', (_req, res) => {
    const files = collectJavaFiles(javaDir);
    res.json({ files });
  });

  app.get('/api/java-project.zip', (_req, res) => {
    const files = collectJavaFiles(javaDir);
    if (!files.length) {
      res.status(404).json({ error: 'Java backend directory not found' });
      return;
    }
    const entries = files.map((f) => ({
      name: `vphone-java-backend/${f.path}`,
      data: Buffer.from(f.content, 'utf8'),
    }));
    const zipBuffer = buildZipArchive(entries);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="vphone-java-backend.zip"');
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  });

  app.post('/api/send-welcome-email', async (req, res) => {
    const body = req.body as {
      email?: string;
      hoTen?: string;
      maKhach?: string;
      loginMethod?: string;
      event?: string;
      vaiTroLabel?: string;
    };
    if (!body?.email) {
      res.status(400).json({ sent: false, error: 'Missing email' });
      return;
    }
    const subject =
      body.event === 'LOGIN'
        ? `Thông báo đăng nhập VPHONE (${body.maKhach || ''})`
        : `Chào mừng ${body.hoTen || 'Quý khách'} đến với VPHONE`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1d4ed8;margin:0 0 12px;">VPHONE Retail</h2>
        <p>Xin chào <strong>${body.hoTen || 'Quý khách'}</strong>,</p>
        <p>Tài khoản <strong>${body.maKhach || ''}</strong> (${body.vaiTroLabel || 'Khách hàng'}) vừa ${body.event === 'LOGIN' ? 'đăng nhập' : 'được tạo thành công'} qua ${body.loginMethod || 'VPHONE'}.</p>
        <p style="color:#64748b;font-size:13px;">Cảm ơn bạn đã sử dụng hệ thống bán lẻ VPHONE.</p>
      </div>
    `;
    const result = await deliverEmail({ to: body.email, subject, html });
    res.json(result);
  });

  app.post('/api/send-order-email', async (req, res) => {
    const body = req.body as {
      email?: string;
      order?: {
        ma: string;
        khach: string;
        tong: number;
        chiTiet?: { ten: string; soLuong: number; thanhTien: number }[];
      };
    };
    if (!body?.email || !body?.order) {
      res.status(400).json({ sent: false, error: 'Missing order payload' });
      return;
    }
    const itemsHtml = (body.order.chiTiet || [])
      .map(
        (l) =>
          `<li>${l.ten} × ${l.soLuong} — ${new Intl.NumberFormat('vi-VN').format(Math.round(l.thanhTien))} ₫</li>`,
      )
      .join('');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1d4ed8;margin:0 0 12px;">Xác nhận đơn hàng ${body.order.ma}</h2>
        <p>Xin chào <strong>${body.order.khach}</strong>, đơn hàng của bạn đã được tiếp nhận.</p>
        <ul>${itemsHtml}</ul>
        <p><strong>Tổng thanh toán: ${new Intl.NumberFormat('vi-VN').format(Math.round(body.order.tong))} ₫</strong></p>
      </div>
    `;
    const result = await deliverEmail({
      to: body.email,
      subject: `VPHONE · Xác nhận đơn hàng ${body.order.ma}`,
      html,
    });
    res.json(result);
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VPHONE server listening on http://localhost:${PORT}`);
  });
}

void startServer();
