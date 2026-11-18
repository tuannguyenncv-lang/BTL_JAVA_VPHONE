import type { Order, PaymentMethod } from '../types/vphone';

export const VPHONE_BANK_INFO = {
  bankId: 'ICB',
  bankName: 'VietinBank',
  accountNumber: '101877475673',
  accountName: 'NGUYEN THE TUAN',
  momoPhoneMasked: '*******040',
};

export const QR_IMAGES = {
  VIETQR_VCB: '/src/assets/images/qr_vietinbank.jpg',
  MOMO: '/src/assets/images/qr_momo.jpg',
  VNPAY: '/src/assets/images/qr_vietinbank.jpg',
} as const;

export type QrWalletChannel = 'VIETQR_VCB' | 'MOMO' | 'VNPAY';

export function getDefaultChannelForMethod(method: PaymentMethod): QrWalletChannel {
  if (method === 'VI_DIEN_TU') return 'MOMO';
  return 'VIETQR_VCB';
}

export function buildPaymentQrMemo(referenceCode: string): string {
  const clean = referenceCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'KHACH';
  return `VPHONE ${clean}`;
}

export function buildPaymentQrPayload(opts: {
  channel: QrWalletChannel;
  amount: number;
  referenceCode: string;
}): string {
  const memo = buildPaymentQrMemo(opts.referenceCode);
  const rounded = Math.max(0, Math.round(opts.amount));
  if (opts.channel === 'MOMO') {
    return `2|99|0901112233|${VPHONE_BANK_INFO.accountName}|vphone@retail.vn|0|0|${rounded}|${memo}|transfer_myqr`;
  }
  if (opts.channel === 'VNPAY') {
    return `VNPAYQR://VPHONE/${VPHONE_BANK_INFO.accountNumber}/${rounded}/${encodeURIComponent(memo)}`;
  }
  return `VIETQR|${VPHONE_BANK_INFO.bankId}|${VPHONE_BANK_INFO.accountNumber}|${VPHONE_BANK_INFO.accountName}|${rounded}|${memo}`;
}

export function buildInvoiceQrPayload(order: Order): string {
  return `VPHONE-INV|${order.ma}|${order.maKhach}|${Math.round(order.tong)}|${order.trangThai}`;
}
