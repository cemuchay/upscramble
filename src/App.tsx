import { useMemo } from 'react';
import { WordScrambleContainer } from './features/scramble/WordScrambleContainer';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import ReloadPrompt from './components/ReloadPrompt';
import PWAInstallPrompt from './components/PwaInstallPrompt';

export default function App() {
  const isEmbedded = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('embedded') === 'true' || window.self !== window.top;
  }, []);

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
        <main className="flex-1 flex flex-col items-center justify-start w-full">
          <WordScrambleContainer />
        </main>
        <ToastContainer position="top-center" />
        {/* Only display standalone PWA prompts when not embedded in another game's iframe */}
        {!isEmbedded && (
          <>
            <ReloadPrompt />
            <PWAInstallPrompt />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
