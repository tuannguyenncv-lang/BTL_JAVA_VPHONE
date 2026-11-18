import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import type { Order, OrderStatus, Product, StoreStats } from '../types/vphone';
import {
  ORDER_STATUS_LABELS,
  computeRevenueSeries,
  computeTopSellingProducts,
  formatVnd,
} from '../utils/vphoneLogic';

interface StatsViewProps {
  stats: StoreStats;
  orders: Order[];
  products: Product[];
  onQuickRestock?: () => void;
}

const STATUS_BAR_COLORS: Record<OrderStatus, string> = {
  CHO_XAC_NHAN: 'bg-amber-500',
  DANG_GIAO: 'bg-blue-600',
  HOAN_THANH: 'bg-emerald-600',
  DA_HUY: 'bg-red-500',
};

export function StatsView({ stats, orders, products, onQuickRestock }: StatsViewProps) {
  const [chartMode, setChartMode] = useState<'day' | 'month'>('month');

  const statusEntries = Object.entries(stats.donTheoTrangThai) as [OrderStatus, number][];
  const maxOrders = Math.max(1, ...statusEntries.map(([, count]) => count));

  const revenueSeries = useMemo(
    () => computeRevenueSeries(orders, chartMode),
    [orders, chartMode],
  );
  const maxRevenue = Math.max(1, ...revenueSeries.map((pt) => pt.revenue));

  const topSelling = useMemo(
    () => computeTopSellingProducts(orders, products, 5),
    [orders, products],
  );

  const kpis = [
    { label: 'Tổng giá trị tồn kho', value: formatVnd(stats.tongGiaTriTon), mono: true },
    { label: 'Doanh thu (đơn hoàn thành)', value: formatVnd(stats.doanhThu), mono: true },
    { label: 'Số sản phẩm', value: String(stats.soSanPham), mono: true },
    { label: 'Số khách hàng', value: String(stats.soKhachHang), mono: true },
    {
      label: 'Sản phẩm giá cao nhất',
      value: stats.giaCaoNhat ? stats.giaCaoNhat.ten : '—',
      mono: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Thống kê & Doanh thu
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131A26]"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
            <p
              className={`mt-2 text-lg font-bold leading-snug text-slate-900 dark:text-white ${
                kpi.mono ? 'font-mono tabular-nums' : 'font-display'
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Top Selling Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Revenue Bar Chart */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-[#131A26]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Biểu đồ doanh thu
              </h2>
            </div>

            <div
              role="group"
              aria-label="Chu kỳ biểu đồ doanh thu"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-200/75 p-1 dark:bg-slate-800/90"
            >
              <button
                type="button"
                onClick={() => setChartMode('day')}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  chartMode === 'day'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                Theo ngày
              </button>
              <button
                type="button"
                onClick={() => setChartMode('month')}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  chartMode === 'month'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                Theo tháng
              </button>
            </div>
          </div>

          {revenueSeries.length ? (
            <div className="mt-6">
              <div className="flex h-52 items-end gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
                {revenueSeries.map((pt) => {
                  const pct = Math.max(8, Math.round((pt.revenue / maxRevenue) * 100));
                  return (
                    <div
                      key={pt.key}
                      className="group flex flex-1 flex-col items-center justify-end gap-1.5 h-full"
                    >
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                        {(pt.revenue / 1_000_000).toFixed(1)}M
                      </span>
                      <div
                        title={`${pt.label}: ${formatVnd(pt.revenue)} (${pt.orders} đơn)`}
                        style={{ height: `${pct}%` }}
                        className="w-full max-w-[46px] rounded-t-md bg-blue-600 transition-opacity group-hover:opacity-85 dark:bg-blue-500"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-3">
                {revenueSeries.map((pt) => (
                  <div key={pt.key} className="flex-1 text-center">
                    <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {pt.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {pt.orders} đơn
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Chưa có đơn hàng hoàn thành để vẽ biểu đồ doanh thu.
            </p>
          )}
        </section>

        {/* Top Selling Products */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-[#131A26]">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Top sản phẩm bán chạy
            </h2>
          </div>

          {topSelling.length ? (
            <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {topSelling.map((item, idx) => (
                <div key={item.ma} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {item.ten}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.hang} · Đã bán{' '}
                        <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                          {item.soLuongBan}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-blue-700 dark:text-blue-400">
                    {formatVnd(item.doanhThu)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Chưa có dữ liệu bán hàng.
            </p>
          )}
        </section>
      </div>

      {/* Order Status Breakdown & Low Stock Alert Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-[#131A26]">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Đơn hàng theo trạng thái
          </h2>
          <div className="mt-4 space-y-3.5">
            {statusEntries.map(([status, count]) => (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {ORDER_STATUS_LABELS[status]}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${STATUS_BAR_COLORS[status]}`}
                    style={{ width: `${(count / maxOrders) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-[#131A26]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Cảnh báo sắp hết hàng (tồn ≤ 5)
            </h2>
            {onQuickRestock && stats.sapHet.length > 0 && (
              <button
                type="button"
                onClick={onQuickRestock}
                className="inline-flex h-8 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
              >
                Lập phiếu nhập ngay
              </button>
            )}
          </div>

          {stats.sapHet.length ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    <th className="px-3.5 py-2.5">Mã</th>
                    <th className="px-3.5 py-2.5">Sản phẩm</th>
                    <th className="px-3.5 py-2.5">Hãng</th>
                    <th className="px-3.5 py-2.5 text-right">Tồn kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {stats.sapHet.map((item) => (
                    <tr key={item.ma} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-3.5 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {item.ma}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-white">
                        {item.ten}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                        {item.hang}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold tabular-nums">
                        <span
                          className={
                            item.ton === 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {item.ton}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Không có sản phẩm nào sắp hết hàng.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
