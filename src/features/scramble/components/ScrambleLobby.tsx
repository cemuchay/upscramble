import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScrambleConfig } from '../engine/types';
import { ScrambleTutorialModal } from './ScrambleTutorialModal';
import { ModalLayout } from '@/components/layout/ModalLayout';
import { useScrambleLobby, AVAILABLE_LENGTHS } from '../hooks/useScrambleLobby';
import {
  Play,
  Sparkles,
  Clock,
  Infinity as InfinityIcon,
  RotateCcw,
  Trash2,
  Trophy,
  History,
  Flame,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Share2,
  Dices,
} from 'lucide-react';

interface ScrambleLobbyProps {
  onStartNewGame: (config: ScrambleConfig) => void;
  onResumeGame: (savedState: any) => void;
  onBackToMenu?: () => void;
}

export const ScrambleLobby: React.FC<ScrambleLobbyProps> = ({
  onStartNewGame,
  onResumeGame,
  onBackToMenu,
}) => {
  const {
    activeTab,
    pendingGames,
    historySessions,
    showTutorial,
    primaryLength,
    additionalLengths,
    selectedLengths,
    mode,
    durationSeconds,
    showConfirmModal,
    isAutoSubmitEnabled,
    highestOverallScore,
    handleTabChange,
    handleTutorialComplete,
    handleOpenTutorial,
    handleSelectPrimaryLength,
    handleToggleAdditionalLength,
    setMode,
    setDurationSeconds,
    handleRandomizeConfig,
    handleOpenReviewModal,
    handleCloseReviewModal,
    handleLaunchGame,
    handleDeletePendingGame,
    handleClearAllPendingGames,
  } = useScrambleLobby({ onStartNewGame });

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4 animate-in fade-in duration-200">
      {/* Top Banner / Navigation */}
      <header className="w-full flex items-center justify-between p-3 sm:p-4 rounded-3xl bg-slate-950/90 border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onBackToMenu && (
            <button
              onClick={onBackToMenu}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>More Games</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-400 text-slate-950 font-black text-sm shadow-md">
              🔀
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                Word Scramble Lobby
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Rainbow Anagram Matrix & Word Puzzle Arena
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Stats, Share & How to Play Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              const shareData = {
                title: 'UpScramble - Word Scramble Puzzle',
                text: 'Challenge your brain with UpScramble! Find words, beat timers, and build streaks in this word scramble game.',
                url: window.location.origin + window.location.pathname,
              };
              if (navigator.share) {
                navigator.share(shareData).catch(() => { });
              } else {
                navigator.clipboard.writeText(shareData.url);
                alert('Game link copied to clipboard!');
              }
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
            title="Share UpScramble"
          >
            <Share2 className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleOpenTutorial}
            className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-cyan-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
            title="How to Play Tutorial"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">How to Play</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30">
            <Trophy className="w-4 h-4 text-amber-400" />
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Best Score</span>
              <span className="text-xs font-black text-amber-300">{highestOverallScore.toLocaleString()} pts</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tutorial Modal */}
      <ScrambleTutorialModal
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialComplete}
      />

      {/* Navigation Tabs (Create Game / Pending Game / History) */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner">
        <button
          onClick={() => handleTabChange('create')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'create'
            ? 'bg-gradient-to-r from-pink-500/20 via-amber-500/20 to-cyan-500/20 text-white border border-pink-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>New Game</span>
        </button>

        <button
          onClick={() => handleTabChange('pending')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${activeTab === 'pending'
            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Pending Games {pendingGames.length > 0 && `(${pendingGames.length})`}</span>
          {pendingGames.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-2.5 right-3" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('history')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'history'
            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>Game History ({historySessions.length})</span>
        </button>
      </div>

      {/* Tab Body */}
      <AnimatePresence mode="wait">
        {activeTab === 'create' && (
          <motion.div
            key="create-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* Left Col: Setup Configuration */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-black tracking-tight text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>Customize Game Setup</span>
                </h2>

                <button
                  type="button"
                  onClick={handleRandomizeConfig}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 hover:from-amber-500/30 hover:to-pink-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                  title="Randomly generate game setup"
                >
                  <Dices className="w-4 h-4 text-amber-400" />
                  <span>Random Setup</span>
                </button>
              </div>

              {/* 2-Row Word Length Selector */}
              <div className="space-y-4">
                {/* Row 1: Primary Target Length */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-pink-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px] font-black">1</span>
                      <span>Primary Word Length (Pick 1)</span>
                    </h2>
                    <span className="text-[11px] font-black text-pink-400">
                      {primaryLength} Letters Main
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {AVAILABLE_LENGTHS.map((len) => {
                      const isSelected = primaryLength === len;
                      return (
                        <button
                          key={len}
                          onClick={() => handleSelectPrimaryLength(len)}
                          className={`
                            py-2 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 border cursor-pointer
                            ${isSelected
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] scale-105'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                            }
                          `}
                        >
                          {len}L
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: Additional Accepted Lengths */}
                <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Additional Accepted Lengths (Optional, max 2)</span>
                    </h2>
                    <span className="text-[11px] font-bold text-cyan-400">
                      {additionalLengths.length}/2 Selected
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {AVAILABLE_LENGTHS.map((len) => {
                      const isPrimary = primaryLength === len;
                      const isSelected = additionalLengths.includes(len);
                      return (
                        <button
                          key={len}
                          disabled={isPrimary}
                          onClick={() => handleToggleAdditionalLength(len)}
                          className={`
                            py-2 rounded-xl font-black text-xs sm:text-sm transition-all duration-150 border cursor-pointer
                            ${isPrimary
                              ? 'bg-slate-900 text-slate-600 border-slate-800 opacity-40 cursor-not-allowed'
                              : isSelected
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)] scale-105'
                                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                            }
                          `}
                        >
                          {len}L
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    Accepts additional shorter or longer anagram words alongside your primary {primaryLength}L words.
                  </div>
                </div>

                {/* Active Selection Summary */}
                <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
                  <span>
                    Active Game Lengths:{' '}
                    <strong className="text-amber-400 font-bold">
                      {selectedLengths.map((l) => `${l}L`).join(', ')}
                    </strong>
                  </span>
                  {isAutoSubmitEnabled ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      ⚡ Auto-submit enabled (Single Length)
                    </span>
                  ) : (
                    <span className="text-amber-300 font-bold">Manual SUBMIT button required</span>
                  )}
                </div>
              </div>

              {/* Game Mode */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Game Mode</span>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('timed')}
                    className={`
                      p-3.5 rounded-2xl flex items-center gap-3 border transition-all text-left cursor-pointer
                      ${mode === 'timed'
                        ? 'bg-gradient-to-r from-cyan-950/70 to-blue-900/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }
                    `}
                  >
                    <Clock className={`w-6 h-6 ${mode === 'timed' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-bold text-sm text-slate-100">Timed Rush</div>
                      <div className="text-[11px] text-slate-400">Board refills as you score</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('untimed')}
                    className={`
                      p-3.5 rounded-2xl flex items-center gap-3 border transition-all text-left cursor-pointer
                      ${mode === 'untimed'
                        ? 'bg-gradient-to-r from-purple-950/70 to-indigo-900/60 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }
                    `}
                  >
                    <InfinityIcon className={`w-6 h-6 ${mode === 'untimed' ? 'text-purple-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-bold text-sm text-slate-100">Untimed Puzzle</div>
                      <div className="text-[11px] text-slate-400">Fixed pool, clear the grid</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Duration (Timed only) */}
              {mode === 'timed' && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black">3</span>
                    <span>Time Duration</span>
                  </h2>
                  <div className="grid grid-cols-4 gap-2">
                    {[45, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setDurationSeconds(sec)}
                        className={`
                          py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer
                          ${durationSeconds === sec
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-600'
                          }
                        `}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Setup Preview & Start Button */}
            <div className="lg:col-span-5 flex flex-col space-y-3.5 pb-2">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                  Game Configuration Summary
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Target Lengths:</span>
                    <span className="font-black text-amber-400">
                      {selectedLengths.map((l) => `${l} Letters`).join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Game Mode:</span>
                    <span className="font-black text-cyan-300">
                      {mode === 'timed' ? `Timed Rush (${durationSeconds}s)` : 'Untimed Puzzle'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Grid Pool:</span>
                    <span className="font-bold text-emerald-300">
                      Auto-Balanced (Smart Capacity)
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Auto-Submit:</span>
                    <span className={`font-bold ${isAutoSubmitEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isAutoSubmitEnabled ? 'Enabled (Single Length)' : 'Manual SUBMIT Button'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-400">Dictionary:</span>
                    <span className="text-slate-200 font-medium">Scrabble / English Validated</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Form valid words quickly to build up streaks and score bonus rainbow multipliers!
                  </span>
                </div>
              </div>

              {/* Action Buttons: Start New Game and Quick Randomize */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleOpenReviewModal}
                  className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.6)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START NEW GAME</span>
                </button>

                <button
                  type="button"
                  onClick={handleRandomizeConfig}
                  className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-amber-300 hover:text-amber-200 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                >
                  <Dices className="w-4 h-4 text-amber-400" />
                  <span>Roll Random Setup</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Game Configuration Confirmation & Review Modal */}
        <ModalLayout
          isOpen={showConfirmModal}
          onClose={handleCloseReviewModal}
          title="Review Game Settings"
          maxWidth="sm"
          containerClassName="bg-slate-900 border border-indigo-500/40 shadow-2xl text-slate-100 p-4 sm:p-5"
        >
          <div className="space-y-4 pt-1">
            <p className="text-xs text-slate-300">
              Ready to scramble? Review your selected setup before launching:
            </p>

            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Target Lengths</span>
                <span className="font-black text-amber-400">
                  {selectedLengths.map((l) => `${l} Letters`).join(', ')}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Mode</span>
                <span className="font-black text-cyan-300">
                  {mode === 'timed' ? `⚡ Timed Rush (${durationSeconds}s)` : '♾️ Untimed Puzzle'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Auto-Submit</span>
                <span className={`font-bold ${isAutoSubmitEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isAutoSubmitEnabled ? 'Enabled' : 'Manual Submit'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Dictionary</span>
                <span className="text-slate-300 font-medium">Scrabble / English</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCloseReviewModal}
                className="py-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Change Settings
              </button>

              <button
                type="button"
                onClick={handleLaunchGame}
                className="py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>LET'S PLAY</span>
              </button>
            </div>
          </div>
        </ModalLayout>

        {activeTab === 'pending' && (
          <motion.div
            key="pending-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full space-y-4"
          >
            {pendingGames.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Unfinished Saved Games ({pendingGames.length})
                  </span>
                  <button
                    onClick={handleClearAllPendingGames}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                {pendingGames.map((game) => (
                  <div
                    key={game.id}
                    className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-xl space-y-4 hover:border-amber-500/60 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                          <RotateCcw className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-100">
                            {game.config?.mode === 'timed' ? '⚡ Timed Rush' : '♾️ Untimed Puzzle'}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Saved on {new Date(game.savedAt || Date.now()).toLocaleDateString()}{' '}
                            {new Date(game.savedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
                        {game.config?.selectedLengths.map((l) => `${l}L`).join(', ')}
                      </span>
                    </div>

                    {/* Score & Progress Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Current Score</span>
                        <div className="text-lg font-black text-amber-300 mt-0.5">
                          {(game.score || 0).toLocaleString()} pts
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Words Cleared</span>
                        <div className="text-lg font-black text-cyan-300 mt-0.5">
                          {(game.foundWords || []).length}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Current Streak</span>
                        <div className="text-lg font-black text-rose-400 mt-0.5 flex items-center gap-1">
                          <Flame className="w-4 h-4 fill-current" />
                          <span>{game.streak || 0}x</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {game.config?.mode === 'timed' ? 'Time Remaining' : 'Status'}
                        </span>
                        <div className="text-lg font-black text-emerald-300 mt-0.5">
                          {game.config?.mode === 'timed'
                            ? `${game.remainingSeconds || 0}s`
                            : 'Active'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={(e) => handleDeletePendingGame(game.id, e)}
                        className="py-3 px-4 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/50 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Discard</span>
                      </button>

                      <button
                        onClick={() => onResumeGame(game)}
                        className="flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-slate-950 shadow-[0_0_25px_rgba(251,146,60,0.5)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>RESUME GAME</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">
                  No Unfinished Games
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You do not have any pending games in progress. Start a new game anytime!
                </p>
                <button
                  onClick={() => handleTabChange('create')}
                  className="mt-2 py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create New Game</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Top High Score Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Games Played</span>
                <div className="text-2xl font-black text-cyan-300 mt-1">
                  {historySessions.length}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                <span className="text-[10px] font-bold uppercase text-slate-400">All-Time High Score</span>
                <div className="text-2xl font-black text-amber-300 mt-1">
                  {highestOverallScore.toLocaleString()} pts
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Words Formed</span>
                <div className="text-2xl font-black text-emerald-300 mt-1">
                  {historySessions.reduce((acc, s) => acc + (s.totalWordsCount || 0), 0)}
                </div>
              </div>
            </div>

            {/* List of Game Sessions */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 mb-2">
              {historySessions.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-950 text-indigo-300 border border-indigo-700/40">
                        {item.gameMode}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {item.selectedLengths.map((l) => `${l}L`).join(', ')}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">
                      {item.totalWordsCount} words found ·{' '}
                      {new Date(item.completedAt).toLocaleDateString()}{' '}
                      {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {item.longestWord && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Longest: <strong className="text-slate-300 font-bold">{item.longestWord}</strong>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-black text-emerald-400">
                      {item.score.toLocaleString()} pts
                    </div>
                    {item.highestStreak > 1 && (
                      <div className="text-[10px] text-orange-400 font-bold flex items-center justify-end gap-0.5 mt-0.5">
                        <Flame className="w-3 h-3 fill-current" />
                        <span>{item.highestStreak}x streak</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {historySessions.length === 0 && (
                <div className="p-12 rounded-3xl bg-slate-900/80 border border-slate-800 text-center text-slate-500 text-xs">
                  No games played yet. Start your first game from the New Game tab!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScrambleLobby;
