import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ImportReceipt, Product, Supplier } from '../types/vphone';
import {
  formatVnd,
  validateInteger,
  validatePhone,
  validatePositiveNumber,
  validateRequired,
} from '../utils/vphoneLogic';

interface ImportViewProps {
  suppliers: Supplier[];
  products: Product[];
  receipts: ImportReceipt[];
  onAddSupplier: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
  onCreateReceipt: (
    maNCC: string,
    lines: { ma: string; soLuong: number; giaNhap: number }[],
  ) => void;
}

interface DraftLine {
  id: string;
  ma: string;
  soLuong: string;
  giaNhap: string;
  slErr?: string;
  giaErr?: string;
}

export function ImportView({
  suppliers,
  products,
  receipts,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onCreateReceipt,
}: ImportViewProps) {
  // Supplier create form
  const [ma, setMa] = useState('');
  const [ten, setTen] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [sdt, setSdt] = useState('');
  const [supErr, setSupErr] = useState<Record<string, string>>({});

  // Import receipt builder
  const [selectedSupplier, setSelectedSupplier] = useState(suppliers[0]?.ma || '');
  const [lines, setLines] = useState<DraftLine[]>([
    { id: 'row-1', ma: products[0]?.ma || '', soLuong: '', giaNhap: '' },
  ]);

  const handleAddSupplier = (e: FormEvent) => {
    e.preventDefault();
    const errs = {
      ma: validateRequired(ma),
      ten: validateRequired(ten),
      sdt: validatePhone(sdt),
    };
    setSupErr(errs);
    if (errs.ma || errs.ten || errs.sdt) return;
    try {
      onAddSupplier({ ma, ten, diaChi, sdt });
      setMa('');
      setTen('');
      setDiaChi('');
      setSdt('');
      setSupErr({});
    } catch (err) {
      setSupErr({ ma: err instanceof Error ? err.message : 'Không thể thêm nhà cung cấp.' });
    }
  };

  const addDraftLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ma: products[0]?.ma || '',
        soLuong: '',
        giaNhap: '',
      },
    ]);
  };

  const handleSubmitReceipt = (e: FormEvent) => {
    e.preventDefault();
    let hasErr = false;
    const validated = lines.map((line) => {
      const slErr = validateInteger(line.soLuong, 1);
      const giaErr = validatePositiveNumber(line.giaNhap, 'giá nhập');
      if (slErr || giaErr) hasErr = true;
      return { ...line, slErr, giaErr };
    });
    setLines(validated);
    if (hasErr || !selectedSupplier) return;

    onCreateReceipt(
      selectedSupplier,
      validated.map((l) => ({
        ma: l.ma,
        soLuong: Number(l.soLuong),
        giaNhap: Number(l.giaNhap),
      })),
    );
    setLines([{ id: `row-${Date.now()}`, ma: products[0]?.ma || '', soLuong: '', giaNhap: '' }]);
  };

  return (
    <div className="space-y-8">
      {/* Suppliers Section */}
      <section className="space-y-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Nhà cung cấp & Nhập hàng
        </h1>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131A26]">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tên nhà cung cấp</th>
                <th className="px-4 py-3">Địa chỉ</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {suppliers.map((s) => (
                <tr key={s.ma} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {s.ma}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.ten}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.diaChi || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    {s.sdt || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEditSupplier(s)}
                        aria-label={`Sửa ${s.ten}`}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSupplier(s)}
                        aria-label={`Xóa ${s.ten}`}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inline Add Supplier Bar */}
        <form
          onSubmit={handleAddSupplier}
          noValidate
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-12 dark:border-slate-800 dark:bg-[#131A26]"
        >
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Mã NCC
            </label>
            <input
              type="text"
              value={ma}
              onChange={(e) => {
                setMa(e.target.value);
                setSupErr((p) => ({ ...p, ma: '' }));
              }}
              placeholder="NCC03"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            />
            {supErr.ma && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{supErr.ma}</p>}
          </div>
          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Tên nhà cung cấp
            </label>
            <input
              type="text"
              value={ten}
              onChange={(e) => {
                setTen(e.target.value);
                setSupErr((p) => ({ ...p, ten: '' }));
              }}
              placeholder="Tên đơn vị cung cấp"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            />
            {supErr.ten && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{supErr.ten}</p>}
          </div>
          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Địa chỉ
            </label>
            <input
              type="text"
              value={diaChi}
              onChange={(e) => setDiaChi(e.target.value)}
              placeholder="Địa chỉ"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Số điện thoại
            </label>
            <input
              type="text"
              value={sdt}
              onChange={(e) => {
                setSdt(e.target.value);
                setSupErr((p) => ({ ...p, sdt: '' }));
              }}
              placeholder="024 3xxx xxxx"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            />
            {supErr.sdt && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{supErr.sdt}</p>}
          </div>
          <div className="flex items-end lg:col-span-2">
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Thêm NCC
            </button>
          </div>
        </form>
      </section>

      {/* Create Import Receipt */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Lập phiếu nhập hàng
        </h2>

        <form
          onSubmit={handleSubmitReceipt}
          noValidate
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131A26]"
        >
          <div className="max-w-md">
            <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Nhà cung cấp
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            >
              {suppliers.map((s) => (
                <option key={s.ma} value={s.ma}>
                  {s.ma} - {s.ten}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, index) => (
              <div
                key={line.id}
                className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <select
                    aria-label={`Sản phẩm dòng ${index + 1}`}
                    value={line.ma}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((r) => (r.id === line.id ? { ...r, ma: e.target.value } : r)),
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
                  >
                    {products.map((p) => (
                      <option key={p.ma} value={p.ma}>
                        {p.ma} - {p.ten}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Số lượng"
                    aria-label={`Số lượng dòng ${index + 1}`}
                    value={line.soLuong}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((r) =>
                          r.id === line.id ? { ...r, soLuong: e.target.value, slErr: '' } : r,
                        ),
                      )
                    }
                    className={`h-10 w-full rounded-lg border px-3 text-sm tabular-nums bg-white text-slate-900 focus:outline-none dark:bg-[#0B0F17] dark:text-slate-100 ${
                      line.slErr ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {line.slErr && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{line.slErr}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Giá nhập (₫)"
                    aria-label={`Giá nhập dòng ${index + 1}`}
                    value={line.giaNhap}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((r) =>
                          r.id === line.id ? { ...r, giaNhap: e.target.value, giaErr: '' } : r,
                        ),
                      )
                    }
                    className={`h-10 w-full rounded-lg border px-3 text-sm tabular-nums bg-white text-slate-900 focus:outline-none dark:bg-[#0B0F17] dark:text-slate-100 ${
                      line.giaErr ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {line.giaErr && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{line.giaErr}</p>
                  )}
                </div>

                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="button"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((r) => r.id !== line.id))}
                    aria-label={`Xóa dòng ${index + 1}`}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={addDraftLine}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm dòng
            </button>

            <button
              type="submit"
              className="h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Lập phiếu nhập
            </button>
          </div>
        </form>
      </section>

      {/* Receipt History */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Các phiếu nhập đã lập
        </h2>

        {!receipts.length ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-[#131A26] dark:text-slate-400">
            Chưa có phiếu nhập nào.
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((pn) => (
              <div
                key={pn.ma}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#131A26]"
              >
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    Phiếu {pn.ma}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{pn.ngay}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    NCC: {pn.ncc}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                        <th className="px-3.5 py-2.5">Sản phẩm</th>
                        <th className="px-3.5 py-2.5 text-right">SL nhập</th>
                        <th className="px-3.5 py-2.5 text-right">Giá nhập</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {pn.chiTiet.map((line, i) => (
                        <tr key={`${pn.ma}-${line.ma}-${i}`}>
                          <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {line.ten}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {line.soLuong}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {formatVnd(line.giaNhap)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex justify-end">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Tổng tiền nhập:{' '}
                    <span className="ml-1 font-mono text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">
                      {formatVnd(pn.tong)}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
