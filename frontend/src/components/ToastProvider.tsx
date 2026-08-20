import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; title: string; message?: string; tone: ToastTone };
type ToastInput = Omit<Toast, 'id'>;
type ToastContextValue = { toast: (input: ToastInput) => void; dismiss: (id: number) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const toast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-2), { ...input, id }]);
    window.setTimeout(() => dismiss(id), 4800);
  }, [dismiss]);

  useEffect(() => {
    const handleToast = (event: Event) => toast((event as CustomEvent<ToastInput>).detail);
    window.addEventListener('nurtured-choice-toast', handleToast);
    return () => window.removeEventListener('nurtured-choice-toast', handleToast);
  }, [toast]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toasts.map((item) => { const Icon = item.tone === 'success' ? CheckCircle2 : item.tone === 'error' ? TriangleAlert : Info; return <div key={item.id} className={`toast toast-${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}><Icon className="h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><p className="font-semibold">{item.title}</p>{item.message ? <p className="mt-0.5 text-xs opacity-80">{item.message}</p> : null}</div><button type="button" className="rounded-lg p-1 opacity-70 transition hover:bg-black/10 hover:opacity-100" onClick={() => dismiss(item.id)} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>; })}
    </div>
  </ToastContext.Provider>;
}
