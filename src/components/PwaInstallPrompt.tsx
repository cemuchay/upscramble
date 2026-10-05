import React from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePwa } from '../hooks/usePwa';

/**
 * PwaInstallPrompt Component
 *
 * Renders a floating notification banner prompting the user to install the application
 * to their home screen or desktop. Automatically hides when not installable or in standalone mode.
 */
export const PwaInstallPrompt: React.FC = () => {
  const { isInstallable, installApp, dismissInstallPrompt } = usePwa();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 max-w-sm w-[calc(100%-2.5rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-indigo-500/30 shadow-xl shadow-indigo-500/10">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Install App
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Add to home screen for fast access.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={installApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>

          <button
            onClick={dismissInstallPrompt}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
