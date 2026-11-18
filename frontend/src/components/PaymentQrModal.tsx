import { useState, type FormEvent } from 'react';
import { Check, CheckCircle2, Clock3, Copy, QrCode } from 'lucide-react';
import type { Order } from '../types/vphone';
import { PAYMENT_METHOD_LABELS, formatVnd } from '../utils/vphoneLogic';
import {
  QR_IMAGES,
  VPHONE_BANK_INFO,
  buildPaymentQrMemo,
  getDefaultChannelForMethod,
  type QrWalletChannel,
} from '../utils/qrPayload';
import { ModalShell } from './Modals';

interface PaymentQrModalProps {
  order: Order;
  onReportTransferred?: (order: Order, maGiaoDich: string) => void;
  onClose: () => void;
}

export function PaymentQrModal({
  order,
  onReportTransferred,
  onClose,
}: PaymentQrModalProps) {
  const [channel, setChannel] = useState<QrWalletChannel>(() =>
    getDefaultChannelForMethod(order.phuongThucThanhToan),
  );
  const [copiedField, setCopiedField] = useState<'stk' | 'memo' | null>(null);
  const [txCode, setTxCode] = useState(order.maGiaoDich || '');
  const [txError, setTxError] = useState('');

  const memo = buildPaymentQrMemo(order.ma);

  const handleCopy = async (field: 'stk' | 'memo', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Ignore clipboard denials
    }
  };

  const handleConfirmTransfer = (e: FormEvent) => {
    e.preventDefault();
    setTxError('');
    onReportTransferred?.(order, txCode.trim());
  };

  const isPaid = order.trangThaiThanhToan === 'DA_THANH_TOAN';
  const isWaitingVerify = order.trangThaiThanhToan === 'CHO_XAC_NHAN';

  return (
    <ModalShell title={`Quét mã QR thanh toán · Đơn ${order.ma}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Phương thức đã chọn</p>
            <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
              {PAYMENT_METHOD_LABELS[order.phuongThucThanhToan]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 dark:text-slate-400">Số tiền thanh toán</p>
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">
              {formatVnd(order.tong)}
            </p>
          </div>
        </div>

        {/* Channel Switcher */}
        <div
          role="group"
          aria-label="Chọn cổng quét mã QR"
          className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        >
          {(
            [
              ['VIETQR_VCB', 'VietinBank · VietQR'],
              ['MOMO', 'Ví MoMo'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setChannel(id)}
              className={`rounded-md py-1.5 text-xs font-semibold ${
                channel === id
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* QR Code Display */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <div className="w-[min(256px,100%)] overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm">
            <img
              src={channel === 'MOMO' ? QR_IMAGES.MOMO : QR_IMAGES.VIETQR_VCB}
              alt={`Mã QR ${channel} cho đơn ${order.ma}`}
              className="block w-full rounded-xl"
            />
          </div>
          <p className="mt-3.5 text-sm font-bold tracking-wide text-slate-900 dark:text-white">
            {VPHONE_BANK_INFO.accountName}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            {channel === 'MOMO'
              ? `Ví MoMo · ${VPHONE_BANK_INFO.momoPhoneMasked}`
              : `${VPHONE_BANK_INFO.bankName} · ${VPHONE_BANK_INFO.accountNumber}`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {channel === 'MOMO'
              ? 'Mở MoMo, chọn Quét mã và thanh toán'
              : 'Quét mã VietQR bằng ứng dụng Ngân hàng hoặc MoMo để thanh toán'}
          </p>
        </div>

        {/* Copyable Bank / Memo Details */}
        <div className="space-y-2 rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">
              STK {VPHONE_BANK_INFO.bankName}:{' '}
              <strong className="font-mono text-slate-900 dark:text-white">
                {VPHONE_BANK_INFO.accountNumber}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => handleCopy('stk', VPHONE_BANK_INFO.accountNumber)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {copiedField === 'stk' ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedField === 'stk' ? 'Đã chép' : 'Chép STK'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">
              Nội dung CK:{' '}
              <strong className="font-mono text-slate-900 dark:text-white">{memo}</strong>
            </span>
            <button
              type="button"
              onClick={() => handleCopy('memo', memo)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {copiedField === 'memo' ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedField === 'memo' ? 'Đã chép' : 'Chép nội dung'}
            </button>
          </div>
        </div>

        {/* Customer Transfer Verification Form */}
        {isPaid ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Đơn hàng đã được cửa hàng xác nhận nhận tiền (Mã GD:{' '}
              <strong className="font-mono">{order.maGiaoDich}</strong>).
            </span>
          </div>
        ) : onReportTransferred ? (
          <form
            onSubmit={handleConfirmTransfer}
            className="space-y-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/30"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                Xác nhận đã chuyển khoản (không bắt buộc nhập mã)
              </span>
              {isWaitingVerify && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  <Clock3 className="h-3 w-3" />
                  Đang chờ đối soát
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              Nếu chỉ chạy thử / demo, bạn cứ bấm thẳng nút bên dưới — hệ thống sẽ tự tạo mã đối soát. Nếu có mã giao dịch thật thì nhập thêm vào ô:
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={txCode}
                onChange={(e) => {
                  setTxCode(e.target.value);
                  setTxError('');
                }}
                placeholder="Mã GD (để trống sẽ tự sinh mã demo)"
                aria-label="Mã giao dịch chuyển khoản"
                className={`h-9 flex-1 rounded-lg border bg-white px-3 font-mono text-xs text-slate-900 focus:outline-none dark:bg-[#0B0F17] dark:text-slate-100 ${
                  txError ? 'border-red-500' : 'border-slate-300 focus:border-blue-600 dark:border-slate-700'
                }`}
              />
              <button
                type="submit"
                className="h-9 shrink-0 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {isWaitingVerify ? 'Cập nhật xác nhận' : 'Tôi đã chuyển khoản xong'}
              </button>
            </div>
            {txError && <p className="text-xs text-red-600 dark:text-red-400">{txError}</p>}
          </form>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
