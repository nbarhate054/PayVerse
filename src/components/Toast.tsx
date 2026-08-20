import { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export function ToastBanner({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[400px] animate-fade-slide-up pointer-events-auto">
      <div
        className={`flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
          isSuccess
            ? 'bg-emerald-900/95 text-white border-emerald-500/30 shadow-emerald-950/30'
            : isError
            ? 'bg-rose-900/95 text-white border-rose-500/30 shadow-rose-950/30'
            : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/30'
        }`}
      >
        <div className="text-xl flex-shrink-0 mt-0.5">
          {isSuccess ? '✅' : isError ? '❌' : 'ℹ️'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">{toast.title}</p>
          <p className="text-xs opacity-90 mt-0.5 leading-snug">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white p-1 -mr-1 rounded-lg text-xs font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
