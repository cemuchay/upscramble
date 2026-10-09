import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ScrambleConfig, ScrambleGameMode, ScrambleSessionStats, PendingScrambleGame } from '../engine/types';
import { LocalStorageScrambleRepository } from '../storage/ScrambleRepository';
import { safeLocalStorage } from '../../../services/safeStorage';

export const AVAILABLE_LENGTHS = [3, 4, 5, 6, 7, 8, 9, 10];
const TUTORIAL_STORAGE_KEY = 'wordscramble_tutorial_completed';
const CONFIG_STORAGE_KEY = 'wordscramble_last_config';
const ACTIVE_TAB_STORAGE_KEY = 'wordscramble_active_tab_v1';

interface SavedScrambleConfig {
  primaryLength: number;
  additionalLengths: number[];
  mode: ScrambleGameMode;
  durationSeconds: number;
}

interface UseScrambleLobbyProps {
  onStartNewGame: (config: ScrambleConfig) => void;
}

export function useScrambleLobby({ onStartNewGame }: UseScrambleLobbyProps) {
  const repository = useMemo(() => new LocalStorageScrambleRepository(), []);

  const [activeTab, setActiveTab] = useState<'create' | 'pending' | 'history'>(() => {
    try {
      const saved = safeLocalStorage.getItem(ACTIVE_TAB_STORAGE_KEY as any);
      if (saved === 'create' || saved === 'pending' || saved === 'history') {
        return saved;
      }
    } catch {}
    return 'create';
  });

  const [pendingGames, setPendingGames] = useState<PendingScrambleGame[]>([]);
  const [historySessions, setHistorySessions] = useState<ScrambleSessionStats[]>([]);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    const val = String(safeLocalStorage.getItem(TUTORIAL_STORAGE_KEY) ?? '');
    return val !== 'true';
  });

  // Game configuration state initialized lazily from storage
  const [primaryLength, setPrimaryLength] = useState<number>(() => {
    try {
      const raw = safeLocalStorage.getItem(CONFIG_STORAGE_KEY as any);
      if (raw && typeof raw === 'object' && 'primaryLength' in (raw as any)) {
        return (raw as any).primaryLength;
      }
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return parsed.primaryLength ?? 5;
      }
    } catch {}
    return 5;
  });

  const [additionalLengths, setAdditionalLengths] = useState<number[]>(() => {
    try {
      const raw = safeLocalStorage.getItem(CONFIG_STORAGE_KEY as any);
      if (raw && typeof raw === 'object' && 'additionalLengths' in (raw as any)) {
        return (raw as any).additionalLengths || [];
      }
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return parsed.additionalLengths || [];
      }
    } catch {}
    return [];
  });

  const [mode, setMode] = useState<ScrambleGameMode>(() => {
    try {
      const raw = safeLocalStorage.getItem(CONFIG_STORAGE_KEY as any);
      if (raw && typeof raw === 'object' && 'mode' in (raw as any)) {
        return (raw as any).mode || 'timed';
      }
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return parsed.mode || 'timed';
      }
    } catch {}
    return 'timed';
  });

  const [durationSeconds, setDurationSeconds] = useState<number>(() => {
    try {
      const raw = safeLocalStorage.getItem(CONFIG_STORAGE_KEY as any);
      if (raw && typeof raw === 'object' && 'durationSeconds' in (raw as any)) {
        return (raw as any).durationSeconds || 90;
      }
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return parsed.durationSeconds || 90;
      }
    } catch {}
    return 90;
  });

  const [useScrabbleDict] = useState<boolean>(true);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Tab switcher with persistence
  const handleTabChange = useCallback((tab: 'create' | 'pending' | 'history') => {
    setActiveTab(tab);
    safeLocalStorage.setItem(ACTIVE_TAB_STORAGE_KEY as any, tab);
  }, []);

  const handleTutorialComplete = useCallback(() => {
    safeLocalStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setShowTutorial(false);
  }, []);

  const handleOpenTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  // Persist config selection whenever values change
  useEffect(() => {
    const toSave: SavedScrambleConfig = {
      primaryLength,
      additionalLengths,
      mode,
      durationSeconds,
    };
    safeLocalStorage.setItem(CONFIG_STORAGE_KEY as any, toSave as any);
  }, [primaryLength, additionalLengths, mode, durationSeconds]);

  // Load storage data
  const loadData = useCallback(async () => {
    const list = await repository.getPendingGames();
    setPendingGames(list);
    const sessions = await repository.getSessions();
    setHistorySessions(sessions);
  }, [repository]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combined selected lengths for game logic
  const selectedLengths = useMemo(() => {
    return Array.from(new Set([primaryLength, ...additionalLengths])).sort((a, b) => a - b);
  }, [primaryLength, additionalLengths]);

  const handleSelectPrimaryLength = useCallback((len: number) => {
    setPrimaryLength(len);
    setAdditionalLengths((prev) => prev.filter((l) => l !== len));
  }, []);

  const handleToggleAdditionalLength = useCallback((len: number) => {
    if (len === primaryLength) return;

    if (additionalLengths.includes(len)) {
      setAdditionalLengths((prev) => prev.filter((l) => l !== len));
    } else {
      if (additionalLengths.length < 2) {
        setAdditionalLengths((prev) => [...prev, len].sort((a, b) => a - b));
      } else {
        setAdditionalLengths((prev) => [prev[1], len].sort((a, b) => a - b));
      }
    }
  }, [primaryLength, additionalLengths]);

  const handleRandomizeConfig = useCallback(() => {
    const randomPrimary = AVAILABLE_LENGTHS[Math.floor(Math.random() * (AVAILABLE_LENGTHS.length - 2))];
    const wantsAdditional = Math.random() > 0.5;
    let randomAdditionals: number[] = [];
    if (wantsAdditional) {
      const candidates = AVAILABLE_LENGTHS.filter((l) => l !== randomPrimary);
      const count = Math.random() > 0.5 ? 2 : 1;
      const shuffled = [...candidates].sort(() => 0.5 - Math.random());
      randomAdditionals = shuffled.slice(0, count).sort((a, b) => a - b);
    }

    const randomMode: ScrambleGameMode = Math.random() > 0.35 ? 'timed' : 'untimed';
    const durations = [60, 90, 120, 180];
    const randomDuration = durations[Math.floor(Math.random() * durations.length)];

    setPrimaryLength(randomPrimary);
    setAdditionalLengths(randomAdditionals);
    setMode(randomMode);
    setDurationSeconds(randomDuration);
  }, []);

  const handleOpenReviewModal = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleCloseReviewModal = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const handleLaunchGame = useCallback(() => {
    setShowConfirmModal(false);
    const wordsPerSpool = selectedLengths.length === 1 && selectedLengths[0] <= 4 ? 8 : 6;
    onStartNewGame({
      selectedLengths,
      mode,
      durationSeconds: mode === 'timed' ? durationSeconds : 0,
      wordsPerSpool,
      maxCapacity: 0,
      useScrabbleDict,
      seed: Date.now().toString(),
    });
  }, [selectedLengths, mode, durationSeconds, useScrabbleDict, onStartNewGame]);

  const handleDeletePendingGame = useCallback(async (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to discard this unfinished game?')) {
      await repository.removePendingGame(gameId);
      setPendingGames((prev) => prev.filter((g) => g.id !== gameId));
    }
  }, [repository]);

  const handleClearAllPendingGames = useCallback(async () => {
    if (window.confirm('Discard all unfinished saved games?')) {
      await repository.clearAllPendingGames();
      setPendingGames([]);
    }
  }, [repository]);

  const isAutoSubmitEnabled = selectedLengths.length === 1;

  const highestOverallScore = useMemo(() => {
    if (historySessions.length === 0) return 0;
    return Math.max(...historySessions.map((s) => s.score));
  }, [historySessions]);

  return {
    // State
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

    // Actions / Handlers
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
  };
}
