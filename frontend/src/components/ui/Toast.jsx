import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import clsx from 'clsx';

const ToastCtx = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((tipo, mensaje) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, mensaje }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const api = {
    success: (m) => push('success', m),
    error:   (m) => push('error', m),
    info:    (m) => push('info', m),
  };

  const Icono = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const Icon = Icono[t.tipo];
          return (
            <div
              key={t.id}
              className={clsx(
                'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-pop',
                t.tipo === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                t.tipo === 'error'   && 'border-red-200 bg-red-50 text-red-800',
                t.tipo === 'info'    && 'border-blue-200 bg-blue-50 text-blue-800',
              )}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <span className="text-sm">{t.mensaje}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);