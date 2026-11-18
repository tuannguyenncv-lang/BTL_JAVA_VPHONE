import { Printer, X } from 'lucide-react';
import type { Order } from '../types/vphone';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatVnd,
} from '../utils/vphoneLogic';
import { buildInvoiceQrPayload } from '../utils/qrPayload';
import { QrCodeBox } from './QrCodeBox';

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

export function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 print-invoice-root"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Hóa đơn ${order.ma}`}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl print-invoice-root"
      >
        <div className="no-print mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <span className="font-display text-sm font-bold text-slate-700">
            Xem trước hóa đơn (In / Lưu PDF)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 text-xs font-semibold text-white hover:bg-blue-800"
            >
              <Printer className="h-3.5 w-3.5" />
              In / Lưu PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hóa đơn"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900">
                VPHONE RETAIL
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Hệ thống bán lẻ điện thoại & phụ kiện chính hãng
              </p>
              <p className="text-xs text-slate-500">Hotline: 1900 6868 · MST: 0109876543</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-display text-base font-bold text-slate-900">HÓA ĐƠN BÁN HÀNG</p>
              <p className="mt-1 font-mono font-semibold text-slate-700">Mã đơn: {order.ma}</p>
              <p className="text-slate-500">Ngày lập: {order.ngay}</p>
              <p className="text-slate-600">Trạng thái: {ORDER_STATUS_LABELS[order.trangThai]}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div>
              <p className="font-semibold text-slate-700">Thông tin khách hàng</p>
              <p className="mt-1 text-slate-800">{order.khach}</p>
              <p className="font-mono text-slate-500">Mã KH: {order.maKhach}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Thanh toán</p>
              <p className="mt-1 text-slate-800">
                {PAYMENT_METHOD_LABELS[order.phuongThucThanhToan]}
              </p>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-200 text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2">STT</th>
                <th className="px-3 py-2">Tên sản phẩm</th>
                <th className="px-3 py-2 text-right">Đơn giá</th>
                <th className="px-3 py-2 text-right">SL</th>
                <th className="px-3 py-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.chiTiet.map((line, i) => (
                <tr key={`${line.ma}-${i}`}>
                  <td className="px-3 py-2 font-mono">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{line.ten}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatVnd(line.donGia)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{line.soLuong}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                    {formatVnd(line.thanhTien)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <QrCodeBox
                value={buildInvoiceQrPayload(order)}
                size={84}
                label={`Mã QR hóa đơn ${order.ma}`}
              />
              <div className="text-[11px] leading-relaxed text-slate-500">
                <p className="font-semibold text-slate-700">Mã QR hóa đơn điện tử</p>
                <p className="font-mono">{order.ma}</p>
                <p>Quét để tra cứu / thanh toán</p>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-1 text-xs">
              <p className="text-slate-600">
                Tạm tính: <span className="font-mono font-semibold">{formatVnd(order.tamTinh)}</span>
              </p>
              {order.tienGiam > 0 && (
                <p className="text-emerald-700">
                  Giảm giá ({order.maGiamGia}):{' '}
                  <span className="font-mono font-semibold">-{formatVnd(order.tienGiam)}</span>
                </p>
              )}
              <p className="pt-1 text-sm font-bold text-slate-900">
                Tổng thanh toán:{' '}
                <span className="ml-1 font-mono text-base tabular-nums text-blue-700">
                  {formatVnd(order.tong)}
                </span>
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500">
            Cảm ơn Quý khách đã tin tưởng mua sắm tại VPHONE. Bảo hành chính hãng 12 tháng trên toàn quốc.
          </div>
        </div>
      </div>
    </div>
  );
}
