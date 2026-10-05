import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, DownloadCloud } from 'lucide-react';

export const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        // Periodically check for updates every 30 minutes when online
        setInterval(async () => {
          if (!(!r.installing && navigator.onLine)) return;
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: {
              'cache': 'no-store',
              'cache-control': 'no-cache',
            },
          });
          if (resp?.status === 200) await r.update();
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <aside
      aria-label="PWA Status Notification"
      className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-4 text-slate-100 shadow-2xl shadow-indigo-950/50 backdrop-blur-md animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {needRefresh ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
        </div>
        <div className="flex-1 text-xs">
          <h4 className="font-semibold text-slate-200">
            {needRefresh ? 'Update Available' : 'Ready for Offline Use'}
          </h4>
          <p className="mt-0.5 text-slate-400 leading-relaxed">
            {needRefresh
              ? 'A new version of UpScramble is ready. Reload to get the latest features!'
              : 'UpScramble and all dictionaries are cached. You can play offline anytime!'}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                Reload Now
              </button>
            )}
            <button
              onClick={close}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={close}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          aria-label="Close prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
};

export default ReloadPrompt;
