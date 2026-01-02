'use client';

import { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  tone?: 'neutral' | 'success' | 'danger';
};

interface ToastContextValue {
  toasts: ToastMessage[];
  push: (toast: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// =============================================================================
// HOOK
// =============================================================================

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// =============================================================================
// PROVIDER
// =============================================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const push = (toast: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
  };

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// TOAST STACK (Internal UI Component)
// =============================================================================

function ToastStack({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-50 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'panel-surface px-4 py-3 border-l-4',
            toast.tone === 'success' && 'border-l-[color:var(--color-success)]',
            toast.tone === 'danger' && 'border-l-[color:var(--color-danger)]',
            (!toast.tone || toast.tone === 'neutral') && 'border-l-orange-500',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">{toast.title}</p>
              {toast.description && <p className="text-xs text-[color:var(--color-ink-secondary)] mt-1">{toast.description}</p>}
            </div>
            <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss" className="text-sm text-[color:var(--color-ink-secondary)]">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
