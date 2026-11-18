import { useMemo, useState } from 'react';
import { Lock, Pencil, Search, ShieldCheck, Unlock, UserPlus } from 'lucide-react';
import type { User, UserRole, UserStatus } from '../types/vphone';
import { maskPasswordHash } from '../utils/passwordHash';
import { ROLE_LABELS, USER_STATUS_LABELS } from '../utils/vphoneLogic';

interface UsersViewProps {
  users: User[];
  currentAdminMa?: string;
  onOpenUserModal: (user: User | null) => void;
  onToggleUserLock: (user: User) => void;
}

export function UsersView({
  users,
  currentAdminMa,
  onOpenUserModal,
  onToggleUserLock,
}: UsersViewProps) {
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const kw = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.vaiTro !== roleFilter) return false;
      const st = u.trangThai || 'HOAT_DONG';
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (kw) {
        const hay = `${u.ma} ${u.hoTen} ${u.email} ${u.sdt}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Người dùng & Phân quyền RBAC
            </h1>
            <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
              {visible.length} tài khoản
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Mật khẩu lưu dạng SHA-256 kèm salt; hỗ trợ Thêm, Sửa vai trò RBAC và Khóa/Mở khóa tài khoản.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenUserModal(null)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <UserPlus className="h-4 w-4" />
          Thêm người dùng
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#131A26]">
        <div
          role="group"
          aria-label="Lọc theo vai trò"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/90"
        >
          {(
            [
              ['ALL', 'Tất cả'],
              ['KHACH_HANG', 'Khách hàng'],
              ['NHAN_VIEN_BAN_HANG', 'Bán hàng'],
              ['THU_KHO', 'Thủ kho'],
              ['QUAN_TRI', 'Quản trị'],
            ] as const
          ).map(([val, label]) => {
            const active = roleFilter === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setRoleFilter(val)}
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

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Lọc theo trạng thái tài khoản"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | UserStatus)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="HOAT_DONG">Đang hoạt động</option>
            <option value="BI_KHOA">Đã khóa</option>
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, email, mã..."
              className="h-9 w-52 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-[#0B0F17] dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131A26]">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Số điện thoại</th>
              <th className="px-4 py-3">Vai trò (RBAC)</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Mật khẩu (SHA-256)</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visible.length ? (
              visible.map((u) => {
                const isLocked = u.trangThai === 'BI_KHOA';
                const isSelf = u.ma === currentAdminMa;
                return (
                  <tr key={u.ma} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {u.ma}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {u.hoTen}
                        {isSelf && (
                          <span className="ml-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            (Bạn)
                          </span>
                        )}
                      </p>
                      {(u.diaChi || u.chucVu) && (
                        <p className="max-w-[200px] truncate text-xs text-slate-500 dark:text-slate-400">
                          {u.diaChi || u.chucVu}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {u.sdt || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {ROLE_LABELS[u.vaiTro]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                          isLocked
                            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                      >
                        {USER_STATUS_LABELS[u.trangThai || 'HOAT_DONG']}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {u.authProvider === 'GOOGLE'
                        ? 'Google OAuth (Firebase)'
                        : maskPasswordHash(u.matKhauHash)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenUserModal(u)}
                          aria-label={`Sửa ${u.hoTen}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => onToggleUserLock(u)}
                          title={isSelf ? 'Không thể tự khóa tài khoản đang đăng nhập' : undefined}
                          className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                            isLocked
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Unlock className="h-3.5 w-3.5" />
                              Mở khóa
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              Khóa
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  Không có tài khoản nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
