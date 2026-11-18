import { useMemo, useState } from 'react';
import { Check, Copy, Minus, Plus, QrCode, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import type {
  CartSummary,
  PaymentMethod,
  PromoCode,
  SafeUser,
} from '../types/vphone';
import {
  PAYMENT_METHOD_LABELS,
  evaluatePromoCode,
  formatVnd,
} from '../utils/vphoneLogic';
import {
  VPHONE_BANK_INFO,
  buildPaymentQrMemo,
  buildPaymentQrPayload,
  type QrWalletChannel,
} from '../utils/qrPayload';
import { ProductIllustration } from './ProductIllustration';
import { QrCodeBox } from './QrCodeBox';

interface CartViewProps {
  user: SafeUser | null;
  cart: CartSummary;
  promos: PromoCode[];
  onUpdateQty: (ma: string, qty: number) => void;
  onRemoveItem: (ma: string) => void;
  onPlaceOrder: (options: {
    promoCode?: string;
    paymentMethod: PaymentMethod;
  }) => void;
  onBrowseProducts: () => void;
}

export function CartView({
  user,
  cart,
  promos,
  onUpdateQty,
  onRemoveItem,
  onPlaceOrder,
  onBrowseProducts,
}: CartViewProps) {
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [promoError, setPromoError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [walletChannel, setWalletChannel] = useState<'MOMO' | 'VNPAY'>('MOMO');
  const [copiedStk, setCopiedStk] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const activePromos = useMemo(
    () => promos.filter((p) => p.kichHoat && p.hanDung >= todayIso),
    [promos, todayIso],
  );

  const promoEval = useMemo(() => {
    if (!appliedPromoCode) return { valid: false, discount: 0 };
    const found = promos.find((p) => p.ma.toUpperCase() === appliedPromoCode.toUpperCase());
    return evaluatePromoCode(found, cart, todayIso);
  }, [appliedPromoCode, promos, cart, todayIso]);

  const promoDiscount = promoEval.valid ? promoEval.discount : 0;
  const finalTotal = Math.max(0, cart.tong - promoDiscount);

  const applyCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setAppliedPromoCode('');
      setPromoError('');
      return;
    }
    const found = promos.find((p) => p.ma.toUpperCase() === code);
    const res = evaluatePromoCode(found, cart, todayIso);
    if (!res.valid) {
      setPromoError(res.error || 'Mã không hợp lệ.');
      setAppliedPromoCode('');
      return;
    }
    setPromoError('');
    setAppliedPromoCode(found!.ma);
    setPromoInput(found!.ma);
  };

  if (!user || user.vaiTro !== 'KHACH_HANG') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-[#131A26]">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Vui lòng đăng nhập bằng tài khoản khách hàng để xem giỏ hàng.
        </p>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Giỏ hàng
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-[#131A26]">
          <ShoppingBag className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
          <p className="mt-3 font-display text-base font-semibold text-slate-900 dark:text-white">
            Giỏ hàng đang trống
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Thêm điện thoại hoặc phụ kiện từ danh mục để bắt đầu đặt hàng.
          </p>
          <button
            type="button"
            onClick={onBrowseProducts}
            className="mt-5 h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Xem sản phẩm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Giỏ hàng & Thanh toán
        </h1>
        <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
          {cart.soLuong} sản phẩm
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Items + Payment */}
        <div className="space-y-5 lg:col-span-8">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131A26]">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3 text-right">Đơn giá</th>
                  <th className="px-4 py-3 text-center">Số lượng</th>
                  <th className="px-4 py-3 text-right">Thành tiền</th>
                  <th className="px-4 py-3 text-right">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {cart.items.map((item) => (
                  <tr key={item.ma} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                          <ProductIllustration
                            product={{
                              ma: item.ma,
                              ten: item.ten,
                              hang: item.hang,
                              loai: item.loai,
                              mauSac: item.mauSac,
                              anh: item.anh,
                            }}
                            compact
                            cover
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{item.ten}</p>
                          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {item.ma} · Tồn: {item.ton}
                            {item.isFlashSale ? ' · Flash Sale' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-200">
                      {formatVnd(item.donGia)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="mx-auto inline-flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#0B0F17]">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.ma, item.soLuong - 1)}
                          aria-label={`Giảm số lượng ${item.ten}`}
                          className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {item.soLuong}
                        </span>
                        <button
                          type="button"
                          disabled={item.soLuong >= item.ton}
                          onClick={() => onUpdateQty(item.ma, item.soLuong + 1)}
                          aria-label={`Tăng số lượng ${item.ten}`}
                          className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap text-slate-900 dark:text-white">
                      {formatVnd(item.thanhTien)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.ma)}
                        aria-label={`Xóa ${item.ten} khỏi giỏ hàng`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Method */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131A26]">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Phương thức thanh toán
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(['COD', 'CHUYEN_KHOAN', 'VI_DIEN_TU'] as PaymentMethod[]).map((method) => (
                <label
                  key={method}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-medium ${
                    paymentMethod === method
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="accent-blue-700"
                  />
                  <span>{PAYMENT_METHOD_LABELS[method]}</span>
                </label>
              ))}
            </div>
            {(paymentMethod === 'CHUYEN_KHOAN' || paymentMethod === 'VI_DIEN_TU') && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                    <QrCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    {paymentMethod === 'CHUYEN_KHOAN'
                      ? 'Mã VietQR · Vietcombank'
                      : 'Quét mã ví điện tử'}
                  </span>

                  {paymentMethod === 'VI_DIEN_TU' && (
                    <div className="inline-flex rounded-md bg-slate-200/80 p-0.5 dark:bg-slate-800">
                      {(['MOMO', 'VNPAY'] as const).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setWalletChannel(ch)}
                          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                            walletChannel === ch
                              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {ch === 'MOMO' ? 'MoMo' : 'VNPay-QR'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <QrCodeBox
                    size={112}
                    label="Mã QR thanh toán tạm tính"
                    value={buildPaymentQrPayload({
                      channel:
                        paymentMethod === 'CHUYEN_KHOAN'
                          ? 'VIETQR_VCB'
                          : (walletChannel as QrWalletChannel),
                      amount: finalTotal,
                      referenceCode: user.ma,
                    })}
                  />
                  <div className="min-w-0 flex-1 space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <p>
                      Số tiền:{' '}
                      <strong className="font-mono text-blue-700 dark:text-blue-400">
                        {formatVnd(finalTotal)}
                      </strong>
                    </p>
                    <p>
                      Ngân hàng: <strong className="text-slate-900 dark:text-white">{VPHONE_BANK_INFO.bankName}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>
                        STK:{' '}
                        <strong className="font-mono text-slate-900 dark:text-white">
                          {VPHONE_BANK_INFO.accountNumber}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(VPHONE_BANK_INFO.accountNumber);
                            setCopiedStk(true);
                            window.setTimeout(() => setCopiedStk(false), 1500);
                          } catch {
                            // Ignore
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {copiedStk ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedStk ? 'Đã chép' : 'Chép'}
                      </button>
                    </div>
                    <p>
                      Nội dung:{' '}
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {buildPaymentQrMemo(user.ma)}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Promo Code + Summary */}
        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131A26]">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Tóm tắt đơn hàng
            </h2>

            {/* Voucher input */}
            <div className="mt-4 space-y-2 border-b border-slate-200 pb-4 dark:border-slate-800">
              <label
                htmlFor="promo-code-input"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <Tag className="h-3.5 w-3.5" />
                Mã giảm giá / Khuyến mãi
              </label>
              <div className="flex gap-2">
                <input
                  id="promo-code-input"
                  type="text"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value);
                    setPromoError('');
                  }}
                  placeholder="Nhập mã (vd: VPHONE10)"
                  className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs uppercase text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => applyCode(promoInput)}
                  className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Áp dụng
                </button>
              </div>
              {promoError && (
                <p className="text-xs text-red-600 dark:text-red-400">{promoError}</p>
              )}
              {promoEval.valid && (
                <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                  <span>Đang áp dụng mã {appliedPromoCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedPromoCode('');
                      setPromoInput('');
                    }}
                    className="underline"
                  >
                    Gỡ mã
                  </button>
                </div>
              )}

              {activePromos.length > 0 && (
                <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Mã khả dụng: </span>
                  {activePromos.map((pr, idx) => (
                    <span key={pr.ma}>
                      {idx > 0 && ' · '}
                      <button
                        type="button"
                        onClick={() => applyCode(pr.ma)}
                        className="font-mono font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400"
                      >
                        {pr.ma}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-2.5 border-b border-slate-200 pb-4 text-sm dark:border-slate-800">
              <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                <dt>Tạm tính</dt>
                <dd className="font-mono tabular-nums">{formatVnd(cart.tong)}</dd>
              </div>
              {cart.tongGiam > 0 && (
                <div className="flex justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <dt>Tiết kiệm sẵn (Flash Sale / Phụ kiện)</dt>
                  <dd className="font-mono tabular-nums">-{formatVnd(cart.tongGiam)}</dd>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                  <dt>Mã giảm giá ({appliedPromoCode})</dt>
                  <dd className="font-mono tabular-nums">-{formatVnd(promoDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                <dt>Vận chuyển</dt>
                <dd className="font-medium text-emerald-700 dark:text-emerald-400">Miễn phí</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Tổng thanh toán</span>
              <span className="font-mono text-xl font-bold tabular-nums text-blue-700 dark:text-blue-400">
                {formatVnd(finalTotal)}
              </span>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <p>Người nhận: {user.hoTen}</p>
              {user.sdt && <p>Điện thoại: {user.sdt}</p>}
              {user.diaChi && <p>Địa chỉ: {user.diaChi}</p>}
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onPlaceOrder({
                    promoCode: promoEval.valid ? appliedPromoCode : undefined,
                    paymentMethod,
                  })
                }
                className="h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Đặt hàng
              </button>
              <button
                type="button"
                onClick={onBrowseProducts}
                className="h-10 w-full rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Mua thêm sản phẩm
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
