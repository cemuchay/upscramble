import { useMemo, useEffect } from 'react';
import { WordScrambleContainer } from './features/scramble/WordScrambleContainer';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const isEmbedded = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('embedded') === 'true' || window.self !== window.top;
  }, []);

  const handleBackToParent = () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'UPSCRAMBLE_CLOSE' }, '*');
    }
  };

  useEffect(() => {
    // Notify parent frame if embedded
    if (isEmbedded && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'UPSCRAMBLE_READY' }, '*');
    }
  }, [isEmbedded]);

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
        <main className="flex-1 flex flex-col items-center justify-start w-full">
          <WordScrambleContainer
            onBackToMenu={isEmbedded ? handleBackToParent : undefined}
            isEmbedded={isEmbedded}
          />
        </main>
        <ToastContainer position="bottom-right" />
      </div>
    </ErrorBoundary>
  );
}
