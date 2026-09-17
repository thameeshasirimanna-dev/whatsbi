import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Trash2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  message: string;
  resolve: (val: boolean) => void;
}

interface DialogContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be inside DialogProvider');
  return ctx;
}

const TOAST_STYLES: Record<ToastType, { border: string; icon: React.ReactNode; iconColor: string }> = {
  success: { border: 'border-[#22C55E]', icon: <CheckCircle2 size={16} />, iconColor: 'text-[#15803D]' },
  error:   { border: 'border-[#EF4444]', icon: <AlertCircle size={16} />, iconColor: 'text-[#EF4444]' },
  warning: { border: 'border-[#F59E0B]', icon: <AlertTriangle size={16} />, iconColor: 'text-[#D97706]' },
  info:    { border: 'border-[#3B82F6]', icon: <Info size={16} />, iconColor: 'text-[#2563EB]' },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const confirm = useCallback((message: string, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, ...options, resolve });
    });
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleConfirm = (val: boolean) => {
    confirmState?.resolve(val);
    setConfirmState(null);
  };

  return (
    <DialogContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast Stack */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border ${s.border} shadow-[0_8px_30px_rgba(22,40,29,0.1)] p-3.5 flex items-start gap-3 pointer-events-auto transition-all`}
            >
              <span className={`${s.iconColor} shrink-0 mt-0.5`}>{s.icon}</span>
              <span className="text-xs font-semibold text-[#16281D] flex-1 leading-relaxed">
                {t.message}
              </span>
              <button
                onClick={() => dismissToast(t.id)}
                className="w-5 h-5 rounded-full hover:bg-[#F4F7F4] text-[#71717A] flex items-center justify-center shrink-0 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[9998] bg-[#16281D]/65 flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_24px_64px_rgba(22,40,29,0.18)] w-full max-w-sm p-6 flex flex-col animate-modal-card">
            <div
              className={`w-12 h-12 rounded-2xl ${
                confirmState.danger ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#9FE870]/20 text-[#16281D]'
              } flex items-center justify-center mb-4`}
            >
              {confirmState.danger ? <Trash2 size={22} /> : <AlertCircle size={22} />}
            </div>

            <h3 className="text-base font-bold text-[#16281D] mb-1.5">
              {confirmState.title || (confirmState.danger ? 'Confirm Deletion' : 'Are you sure?')}
            </h3>

            <p className="text-xs text-[#71717A] leading-relaxed mb-6">
              {confirmState.message}
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleConfirm(false)}
                className="flex-1 py-2.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-semibold text-[#71717A] transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirm(true)}
                className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all text-center ${
                  confirmState.danger
                    ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-[0_4px_14px_rgba(239,68,68,0.3)]'
                    : 'bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.3)]'
                }`}
              >
                {confirmState.confirmLabel || (confirmState.danger ? 'Delete' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export default DialogProvider;
