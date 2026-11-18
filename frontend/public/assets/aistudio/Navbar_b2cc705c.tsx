import { Moon, Sun } from 'lucide-react';
import type { SafeUser, ViewId } from '../types/vphone';
import { canAccessView, ROLE_LABELS } from '../utils/vphoneLogic';

interface NavbarProps {
  user: SafeUser | null;
  activeView: ViewId;
  cartCount: number;
  isDark: boolean;
  onNavigate: (view: ViewId) => void;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  activeView,
  cartCount,
  isDark,
  onNavigate,
  onToggleTheme,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  const role = user?.vaiTro;

  const allTabs: { id: ViewId; label: string; count?: number }[] = [
    { id: 'sanpham', label: 'Sản phẩm' },
    { id: 'gio', label: 'Giỏ hàng', count: cartCount },
    { id: 'thongke', label: 'Thống kê' },
    { id: 'donhang', label: role === 'KHACH_HANG' ? 'Đơn của tôi' : 'Đơn hàng' },
    { id: 'khuyenmai', label: 'Khuyến mãi' },
    { id: 'nhaphang', label: 'Nhập hàng' },
    { id: 'nguoidung', label: 'Người dùng' },
    { id: 'oracle', label: 'Oracle SQL' },
  ];

  const navItems = allTabs.filter((t) => canAccessView(role, t.id));
  const homeView: ViewId =
    role === 'QUAN_TRI' || role === 'NHAN_VIEN_BAN_HANG'
      ? 'thongke'
      : role === 'THU_KHO'
        ? 'nhaphang'
        : 'sanpham';

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0B0F17]/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        {/* Zone 1: Brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate(homeView);
          }}
          className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 dark:text-white"
        >
          VPHONE
        </a>

        {/* Zone 2: Clean single-line text navigation */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden h-16 md:flex items-center gap-5 overflow-x-auto overflow-y-hidden"
        >
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative flex h-full items-center text-sm font-medium whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
                  active
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="ml-1 font-mono text-xs font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                    ({item.count})
                  </span>
                )}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700 dark:bg-blue-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme switch + account action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.hoTen}
                  referrerPolicy="no-referrer"
                  className="hidden h-8 w-8 rounded-full border border-slate-200 object-cover sm:block dark:border-slate-700"
                />
              )}
              <div className="hidden sm:block text-right leading-tight">
                <p className="max-w-[140px] truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {user.hoTen}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {ROLE_LABELS[user.vaiTro]}
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 whitespace-nowrap shrink-0 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="h-9 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white whitespace-nowrap shrink-0 hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation strip */}
      <nav
        aria-label="Điều hướng di động"
        className="flex md:hidden items-center gap-3.5 overflow-x-auto border-t border-slate-100 px-4 py-1.5 dark:border-slate-800/80"
      >
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                active
                  ? 'text-blue-700 underline underline-offset-4 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.label}
              {typeof item.count === 'number' && item.count > 0 ? ` (${item.count})` : ''}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
