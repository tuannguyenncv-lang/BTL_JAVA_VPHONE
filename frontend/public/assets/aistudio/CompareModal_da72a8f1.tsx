import { Star } from 'lucide-react';
import type { Product, ProductReview, SafeUser } from '../types/vphone';
import {
  formatVnd,
  getEffectivePrice,
  getProductRatingSummary,
} from '../utils/vphoneLogic';
import { ModalShell } from './Modals';
import { ProductIllustration } from './ProductIllustration';

interface CompareModalProps {
  products: Product[];
  reviews: ProductReview[];
  user: SafeUser | null;
  onClose: () => void;
  onRemove: (ma: string) => void;
  onAddToCart: (product: Product, qty: number) => void;
}

export function CompareModal({
  products,
  reviews,
  user,
  onClose,
  onRemove,
  onAddToCart,
}: CompareModalProps) {
  const isCustomer = user?.vaiTro === 'KHACH_HANG';

  const rows: { label: string; render: (p: Product) => string }[] = [
    { label: 'Hãng sản xuất', render: (p) => p.hang },
    { label: 'Màu sắc', render: (p) => p.mauSac || '—' },
    { label: 'RAM / Bộ nhớ', render: (p) => (p.ram && p.boNho ? `${p.ram}GB / ${p.boNho}GB` : '—') },
    { label: 'Màn hình', render: (p) => p.manHinh || '—' },
    { label: 'Vi xử lý', render: (p) => p.chip || '—' },
    { label: 'Camera', render: (p) => p.camera || '—' },
    { label: 'Pin & Sạc', render: (p) => p.pin || '—' },
    { label: 'Tồn kho', render: (p) => (p.ton > 0 ? `Còn ${p.ton}` : 'Hết hàng') },
  ];

  return (
    <ModalShell title={`So sánh điện thoại (${products.length})`} onClose={onClose} wide>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="w-32 py-3 pr-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Thông số
              </th>
              {products.map((p) => {
                const eff = getEffectivePrice(p);
                const rating = getProductRatingSummary(p.ma, reviews);
                return (
                  <th key={p.ma} className="min-w-[160px] px-3 pb-4 align-top">
                    <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 dark:bg-[#192234]">
                      <ProductIllustration product={p} cover />
                    </div>
                    <p className="mt-2 font-display text-sm font-bold text-slate-900 dark:text-white">
                      {p.ten}
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-blue-700 dark:text-blue-400">
                      {formatVnd(eff.price)}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-normal text-amber-600 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-current" />
                      {rating.count > 0 ? `${rating.average} (${rating.count})` : 'Chưa đánh giá'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {isCustomer && (
                        <button
                          type="button"
                          disabled={p.ton === 0}
                          onClick={() => onAddToCart(p, 1)}
                          className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-45 dark:bg-blue-600"
                        >
                          Mua
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemove(p.ma)}
                        className="text-xs font-medium text-slate-500 underline hover:text-red-600 dark:text-slate-400"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-2.5 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {row.label}
                </td>
                {products.map((p) => (
                  <td key={`${row.label}-${p.ma}`} className="px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
