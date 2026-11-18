import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type {
  Order,
  Product,
  ProductType,
  Supplier,
  User,
  UserRole,
  UserStatus,
} from '../types/vphone';
import { formatVnd } from '../utils/vphoneLogic';
import { VPHONE_BANK_INFO, buildPaymentQrMemo } from '../utils/qrPayload';
import {
  validateEmail,
  validateImageUrl,
  validateInteger,
  validatePhone,
  validatePositiveNumber,
  validateRequired,
} from '../utils/vphoneLogic';

interface ModalShellProps {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}

export function ModalShell({ title, onClose, wide = false, children }: ModalShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="no-print fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#131A26]`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  span2?: boolean;
  children: ReactNode;
}

function FormField({ label, error, span2, children }: FieldProps) {
  return (
    <label
      className={`flex flex-col gap-1.5 text-sm text-slate-600 dark:text-slate-300 ${
        span2 ? 'sm:col-span-2' : ''
      }`}
    >
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      <span aria-live="polite" className="min-h-[16px] text-xs text-red-600 dark:text-red-400">
        {error || ''}
      </span>
    </label>
  );
}

const inputCls = (hasErr?: string) =>
  `h-10 w-full rounded-lg border px-3 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 dark:bg-[#0B0F17] dark:text-slate-100 ${
    hasErr
      ? 'border-red-500 focus:ring-red-500/25'
      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20 dark:border-slate-700 dark:focus:border-blue-500'
  }`;

/* ---------------- Auth Modal ---------------- */

interface AuthModalProps {
  onClose: () => void;
  onLogin: (email: string, matKhau: string) => Promise<void> | void;
  onGoogleLogin: () => Promise<void>;
  onRegister: (data: {
    hoTen: string;
    email: string;
    matKhau: string;
    sdt: string;
    diaChi: string;
  }) => Promise<void> | void;
}

function GoogleLogoMark() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.09.73-2.48 1.16-4.22 1.16-3.24 0-5.99-2.19-6.97-5.13H1.03v3.14C3.04 21.14 7.23 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.03 14.02A7.18 7.18 0 0 1 4.65 12c0-.7.13-1.39.38-2.02V6.84H1.03A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.03 5.16l4-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.23 0 3.04 2.86 1.03 6.84l4 3.14c.98-2.94 3.73-5.23 6.97-5.23Z"
      />
    </svg>
  );
}

