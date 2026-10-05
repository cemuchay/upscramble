import React from 'react';
import { X } from 'lucide-react';

export interface ModalLayoutProps {
  isOpen?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
  containerClassName?: string;
  zIndex?: string;
  isOverlay?: boolean;
  theme?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

export const ModalLayout: React.FC<ModalLayoutProps> = ({
  isOpen = true,
  onClose,
  children,
  title,
  maxWidth = 'xl',
  showCloseButton = true,
  className = '',
  containerClassName = '',
  zIndex = 'z-50',
  isOverlay = true,
}) => {
  if (!isOpen) return null;

  const isFullScreen = maxWidth === 'full';

  if (isFullScreen) {
    return (
      <div
        className={`${
          isOverlay ? `fixed inset-0 ${zIndex} bg-slate-950` : 'relative flex-1 bg-slate-950'
        } w-full flex flex-col flex-1 overflow-hidden select-none text-white ${className}`}
      >
        <div className={`flex flex-col flex-1 h-full w-full min-h-0 relative overflow-hidden bg-slate-950 ${containerClassName}`}>
          {(title || (onClose && showCloseButton)) && (
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800 shrink-0 relative">
              {title ? (
                <h2 className="text-base sm:text-lg uppercase tracking-wider text-slate-100 flex-1 text-center font-black">
                  {title}
                </h2>
              ) : (
                <div className="flex-1" />
              )}
              {onClose && showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fade-in ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className={`relative w-full ${
          maxWidthMap[maxWidth] || 'max-w-xl'
        } bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${containerClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || (onClose && showCloseButton)) && (
          <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
            {title ? (
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-100 flex-1">
                {title}
              </h2>
            ) : (
              <div className="flex-1" />
            )}
            {onClose && showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
