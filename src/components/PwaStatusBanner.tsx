import React from 'react';
import { RefreshCw, Sparkles, WifiOff } from 'lucide-react';
import { usePwa } from '../hooks/usePwa';

/**
 * PwaStatusBanner Component
 *
 * Renders non-intrusive indicators for:
 * 1. "Update Available" notification with an immediate 1-click update button.
 * 2. "Offline Mode" status banner when internet connectivity is lost.
 */
export const PwaStatusBanner: React.FC = () => {
  const { needRefresh, updateApp, isOffline } = usePwa();

  return (
    <>
      {/* Offline Indicator Banner */}
      {isOffline && (
        <aside
          aria-label="Network status banner"
          className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 py-1.5 px-4 text-xs flex items-center justify-center gap-2 backdrop-blur-sm transition-all"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. Running in cached offline mode.</span>
        </aside>
      )}

      {/* New Service Worker Update Prompt Dialog */}
      {needRefresh && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-[calc(100%-2.5rem)] sm:w-auto animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-purple-500/30 shadow-xl shadow-purple-500/10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                New Update Ready
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                A new version is available.
              </p>
            </div>

            <button
              onClick={updateApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Reload</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PwaStatusBanner;
