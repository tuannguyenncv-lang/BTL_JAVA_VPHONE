import { useMemo, useState, type FormEvent } from 'react';
import { PauseCircle, Pencil, PlayCircle, Plus, Tag, Trash2 } from 'lucide-react';
import type { ProductType, PromoCode, PromoType } from '../types/vphone';
import {
  formatVnd,
  validateNonNegativeNumber,
  validatePositiveNumber,
  validateRequired,
} from '../utils/vphoneLogic';

interface PromosViewProps {
  promos: PromoCode[];
  onSavePromo: (promo: PromoCode) => void;
  onTogglePromo: (code: string) => void;
  onDeletePromo: (promo: PromoCode) => void;
}

export function PromosView({
  promos,
  onSavePromo,
  onTogglePromo,
  onDeletePromo,
}: PromosViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [ma, setMa] = useState('');
  const [moTa, setMoTa] = useState('');
  const [loai, setLoai] = useState<PromoType>('PHAN_TRAM');
  const [giaTri, setGiaTri] = useState('10');
  const [donToiThieu, setDonToiThieu] = useState('1000000');
  const [apDungCho, setApDungCho] = useState<'ALL' | ProductType>('ALL');
  const [hanDung, setHanDung] = useState('2026-12-31');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const visible = useMemo(() => {
    if (statusFilter === 'ACTIVE') return promos.filter((p) => p.kichHoat);
    if (statusFilter === 'PAUSED') return promos.filter((p) => !p.kichHoat);
    return promos;
  }, [promos, statusFilter]);

  const clearErr = (k: string) => {
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
  };

  const startEdit = (p: PromoCode) => {
    setMa(p.ma);
    setMoTa(p.moTa);
    setLoai(p.loai);
    setGiaTri(String(p.giaTri));
    setDonToiThieu(String(p.donToiThieu));
    setApDungCho(p.apDungCho);
    setHanDung(p.hanDung);
    setErrors({});
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const valNum = Number(giaTri);
    const nextErr: Record<string, string> = {
      ma: validateRequired(ma),
      moTa: validateRequired(moTa),
      giaTri:
        validatePositiveNumber(giaTri, 'giá trị giảm') ||
        (loai === 'PHAN_TRAM' && valNum > 90 ? 'Giảm theo % tối đa 90%.' : ''),
      donToiThieu: validateNonNegativeNumber(donToiThieu),
      hanDung: validateRequired(hanDung),
    };
    setErrors(nextErr);
    if (Object.values(nextErr).some(Boolean)) return;

    onSavePromo({
      ma: ma.trim().toUpperCase(),
      moTa: moTa.trim(),
      loai,
      giaTri: Math.round(Number(giaTri)),
      donToiThieu: donToiThieu.trim() ? Math.round(Number(donToiThieu)) : 0,
      apDungCho,
      hanDung,
      kichHoat: true,
    });
    setMa('');
    setMoTa('');
    setGiaTri('10');
    setDonToiThieu('1000000');
  };

  const inputCls = (err?: string) =>
    `h-9 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
      err
        ? 'border-red-500 focus:ring-red-500/20'
        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/20 dark:border-slate-700'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mã giảm giá & Khuyến mãi
          </h1>
          <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
            {visible.length} mã
          </span>
        </div>

        <div
          role="group"
          aria-label="Lọc trạng thái mã"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-200/75 p-1 dark:bg-slate-800/90"
        >
          {(
            [
              ['ALL', 'Tất cả'],
              ['ACTIVE', 'Đang bật'],
              ['PAUSED', 'Tạm ngừng'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                statusFilter === val
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Create Promo Form */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4 dark:border-slate-800 dark:bg-[#131A26]">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Tạo mã khuyến mãi mới
            </h2>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mã voucher
              </label>
              <input
                type="text"
                value={ma}
                onChange={(e) => {
                  setMa(e.target.value.toUpperCase());
                  clearErr('ma');
                }}
                placeholder="VD: TET2026"
                className={`${inputCls(errors.ma)} font-mono uppercase`}
              />
              {errors.ma && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.ma}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mô tả ngắn
              </label>
              <input
                type="text"
                value={moTa}
                onChange={(e) => {
                  setMoTa(e.target.value);
                  clearErr('moTa');
                }}
                placeholder="Giảm 10% cho đơn từ 5 triệu"
                className={inputCls(errors.moTa)}
              />
              {errors.moTa && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.moTa}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hình thức giảm
                </label>
                <select
                  value={loai}
                  onChange={(e) => setLoai(e.target.value as PromoType)}
                  className={inputCls()}
                >
                  <option value="PHAN_TRAM">Phần trăm (%)</option>
                  <option value="SO_TIEN">Số tiền (VNĐ)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {loai === 'PHAN_TRAM' ? 'Mức giảm (%)' : 'Mức giảm (VNĐ)'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={giaTri}
                  onChange={(e) => {
                    setGiaTri(e.target.value);
                    clearErr('giaTri');
                  }}
                  className={`${inputCls(errors.giaTri)} font-mono`}
                />
                {errors.giaTri && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.giaTri}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Đơn tối thiểu
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={donToiThieu}
                  onChange={(e) => {
                    setDonToiThieu(e.target.value);
                    clearErr('donToiThieu');
                  }}
                  className={`${inputCls(errors.donToiThieu)} font-mono`}
                />
                {errors.donToiThieu && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.donToiThieu}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Áp dụng cho
                </label>
                <select
                  value={apDungCho}
                  onChange={(e) => setApDungCho(e.target.value as 'ALL' | ProductType)}
                  className={inputCls()}
                >
                  <option value="ALL">Toàn bộ đơn</option>
                  <option value="DIEN_THOAI">Điện thoại</option>
                  <option value="PHU_KIEN">Phụ kiện</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hạn sử dụng
              </label>
              <input
                type="date"
                value={hanDung}
                onChange={(e) => {
                  setHanDung(e.target.value);
                  clearErr('hanDung');
                }}
                className={`${inputCls(errors.hanDung)} font-mono`}
              />
              {errors.hanDung && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.hanDung}</p>
              )}
            </div>

            <button
              type="submit"
              className="mt-1 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Lưu mã giảm giá
            </button>
          </form>
        </section>

        {/* Promo List */}
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white lg:col-span-8 dark:border-slate-800 dark:bg-[#131A26]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Ưu đãi & Mô tả</th>
                <th className="px-4 py-3">Điều kiện</th>
                <th className="px-4 py-3">Hạn dùng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {visible.map((p) => (
                <tr key={p.ma} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                    {p.ma}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {p.loai === 'PHAN_TRAM' ? `Giảm ${p.giaTri}%` : `Giảm ${formatVnd(p.giaTri)}`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.moTa}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                    <p>Đơn từ {formatVnd(p.donToiThieu)}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {p.apDungCho === 'ALL'
                        ? 'Tất cả sản phẩm'
                        : p.apDungCho === 'DIEN_THOAI'
                          ? 'Chỉ điện thoại'
                          : 'Chỉ phụ kiện'}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {p.hanDung}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${
                        p.kichHoat
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {p.kichHoat ? 'Đang bật' : 'Tạm ngừng'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        title="Sửa mã khuyến mãi"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5 text-blue-600" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePromo(p.ma)}
                        title={p.kichHoat ? 'Tạm ngừng mã' : 'Kích hoạt mã'}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {p.kichHoat ? (
                          <>
                            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                            Tắt
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Bật
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePromo(p)}
                        aria-label={`Xóa mã ${p.ma}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
