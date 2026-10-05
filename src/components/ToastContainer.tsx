import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Loader2,
  Bell,
  X,
} from 'lucide-react';
import { toast, ToastItem, ToastPosition, ToastType } from '../services/toast';

interface ToastContainerProps {
  position?: ToastPosition;
}

const positionClasses: Record<ToastPosition, string> = {
  'top-right': 'top-5 right-5 items-end',
  'top-left': 'top-5 left-5 items-start',
  'top-center': 'top-5 left-1/2 -translate-x-1/2 items-center',
  'bottom-right': 'bottom-5 right-5 items-end',
  'bottom-left': 'bottom-5 left-5 items-start',
  'bottom-center': 'bottom-5 left-1/2 -translate-x-1/2 items-center',
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ position = 'bottom-right' }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });
    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  // Group toasts by position (defaulting to the prop position if unspecified)
  const groupedToasts = toasts.reduce<Record<ToastPosition, ToastItem[]>>(
    (acc, item) => {
      const pos = item.position || position;
      if (!acc[pos]) acc[pos] = [];
      acc[pos].push(item);
      return acc;
    },
    {} as Record<ToastPosition, ToastItem[]>
  );

  return (
    <>
      {(Object.keys(groupedToasts) as ToastPosition[]).map((pos) => {
        const items = groupedToasts[pos];
        if (!items || items.length === 0) return null;

        return (
          <div
            key={pos}
            className={`fixed z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0 ${positionClasses[pos]}`}
            aria-live="polite"
          >
            {items.map((item) => (
              <ToastCard key={item.id} item={item} onDismiss={() => toast.dismiss(item.id)} />
            ))}
          </div>
        );
      })}
    </>
  );
};

const toastConfig: Record<
  ToastType,
  {
    icon: React.ReactNode;
    border: string;
    bg: string;
    text: string;
    progressBar: string;
  }
> = {
  success: {
    icon: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    border: 'border-emerald-200 dark:border-emerald-900/60',
    bg: 'bg-white/95 dark:bg-slate-900/95 shadow-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    progressBar: 'bg-emerald-500',
  },
  error: {
    icon: <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
    border: 'border-rose-200 dark:border-rose-900/60',
    bg: 'bg-white/95 dark:bg-slate-900/95 shadow-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
    progressBar: 'bg-rose-500',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
    border: 'border-amber-200 dark:border-amber-900/60',
    bg: 'bg-white/95 dark:bg-slate-900/95 shadow-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    progressBar: 'bg-amber-500',
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />,
    border: 'border-blue-200 dark:border-blue-900/60',
    bg: 'bg-white/95 dark:bg-slate-900/95 shadow-blue-500/10',
    text: 'text-blue-700 dark:text-blue-300',
    progressBar: 'bg-blue-500',
  },
  loading: {
    icon: <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0 mt-0.5" />,
    border: 'border-indigo-200 dark:border-indigo-900/60',
    bg: 'bg-white/95 dark:bg-slate-900/95 shadow-indigo-500/10',
    text: 'text-indigo-700 dark:text-indigo-300',
    progressBar: 'bg-indigo-500',
  },
  default: {
    icon: <Bell className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />,
    border: 'border-slate-200 dark:border-slate-800',
    bg: 'bg-white/95 dark:bg-slate-900/95 shadow-slate-500/10',
    text: 'text-slate-800 dark:text-slate-200',
    progressBar: 'bg-slate-500',
  },
};

interface ToastCardProps {
  item: ToastItem;
  onDismiss: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ item, onDismiss }) => {
  const config = toastConfig[item.type] || toastConfig.default;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (item.duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / item.duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [item.duration]);

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden flex flex-col w-full rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${config.bg} ${config.border}`}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        {item.icon ? (
          <div className="shrink-0 mt-0.5">{item.icon}</div>
        ) : (
          config.icon
        )}

        <div className="flex-1 min-w-0 pr-1 space-y-0.5">
          {item.title && (
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {item.title}
            </p>
          )}
          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug break-words">
            {item.message}
          </p>
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Optional Action Button */}
          {item.action && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick();
                  onDismiss();
                }}
                className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
              >
                {item.action.label}
              </button>
            </div>
          )}
        </div>

        {item.dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Dismiss toast notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Auto-dismiss progress bar indicator */}
      {item.duration > 0 && (
        <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800/80">
          <div
            className={`h-full transition-all duration-75 ease-linear ${config.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default ToastContainer;
