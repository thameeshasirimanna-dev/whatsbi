import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Trash2 } from 'lucide-react';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

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
  success: { border: '#22c55e', icon: <CheckCircle2 size={16} />, iconColor: '#22c55e' },
  error:   { border: '#f43f5e', icon: <AlertCircle size={16} />, iconColor: '#f43f5e' },
  warning: { border: '#f59e0b', icon: <AlertTriangle size={16} />, iconColor: '#f59e0b' },
  info:    { border: '#0891b2', icon: <Info size={16} />, iconColor: '#0891b2' },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const confirm = useCallback((message: string, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ message, ...options, resolve });
    });
  }, []);

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleConfirm = (val: boolean) => {
    confirmState?.resolve(val);
    setConfirmState(null);
  };

  return (
    <DialogContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack — top right */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360, width: '100%', pointerEvents: 'none' }}>
        <style>{`
          @keyframes dp-toast-in {
            from { opacity: 0; transform: translateX(100%); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
        {toasts.map(t => {
          const s = TOAST_STYLES[t.type];
          return (
            <div key={t.id} style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #ebebeb',
              borderLeft: `4px solid ${s.border}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              animation: 'dp-toast-in 0.25s ease',
              pointerEvents: 'all',
            }}>
              <span style={{ color: s.iconColor, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <span style={{ ...DM, fontSize: 13, color: '#0c1a0e', flex: 1, lineHeight: 1.5 }}>{t.message}</span>
              <button onClick={() => dismissToast(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#a1a1aa', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <div
          className="animate-backdrop"
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            className="animate-modal"
            style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', width: '100%', maxWidth: 400, padding: 28 }}
          >
            {/* Icon */}
            <div style={{ width: 48, height: 48, borderRadius: 14, background: confirmState.danger ? 'rgba(244,63,94,0.08)' : 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              {confirmState.danger
                ? <Trash2 size={22} style={{ color: '#f43f5e' }} />
                : <AlertCircle size={22} style={{ color: '#22c55e' }} />
              }
            </div>

            {/* Title */}
            <div style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', marginBottom: 8 }}>
              {confirmState.title || (confirmState.danger ? 'Confirm Delete' : 'Are you sure?')}
            </div>

            {/* Message */}
            <div style={{ ...DM, fontSize: 14, color: '#71717a', lineHeight: 1.55, marginBottom: 24 }}>
              {confirmState.message}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleConfirm(false)}
                style={{ flex: 1, padding: '10px 0', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, cursor: 'pointer', ...DM, fontSize: 14, fontWeight: 600, color: '#3f3f46' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.09)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, cursor: 'pointer',
                  ...DM, fontSize: 14, fontWeight: 600, color: '#fff',
                  background: confirmState.danger
                    ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
                    : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                  boxShadow: confirmState.danger
                    ? '0 4px 14px rgba(244,63,94,0.35)'
                    : '0 4px 14px rgba(34,197,94,0.35)',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
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
