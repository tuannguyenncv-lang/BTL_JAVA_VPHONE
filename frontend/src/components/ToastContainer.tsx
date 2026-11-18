import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { ToastMessage } from '../types/vphone';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="no-print fixed bottom-5 right-5 z-50 flex w-[calc(100%-2.5rem)] max-w-xs flex-col gap-2"
    >
      {toasts.slice(-2).map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg dark:bg-[#131A26] ${
            t.kind === 'err'
              ? 'border-red-200 text-slate-900 dark:border-red-900/60 dark:text-slate-100'
              : 'border-slate-200 text-slate-900 dark:border-slate-800 dark:text-slate-100'
          }`}
        >
          {t.kind === 'err' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{t.title}</p>
            {t.detail && (
              <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                {t.detail}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Đóng thông báo"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
