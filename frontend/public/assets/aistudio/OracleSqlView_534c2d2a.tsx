import { useEffect, useState } from 'react';
import { Check, Copy, Database, Download } from 'lucide-react';

interface OracleSqlViewProps {
  onNotify?: (msg: string) => void;
}

const SQL_HIGHLIGHTS = [
  {
    name: 'V_DOANH_THU_THANG & V_TOP_BAN_CHAY & V_CANH_BAO_TON_KHO',
    type: 'Oracle Views',
    desc: 'Tổng hợp doanh thu theo tháng, xếp hạng top bán chạy và tự động lọc sản phẩm sắp hết hàng (TON <= 5).',
  },
  {
    name: 'TRG_TINH_GIA_BAN_PHU_KIEN & TRG_GIAM_TON_KHO_DAT_HANG',
    type: 'Oracle Triggers',
    desc: 'Tự động tính giá bán phụ kiện (-5%), trừ tồn kho khi tạo chi tiết đơn, hoàn kho khi hủy đơn và cộng tồn khi nhập hàng.',
  },
  {
    name: 'SP_AP_DUNG_MA_GIAM_GIA & SP_CAP_NHAT_TRANG_THAI_DON',
    type: 'Stored Procedures',
    desc: 'Kiểm tra điều kiện mã giảm giá, áp dụng chiết khấu và chuyển đổi trạng thái đơn hàng an toàn theo transaction.',
  },
];

export function OracleSqlView({ onNotify }: OracleSqlViewProps) {
  const [sqlText, setSqlText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/oracle_vphone.sql')
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('Không thể tải script Oracle'))))
      .then((text) => {
        if (!cancelled) {
          setSqlText(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSqlText('-- Không tải được nội dung file /oracle_vphone.sql');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (!sqlText) return;
    try {
      await navigator.clipboard.writeText(sqlText);
      setCopied(true);
      onNotify?.('Đã sao chép toàn bộ mã Oracle SQL');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify?.('Trình duyệt không cho phép sao chép tự động');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Thiết kế CSDL Oracle (Trigger / Procedure / View)
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Script chuẩn Oracle Database phục vụ báo cáo môn Hệ quản trị CSDL: bảng mã hóa SHA-256, Trigger tồn kho, Procedure khuyến mãi và View thống kê.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Đã sao chép' : 'Sao chép SQL'}
          </button>
          <a
            href="/oracle_vphone.sql"
            download="oracle_vphone.sql"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Download className="h-4 w-4" />
            Tải file .sql
          </a>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SQL_HIGHLIGHTS.map((item) => (
          <div
            key={item.name}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131A26]"
          >
            <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
              {item.type}
            </p>
            <h2 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white">
              {item.name}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* SQL Source Preview */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs">
          <span className="font-mono font-semibold text-slate-300">oracle_vphone.sql</span>
          <span className="font-mono tabular-nums text-slate-400">
            {loading ? 'Đang tải...' : `${sqlText.split('\n').length} dòng`}
          </span>
        </div>
        <pre className="max-h-[540px] overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
          <code>{loading ? '-- Đang đọc script Oracle SQL...' : sqlText}</code>
        </pre>
      </section>
    </div>
  );
}
