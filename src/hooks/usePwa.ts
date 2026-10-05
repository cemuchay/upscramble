import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface UsePwaReturn {
  /** True if the browser has triggered the beforeinstallprompt event */
  isInstallable: boolean;
  /** True if the app is currently running in standalone PWA mode */
  isStandalone: boolean;
  /** True if the browser is currently offline */
  isOffline: boolean;
  /** True if a service worker update is ready */
  needRefresh: boolean;
  /** Triggers the native browser install prompt */
  installApp: () => Promise<boolean>;
  /** Updates the service worker to activate the newest release */
  updateApp: () => Promise<void>;
  /** Dismisses the install banner for this session */
  dismissInstallPrompt: () => void;
}

/**
 * Custom React hook managing PWA installation lifecycle, network status, and update detection
 *
 * @returns {UsePwaReturn} PWA state indicators and control functions
 */
export function usePwa(): UsePwaReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSWFn, setUpdateSWFn] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // 1. Detect standalone mode
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(Boolean(isStandaloneMode));
    }

    // 2. Intercept beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsStandalone(true);
    };

    // 3. Network status listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Listen for Vite PWA virtual service worker updates if available
    try {
      import('virtual:pwa-register').then(({ registerSW }) => {
        const updateSW = registerSW({
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            console.log('[PWA] App is ready for offline usage');
          },
        });
        setUpdateSWFn(() => updateSW);
      }).catch(() => {
        // Virtual register may not be present if PWA plugin is disabled
      });
    } catch {
      // Ignore if virtual:pwa-register is not installed
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[PWA] Install prompt failed', err);
      return false;
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(async (): Promise<void> => {
    if (updateSWFn) {
      await updateSWFn();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [updateSWFn]);

  const dismissInstallPrompt = useCallback(() => {
    setIsInstallable(false);
  }, []);

  return {
    isInstallable,
    isStandalone,
    isOffline,
    needRefresh,
    installApp,
    updateApp,
    dismissInstallPrompt,
  };
}

export default usePwa;
