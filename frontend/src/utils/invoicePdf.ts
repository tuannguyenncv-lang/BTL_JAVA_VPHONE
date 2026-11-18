import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Order } from '../types/vphone';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatVnd,
} from './vphoneLogic';
import { buildInvoiceQrPayload } from './qrPayload';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

export async function downloadInvoicePdf(order: Order): Promise<string> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const width = 1240;
  const padX = 88;
  const padTop = 84;
  const contentW = width - padX * 2;

  // Measure wrapped item lines first so canvas height adapts to item count
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) {
    throw new Error('Trình duyệt không hỗ trợ tạo PDF hóa đơn.');
  }
  mCtx.font = '500 22px "DM Sans", ui-sans-serif, system-ui, sans-serif';

  const colNameW = 440;
  const rowSpecs = order.chiTiet.map((line) => {
    const wrapped = wrapText(mCtx, line.ten, colNameW - 24);
    const rowH = Math.max(54, wrapped.length * 30 + 24);
    return { line, wrapped, rowH };
  });

  const tableRowsH = rowSpecs.reduce((sum, r) => sum + r.rowH, 0);
  const estimatedHeight = Math.max(
    1120,
    padTop + 140 + 130 + 52 + tableRowsH + 260 + 110,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = estimatedHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể khởi tạo bộ vẽ PDF.');
  }

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = padTop;

  // Brand header (Left)
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 38px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('VPHONE', padX, y + 32);

  ctx.fillStyle = '#475569';
  ctx.font = '400 21px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Hệ thống bán lẻ điện thoại & phụ kiện chính hãng', padX, y + 68);
  ctx.fillStyle = '#64748b';
  ctx.fillText('Hotline: 1900 6868 · MST: 0109876543', padX, y + 98);

  // Invoice header (Right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 30px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('HÓA ĐƠN BÁN HÀNG', width - padX, y + 30);

  ctx.fillStyle = '#334155';
  ctx.font = '600 21px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(`Mã đơn: ${order.ma}`, width - padX, y + 66);

  ctx.fillStyle = '#64748b';
  ctx.font = '400 20px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(`Ngày lập: ${order.ngay}`, width - padX, y + 96);
  ctx.fillStyle = '#334155';
  ctx.fillText(`Trạng thái: ${ORDER_STATUS_LABELS[order.trangThai]}`, width - padX, y + 124);
  ctx.textAlign = 'left';

  y += 150;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(width - padX, y);
  ctx.stroke();

  y += 38;

  // Customer & Payment info
  ctx.fillStyle = '#334155';
  ctx.font = '700 21px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Thông tin khách hàng', padX, y);
  ctx.fillText('Thanh toán', padX + contentW * 0.52, y);

  y += 32;
  ctx.fillStyle = '#0f172a';
  ctx.font = '500 22px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(order.khach, padX, y);

  const paymentLabel = PAYMENT_METHOD_LABELS[order.phuongThucThanhToan];
  ctx.fillText(paymentLabel, padX + contentW * 0.52, y);

  y += 30;
  ctx.fillStyle = '#64748b';
  ctx.font = '400 20px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText(`Mã KH: ${order.maKhach}`, padX, y);

  if (order.phuongThucThanhToan !== 'COD') {
    const payState =
      order.trangThaiThanhToan ||
      (order.trangThai === 'HOAN_THANH' ? 'DA_THANH_TOAN' : 'CHUA_THANH_TOAN');
    const payDetail = `${PAYMENT_STATUS_LABELS[payState]}${order.maGiaoDich ? ` · Mã GD: ${order.maGiaoDich}` : ''}`;
    ctx.font = '400 19px "DM Sans", ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(payDetail, padX + contentW * 0.52, y);
  }

  y += 46;

  // Table header
  const colX = {
    stt: padX,
    name: padX + 76,
    priceRight: padX + 76 + colNameW + 195,
    qtyRight: padX + 76 + colNameW + 285,
    totalRight: width - padX - 18,
  };

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(padX, y, contentW, 50);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, y, contentW, 50 + tableRowsH);

  ctx.fillStyle = '#475569';
  ctx.font = '700 20px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('STT', colX.stt + 18, y + 32);
  ctx.fillText('Tên sản phẩm', colX.name + 12, y + 32);
  ctx.textAlign = 'right';
  ctx.fillText('Đơn giá', colX.priceRight, y + 32);
  ctx.fillText('SL', colX.qtyRight, y + 32);
  ctx.fillText('Thành tiền', colX.totalRight, y + 32);
  ctx.textAlign = 'left';

  y += 50;

  // Table rows
  rowSpecs.forEach((row, idx) => {
    if (idx > 0) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(width - padX, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#334155';
    ctx.font = '500 20px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(String(idx + 1), colX.stt + 18, y + 34);

    ctx.fillStyle = '#0f172a';
    ctx.font = '500 22px "DM Sans", ui-sans-serif, system-ui, sans-serif';
    row.wrapped.forEach((txt, lineIdx) => {
      ctx.fillText(txt, colX.name + 12, y + 34 + lineIdx * 30);
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = '#334155';
    ctx.font = '400 21px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(formatVnd(row.line.donGia), colX.priceRight, y + 34);
    ctx.fillText(String(row.line.soLuong), colX.qtyRight, y + 34);

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 21px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(formatVnd(row.line.thanhTien), colX.totalRight, y + 34);
    ctx.textAlign = 'left';

    y += row.rowH;
  });

  y += 42;

  // QR code on left + Totals on right
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, buildInvoiceQrPayload(order), {
    width: 170,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
  ctx.drawImage(qrCanvas, padX, y, 160, 160);

  ctx.fillStyle = '#334155';
  ctx.font = '700 20px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Mã QR hóa đơn điện tử', padX + 184, y + 48);
  ctx.fillStyle = '#475569';
  ctx.font = '500 20px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText(order.ma, padX + 184, y + 80);
  ctx.fillStyle = '#64748b';
  ctx.font = '400 19px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Quét để tra cứu / thanh toán', padX + 184, y + 112);

  // Totals right
  ctx.textAlign = 'right';
  let totY = y + 44;
  ctx.fillStyle = '#475569';
  ctx.font = '400 22px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(`Tạm tính: ${formatVnd(order.tamTinh)}`, width - padX, totY);

  if (order.tienGiam > 0) {
    totY += 36;
    ctx.fillStyle = '#047857';
    ctx.fillText(
      `Giảm giá (${order.maGiamGia || 'Voucher'}): -${formatVnd(order.tienGiam)}`,
      width - padX,
      totY,
    );
  }

  totY += 48;
  const totalAmountStr = formatVnd(order.tong);
  ctx.fillStyle = '#1d4ed8';
  ctx.font = '700 30px "JetBrains Mono", ui-monospace, monospace';
  const amountWidth = ctx.measureText(totalAmountStr).width;
  ctx.fillText(totalAmountStr, width - padX, totY);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 24px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Tổng thanh toán:', width - padX - amountWidth - 18, totY);
  ctx.textAlign = 'left';

  y += 206;

  // Footer divider & thank you note
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(width - padX, y);
  ctx.stroke();

  y += 40;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '400 19px "DM Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(
    'Cảm ơn Quý khách đã tin tưởng mua sắm tại VPHONE. Bảo hành chính hãng 12 tháng trên toàn quốc.',
    width / 2,
    y,
  );
  ctx.textAlign = 'left';

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let renderW = pageWidth;
  let renderH = (canvas.height * renderW) / canvas.width;
  if (renderH > pageHeight) {
    renderH = pageHeight;
    renderW = (canvas.width * renderH) / canvas.height;
  }
  const offsetX = (pageWidth - renderW) / 2;
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', offsetX, 0, renderW, renderH, undefined, 'FAST');

  const fileName = `HoaDon_${order.ma}.pdf`;
  pdf.save(fileName);
  return fileName;
}
