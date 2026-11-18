import { useState } from 'react';
import {
  BadgeCheck,
  Clock3,
  Package,
  Printer,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import type { Order, OrderStatus, SafeUser } from '../types/vphone';
import {
  ORDER_NEXT_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatVnd,
  paginateItems,
} from '../utils/vphoneLogic';

interface OrdersViewProps {
  user: SafeUser | null;
  orders: Order[];
  onTransitionStatus: (order: Order, nextStatus: OrderStatus) => void;
  onPrintInvoice: (order: Order) => void;
  onOpenQr?: (order: Order) => void;
  onVerifyPayment?: (order: Order) => void;
  onBrowseProducts: () => void;
}

function statusClasses(status: OrderStatus): string {
  switch (status) {
    case 'CHO_XAC_NHAN':
      return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-900/60';
    case 'DANG_GIAO':
      return 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-900/60';
    case 'HOAN_THANH':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-900/60';
    case 'DA_HUY':
      return 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/50 dark:border-red-900/60';
  }
}

const TRACK_STEPS: OrderStatus[] = ['CHO_XAC_NHAN', 'DANG_GIAO', 'HOAN_THANH'];

export function OrdersView({
  user,
  orders,
  onTransitionStatus,
  onPrintInvoice,
  onOpenQr,
  onVerifyPayment,
  onBrowseProducts,
}: OrdersViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHO_DOI_SOAT' | OrderStatus>('ALL');
  const [page, setPage] = useState(1);

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-[#131A26]">
        <p className="text-sm text-slate-600 dark:text-slate-300">Vui lòng đăng nhập để xem đơn hàng.</p>
      </div>
    );
  }

  const canManageOrders = user.vaiTro === 'QUAN_TRI' || user.vaiTro === 'NHAN_VIEN_BAN_HANG';
  const scopedOrders = canManageOrders
    ? orders
    : orders.filter((o) => o.maKhach === user.ma);

  const pendingReconcileCount = scopedOrders.filter(
    (o) =>
      o.trangThai !== 'DA_HUY' &&
      o.phuongThucThanhToan !== 'COD' &&
      o.trangThaiThanhToan === 'CHO_XAC_NHAN',
  ).length;

  const visibleOrders =
    statusFilter === 'ALL'
      ? scopedOrders
      : statusFilter === 'CHO_DOI_SOAT'
        ? scopedOrders.filter(
            (o) =>
              o.trangThai !== 'DA_HUY' &&
              o.phuongThucThanhToan !== 'COD' &&
              o.trangThaiThanhToan !== 'DA_THANH_TOAN',
          )
        : scopedOrders.filter((o) => o.trangThai === statusFilter);
  const paginated = paginateItems(visibleOrders, page, 5);

  const filterTabs = [
    ['ALL', 'Tất cả'],
    ...(canManageOrders ? ([['CHO_DOI_SOAT', `Chờ đối soát CK (${pendingReconcileCount})`]] as const) : []),
    ['CHO_XAC_NHAN', 'Chờ xác nhận'],
    ['DANG_GIAO', 'Đang giao'],
    ['HOAN_THANH', 'Hoàn thành'],
    ['DA_HUY', 'Đã hủy'],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {canManageOrders ? 'Quản lý đơn hàng' : 'Đơn hàng của tôi'}
          </h1>
          <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
            {visibleOrders.length} đơn
          </span>
        </div>

        <div
          role="group"
          aria-label="Lọc theo trạng thái đơn hàng"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/75 p-1 dark:bg-slate-800/90"
        >
          {filterTabs.map(([val, label]) => {
            const active = statusFilter === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {!paginated.items.length ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-[#131A26]">
          <Package className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
          <p className="mt-3 font-display text-base font-semibold text-slate-900 dark:text-white">
            Chưa có đơn hàng nào
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {statusFilter === 'ALL'
              ? 'Các đơn hàng mới tạo sẽ xuất hiện tại đây.'
              : 'Không có đơn hàng nào ở trạng thái này.'}
          </p>
          {!canManageOrders && statusFilter === 'ALL' && (
            <button
              type="button"
              onClick={onBrowseProducts}
              className="mt-5 h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Khám phá sản phẩm
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {paginated.items.map((order) => {
            const nextStatuses = canManageOrders
              ? ORDER_NEXT_STATUSES[order.trangThai]
              : order.trangThai === 'CHO_XAC_NHAN'
                ? (['DA_HUY'] as OrderStatus[])
                : [];
            const currentStepIdx = TRACK_STEPS.indexOf(order.trangThai);
            const isOnlinePay = order.phuongThucThanhToan !== 'COD';
            const payState = order.trangThaiThanhToan || (order.trangThai === 'HOAN_THANH' ? 'DA_THANH_TOAN' : 'CHUA_THANH_TOAN');
            const needsPaymentVerify =
              canManageOrders &&
              onVerifyPayment &&
              isOnlinePay &&
              order.trangThai !== 'DA_HUY' &&
              payState !== 'DA_THANH_TOAN';

            return (
              <section
                key={order.ma}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131A26]"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      Đơn {order.ma}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${statusClasses(
                        order.trangThai,
                      )}`}
                    >
                      {ORDER_STATUS_LABELS[order.trangThai]}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{order.ngay}</span>
                    {canManageOrders && (
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        Khách: {order.khach} ({order.maKhach})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!canManageOrders &&
                      onOpenQr &&
                      isOnlinePay &&
                      (order.trangThai === 'CHO_XAC_NHAN' || order.trangThai === 'DANG_GIAO') &&
                      payState !== 'DA_THANH_TOAN' && (
                        <button
                          type="button"
                          onClick={() => onOpenQr(order)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          {payState === 'CHO_XAC_NHAN' ? 'Xem QR / Mã GD' : 'Quét mã QR'}
                        </button>
                      )}

                    {needsPaymentVerify && (
                      <button
                        type="button"
                        onClick={() => onVerifyPayment(order)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${
                          payState === 'CHO_XAC_NHAN'
                            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {payState === 'CHO_XAC_NHAN' ? 'Đối soát & xác nhận tiền' : 'Xác nhận nhận tiền'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onPrintInvoice(order)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      In hóa đơn PDF
                    </button>

                    {nextStatuses.map((tt) => (
                      <button
                        key={tt}
                        type="button"
                        onClick={() => onTransitionStatus(order, tt)}
                        className={
                          tt === 'DA_HUY'
                            ? 'h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40'
                            : 'h-9 rounded-lg bg-blue-700 px-3.5 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500'
                        }
                      >
                        {tt === 'DA_HUY' ? 'Hủy đơn' : `Chuyển: ${ORDER_STATUS_LABELS[tt]}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Tracking Stepper */}
                {order.trangThai !== 'DA_HUY' && (
                  <div className="mb-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3 dark:border-slate-800/80">
                    {TRACK_STEPS.map((step, idx) => {
                      const reached = currentStepIdx >= idx;
                      return (
                        <div key={step} className="space-y-1.5">
                          <div
                            className={`h-1.5 w-full rounded-full ${
                              reached
                                ? 'bg-blue-700 dark:bg-blue-500'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                          <p
                            className={`text-[11px] font-medium ${
                              reached
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {idx + 1}. {ORDER_STATUS_LABELS[step]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Cancellation Reason Notice */}
                {order.trangThai === 'DA_HUY' && order.lyDoHuy && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <span className="font-semibold">Lý do hủy: </span>
                      <span>{order.lyDoHuy}</span>
                      {(order.nguoiHuy || order.ngayHuy) && (
                        <span className="ml-1.5 text-red-600/80 dark:text-red-400/80">
                          ({[order.nguoiHuy, order.ngayHuy].filter(Boolean).join(' · ')})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                        <th className="px-3.5 py-2.5">Sản phẩm</th>
                        <th className="px-3.5 py-2.5 text-right">Đơn giá</th>
                        <th className="px-3.5 py-2.5 text-right">SL</th>
                        <th className="px-3.5 py-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {order.chiTiet.map((line, idx) => (
                        <tr key={`${order.ma}-${line.ma}-${idx}`}>
                          <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {line.ten}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {formatVnd(line.donGia)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {line.soLuong}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                            {formatVnd(line.thanhTien)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{PAYMENT_METHOD_LABELS[order.phuongThucThanhToan]}</span>
                    {isOnlinePay && order.trangThai !== 'DA_HUY' && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${
                          payState === 'DA_THANH_TOAN'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : payState === 'CHO_XAC_NHAN'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {payState === 'DA_THANH_TOAN' ? (
                          <BadgeCheck className="h-3 w-3" />
                        ) : (
                          <Clock3 className="h-3 w-3" />
                        )}
                        {PAYMENT_STATUS_LABELS[payState]}
                        {order.maGiaoDich ? ` · Mã GD: ${order.maGiaoDich}` : ''}
                      </span>
                    )}
                    {order.maGiamGia && (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        · Mã {order.maGiamGia} (-{formatVnd(order.tienGiam)})
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Tổng cộng:{' '}
                    <span className="ml-1 font-mono text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">
                      {formatVnd(order.tong)}
                    </span>
                  </p>
                </div>
              </section>
            );
          })}

          {paginated.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-2">
              {Array.from({ length: paginated.totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`h-8 min-w-8 rounded-md px-2 font-mono text-xs font-semibold ${
                    n === paginated.currentPage
                      ? 'bg-blue-700 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#131A26] dark:text-slate-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