export function AuthModal({ onClose, onLogin, onGoogleLogin, onRegister }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'reg'>('login');
  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [hoTen, setHoTen] = useState('');
  const [sdt, setSdt] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [googlePending, setGooglePending] = useState(false);

  const handleGoogleClick = async () => {
    setErrors({});
    setGooglePending(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Đăng nhập bằng Google thất bại.',
      });
    } finally {
      setGooglePending(false);
    }
  };

  const clearErr = (k: string) => {
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const nextErr: Record<string, string> = {
      email: validateEmail(email),
      matKhau: validateRequired(matKhau),
    };
    setErrors(nextErr);
    if (nextErr.email || nextErr.matKhau) return;
    try {
      await onLogin(email, matKhau);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Đăng nhập thất bại.' });
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const nextErr: Record<string, string> = {
      hoTen: validateRequired(hoTen),
      email: validateEmail(email),
      matKhau: validateRequired(matKhau),
      sdt: validatePhone(sdt),
    };
    setErrors(nextErr);
    if (Object.values(nextErr).some(Boolean)) return;
    try {
      await onRegister({ hoTen, email, matKhau, sdt, diaChi });
      setTab('login');
      setErrors({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại.';
      setErrors({ email: msg });
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setMatKhau(demoPass);
    setErrors({});
  };

  return (
    <ModalShell title="Tài khoản VPHONE" onClose={onClose}>
      <div
        role="tablist"
        aria-label="Chế độ tài khoản"
        className="mb-5 flex border-b border-slate-200 dark:border-slate-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'login'}
          onClick={() => {
            setTab('login');
            setErrors({});
          }}
          className={`border-b-2 px-4 pb-2.5 text-sm font-semibold whitespace-nowrap ${
            tab === 'login'
              ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'reg'}
          onClick={() => {
            setTab('reg');
            setErrors({});
          }}
          className={`border-b-2 px-4 pb-2.5 text-sm font-semibold whitespace-nowrap ${
            tab === 'reg'
              ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Đăng ký khách hàng
        </button>
      </div>

      {tab === 'login' ? (
        <form onSubmit={handleLogin} noValidate className="space-y-3">
          {errors.form && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {errors.form}
            </p>
          )}

          <FormField label="Email" error={errors.email}>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearErr('email');
              }}
              placeholder="email@vphone.vn"
              autoComplete="username"
              className={inputCls(errors.email)}
            />
          </FormField>

          <FormField label="Mật khẩu (lưu dạng mã hóa SHA-256)" error={errors.matKhau}>
            <input
              type="password"
              value={matKhau}
              onChange={(e) => {
                setMatKhau(e.target.value);
                clearErr('matKhau');
              }}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              className={inputCls(errors.matKhau)}
            />
          </FormField>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Đăng nhập
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Họ tên" error={errors.hoTen} span2>
            <input
              type="text"
              value={hoTen}
              onChange={(e) => {
                setHoTen(e.target.value);
                clearErr('hoTen');
              }}
              className={inputCls(errors.hoTen)}
            />
          </FormField>
          <FormField label="Email" error={errors.email}>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearErr('email');
              }}
              className={inputCls(errors.email)}
            />
          </FormField>
          <FormField label="Mật khẩu" error={errors.matKhau}>
            <input
              type="password"
              value={matKhau}
              onChange={(e) => {
                setMatKhau(e.target.value);
                clearErr('matKhau');
              }}
              className={inputCls(errors.matKhau)}
            />
          </FormField>
          <FormField label="Số điện thoại" error={errors.sdt}>
            <input
              type="text"
              value={sdt}
              onChange={(e) => {
                setSdt(e.target.value);
                clearErr('sdt');
              }}
              className={inputCls(errors.sdt)}
            />
          </FormField>
          <FormField label="Địa chỉ" error={errors.diaChi}>
            <input
              type="text"
              value={diaChi}
              onChange={(e) => setDiaChi(e.target.value)}
              className={inputCls()}
            />
          </FormField>
          <div className="flex justify-end gap-2.5 pt-2 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Đăng ký
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

/* ---------------- User Add / Edit RBAC Modal ---------------- */

export interface UserSavePayload {
  isEdit: boolean;
  ma?: string;
  hoTen: string;
  email: string;
  matKhau?: string;
  sdt: string;
  vaiTro: UserRole;
  trangThai: UserStatus;
  diaChi?: string;
  chucVu?: string;
}

interface UserModalProps {
  user: User | null;
  currentAdminMa?: string;
  onClose: () => void;
  onSave: (payload: UserSavePayload) => void;
}

export function UserModal({ user, currentAdminMa, onClose, onSave }: UserModalProps) {
  const isEdit = !!user;
  const isSelf = isEdit && user.ma === currentAdminMa;

  const [hoTen, setHoTen] = useState(user?.hoTen || '');
  const [email, setEmail] = useState(user?.email || '');
  const [matKhau, setMatKhau] = useState('');
  const [sdt, setSdt] = useState(user?.sdt || '');
  const [vaiTro, setVaiTro] = useState<UserRole>(user?.vaiTro || 'KHACH_HANG');
  const [trangThai, setTrangThai] = useState<UserStatus>(user?.trangThai || 'HOAT_DONG');
  const [diaChi, setDiaChi] = useState(user?.diaChi || '');
  const [chucVu, setChucVu] = useState(user?.chucVu || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErr = (k: string) => {
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const passErr = isEdit
      ? matKhau.trim() && matKhau.trim().length < 6
        ? 'Mật khẩu mới phải có ít nhất 6 ký tự.'
        : ''
      : !matKhau.trim()
        ? 'Vui lòng nhập mật khẩu.'
        : matKhau.trim().length < 6
          ? 'Mật khẩu phải có ít nhất 6 ký tự.'
          : '';

    const nextErr: Record<string, string> = {
      hoTen: validateRequired(hoTen),
      email: validateEmail(email),
      matKhau: passErr,
      sdt: validatePhone(sdt),
    };
    setErrors(nextErr);
    if (Object.values(nextErr).some(Boolean)) return;

    try {
      onSave({
        isEdit,
        ma: user?.ma,
        hoTen,
        email,
        matKhau: matKhau.trim() || undefined,
        sdt,
        vaiTro,
        trangThai,
        diaChi: vaiTro === 'KHACH_HANG' ? diaChi : undefined,
        chucVu: vaiTro !== 'KHACH_HANG' ? chucVu : undefined,
      });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Không thể lưu tài khoản.' });
    }
  };

  return (
    <ModalShell
      title={isEdit ? `Cập nhật người dùng ${user.ma}` : 'Thêm người dùng & Phân quyền'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {errors.form && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:col-span-2 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {errors.form}
          </p>
        )}

        <FormField label="Họ và tên" error={errors.hoTen} span2>
          <input
            type="text"
            value={hoTen}
            onChange={(e) => {
              setHoTen(e.target.value);
              clearErr('hoTen');
            }}
            placeholder="Nguyễn Văn A"
            className={inputCls(errors.hoTen)}
          />
        </FormField>

        <FormField label="Email đăng nhập" error={errors.email}>
          <input
            type="email"
            value={email}
            disabled={isEdit && user?.authProvider === 'GOOGLE'}
            onChange={(e) => {
              setEmail(e.target.value);
              clearErr('email');
            }}
            placeholder="nhanvien@vphone.vn"
            className={inputCls(errors.email)}
          />
        </FormField>

        <FormField label="Số điện thoại" error={errors.sdt}>
          <input
            type="text"
            value={sdt}
            onChange={(e) => {
              setSdt(e.target.value);
              clearErr('sdt');
            }}
            placeholder="0901 234 567"
            className={inputCls(errors.sdt)}
          />
        </FormField>

        <FormField label="Vai trò (RBAC)">
          <select
            value={vaiTro}
            disabled={isSelf}
            onChange={(e) => setVaiTro(e.target.value as UserRole)}
            className={inputCls()}
          >
            <option value="KHACH_HANG">Khách hàng</option>
            <option value="NHAN_VIEN_BAN_HANG">Nhân viên bán hàng</option>
            <option value="THU_KHO">Thủ kho</option>
            <option value="QUAN_TRI">Quản trị viên</option>
          </select>
        </FormField>

        <FormField label="Trạng thái tài khoản">
          <select
            value={trangThai}
            disabled={isSelf}
            onChange={(e) => setTrangThai(e.target.value as UserStatus)}
            className={inputCls()}
          >
            <option value="HOAT_DONG">Đang hoạt động</option>
            <option value="BI_KHOA">Khóa tài khoản</option>
          </select>
        </FormField>

        <FormField
          label={isEdit ? 'Đặt lại mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu (băm SHA-256)'}
          error={errors.matKhau}
          span2
        >
          <input
            type="password"
            value={matKhau}
            onChange={(e) => {
              setMatKhau(e.target.value);
              clearErr('matKhau');
            }}
            placeholder={isEdit ? 'Nhập mật khẩu mới nếu muốn đổi' : 'Tối thiểu 6 ký tự'}
            className={inputCls(errors.matKhau)}
          />
        </FormField>

        {vaiTro === 'KHACH_HANG' ? (
          <FormField label="Địa chỉ giao hàng" span2>
            <input
              type="text"
              value={diaChi}
              onChange={(e) => setDiaChi(e.target.value)}
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
              className={inputCls()}
            />
          </FormField>
        ) : (
          <FormField label="Chức vụ / Bộ phận" span2>
            <input
              type="text"
              value={chucVu}
              onChange={(e) => setChucVu(e.target.value)}
              placeholder="VD: Chuyên viên bán hàng / Thủ kho"
              className={inputCls()}
            />
          </FormField>
        )}

        {isSelf && (
          <p className="text-xs text-amber-700 sm:col-span-2 dark:text-amber-400">
            Đang sửa tài khoản quản trị hiện tại: không thể tự hạ quyền hoặc tự khóa.
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-2 sm:col-span-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------------- Product Add / Edit Modal ---------------- */

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (payload: {
    isEdit: boolean;
    ma: string;
    ten: string;
    hang: string;
    loai: ProductType;
    gia: number;
    ton: number;
    ram?: number;
    boNho?: number;
    mauSac?: string;
    loaiPhuKien?: string;
    anh?: string;
    flashSaleGia?: number;
    manHinh?: string;
    chip?: string;
    camera?: string;
    pin?: string;
  }) => void;
}

export function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const isEdit = !!product;
  const [loai, setLoai] = useState<ProductType>(product?.loai || 'DIEN_THOAI');
  const [ma, setMa] = useState(product?.ma || '');
  const [ten, setTen] = useState(product?.ten || '');
  const [hang, setHang] = useState(product?.hang || '');
  const [gia, setGia] = useState(product ? String(product.gia) : '');
  const [flashSaleGia, setFlashSaleGia] = useState(
    product?.flashSaleGia ? String(product.flashSaleGia) : '',
  );
  const [ton, setTon] = useState(product ? String(product.ton) : '');
  const [ram, setRam] = useState(product?.ram != null ? String(product.ram) : '');
  const [boNho, setBoNho] = useState(product?.boNho != null ? String(product.boNho) : '');
  const [mauSac, setMauSac] = useState(product?.mauSac || '');
  const [loaiPhuKien, setLoaiPhuKien] = useState(product?.loaiPhuKien || '');
  const [manHinh, setManHinh] = useState(product?.manHinh || '');
  const [chip, setChip] = useState(product?.chip || '');
  const [anh, setAnh] = useState(product?.anh || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErr = (k: string) => {
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErr: Record<string, string> = {
      ma: isEdit ? '' : validateRequired(ma),
      ten: validateRequired(ten),
      hang: validateRequired(hang),
      gia: validatePositiveNumber(gia, 'giá'),
      ton: validateInteger(ton, 0),
      anh: validateImageUrl(anh),
    };
    if (flashSaleGia.trim()) {
      const fErr = validatePositiveNumber(flashSaleGia, 'giá Flash Sale');
      if (fErr) nextErr.flashSaleGia = fErr;
      else if (Number(flashSaleGia) >= Number(gia)) {
        nextErr.flashSaleGia = 'Giá Flash Sale phải nhỏ hơn giá niêm yết.';
      }
    }
    if (loai === 'DIEN_THOAI') {
      nextErr.ram = validateInteger(ram, 1);
      nextErr.boNho = validateInteger(boNho, 1);
    }
    setErrors(nextErr);
    if (Object.values(nextErr).some(Boolean)) return;

    try {
      onSave({
        isEdit,
        ma,
        ten,
        hang,
        loai,
        gia: Number(gia),
        ton: Number(ton),
        ram: loai === 'DIEN_THOAI' ? Number(ram) : undefined,
        boNho: loai === 'DIEN_THOAI' ? Number(boNho) : undefined,
        mauSac: loai === 'DIEN_THOAI' ? mauSac : undefined,
        loaiPhuKien: loai === 'PHU_KIEN' ? loaiPhuKien : undefined,
        anh,
        flashSaleGia: flashSaleGia.trim() ? Number(flashSaleGia) : undefined,
        manHinh: loai === 'DIEN_THOAI' ? manHinh : undefined,
        chip: loai === 'DIEN_THOAI' ? chip : undefined,
      });
    } catch (err) {
      setErrors({ ma: err instanceof Error ? err.message : 'Không thể lưu sản phẩm.' });
    }
  };

  return (
    <ModalShell title={isEdit ? `Sửa sản phẩm ${product.ma}` : 'Thêm sản phẩm mới'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Loại">
          <select
            value={loai}
            disabled={isEdit}
            onChange={(e) => setLoai(e.target.value as ProductType)}
            className={inputCls()}
          >
            <option value="DIEN_THOAI">Điện thoại</option>
            <option value="PHU_KIEN">Phụ kiện</option>
          </select>
        </FormField>

        <FormField label="Mã sản phẩm" error={errors.ma}>
          <input
            type="text"
            value={ma}
            disabled={isEdit}
            onChange={(e) => {
              setMa(e.target.value);
              clearErr('ma');
            }}
            placeholder="DT07"
            className={inputCls(errors.ma)}
          />
        </FormField>

        <FormField label="Tên sản phẩm" error={errors.ten} span2>
          <input
            type="text"
            value={ten}
            onChange={(e) => {
              setTen(e.target.value);
              clearErr('ten');
            }}
            className={inputCls(errors.ten)}
          />
        </FormField>

        <FormField label="Hãng" error={errors.hang}>
          <input
            type="text"
            value={hang}
            onChange={(e) => {
              setHang(e.target.value);
              clearErr('hang');
            }}
            className={inputCls(errors.hang)}
          />
        </FormField>

        <FormField label="Số lượng tồn" error={errors.ton}>
          <input
            type="text"
            inputMode="numeric"
            value={ton}
            onChange={(e) => {
              setTon(e.target.value);
              clearErr('ton');
            }}
            className={inputCls(errors.ton)}
          />
        </FormField>

        <FormField label="Giá niêm yết (₫)" error={errors.gia}>
          <input
            type="text"
            inputMode="decimal"
            value={gia}
            onChange={(e) => {
              setGia(e.target.value);
              clearErr('gia');
            }}
            className={inputCls(errors.gia)}
          />
        </FormField>

        <FormField label="Giá Flash Sale (nếu có)" error={errors.flashSaleGia}>
          <input
            type="text"
            inputMode="decimal"
            value={flashSaleGia}
            onChange={(e) => {
              setFlashSaleGia(e.target.value);
              clearErr('flashSaleGia');
            }}
            placeholder="Để trống nếu không sale"
            className={inputCls(errors.flashSaleGia)}
          />
        </FormField>

        {loai === 'DIEN_THOAI' ? (
          <>
            <FormField label="RAM (GB)" error={errors.ram}>
              <input
                type="text"
                inputMode="numeric"
                value={ram}
                onChange={(e) => {
                  setRam(e.target.value);
                  clearErr('ram');
                }}
                className={inputCls(errors.ram)}
              />
            </FormField>
            <FormField label="Bộ nhớ (GB)" error={errors.boNho}>
              <input
                type="text"
                inputMode="numeric"
                value={boNho}
                onChange={(e) => {
                  setBoNho(e.target.value);
                  clearErr('boNho');
                }}
                className={inputCls(errors.boNho)}
              />
            </FormField>
            <FormField label="Màu sắc">
              <input
                type="text"
                value={mauSac}
                onChange={(e) => setMauSac(e.target.value)}
                className={inputCls()}
              />
            </FormField>
            <FormField label="Vi xử lý (Chip)">
              <input
                type="text"
                value={chip}
                onChange={(e) => setChip(e.target.value)}
                className={inputCls()}
              />
            </FormField>
            <FormField label="Màn hình" span2>
              <input
                type="text"
                value={manHinh}
                onChange={(e) => setManHinh(e.target.value)}
                className={inputCls()}
              />
            </FormField>
          </>
        ) : (
          <FormField label="Loại phụ kiện" span2>
            <input
              type="text"
              value={loaiPhuKien}
              onChange={(e) => setLoaiPhuKien(e.target.value)}
              className={inputCls()}
            />
          </FormField>
        )}

        <FormField label="Đường dẫn ảnh (không bắt buộc)" error={errors.anh} span2>
          <input
            type="url"
            value={anh}
            onChange={(e) => {
              setAnh(e.target.value);
              clearErr('anh');
            }}
            placeholder="https://... hoặc /src/assets/images/..."
            className={inputCls(errors.anh)}
          />
        </FormField>

        <div className="flex justify-end gap-2.5 pt-2 sm:col-span-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Lưu
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------------- Supplier Edit Modal ---------------- */

interface SupplierModalProps {
  supplier: Supplier;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
}

export function SupplierModal({ supplier, onClose, onSave }: SupplierModalProps) {
  const [ten, setTen] = useState(supplier.ten);
  const [diaChi, setDiaChi] = useState(supplier.diaChi);
  const [sdt, setSdt] = useState(supplier.sdt);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErr = {
      ten: validateRequired(ten),
      sdt: validatePhone(sdt),
    };
    setErrors(nextErr);
    if (nextErr.ten || nextErr.sdt) return;
    onSave({ ma: supplier.ma, ten, diaChi, sdt });
  };

  return (
    <ModalShell title={`Sửa nhà cung cấp ${supplier.ma}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Tên nhà cung cấp" error={errors.ten} span2>
          <input
            type="text"
            value={ten}
            onChange={(e) => {
              setTen(e.target.value);
              setErrors((p) => ({ ...p, ten: '' }));
            }}
            className={inputCls(errors.ten)}
          />
        </FormField>
        <FormField label="Địa chỉ">
          <input
            type="text"
            value={diaChi}
            onChange={(e) => setDiaChi(e.target.value)}
            className={inputCls()}
          />
        </FormField>
        <FormField label="Số điện thoại" error={errors.sdt}>
          <input
            type="text"
            value={sdt}
            onChange={(e) => {
              setSdt(e.target.value);
              setErrors((p) => ({ ...p, sdt: '' }));
            }}
            className={inputCls(errors.sdt)}
          />
        </FormField>
        <div className="flex justify-end gap-2.5 pt-2 sm:col-span-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="h-10 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Lưu
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------------- Confirm Modal ---------------- */

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Xóa',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-6 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

/* ---------------- Cancel Order Reason Modal ---------------- */

interface CancelOrderModalProps {
  order: Order;
  isStaff: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const CUSTOMER_CANCEL_REASONS = [
  'Đổi ý, không muốn mua nữa',
  'Muốn đổi sản phẩm / cấu hình khác',
  'Đặt nhầm phương thức thanh toán',
  'Tìm được ưu đãi phù hợp hơn',
];

const STAFF_CANCEL_REASONS = [
  'Khách hàng yêu cầu hủy đơn',
  'Quá hạn nhưng chưa nhận được chuyển khoản',
  'Sản phẩm tạm hết hàng khi kiểm kho',
  'Thông tin người nhận không liên hệ được',
];

export function CancelOrderModal({
  order,
  isStaff,
  onConfirm,
  onCancel,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const presets = isStaff ? STAFF_CANCEL_REASONS : CUSTOMER_CANCEL_REASONS;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Vui lòng nhập lý do hủy đơn (tối thiểu 3 ký tự).');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <ModalShell title={`Hủy đơn hàng ${order.ma}`} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Khi xác nhận hủy đơn <strong>{order.ma}</strong>, số lượng sản phẩm sẽ được hoàn lại về kho. Vui lòng cho biết lý do hủy đơn:
        </p>

        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setReason(preset);
                setError('');
              }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                reason === preset
                  ? 'border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <FormField label="Lý do hủy đơn *" error={error}>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder="Nhập lý do cụ thể khi hủy đơn hàng..."
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 dark:bg-[#0B0F17] dark:text-slate-100 ${
              error
                ? 'border-red-500 focus:ring-red-500/25'
                : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20 dark:border-slate-700 dark:focus:border-blue-500'
            }`}
          />
        </FormField>

        <div className="flex justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Quay lại
          </button>
          <button
            type="submit"
            className="h-10 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Xác nhận hủy đơn
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------------- Verify Payment Modal (Admin / Staff) ---------------- */

interface VerifyPaymentModalProps {
  order: Order;
  onConfirm: (maGiaoDich: string) => void;
  onClose: () => void;
}

export function VerifyPaymentModal({
  order,
  onConfirm,
  onClose,
}: VerifyPaymentModalProps) {
  const expectedMemo = buildPaymentQrMemo(order.ma);
  const [maGiaoDich, setMaGiaoDich] = useState(order.maGiaoDich || `CK-${order.ma}`);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(maGiaoDich.trim() || `CK-${order.ma}`);
  };

  return (
    <ModalShell title={`Đối soát chuyển khoản · Đơn ${order.ma}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Khách hàng:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {order.khach} ({order.maKhach})
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Số tiền cần nhận:</span>
            <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400">
              {formatVnd(order.tong)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Nội dung CK khớp đơn:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {expectedMemo}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">Tài khoản nhận:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {VPHONE_BANK_INFO.bankName} · {VPHONE_BANK_INFO.accountNumber}
            </span>
          </div>
          {order.ngayBaoChuyenKhoan && (
            <div className="flex justify-between gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
              <span className="text-amber-700 dark:text-amber-400">Khách báo CK lúc:</span>
              <span className="font-mono text-amber-700 dark:text-amber-400">
                {order.ngayBaoChuyenKhoan}
              </span>
            </div>
          )}
        </div>

        <FormField label="Mã giao dịch đối soát (tự điền nếu chạy thử)">
          <input
            type="text"
            value={maGiaoDich}
            onChange={(e) => setMaGiaoDich(e.target.value)}
            placeholder={`VD: VCB-FT263201849 hoặc CK-${order.ma}`}
            className={inputCls()}
          />
        </FormField>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Kiểm tra biến động số dư ngân hàng / ví đúng số tiền{' '}
          <strong className="text-slate-700 dark:text-slate-200">{formatVnd(order.tong)}</strong>{' '}
          với nội dung <strong className="font-mono">{expectedMemo}</strong> trước khi xác nhận.
        </p>

        <div className="flex justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
          <button
            type="submit"
            className="h-10 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Xác nhận đã nhận tiền
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
