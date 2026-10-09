import React, { useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import { scrambleReducer, initialScrambleState } from './engine/ScrambleEngine';
import type { ScrambleConfig, ScrambleTile } from './engine/types';
import { LocalStorageScrambleRepository } from './storage/ScrambleRepository';
import { loadWordLists } from '../../services/wordService';
import { ScrambleLobby } from './components/ScrambleLobby';
import { ScrambleBoard } from './components/ScrambleBoard';
import { SubmissionTray } from './components/SubmissionTray';
import { FoundWordsList } from './components/FoundWordsList';
import { ScrambleSummaryModal } from './components/ScrambleSummaryModal';
import { ScrambleTutorialModal } from './components/ScrambleTutorialModal';
import { safeLocalStorage } from '../../services/safeStorage';
import { toast } from '../../services/toast';
import { ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';

interface WordScrambleContainerProps {
  onBackToMenu?: () => void;
  isEmbedded?: boolean;
}

const TUTORIAL_STORAGE_KEY = 'wordscramble_tutorial_completed';
const TOAST_DURATION = {
  SHORT: 2000,
  DEFAULT: 3000,
  LONG: 5000,
};

export const WordScrambleContainer: React.FC<WordScrambleContainerProps> = ({
  onBackToMenu,
}) => {
  const triggerToast = useCallback((msg: string, duration = 3000) => {
    toast.info(msg, { duration });
  }, []);
  const [state, dispatch] = useReducer(scrambleReducer, initialScrambleState);
  const [view, setView] = useState<'lobby' | 'game'>('lobby');
  const [validDictionary, setValidDictionary] = useState<Set<string>>(new Set());
  const [wordListMap, setWordListMap] = useState<Record<number, string[]>>({});
  const [showInGameTutorial, setShowInGameTutorial] = useState<boolean>(false);

  const repository = useMemo(() => new LocalStorageScrambleRepository(), []);

  // Preload and build active dictionary whenever target lengths change with thorough error handling
  const prepareDictionaries = useCallback(async (lengths: number[]): Promise<{
    wordListMap: Record<number, string[]>;
    validDictionary: Set<string>;
  }> => {
    const newWordListMap: Record<number, string[]> = {};
    const combinedValid = new Set<string>();

    try {
      await Promise.all(
        lengths.map(async (len) => {
          try {
            const cache = await loadWordLists(len, false);
            if (cache && cache.official && cache.official.length > 0) {
              newWordListMap[len] = cache.official;
              cache.valid.forEach((w) => combinedValid.add(w));
            } else {
              throw new Error(`Empty word list for length ${len}`);
            }
          } catch (err) {
            console.warn(`Fallback word loader for length ${len}:`, err);
            // Fallback default starter words if network/cache failed
            const fallbackMap: Record<number, string[]> = {
              3: ['CAT', 'DOG', 'SUN', 'BAT', 'HAT', 'RUN', 'TOP', 'PEN', 'CUP', 'BOX'],
              4: ['BIRD', 'STAR', 'MOON', 'FISH', 'LION', 'TREE', 'BOOK', 'WIND', 'GOLD', 'FIRE'],
              5: ['APPLE', 'CRANE', 'GRAPE', 'PLANT', 'TRAIN', 'HOUSE', 'LIGHT', 'WATER', 'STONE', 'BREAD'],
              6: ['PLANET', 'SILVER', 'SPRING', 'CASTLE', 'FLOWER', 'GARDEN', 'STREAM', 'WONDER'],
              7: ['RAINBOW', 'THUNDER', 'DIAMOND', 'JOURNEY', 'CRYSTAL', 'MORNING', 'SUNRISE'],
              8: ['STARSHIP', 'MOUNTAIN', 'SUNLIGHT', 'CHAMPION', 'FIREWORK', 'TREASURE'],
              9: ['BUTTERFLY', 'BEAUTIFUL', 'LIGHTNING', 'ASTRONOMY', 'WATERFALL'],
              10: ['WONDERLAND', 'BASKETBALL', 'PLAYGROUND', 'SPACECRAFT']
            };
            const fallbackWords = fallbackMap[len] || fallbackMap[5];
            newWordListMap[len] = fallbackWords;
            fallbackWords.forEach((w) => combinedValid.add(w));
          }
        })
      );

      setWordListMap(newWordListMap);
      setValidDictionary(combinedValid);
      return { wordListMap: newWordListMap, validDictionary: combinedValid };
    } catch (e: any) {
      console.error('WordScramble dictionary load error:', e);
      throw e;
    }
  }, []);

  const handleStartGame = async (config: ScrambleConfig) => {
    try {
      const { wordListMap: preparedMap } = await prepareDictionaries(config.selectedLengths);

      const hasWords = config.selectedLengths.some((len) => (preparedMap[len] || []).length > 0);
      if (!hasWords) {
        throw new Error('No words available for selected lengths. Please try another selection.');
      }

      dispatch({ type: 'START_GAME', config, wordListMap: preparedMap });
      setView('game');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Error starting Word Scramble game:', err);
      triggerToast(err?.message || 'Could not start game. Please try again.', TOAST_DURATION.DEFAULT);
    }
  };

  const handleResumeGame = async (savedState: any) => {
    try {
      await prepareDictionaries(savedState.config.selectedLengths);
      dispatch({ type: 'RESTORE_SAVED_GAME', state: savedState });
      setView('game');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Error resuming saved game:', err);
      triggerToast(err?.message || 'Could not resume game.', TOAST_DURATION.DEFAULT);
    }
  };

  const handleReturnToLobby = () => {
    // If a game is active/playing or paused, immediately persist pending game before switching view
    if (state.status === 'playing' || state.status === 'paused') {
      const gId = state.gameId || `game_${Date.now()}`;
      repository.savePendingGame({
        id: gId,
        config: state.config,
        tiles: state.tiles,
        stagedTileIds: state.stagedTileIds,
        foundWords: state.foundWords,
        score: state.score,
        streak: state.streak,
        highestStreak: state.highestStreak,
        remainingSeconds: state.remainingSeconds,
        wordsClearedSinceRefill: state.wordsClearedSinceRefill || 0,
        targetRefillThreshold: state.targetRefillThreshold || 5,
        maxCapacity: state.maxCapacity || 30,
        secretSpoolWords: state.secretSpoolWords || [],
        gameStartedAt: state.gameStartedAt,
        lastWordSubmittedAt: state.lastWordSubmittedAt,
        timeDecayMultiplier: state.timeDecayMultiplier || 1.0,
        savedAt: new Date().toISOString(),
      });
    }
    setView('lobby');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scroll to top whenever view changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [view]);

  // Dynamic Timer Tick according to progressive decay multiplier
  useEffect(() => {
    if (view !== 'game' || state.status !== 'playing' || state.config.mode === 'untimed') return;

    // Base 1000ms divided by decay multiplier (e.g. 1.1x -> 909ms, 1.2x -> 833ms, 1.3x -> 769ms)
    const decay = state.timeDecayMultiplier || 1.0;
    const intervalMs = Math.max(400, Math.round(1000 / decay));

    const timer = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [view, state.status, state.config.mode, state.timeDecayMultiplier]);

  // Persist session to repository on Game Over and clean up active game
  useEffect(() => {
    if (view !== 'game') return;

    if (state.status === 'game_over') {
      const longest = state.foundWords.reduce(
        (max, curr) => (curr.word.length > max.length ? curr.word : max),
        ''
      );
      repository.saveSession({
        id: `session_${Date.now()}`,
        gameMode: state.config.mode,
        selectedLengths: state.config.selectedLengths,
        score: state.score,
        wordsFound: state.foundWords.map((f) => f.word),
        totalWordsCount: state.foundWords.length,
        longestWord: longest,
        highestStreak: state.highestStreak,
        timeSpentSeconds: state.config.durationSeconds - state.remainingSeconds,
        completedAt: new Date().toISOString(),
      }).then(() => {
        if (state.gameId) {
          repository.removePendingGame(state.gameId);
        }
      });
    }
  }, [view, state.status, state.gameId, state.foundWords, state.score, state.highestStreak, state.config, state.remainingSeconds, repository]);

  // Debounced auto-save for active game in progress (avoids disk stalls on every 1-second timer tick)
  useEffect(() => {
    if (view !== 'game' || (state.status !== 'playing' && state.status !== 'paused')) return;

    const timeout = setTimeout(() => {
      const gId = state.gameId || `game_${Date.now()}`;
      repository.savePendingGame({
        id: gId,
        config: state.config,
        tiles: state.tiles,
        stagedTileIds: state.stagedTileIds,
        foundWords: state.foundWords,
        score: state.score,
        streak: state.streak,
        highestStreak: state.highestStreak,
        remainingSeconds: state.remainingSeconds,
        wordsClearedSinceRefill: state.wordsClearedSinceRefill || 0,
        targetRefillThreshold: state.targetRefillThreshold || 5,
        maxCapacity: state.maxCapacity || 30,
        secretSpoolWords: state.secretSpoolWords || [],
        gameStartedAt: state.gameStartedAt,
        lastWordSubmittedAt: state.lastWordSubmittedAt,
        timeDecayMultiplier: state.timeDecayMultiplier || 1.0,
        savedAt: new Date().toISOString(),
      });
    }, 1500);

    return () => clearTimeout(timeout);
  }, [
    view,
    state,
    repository
  ]);

  // Staged tiles calculation
  const stagedTiles = useMemo(() => {
    return state.stagedTileIds
      .map((id) => state.tiles.find((t) => t.id === id))
      .filter((t): t is ScrambleTile => Boolean(t));
  }, [state.stagedTileIds, state.tiles]);

  const isValidLength = state.config.selectedLengths.includes(stagedTiles.length);

  // Auto-Submit: ONLY when exactly 1 word length is configured in game options
  useEffect(() => {
    if (view !== 'game' || state.status !== 'playing' || stagedTiles.length === 0) return;
    // Condition 2: Only auto submit when only 1 word length is configured
    if (state.config.selectedLengths.length !== 1) return;

    const targetLen = state.config.selectedLengths[0];
    if (stagedTiles.length !== targetLen) return;

    const formedWord = stagedTiles.map((t) => t.letter).join('').toUpperCase();

    if (state.foundWords.some((f) => f.word === formedWord)) {
      triggerToast(`"${formedWord}" already played!`, TOAST_DURATION.SHORT);
      return;
    }

    if (validDictionary.has(formedWord)) {
      dispatch({
        type: 'SUBMIT_WORD',
        validDictionary,
        wordListMap,
      });
    }
  }, [view, stagedTiles, validDictionary, wordListMap, state.status, state.config.selectedLengths, state.foundWords, triggerToast]);

  // Stable Callbacks to prevent re-rendering memoized Board and Tray on 1s timer ticks
  const handleStageTile = useCallback((tileId: string) => {
    dispatch({ type: 'STAGE_TILE', tileId });
  }, []);

  const handleUnstageTile = useCallback((tileId: string) => {
    dispatch({ type: 'UNSTAGE_TILE', tileId });
  }, []);

  const handleSwapStagedTiles = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'SWAP_STAGED_TILES', fromIndex, toIndex });
  }, []);

  const handleBackspace = useCallback(() => {
    dispatch({ type: 'UNSTAGE_LAST_TILE' });
  }, []);

  const handleClear = useCallback(() => {
    dispatch({ type: 'CLEAR_STAGING' });
  }, []);

  const handleShuffle = useCallback(() => {
    dispatch({ type: 'SHUFFLE_TILES' });
  }, []);

  const handleSubmit = useCallback(() => {
    if (stagedTiles.length === 0) return;
    const formedWord = stagedTiles.map((t) => t.letter).join('').toUpperCase();

    // Check if word has already been played
    if (state.foundWords.some((entry) => entry.word === formedWord)) {
      triggerToast(`"${formedWord}" already played!`, TOAST_DURATION.SHORT);
      return;
    }

    // Check if length is acceptable
    if (!state.config.selectedLengths.includes(formedWord.length)) {
      triggerToast(
        `Word must be ${state.config.selectedLengths.map((l) => `${l}L`).join(' or ')}`,
        TOAST_DURATION.SHORT
      );
      dispatch({
        type: 'SUBMIT_WORD',
        validDictionary,
        wordListMap,
      });
      return;
    }

    // Check if in dictionary
    if (!validDictionary.has(formedWord)) {
      triggerToast(`"${formedWord}" not in word list!`, TOAST_DURATION.SHORT);
      dispatch({
        type: 'SUBMIT_WORD',
        validDictionary,
        wordListMap,
      });
      return;
    }

    dispatch({
      type: 'SUBMIT_WORD',
      validDictionary,
      wordListMap,
    });
  }, [stagedTiles, state.foundWords, state.config.selectedLengths, validDictionary, wordListMap, triggerToast]);

  const handleTogglePause = useCallback(() => {
    dispatch({ type: state.status === 'playing' ? 'PAUSE_GAME' : 'RESUME_GAME' });
  }, [state.status]);

  // Desktop Physical Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (view !== 'game' || state.status !== 'playing') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleShuffle();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        // Look for the first available tile matching this letter in the letter pool grid
        const char = e.key.toUpperCase();
        const availableTile = state.tiles.find(
          (t) => t.status === 'available' && t.letter.toUpperCase() === char
        );
        if (availableTile) {
          e.preventDefault();
          handleStageTile(availableTile.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, state.status, state.tiles, handleSubmit, handleBackspace, handleClear, handleShuffle, handleStageTile]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col items-center pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] px-3 sm:px-5 select-none relative">
      {view === 'lobby' ? (
        <ScrambleLobby
          onStartNewGame={handleStartGame}
          onResumeGame={handleResumeGame}
          onBackToMenu={onBackToMenu}
        />
      ) : (
        <>
          {/* Unified Top In-Game Navbar with Integrated Timer & Stats */}
          <header className="w-full max-w-4xl flex items-center justify-between py-2 px-3 sm:px-4 mb-3 rounded-2xl bg-slate-950/90 border border-slate-800/80 backdrop-blur-md shadow-lg">
            {/* Left: Back to Lobby & Guide */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleReturnToLobby}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 shadow-sm"
                title="Back to Lobby"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Lobby</span>
              </button>

              <button
                onClick={() => setShowInGameTutorial(true)}
                className="p-2 sm:p-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer active:scale-95 shadow-sm"
                title="How to Play Guide"
              >
                <HelpCircle className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Center: Live Timer Badge / Untimed Status + Pause Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm font-mono border transition-all ${
                  state.status === 'paused'
                    ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : state.config.mode === 'timed' && state.remainingSeconds <= 15
                    ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                    : 'bg-slate-900/90 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                }`}
              >
                <span className="text-xs">⏱️</span>
                <span>
                  {state.config.mode === 'timed'
                    ? `${Math.floor(state.remainingSeconds / 60)}:${(state.remainingSeconds % 60).toString().padStart(2, '0')}`
                    : '♾️ Untimed'}
                </span>
                {state.config.mode === 'timed' && state.timeDecayMultiplier > 1.0 && (
                  <span className="hidden sm:inline text-[9px] text-rose-400 font-sans font-bold ml-1">
                    ({state.timeDecayMultiplier.toFixed(1)}x)
                  </span>
                )}
              </div>

              <button
                onClick={handleTogglePause}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-amber-400 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer active:scale-95 shadow-sm"
                title={state.status === 'paused' ? 'Resume Game' : 'Pause Game'}
              >
                {state.status === 'paused' ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-black">▶ Resume</span>
                ) : (
                  <span className="flex items-center gap-1">⏸ Pause</span>
                )}
              </button>
            </div>

            {/* Right: Live Score & Streak */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {state.streak > 1 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/40 text-[11px] font-black text-orange-300 animate-pulse">
                  <span>🔥</span>
                  <span>{state.streak}x</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">Score:</span>
                <span className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">
                  {state.score.toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => handleStartGame(state.config)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Restart with same settings"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </header>

          {/* In-Game Tutorial Modal */}
          <ScrambleTutorialModal
            isOpen={showInGameTutorial}
            onComplete={() => {
              safeLocalStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
              setShowInGameTutorial(false);
            }}
            onSkip={() => {
              safeLocalStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
              setShowInGameTutorial(false);
            }}
          />

          {/* Main Game Surface with Anti-Cheat Pause Blur */}
          <div className="w-full max-w-4xl relative flex-1 flex flex-col items-center">
            {/* Pause Screen Overlay */}
            {state.status === 'paused' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-950/75 backdrop-blur-xl border border-indigo-500/30 shadow-2xl animate-in fade-in duration-200">
                <div className="max-w-xs w-full text-center space-y-4 p-6 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto text-xl shadow-lg">
                    ⏸️
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-100">Game Paused</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Matrix & letters are hidden while paused.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-around text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Score</span>
                      <span className="font-black text-amber-300">{state.score}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Words</span>
                      <span className="font-black text-cyan-300">{state.foundWords.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Streak</span>
                      <span className="font-black text-rose-400">{state.streak}x</span>
                    </div>
                  </div>

                  <button
                    onClick={handleTogglePause}
                    className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    ▶ RESUME GAME
                  </button>
                </div>
              </div>
            )}

            <main className={`w-full flex flex-col lg:flex-row items-start justify-center gap-4 flex-1 transition-all duration-200 ${
              state.status === 'paused' ? 'filter blur-md pointer-events-none select-none opacity-25' : ''
            }`}>
              {/* Left Column on Desktop (Selected Word on TOP -> Letter Pool Below), Top on Mobile */}
              <section className="w-full lg:w-7/12 flex flex-col gap-2.5">
                {/* Selected Words (Submission Tray) ON TOP as requested */}
                <SubmissionTray
                  stagedTiles={stagedTiles}
                  targetLengths={state.config.selectedLengths}
                  onUnstageTile={handleUnstageTile}
                  onSwapTiles={handleSwapStagedTiles}
                  onBackspace={handleBackspace}
                  onClear={handleClear}
                  onSubmit={handleSubmit}
                  onShuffle={handleShuffle}
                  isValidLength={isValidLength}
                  disabled={state.status !== 'playing'}
                />

                {/* Letter Pool Matrix BELOW Selected Words */}
                <ScrambleBoard
                  tiles={state.tiles}
                  onTileClick={handleStageTile}
                  disabled={state.status !== 'playing'}
                />
              </section>

              {/* Right Column on Desktop (Discovered Words List), Bottom on Mobile */}
              <section className="w-full lg:w-5/12 flex flex-col gap-2.5">
                <FoundWordsList foundWords={state.foundWords} />
              </section>
            </main>
          </div>

          {/* Game Over Summary Modal with Return to Lobby */}
          <ScrambleSummaryModal
            isOpen={state.status === 'game_over'}
            gameState={state}
            onPlayAgain={() => handleStartGame(state.config)}
            onReturnToLobby={handleReturnToLobby}
          />
        </>
      )}
    </div>
  );
};
export default WordScrambleContainer;
