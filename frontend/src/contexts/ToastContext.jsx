import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  info:    Info,
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
};

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', timeoutMs = 3500) => {
    _id += 1;
    const id = _id;
    setToasts((t) => [...t, { id, message, type }]);
    if (timeoutMs) setTimeout(() => dismiss(id), timeoutMs);
  }, [dismiss]);

  const value = {
    info:    (m) => push(m, 'info'),
    success: (m) => push(m, 'success'),
    error:   (m) => push(m, 'error'),
    warning: (m) => push(m, 'warning'),
    push, dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-slate-800 dark:text-slate-200">{t.message}</div>
              <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
