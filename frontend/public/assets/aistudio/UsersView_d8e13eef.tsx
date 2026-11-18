import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { User, UserRole } from '../types/vphone';
import { maskPasswordHash } from '../utils/passwordHash';
import { ROLE_LABELS } from '../utils/vphoneLogic';

interface UsersViewProps {
  users: User[];
}

export function UsersView({ users }: UsersViewProps) {
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const visible =
    roleFilter === 'ALL' ? users : users.filter((u) => u.vaiTro === roleFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Người dùng & Phân quyền
            </h1>
            <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
              {visible.length} tài khoản
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Mật khẩu được băm một chiều SHA-256 kèm salt ngẫu nhiên, không lưu văn bản thường.
          </p>
        </div>

        <div
          role="group"
          aria-label="Lọc theo vai trò"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/75 p-1 dark:bg-slate-800/90"
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131A26]">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Số điện thoại</th>
              <th className="px-4 py-3">Vai trò (RBAC)</th>
              <th className="px-4 py-3">Mật khẩu (SHA-256)</th>
              <th className="px-4 py-3">Địa chỉ / Chức vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visible.map((u) => (
              <tr key={u.ma} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {u.ma}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                  {u.hoTen}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {u.sdt || '—'}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                  {ROLE_LABELS[u.vaiTro]}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {u.authProvider === 'GOOGLE' ? 'Google OAuth (Firebase)' : maskPasswordHash(u.matKhauHash)}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {u.diaChi || u.chucVu || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
