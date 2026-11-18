import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Đã xảy ra lỗi không mong muốn.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-[#131A26]">
            <h1 className="font-display text-lg font-bold text-red-600 dark:text-red-400">
              Không thể hiển thị ứng dụng
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Hệ thống gặp sự cố trong quá trình xử lý dữ liệu. Vui lòng tải lại trang để tiếp tục.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
