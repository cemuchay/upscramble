import React, { useState, useEffect } from 'react';
import { safeLocalStorage } from '../services/safeStorage';
import { DownloadCloud, Share2, PlusSquare, X, Check, Smartphone } from 'lucide-react';
import { ModalLayout } from './layout/ModalLayout';

const PWA_PROMPT_KEY = 'upscramble_pwa_prompt_history';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface PromptHistory {
  dismissCount: number;
  lastPromptTime: number;
  installed?: boolean;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOSDevice = /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOSDevice);

    // Check prompt dismissal history (Max twice before 1 week cooldown)
    const history: PromptHistory = safeLocalStorage.getItem(PWA_PROMPT_KEY as any, {
      dismissCount: 0,
      lastPromptTime: 0,
    });

    const now = Date.now();
    if (history.dismissCount >= 2 && now - history.lastPromptTime < ONE_WEEK_MS) {
      // User dismissed twice and 1 week has not elapsed yet
      return;
    }

    // Handle standard browser install prompt event (Chrome, Android, Edge, Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS Safari, standard beforeinstallprompt is not fired, so we display the install option
    if (iOSDevice && !isStandalone) {
      setShowBanner(true);
    }

    // Listen for successful install
    const handleAppInstalled = () => {
      setShowBanner(false);
      safeLocalStorage.setItem(PWA_PROMPT_KEY as any, {
        dismissCount: 0,
        lastPromptTime: Date.now(),
        installed: true,
      });
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    const history: PromptHistory = safeLocalStorage.getItem(PWA_PROMPT_KEY as any, {
      dismissCount: 0,
      lastPromptTime: 0,
    });

    const nextCount = (history.dismissCount || 0) + 1;
    safeLocalStorage.setItem(PWA_PROMPT_KEY as any, {
      dismissCount: nextCount,
      lastPromptTime: Date.now(),
    });
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      setShowIOSModal(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setDeferredPrompt(null);
    } else {
      handleDismiss();
    }
  };

  return (
    <>
      {showBanner && (
        <aside
          aria-label="Install UpScramble App"
          className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-indigo-500/40 bg-slate-900/95 p-4 text-slate-100 shadow-2xl shadow-indigo-950/60 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 text-white font-black shadow-lg shadow-pink-500/30">
              <DownloadCloud className="h-5 w-5" />
            </div>
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>Install UpScramble</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  PWA
                </span>
              </h4>
              <p className="mt-1 text-slate-300 leading-relaxed">
                Play offline instantly with fullscreen gameplay and faster loading on your device.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 px-3.5 py-1.5 font-bold text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Not Now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              aria-label="Close install prompt"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* iOS Step-by-Step Installation Modal */}
      <ModalLayout
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
        title="Install UpScramble on iOS"
        maxWidth="md"
        containerClassName="bg-slate-900 border border-indigo-500/40 shadow-2xl text-slate-100 p-4 sm:p-6"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs sm:text-sm text-slate-300">
            Install UpScramble to your iPhone or iPad home screen for an app-like fullscreen experience with full offline dictionary access:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>Tap the Share icon</span>
                  <Share2 className="w-3.5 h-3.5 text-cyan-400 inline" />
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  At the bottom of Safari (or top in iPad toolbar), tap the browser Share button.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>Select "Add to Home Screen"</span>
                  <PlusSquare className="w-3.5 h-3.5 text-pink-400 inline" />
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Scroll down the share sheet and tap the <strong>Add to Home Screen</strong> option.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>Tap "Add"</span>
                  <Check className="w-3.5 h-3.5 text-emerald-400 inline" />
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Confirm by tapping <strong>Add</strong> in the top right corner. UpScramble will appear on your home screen!
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition-all cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      </ModalLayout>
    </>
  );
};

export default PWAInstallPrompt;
