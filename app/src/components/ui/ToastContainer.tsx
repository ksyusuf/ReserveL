'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  useEffect(() => {
    const timers: number[] = [];
    toasts.forEach((t) => {
      if (t.timeout && t.timeout > 0) {
        const id = window.setTimeout(() => removeToast(t.id), t.timeout);
        timers.push(id);
      }
    });
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [toasts, removeToast]);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            t.type === 'success'
              ? 'bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg'
              : t.type === 'error'
              ? 'bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg'
              : t.type === 'warning'
              ? 'bg-yellow-600 text-white px-4 py-3 rounded-xl shadow-lg'
              : 'bg-gray-700 text-white px-4 py-3 rounded-xl shadow-lg'
          }
        >
          <div className="flex items-center justify-between space-x-3">
            <span className="text-sm font-medium">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/80 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


