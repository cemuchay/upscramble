import { safeIndexedDB } from './safeIndexedDB';

export interface WordListCache {
  official: string[];
  valid: Set<string>;
}

const memoryCache = new Map<string, WordListCache>();
const pending = new Map<string, Promise<WordListCache>>();

const processWords = (rawContent: string): string[] => {
  return Array.from(
    new Set(
      rawContent
        .split(/\s+/)
        .map((w) => w.trim().toUpperCase())
        .filter((w) => w.length > 0)
    )
  ).sort();
};

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

/**
 * Loads official and valid dictionary words for a given word length.
 * Queries IndexedDB cache first; falls back to static download once per user.
 */
export async function loadWordLists(length: number, isChallenge = false): Promise<WordListCache> {
  const cacheKey = `${length}_${isChallenge}`;

  // 1. Check in-memory session cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Prevent redundant simultaneous fetches
  if (pending.has(cacheKey)) {
    return pending.get(cacheKey)!;
  }

  const promise = (async (): Promise<WordListCache> => {
    // 3. Try to read from IndexedDB
    try {
      const dbKey = `words_${length}_${isChallenge ? 'challenge' : 'standard'}`;
      const record = await safeIndexedDB.get('keyval', dbKey);
      if (record && record.value && typeof record.value === 'object') {
        const cached = record.value as { official: string[]; valid: string[] };
        if (Array.isArray(cached.official) && Array.isArray(cached.valid)) {
          const result: WordListCache = {
            official: cached.official,
            valid: new Set(cached.valid)
          };
          memoryCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn('Failed to read words from IndexedDB:', e);
    }

    // 4. Fallback to network fetch from public/words/
    try {
      const hasStrippedFile = [3, 4, 6, 7, 8, 9, 10].includes(length);
      const [officialRaw, allowedRaw, strippedRaw] = await Promise.all([
        fetch(`/words/words_${length}_official.txt`).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        }),
        fetch(`/words/words_${length}_allowed.txt`).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        }),
        isChallenge && hasStrippedFile
          ? fetch(`/words/words_${length}_official_stripped.txt`).then((r) => r.ok ? r.text() : null)
          : Promise.resolve(null)
      ]);

      const originalOfficial = processWords(officialRaw);
      const allWords = processWords(allowedRaw);
      const official = strippedRaw ? processWords(strippedRaw) : originalOfficial;

      const result: WordListCache = {
        official,
        valid: new Set([...originalOfficial, ...allWords])
      };

      memoryCache.set(cacheKey, result);

      // Save to IndexedDB asynchronously
      const dbKey = `words_${length}_${isChallenge ? 'challenge' : 'standard'}`;
      safeIndexedDB.set('keyval', {
        id: dbKey,
        value: {
          official,
          valid: Array.from(result.valid)
        },
        updatedAt: Date.now()
      }).catch((err) => console.warn('Failed to cache words into IndexedDB:', err));

      return result;
    } catch (err) {
      console.warn(`Network word fetch failed for length ${length}, using starter fallback`, err);
      const fallbackWords = fallbackMap[length] || fallbackMap[5];
      const result: WordListCache = {
        official: fallbackWords,
        valid: new Set(fallbackWords)
      };
      memoryCache.set(cacheKey, result);
      return result;
    } finally {
      pending.delete(cacheKey);
    }
  })();

  pending.set(cacheKey, promise);
  return promise;
}
