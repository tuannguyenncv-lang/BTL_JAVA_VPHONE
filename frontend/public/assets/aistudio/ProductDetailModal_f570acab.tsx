import { useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import type { Product, ProductReview, SafeUser } from '../types/vphone';
import {
  formatVnd,
  getEffectivePrice,
  getProductRatingSummary,
  getProductSpecs,
  getRelatedProducts,
  validateInteger,
  validateRequired,
} from '../utils/vphoneLogic';
import { ModalShell } from './Modals';
import { ProductIllustration } from './ProductIllustration';

interface ProductDetailModalProps {
  product: Product;
  allProducts: Product[];
  reviews: ProductReview[];
  user: SafeUser | null;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, qty: number) => void;
  onRequireLogin: () => void;
  onSubmitReview: (maSanPham: string, sao: number, binhLuan: string) => void;
}

export function ProductDetailModal({
  product,
  allProducts,
  reviews,
  user,
  onClose,
  onSelectProduct,
  onAddToCart,
  onRequireLogin,
  onSubmitReview,
}: ProductDetailModalProps) {
  const [qty, setQty] = useState('1');
  const [qtyErr, setQtyErr] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [commentErr, setCommentErr] = useState('');

  const eff = getEffectivePrice(product);
  const specs = getProductSpecs(product);
  const prodReviews = reviews.filter((r) => r.maSanPham === product.ma);
  const ratingSummary = getProductRatingSummary(product.ma, reviews);
  const related = getRelatedProducts(product, allProducts, 3);
  const isCustomer = user?.vaiTro === 'KHACH_HANG';

  const handleBuy = () => {
    const err =
      validateInteger(qty, 1) ||
      (Number(qty) > product.ton ? `Chỉ còn ${product.ton} sản phẩm.` : '');
    setQtyErr(err);
    if (err) return;
    onAddToCart(product, Number(qty));
  };

  const handleReviewSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateRequired(comment);
    setCommentErr(err);
    if (err) return;
    onSubmitReview(product.ma, rating, comment);
    setComment('');
    setRating(5);
  };

  return (
    <ModalShell title={product.ten} onClose={onClose} wide>
      <div className="space-y-8">
        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 md:col-span-6 dark:bg-[#192234]">
            <ProductIllustration product={product} cover />
          </div>

          <div className="flex flex-col md:col-span-6">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {product.hang} · {product.loai === 'PHU_KIEN' ? 'Phụ kiện' : 'Điện thoại'}
              </span>
              <span className="font-mono">{product.ma}</span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <Star className="h-3.5 w-3.5 fill-current" />
                {ratingSummary.count > 0 ? ratingSummary.average : 'Chưa có đánh giá'}
              </span>
              {ratingSummary.count > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  ({ratingSummary.count} đánh giá)
                </span>
              )}
              {eff.isFlashSale && (
                <span className="font-semibold text-red-600 dark:text-red-400">
                  · Flash Sale
                </span>
              )}
            </div>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatVnd(eff.price)}
              </span>
              {eff.hasDiscount && (
                <s className="font-mono text-sm tabular-nums text-slate-400">
                  {formatVnd(eff.originalPrice)}
                </s>
              )}
            </div>

            <p
              className={`mt-1.5 text-xs font-medium ${
                product.ton === 0
                  ? 'text-red-600 dark:text-red-400'
                  : product.ton <= 5
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {product.ton === 0
                ? 'Hết hàng'
                : product.ton <= 5
                  ? `Sắp hết: còn ${product.ton} sản phẩm`
                  : `Còn ${product.ton} sản phẩm`}
            </p>

            {product.moTa && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {product.moTa}
              </p>
            )}

            <dl className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
              {specs.length > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Cấu hình</dt>
                  <dd className="text-right font-medium text-slate-800 dark:text-slate-200">
                    {specs.join(' · ')}
                  </dd>
                </div>
              )}
              {product.manHinh && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Màn hình</dt>
                  <dd className="text-right font-medium text-slate-800 dark:text-slate-200">
                    {product.manHinh}
                  </dd>
                </div>
              )}
              {product.chip && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Chip</dt>
                  <dd className="text-right font-medium text-slate-800 dark:text-slate-200">
                    {product.chip}
                  </dd>
                </div>
              )}
              {product.camera && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Camera</dt>
                  <dd className="text-right font-medium text-slate-800 dark:text-slate-200">
                    {product.camera}
                  </dd>
                </div>
              )}
              {product.pin && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Pin & Sạc</dt>
                  <dd className="text-right font-medium text-slate-800 dark:text-slate-200">
                    {product.pin}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-auto pt-4">
              {isCustomer ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label="Số lượng mua"
                      value={qty}
                      disabled={product.ton === 0}
                      onChange={(e) => {
                        setQty(e.target.value);
                        setQtyErr('');
                      }}
                      className="h-10 w-16 rounded-lg border border-slate-300 bg-white text-center font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
                    />
                    <button
                      type="button"
                      disabled={product.ton === 0}
                      onClick={handleBuy}
                      className="h-10 flex-1 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-45 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      {product.ton === 0 ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
                    </button>
                  </div>
                  {qtyErr && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{qtyErr}</p>}
                </div>
              ) : !user ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequireLogin();
                  }}
                  className="h-10 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Đăng nhập để mua ngay
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Gợi ý sản phẩm liên quan
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {related.map((rel) => {
                const relEff = getEffectivePrice(rel);
                return (
                  <button
                    key={rel.ma}
                    type="button"
                    onClick={() => onSelectProduct(rel)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      <ProductIllustration product={rel} compact cover />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                        {rel.ten}
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-blue-700 dark:text-blue-400">
                        {formatVnd(relEff.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Reviews & Comments */}
        <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Đánh giá & Bình luận ({prodReviews.length})
          </h4>

          {isCustomer && (
            <form onSubmit={handleReviewSubmit} className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Chọn số sao:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      aria-label={`${s} sao`}
                      className="p-1"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          s <= rating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    setCommentErr('');
                  }}
                  placeholder="Chia sẻ trải nghiệm sử dụng sản phẩm..."
                  className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white whitespace-nowrap hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Gửi đánh giá
                </button>
              </div>
              {commentErr && (
                <p className="text-xs text-red-600 dark:text-red-400">{commentErr}</p>
              )}
            </form>
          )}

          <div className="mt-4 space-y-3">
            {prodReviews.length ? (
              prodReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="border-b border-slate-100 pb-3 last:border-b-0 dark:border-slate-800/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {rev.tenKhach}
                    </span>
                    <span className="text-[11px] text-slate-400">{rev.ngay}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= rev.sao
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {rev.binhLuan}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chưa có bình luận nào cho sản phẩm này.
              </p>
            )}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}
