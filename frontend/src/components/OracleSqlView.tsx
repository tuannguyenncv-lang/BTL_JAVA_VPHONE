import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Database,
  Download,
  FileCode2,
  FolderArchive,
  Server,
} from 'lucide-react';

interface OracleSqlViewProps {
  onNotify?: (msg: string) => void;
}

interface JavaSourceFile {
  path: string;
  name: string;
  category: string;
  language: string;
  content: string;
}

const ARCHITECTURE_HIGHLIGHTS = [
  {
    type: 'Pure Java HttpServer (JDK 8+)',
    name: 'Web.java & RBAC Token Middleware',
    desc: 'Máy chủ HTTP tích hợp sẵn com.sun.net.httpserver.HttpServer (cổng 8080, không dùng Spring Boot), phục vụ giao diện web/ và REST API JSON đầy đủ CRUD + kiểm tra khóa tài khoản.',
    icon: Server,
  },
  {
    type: 'Oracle JDBC + Demo Fallback',
    name: 'OracleConnection, Models & 6 DAOs',
    desc: 'Tách lớp Model + DAO (NguoiDungDAO, SanPhamDAO, DonHangDAO, KhuyenMaiDAO, KhoNhapDAO, ThongKeDAO), băm mật khẩu SHA-256 + salt đồng bộ Web và tự fallback Demo MemoryDatabase khi chưa cài Oracle.',
    icon: Code2,
  },
  {
    type: 'Oracle Database Schema',
    name: 'Views, Triggers & Stored Procedures',
    desc: 'Kịch bản oracle_vphone.sql đầy đủ cột TRANG_THAI trên NGUOI_DUNG, Trigger trừ/hoàn tồn kho tự động, Procedure áp mã khuyến mãi và View thống kê doanh thu.',
    icon: Database,
  },
];

export function OracleSqlView({ onNotify }: OracleSqlViewProps) {
  const [files, setFiles] = useState<JavaSourceFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/java-sources')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('API unavailable'))))
      .then((data: { files?: JavaSourceFile[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data.files) ? data.files : [];
        if (list.length) {
          setFiles(list);
          setSelectedPath(list[0].path);
          setLoading(false);
          return;
        }
        return Promise.reject(new Error('Empty files'));
      })
      .catch(async () => {
        try {
          const res = await fetch('/oracle_vphone.sql');
          const sql = res.ok ? await res.text() : '-- Không tải được /oracle_vphone.sql';
          if (!cancelled) {
            setFiles([
              {
                path: 'sql/oracle_vphone.sql',
                name: 'oracle_vphone.sql',
                category: 'Oracle SQL',
                language: 'sql',
                content: sql,
              },
            ]);
            setSelectedPath('sql/oracle_vphone.sql');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, JavaSourceFile[]>();
    for (const f of files) {
      const list = groups.get(f.category) || [];
      list.push(f);
      groups.set(f.category, list);
    }
    return Array.from(groups.entries());
  }, [files]);

  const activeFile = useMemo(
    () => files.find((f) => f.path === selectedPath) || files[0] || null,
    [files, selectedPath],
  );

  const handleCopy = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      onNotify?.(`Đã sao chép ${activeFile.name}`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify?.('Trình duyệt không cho phép sao chép tự động');
    }
  };

  const handleDownloadCurrent = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify?.(`Đang tải file ${activeFile.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Mã nguồn Java HttpServer & Oracle SQL
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Trọn bộ dự án bài tập lớn môn Java thuần (<code className="font-mono text-xs">com.sun.net.httpserver.HttpServer</code> + Oracle JDBC) kèm script chạy ngay trên máy cá nhân.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!activeFile}
            onClick={handleCopy}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Đã sao chép' : 'Sao chép file'}
          </button>

          <button
            type="button"
            disabled={!activeFile}
            onClick={handleDownloadCurrent}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Tải file này
          </button>

          <a
            href="/api/java-project.zip"
            download="vphone-java-backend.zip"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <FolderArchive className="h-4 w-4" />
            Tải toàn bộ dự án Java (.zip)
          </a>
        </div>
      </div>

      {/* Architecture Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ARCHITECTURE_HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131A26]"
            >
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                <Icon className="h-3.5 w-3.5" />
                <span>{item.type}</span>
              </div>
              <h2 className="mt-1.5 font-display text-sm font-bold text-slate-900 dark:text-white">
                {item.name}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Multi-file Java + SQL Explorer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="rounded-xl border border-slate-200 bg-white p-3 lg:col-span-4 dark:border-slate-800 dark:bg-[#131A26]">
          <div className="mb-2 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Cấu trúc tệp ({files.length})
            </span>
            <span className="font-mono text-[11px] text-slate-400">java-backend/</span>
          </div>

          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {groupedFiles.map(([category, groupItems]) => (
              <div key={category} className="space-y-1">
                <p className="px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {category}
                </p>
                {groupItems.map((f) => {
                  const active = activeFile?.path === f.path;
                  return (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => setSelectedPath(f.path)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        active
                          ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-75" />
                      <span className="min-w-0 flex-1 truncate font-mono">{f.path}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100 lg:col-span-8 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs">
            <span className="font-mono font-semibold text-slate-200">
              {activeFile ? activeFile.path : 'Đang tải...'}
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {loading
                ? 'Đang tải mã nguồn...'
                : activeFile
                  ? `${activeFile.content.split('\n').length} dòng · ${activeFile.language.toUpperCase()}`
                  : '0 dòng'}
            </span>
          </div>
          <pre className="max-h-[560px] overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
            <code>
              {loading
                ? '// Đang đọc tệp từ dự án java-backend/...'
                : activeFile?.content || '// Không có dữ liệu hiển thị.'}
            </code>
          </pre>
        </section>
      </div>
    </div>
  );
}
