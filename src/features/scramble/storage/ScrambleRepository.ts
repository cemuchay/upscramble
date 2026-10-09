import type { ScrambleSessionStats, PendingScrambleGame } from '../engine/types';
import { safeLocalStorage } from '../../../services/safeStorage';

export interface IScrambleRepository {
  saveSession(session: ScrambleSessionStats): Promise<void>;
  getSessions(): Promise<ScrambleSessionStats[]>;
  getHighScores(): Promise<Record<string, number>>;
  savePendingGame(game: PendingScrambleGame): Promise<void>;
  getPendingGames(): Promise<PendingScrambleGame[]>;
  removePendingGame(gameId: string): Promise<void>;
  clearAllPendingGames(): Promise<void>;
  // Deprecated backward-compatible single game methods
  saveActiveGame(state: any): Promise<void>;
  loadActiveGame(): Promise<any | null>;
  clearActiveGame(): Promise<void>;
}

export class LocalStorageScrambleRepository implements IScrambleRepository {
  private readonly SESSIONS_KEY = 'word_scramble_sessions_v1';
  private readonly HIGHSCORES_KEY = 'word_scramble_highscores_v1';
  private readonly ACTIVE_GAME_KEY = 'word_scramble_active_game_v1';
  private readonly PENDING_GAMES_KEY = 'word_scramble_pending_games_v2';

  async saveSession(session: ScrambleSessionStats): Promise<void> {
    try {
      const existing = await this.getSessions();
      const updated = [session, ...existing].slice(0, 100);
      safeLocalStorage.setItem(this.SESSIONS_KEY as any, updated as any);

      // Update High Scores map by mode and letter config key
      const key = `${session.gameMode}_${session.selectedLengths.sort().join('-')}`;
      const highScores = await this.getHighScores();
      if (!highScores[key] || session.score > highScores[key]) {
        highScores[key] = session.score;
        safeLocalStorage.setItem(this.HIGHSCORES_KEY as any, highScores as any);
      }
    } catch (e) {
      console.warn('Failed to save scramble session to safeLocalStorage:', e);
    }
  }

  async getSessions(): Promise<ScrambleSessionStats[]> {
    try {
      const data = safeLocalStorage.getItem(this.SESSIONS_KEY as any);
      if (Array.isArray(data)) return data;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          return [];
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  async getHighScores(): Promise<Record<string, number>> {
    try {
      const data = safeLocalStorage.getItem(this.HIGHSCORES_KEY as any);
      if (data && typeof data === 'object') return data as Record<string, number>;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          return {};
        }
      }
      return {};
    } catch {
      return {};
    }
  }

  async getPendingGames(): Promise<PendingScrambleGame[]> {
    try {
      const data = safeLocalStorage.getItem(this.PENDING_GAMES_KEY as any);
      let list: PendingScrambleGame[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (typeof data === 'string') {
        try {
          list = JSON.parse(data);
        } catch {}
      }

      // Check legacy single active game migration
      const rawLegacy = safeLocalStorage.getItem(this.ACTIVE_GAME_KEY as any);
      if (rawLegacy && typeof rawLegacy === 'object') {
        const legacy = rawLegacy as Record<string, any>;
        if (!list.some((g) => g.id === legacy.id)) {
          const migrated: PendingScrambleGame = {
            id: legacy.id || `legacy_${Date.now()}`,
            savedAt: legacy.savedAt || new Date().toISOString(),
            config: legacy.config,
            tiles: legacy.tiles || [],
            stagedTileIds: legacy.stagedTileIds || [],
            foundWords: legacy.foundWords || [],
            score: legacy.score || 0,
            streak: legacy.streak || 0,
            highestStreak: legacy.highestStreak || 0,
            remainingSeconds: legacy.remainingSeconds || 0,
            wordsClearedSinceRefill: legacy.wordsClearedSinceRefill || 0,
            targetRefillThreshold: legacy.targetRefillThreshold || 5,
            maxCapacity: legacy.maxCapacity || 30,
            secretSpoolWords: legacy.secretSpoolWords || [],
            timeDecayMultiplier: legacy.timeDecayMultiplier || 1.0,
          };
          list.unshift(migrated);
          safeLocalStorage.removeItem(this.ACTIVE_GAME_KEY as any);
          await this.savePendingGamesList(list);
        }
      }

      return list;
    } catch (e) {
      console.warn('Failed to load pending games:', e);
      return [];
    }
  }

  private async savePendingGamesList(list: PendingScrambleGame[]): Promise<void> {
    try {
      safeLocalStorage.setItem(this.PENDING_GAMES_KEY as any, list.slice(0, 20));
    } catch (e) {
      console.warn('Failed to save pending games list:', e);
    }
  }

  async savePendingGame(game: PendingScrambleGame): Promise<void> {
    try {
      const existing = await this.getPendingGames();
      const filtered = existing.filter((g) => g.id !== game.id);
      const updated = [game, ...filtered].slice(0, 20);
      await this.savePendingGamesList(updated);
    } catch (e) {
      console.warn('Failed to save pending game:', e);
    }
  }

  async removePendingGame(gameId: string): Promise<void> {
    try {
      const existing = await this.getPendingGames();
      const updated = existing.filter((g) => g.id !== gameId);
      await this.savePendingGamesList(updated);
    } catch (e) {
      console.warn('Failed to remove pending game:', e);
    }
  }

  async clearAllPendingGames(): Promise<void> {
    try {
      safeLocalStorage.removeItem(this.PENDING_GAMES_KEY as any);
      safeLocalStorage.removeItem(this.ACTIVE_GAME_KEY as any);
    } catch (e) {
      console.warn('Failed to clear pending games:', e);
    }
  }

  // Deprecated backward-compatible methods
  async saveActiveGame(state: any): Promise<void> {
    const gameId = state.id || state.gameId || `game_${Date.now()}`;
    await this.savePendingGame({
      ...state,
      id: gameId,
      savedAt: state.savedAt || new Date().toISOString(),
    });
  }

  async loadActiveGame(): Promise<any | null> {
    const list = await this.getPendingGames();
    return list[0] ?? null;
  }

  async clearActiveGame(): Promise<void> {
    const list = await this.getPendingGames();
    if (list.length > 0) {
      await this.removePendingGame(list[0].id);
    }
  }
}

