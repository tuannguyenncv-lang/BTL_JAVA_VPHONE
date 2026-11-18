import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GitCompareArrows, Plus, RotateCcw, Search, Star } from 'lucide-react';
import { HERO_BANNER_IMAGE } from '../data/seedData';
import type {
  Product,
  ProductFilter,
  ProductReview,
  SafeUser,
} from '../types/vphone';
import {
  filterAndSortProducts,
  formatVnd,
  getEffectivePrice,
  getProductRatingSummary,
  getProductSpecs,
  isFlashSaleActive,
  paginateItems,
  validateInteger,
  validatePriceRange,
} from '../utils/vphoneLogic';
import { ProductIllustration } from './ProductIllustration';

interface StorefrontViewProps {
  products: Product[];
  reviews: ProductReview[];
  user: SafeUser | null;
  compareIds: string[];
  onToggleCompare: (product: Product) => void;
  onOpenCompareModal: () => void;
  onClearCompare: () => void;
  onOpenProductDetail: (product: Product) => void;
  onAddToCart: (product: Product, qty: number) => void;
  onRequireLogin: () => void;
  onOpenProductModal: (product: Product | null) => void;
  onDeleteProduct: (product: Product) => void;
  onQuickRestock: () => void;
}

function useFlashCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(14250);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 14250));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
  const m = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
  const s = String(secondsLeft % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function StorefrontView({
  products,
  reviews,
  user,
  compareIds,
  onToggleCompare,
  onOpenCompareModal,
  onClearCompare,
  onOpenProductDetail,
  onAddToCart,
  onRequireLogin,
  onOpenProductModal,
  onDeleteProduct,
  onQuickRestock,
}: StorefrontViewProps) {
  const role = user?.vaiTro;
  const isStaff = role === 'QUAN_TRI' || role === 'NHAN_VIEN_BAN_HANG' || role === 'THU_KHO';
  const canEditCatalog = role === 'QUAN_TRI' || role === 'NHAN_VIEN_BAN_HANG';
  const canRestock = role === 'QUAN_TRI' || role === 'THU_KHO';
  const isCustomer = role === 'KHACH_HANG';

  const countdown = useFlashCountdown();

  const [filter, setFilter] = useState<ProductFilter>({
    q: '',
    hang: 'ALL',
    min: '',
    max: '',
    sort: '',
    loai: 'ALL',
    stockState: 'ALL',
  });
  const [appliedFilter, setAppliedFilter] = useState<ProductFilter>(filter);
  const [priceErrors, setPriceErrors] = useState<{ minErr: string; maxErr: string }>({
    minErr: '',
    maxErr: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
  const [qtyErrors, setQtyErrors] = useState<Record<string, string>>({});

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.hang))).sort(),
    [products],
  );

  const flashSaleCount = useMemo(
    () => products.filter((p) => isFlashSaleActive(p)).length,
    [products],
  );

  const filteredProducts = useMemo(
    () => filterAndSortProducts(products, appliedFilter, reviews),
    [products, appliedFilter, reviews],
  );

  const paginated = useMemo(
    () => paginateItems(filteredProducts, page, pageSize),
    [filteredProducts, page, pageSize],
  );

  const applyFilters = (override?: Partial<ProductFilter>) => {
    const next = { ...filter, ...override };
    const rangeErr = validatePriceRange(next.min, next.max);
    setPriceErrors(rangeErr);
    if (rangeErr.minErr || rangeErr.maxErr) return;
    setFilter(next);
    setAppliedFilter(next);
    setPage(1);
  };

  const resetFilters = () => {
    const empty: ProductFilter = {
      q: '',
      hang: 'ALL',
      min: '',
      max: '',
      sort: '',
      loai: 'ALL',
      stockState: 'ALL',
    };
    setFilter(empty);
    setAppliedFilter(empty);
    setPriceErrors({ minErr: '', maxErr: '' });
    setPage(1);
  };

  const handleCategoryChange = (loai: ProductFilter['loai']) => {
    const next = { ...filter, loai };
    setFilter(next);
    setAppliedFilter({ ...appliedFilter, loai });
    setPage(1);
  };

  const handleAddClick = (sp: Product) => {
    const rawQty = qtyMap[sp.ma] ?? '1';
    const intErr = validateInteger(rawQty, 1);
    const qty = Number(rawQty);
    const err = intErr || (qty > sp.ton ? `Chỉ còn ${sp.ton} sản phẩm.` : '');
    setQtyErrors((prev) => ({ ...prev, [sp.ma]: err }));
    if (err) return;
    onAddToCart(sp, qty);
  };

  return (
    <div className="space-y-8">
      {/* Slim Flash Sale Bar + Hero (Guest & Customer only) */}
      {!isStaff && (
        <>
          {flashSaleCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-xs dark:border-blue-900/60 dark:bg-blue-950/35">
              <div className="flex flex-wrap items-center gap-2 text-slate-800 dark:text-slate-100">
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  Flash Sale hôm nay
                </span>
                <span aria-hidden="true">·</span>
                <span>{flashSaleCount} sản phẩm giảm giá trực tiếp</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  Kết thúc sau {countdown}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCategoryChange('FLASH_SALE')}
                className="font-semibold text-blue-700 underline underline-offset-4 hover:text-blue-800 dark:text-blue-400"
              >
                Lọc sản phẩm Flash Sale
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 items-stretch gap-6 rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 lg:grid-cols-12 dark:border-slate-800 dark:bg-[#131A26]">
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">
                Hệ thống bán lẻ thiết bị di động chính hãng
              </p>
              <h1 className="mt-2 max-w-xl font-display text-[clamp(1.85rem,3.3vw,2.65rem)] font-bold leading-[1.15] tracking-tight text-slate-900 [text-wrap:balance] dark:text-white">
                Thiết bị flagship và phụ kiện chuẩn mực cho công việc hằng ngày.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                So sánh cấu hình trực tiếp, thanh toán QR nhanh và áp dụng mã giảm giá ngay tại giỏ hàng.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#danh-muc"
                  className="inline-flex h-11 items-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Khám phá danh mục
                </a>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('FLASH_SALE')}
                  className="inline-flex h-11 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Xem ưu đãi Flash Sale
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-slate-100 lg:col-span-6 dark:bg-[#192234]">
              <img
                src={HERO_BANNER_IMAGE}
                alt="Bộ sưu tập điện thoại flagship và tai nghe tại VPHONE"
                className="h-full min-h-[220px] w-full object-cover"
              />
            </div>
          </section>
        </>
      )}

      {/* Catalog Header & Controls */}
      <section id="danh-muc" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isStaff ? 'Quản lý kho sản phẩm' : 'Danh mục sản phẩm'}
            </h2>
            <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
              {filteredProducts.length} sản phẩm
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Lọc theo danh mục"
              className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/75 p-1 dark:bg-slate-800/90"
            >
              {(
                [
                  ['ALL', 'Tất cả'],
                  ['DIEN_THOAI', 'Điện thoại'],
                  ['PHU_KIEN', 'Phụ kiện'],
                  ['FLASH_SALE', 'Flash Sale'],
                ] as const
              ).map(([val, label]) => {
                const active = filter.loai === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleCategoryChange(val)}
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

            {canEditCatalog && (
              <button
                type="button"
                onClick={() => onOpenProductModal(null)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white whitespace-nowrap hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </button>
            )}
          </div>
        </div>

        {/* Advanced Search & Filter Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-12 dark:border-slate-800 dark:bg-[#131A26]"
        >
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Từ khóa
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filter.q}
                onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
                placeholder="Tên máy, chip, màu sắc..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Hãng
            </label>
            <select
              aria-label="Lọc theo hãng"
              value={filter.hang}
              onChange={(e) => applyFilters({ hang: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            >
              <option value="ALL">Tất cả hãng</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Tình trạng kho
            </label>
            <select
              aria-label="Lọc tình trạng kho"
              value={filter.stockState}
              onChange={(e) =>
                applyFilters({ stockState: e.target.value as ProductFilter['stockState'] })
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            >
              <option value="ALL">Tất cả</option>
              <option value="IN_STOCK">Còn hàng</option>
              <option value="LOW_STOCK">Sắp hết (≤ 5)</option>
              <option value="OUT_OF_STOCK">Hết hàng</option>
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Giá từ
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={filter.min}
              onChange={(e) => {
                setFilter((f) => ({ ...f, min: e.target.value }));
                setPriceErrors((p) => ({ ...p, minErr: '' }));
              }}
              placeholder="0"
              className={`h-10 w-full rounded-lg border px-2.5 text-sm tabular-nums bg-white text-slate-900 focus:outline-none dark:bg-[#0B0F17] dark:text-slate-100 ${
                priceErrors.minErr
                  ? 'border-red-500'
                  : 'border-slate-300 focus:border-blue-600 dark:border-slate-700'
              }`}
            />
            {priceErrors.minErr && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{priceErrors.minErr}</p>
            )}
          </div>

          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Giá đến
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={filter.max}
              onChange={(e) => {
                setFilter((f) => ({ ...f, max: e.target.value }));
                setPriceErrors((p) => ({ ...p, maxErr: '' }));
              }}
              placeholder="50tr"
              className={`h-10 w-full rounded-lg border px-2.5 text-sm tabular-nums bg-white text-slate-900 focus:outline-none dark:bg-[#0B0F17] dark:text-slate-100 ${
                priceErrors.maxErr
                  ? 'border-red-500'
                  : 'border-slate-300 focus:border-blue-600 dark:border-slate-700'
              }`}
            />
            {priceErrors.maxErr && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{priceErrors.maxErr}</p>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Sắp xếp
            </label>
            <select
              aria-label="Sắp xếp sản phẩm"
              value={filter.sort}
              onChange={(e) => applyFilters({ sort: e.target.value as ProductFilter['sort'] })}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            >
              <option value="">Mặc định</option>
              <option value="gia_tang">Giá tăng</option>
              <option value="gia_giam">Giá giảm</option>
              <option value="danh_gia">Đánh giá</option>
            </select>
          </div>

          <div className="flex items-end gap-2 lg:col-span-2">
            <button
              type="submit"
              className="h-10 flex-1 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white whitespace-nowrap hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Lọc
            </button>
            <button
              type="button"
              onClick={resetFilters}
              aria-label="Xóa bộ lọc"
              title="Xóa bộ lọc"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Staff Table View vs Storefront Grid View */}
        {isStaff ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131A26]">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  <th className="px-4 py-3">Ảnh</th>
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Hãng / Thông số</th>
                  <th className="px-4 py-3 text-right">Giá bán</th>
                  <th className="px-4 py-3 text-right">Tồn kho</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginated.items.length ? (
                  paginated.items.map((sp) => {
                    const eff = getEffectivePrice(sp);
                    return (
                      <tr
                        key={sp.ma}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-2.5">
                          <div className="h-12 w-14 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                            <ProductIllustration product={sp} compact cover />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                          {sp.ma}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => onOpenProductDetail(sp)}
                            className="text-left font-semibold text-slate-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-400"
                          >
                            {sp.ten}
                          </button>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {sp.loai === 'PHU_KIEN' ? 'Phụ kiện' : 'Điện thoại'}
                            {eff.isFlashSale ? ' · Flash Sale' : ''}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{sp.hang}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {getProductSpecs(sp).join(' · ') || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatVnd(eff.price)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          <span
                            className={
                              sp.ton === 0
                                ? 'font-semibold text-red-600 dark:text-red-400'
                                : sp.ton <= 5
                                  ? 'font-semibold text-amber-600 dark:text-amber-400'
                                  : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {sp.ton}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {canRestock && sp.ton <= 5 && (
                              <button
                                type="button"
                                onClick={onQuickRestock}
                                className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              >
                                Nhập thêm
                              </button>
                            )}
                            {canEditCatalog && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onOpenProductModal(sp)}
                                  aria-label={`Sửa ${sp.ten}`}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteProduct(sp)}
                                  aria-label={`Xóa ${sp.ten}`}
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                                >
                                  Xóa
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      Không tìm thấy sản phẩm phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : paginated.items.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.items.map((sp) => {
              const specs = getProductSpecs(sp);
              const eff = getEffectivePrice(sp);
              const rating = getProductRatingSummary(sp.ma, reviews);
              const isPhone = sp.loai === 'DIEN_THOAI';
              const isCompared = compareIds.includes(sp.ma);
              const qtyVal = qtyMap[sp.ma] ?? '1';
              const qtyErr = qtyErrors[sp.ma];

              return (
                <article
                  key={sp.ma}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#131A26]"
                >
                  {/* 4:3 Product Image Stage */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-[#192234]">
                    <button
                      type="button"
                      onClick={() => onOpenProductDetail(sp)}
                      aria-label={`Xem chi tiết ${sp.ten}`}
                      className="block h-full w-full text-left"
                    >
                      <ProductIllustration product={sp} cover />
                    </button>
                    {eff.isFlashSale ? (
                      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Flash Sale
                      </span>
                    ) : eff.hasDiscount ? (
                      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-blue-700 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Giảm 5%
                      </span>
                    ) : null}
                  </div>

                  {/* Clean Metadata & Actions */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {sp.hang} · {sp.loai === 'PHU_KIEN' ? 'Phụ kiện' : 'Điện thoại'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Star className="h-3 w-3 fill-current" />
                        {rating.count > 0 ? `${rating.average} (${rating.count})` : 'Mới'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenProductDetail(sp)}
                      className="mt-1.5 text-left font-display text-base font-semibold leading-snug text-slate-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-400"
                    >
                      {sp.ten}
                    </button>

                    <p className="mt-1 min-h-[20px] text-xs text-slate-500 dark:text-slate-400">
                      {specs.length ? specs.join(' · ') : 'Phụ kiện chính hãng'}
                    </p>

                    <div className="mt-3 flex items-baseline gap-2.5">
                      <span className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatVnd(eff.price)}
                      </span>
                      {eff.hasDiscount && (
                        <s className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                          {formatVnd(eff.originalPrice)}
                        </s>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-medium ${
                          sp.ton === 0
                            ? 'text-red-600 dark:text-red-400'
                            : sp.ton <= 5
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {sp.ton === 0
                          ? 'Hết hàng'
                          : sp.ton <= 5
                            ? `Sắp hết: còn ${sp.ton}`
                            : `Còn ${sp.ton} sản phẩm`}
                      </span>

                      {isPhone && (
                        <button
                          type="button"
                          onClick={() => onToggleCompare(sp)}
                          className={`inline-flex items-center gap-1 font-medium ${
                            isCompared
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          <GitCompareArrows className="h-3.5 w-3.5" />
                          {isCompared ? 'Đã chọn so sánh' : 'So sánh'}
                        </button>
                      )}
                    </div>

                    <div className="mt-auto pt-4">
                      {isCustomer ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <label className="sr-only" htmlFor={`qty-${sp.ma}`}>
                              Số lượng mua {sp.ten}
                            </label>
                            <input
                              id={`qty-${sp.ma}`}
                              type="text"
                              inputMode="numeric"
                              value={qtyVal}
                              disabled={sp.ton === 0}
                              onChange={(e) => {
                                setQtyMap((prev) => ({ ...prev, [sp.ma]: e.target.value }));
                                setQtyErrors((prev) => ({ ...prev, [sp.ma]: '' }));
                              }}
                              className="h-10 w-16 rounded-lg border border-slate-300 bg-white px-2.5 text-center font-mono text-sm tabular-nums text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
                            />
                            <button
                              type="button"
                              disabled={sp.ton === 0}
                              onClick={() => handleAddClick(sp)}
                              aria-label={`Thêm ${sp.ten} vào giỏ`}
                              className="h-10 flex-1 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white whitespace-nowrap hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                              {sp.ton === 0 ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
                            </button>
                          </div>
                          {qtyErr && (
                            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{qtyErr}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenProductDetail(sp)}
                            className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={onRequireLogin}
                            className="h-10 flex-1 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                          >
                            Đăng nhập mua
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-[#131A26]">
            <p className="font-display text-base font-semibold text-slate-800 dark:text-slate-200">
              Không tìm thấy sản phẩm phù hợp
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Thử thay đổi từ khóa, hãng hoặc khoảng giá để xem thêm kết quả.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}

        {/* Pagination Bar */}
        {paginated.totalItems > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>Hiển thị</span>
              <select
                aria-label="Số sản phẩm mỗi trang"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#131A26] dark:text-slate-100"
              >
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={12}>12</option>
              </select>
              <span className="font-mono tabular-nums">
                Trang {paginated.currentPage} / {paginated.totalPages}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={paginated.currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-[#131A26] dark:text-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: paginated.totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  className={`h-8 min-w-8 rounded-md px-2 font-mono text-xs font-semibold tabular-nums ${
                    pNum === paginated.currentPage
                      ? 'bg-blue-700 text-white dark:bg-blue-600'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#131A26] dark:text-slate-200'
                  }`}
                >
                  {pNum}
                </button>
              ))}
              <button
                type="button"
                disabled={paginated.currentPage >= paginated.totalPages}
                onClick={() => setPage((p) => Math.min(paginated.totalPages, p + 1))}
                aria-label="Trang sau"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-[#131A26] dark:text-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Sticky Compare Bar (when 1..3 phones selected) */}
      {!isStaff && compareIds.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-lg dark:border-slate-700 dark:bg-[#131A26]">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <GitCompareArrows className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <span>Đã chọn {compareIds.length}/3 điện thoại để so sánh</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearCompare}
              className="h-8 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Xóa chọn
            </button>
            <button
              type="button"
              disabled={compareIds.length < 2}
              onClick={onOpenCompareModal}
              className="h-8 rounded-md bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-45 dark:bg-blue-600"
            >
              So sánh ngay ({compareIds.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
