import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (title: string, message?: string) => toast({ type: 'success', title, message }),
    [toast],
  );
  const error = useCallback(
    (title: string, message?: string) => toast({ type: 'error', title, message }),
    [toast],
  );
  const warning = useCallback(
    (title: string, message?: string) => toast({ type: 'warning', title, message }),
    [toast],
  );
  const info = useCallback(
    (title: string, message?: string) => toast({ type: 'info', title, message }),
    [toast],
  );

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-discord-green shrink-0" />,
    error: <XCircle className="w-5 h-5 text-discord-red shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-discord-yellow shrink-0" />,
    info: <Info className="w-5 h-5 text-discord-blurple shrink-0" />,
  };

  const borders = {
    success: 'border-discord-green/30 bg-[#2b2d31]/95',
    error: 'border-discord-red/30 bg-[#2b2d31]/95',
    warning: 'border-discord-yellow/30 bg-[#2b2d31]/95',
    info: 'border-discord-blurple/30 bg-[#2b2d31]/95',
  };

  const contextValue = useMemo(
    () => ({ toast, success, error, warning, info, removeToast }),
    [toast, success, error, warning, info, removeToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Container (Responsive on mobile) */}
      <div
        role="region"
        aria-label="Thông báo hệ thống"
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex flex-col gap-2.5 sm:max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-5',
              borders[t.type],
            )}
          >
            {icons[t.type]}
            <div className="flex-1 space-y-0.5 text-left">
              <div className="text-sm font-semibold text-white leading-tight">
                {t.title}
              </div>
              {t.message && (
                <div className="text-xs text-discord-muted leading-relaxed">
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-discord-muted hover:text-white p-0.5 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
