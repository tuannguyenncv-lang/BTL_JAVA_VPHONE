import { useState } from 'react';
import { Check, Copy, QrCode } from 'lucide-react';
import type { Order } from '../types/vphone';
import { PAYMENT_METHOD_LABELS, formatVnd } from '../utils/vphoneLogic';
import {
  VPHONE_BANK_INFO,
  buildPaymentQrMemo,
  buildPaymentQrPayload,
  getDefaultChannelForMethod,
  type QrWalletChannel,
} from '../utils/qrPayload';
import { ModalShell } from './Modals';
import { QrCodeBox } from './QrCodeBox';

interface PaymentQrModalProps {
  order: Order;
  onClose: () => void;
}

export function PaymentQrModal({ order, onClose }: PaymentQrModalProps) {
  const [channel, setChannel] = useState<QrWalletChannel>(() =>
    getDefaultChannelForMethod(order.phuongThucThanhToan),
  );
  const [copiedField, setCopiedField] = useState<'stk' | 'memo' | null>(null);

  const memo = buildPaymentQrMemo(order.ma);
  const qrValue = buildPaymentQrPayload({
    channel,
    amount: order.tong,
    referenceCode: order.ma,
  });

  const handleCopy = async (field: 'stk' | 'memo', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Ignore clipboard denials
    }
  };

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
          className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        >
          {(
            [
              ['VIETQR_VCB', 'VietQR · VCB'],
              ['MOMO', 'Ví MoMo'],
              ['VNPAY', 'VNPay-QR'],
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
          <QrCodeBox
            value={qrValue}
            size={188}
            label={`Mã QR ${channel} cho đơn ${order.ma}`}
          />
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <QrCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            {channel === 'VIETQR_VCB'
              ? `VietQR · ${VPHONE_BANK_INFO.bankName} (${VPHONE_BANK_INFO.accountNumber})`
              : channel === 'MOMO'
                ? 'Mở ứng dụng MoMo để quét mã thanh toán'
                : 'Mở ứng dụng Ngân hàng / VNPay để quét VNPay-QR'}
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

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Đã quét / Đóng
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
