import type { ScrambleTile } from './types';
import { SCRABBLE_LETTER_VALUES } from './rainbowColors';

/**
 * Deterministic pseudo-random number generator for seedable games
 */
export function createRng(seedStr: string = Date.now().toString()) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  let s = Math.abs(seed) || 123456789;

  return function random(): number {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Spools a set of secret valid words based on target lengths
 */
export function spoolSecretWords(
  wordListMap: Record<number, string[]>,
  selectedLengths: number[],
  wordCount: number = 6,
  rng: () => number = Math.random
): string[] {
  const chosenWords: string[] = [];
  
  for (let i = 0; i < wordCount; i++) {
    const targetLength = selectedLengths[i % selectedLengths.length];
    const available = wordListMap[targetLength] || [];
    if (available.length > 0) {
      const idx = Math.floor(rng() * available.length);
      chosenWords.push(available[idx]);
    }
  }

  return chosenWords;
}

/**
 * Creates and scatters tiles from a list of base words + bonus helper tiles (vowels/common consonants)
 */
export function generateTilesFromWords(
  words: string[],
  startIdOffset: number = 0,
  rng: () => number = Math.random
): ScrambleTile[] {
  const letterPool: { letter: string; isBonus?: boolean }[] = [];

  words.forEach((w) => {
    w.toUpperCase().split('').forEach((l) => {
      letterPool.push({ letter: l, isBonus: false });
    });
  });

  // Add bonus helper tiles (butter tiles): popular vowels (A, E, I, O) & consonants (R, S, T, N, L)
  const BUTTER_TILES = ['E', 'A', 'I', 'O', 'R', 'S', 'T', 'L', 'N'];
  const bonusCount = Math.min(3, Math.max(1, Math.floor(words.length / 2)));
  for (let i = 0; i < bonusCount; i++) {
    const randomBonusLetter = BUTTER_TILES[Math.floor(rng() * BUTTER_TILES.length)];
    letterPool.push({ letter: randomBonusLetter, isBonus: true });
  }

  // Fisher-Yates shuffle
  for (let i = letterPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [letterPool[i], letterPool[j]] = [letterPool[j], letterPool[i]];
  }

  return letterPool.map((item, idx) => ({
    id: `tile_${startIdOffset + idx}_${item.letter}_${Math.floor(rng() * 10000)}`,
    letter: item.letter,
    originalIndex: startIdOffset + idx,
    status: 'available',
    colorIndex: (startIdOffset + idx) % 8,
  }));
}

/**
 * Calculate score for a submitted word
 * Applies +50% bonus if the submitted word matches one of the secret original spool words
 */
export function calculateWordScore(
  word: string,
  streak: number = 1,
  isSpoolBonus: boolean = false
): number {
  const upper = word.toUpperCase();
  let baseLetterPoints = 0;
  for (const char of upper) {
    baseLetterPoints += SCRABBLE_LETTER_VALUES[char] || 1;
  }

  // Length multiplier
  const lengthMultiplier = upper.length >= 7 ? 2.5 : upper.length >= 5 ? 1.8 : 1.2;
  const streakBonus = Math.min(streak * 0.15, 1.0); // up to +100% bonus for streak
  const spoolMultiplier = isSpoolBonus ? 1.5 : 1.0; // +50% bonus for original secret spool word

  return Math.round(baseLetterPoints * 10 * lengthMultiplier * (1 + streakBonus) * spoolMultiplier);
}

/**
 * Determine the maximum seconds allowed between word submissions to qualify as a "Hot Streak"
 * Tighter thresholds for challenging & rewarding fast gameplay:
 * 3L: 2.5s | 4L: 3.5s | 5L: 4.5s | 6L+: 6.0s
 */
export function getHotStreakTimeThreshold(wordLength: number): number {
  if (wordLength <= 3) return 2.5;
  if (wordLength === 4) return 3.5;
  if (wordLength === 5) return 4.5;
  return 6.0;
}

/**
 * Calculate dynamic time bonus in seconds for a correctly submitted word in timed mode.
 * Features progressive Hot Streak rewards for back-to-back rapid submissions.
 */
export function calculateTimeBonus(
  wordLength: number,
  score: number,
  secondsSinceLastWord: number = 5,
  isSpoolBonus: boolean = false,
  currentStreak: number = 0
): { bonusSeconds: number; isHotStreak: boolean; streakTier: number } {
  // Base bonus by length: 3L = 2s, 4L = 3s, 5L = 4s, 6L = 5s, 7L+ = 6s
  let baseBonus = Math.min(6, Math.max(2, wordLength - 1));

  // Score magnitude bonus
  if (score >= 400) baseBonus += 2;
  else if (score >= 200) baseBonus += 1;

  // Check if this submission is within the tight hot streak threshold
  const threshold = getHotStreakTimeThreshold(wordLength);
  const isHotStreak = secondsSinceLastWord <= threshold;

  // Streak Tier progression (0 = regular, 1 = On Fire, 2 = Blazing, 3 = Unstoppable)
  let streakTier = 0;
  let multiplier = 1.0;

  if (isHotStreak && currentStreak >= 2) {
    if (currentStreak >= 6) {
      streakTier = 3; // Unstoppable 🔥🔥🔥 (2.0x reward)
      multiplier = 2.0;
    } else if (currentStreak >= 4) {
      streakTier = 2; // Blazing 🔥🔥 (1.5x reward)
      multiplier = 1.5;
    } else {
      streakTier = 1; // On Fire 🔥 (1.25x reward)
      multiplier = 1.25;
    }
  } else if (isHotStreak) {
    // Single fast submission (warm-up speed bonus)
    baseBonus += 1;
  }

  // Original secret spool bonus adds +1s
  if (isSpoolBonus) {
    baseBonus += 1;
  }

  const finalBonus = Math.min(12, Math.round(baseBonus * multiplier));

  return {
    bonusSeconds: finalBonus,
    isHotStreak,
    streakTier,
  };
}


/**
 * Calculate time decay multiplier based on total words found relative to game progress.
 * After 10 words: +10% faster (1.1x)
 * After 20 words: +20% faster (1.2x)
 * After 30 words: +30% faster (1.3x)
 * After 45 words: +50% faster (1.5x)
 */
export function calculateTimeDecayMultiplier(wordsFoundCount: number): number {
  if (wordsFoundCount >= 45) return 1.5;
  if (wordsFoundCount >= 30) return 1.3;
  if (wordsFoundCount >= 20) return 1.2;
  if (wordsFoundCount >= 10) return 1.1;
  return 1.0;
}

/**
 * Fast check to determine if any unplayed valid word of the target lengths can be formed
 * from the currently available letters in the matrix.
 */
export function hasAnyRemainingValidWord(
  availableTiles: ScrambleTile[],
  targetLengths: number[],
  wordListMap: Record<number, string[]>,
  foundWordsSet: Set<string>
): boolean {
  if (availableTiles.length === 0 || targetLengths.length === 0) {
    return false;
  }

  // Count available letter frequencies
  const availableFreq: Record<string, number> = {};
  for (const t of availableTiles) {
    const l = t.letter.toUpperCase();
    availableFreq[l] = (availableFreq[l] || 0) + 1;
  }

  for (const len of targetLengths) {
    if (availableTiles.length < len) continue;

    const words = wordListMap[len] || [];
    for (let i = 0; i < words.length; i++) {
      const candidate = words[i];
      if (foundWordsSet.has(candidate)) continue;

      // Check letter count frequency
      const wordFreq: Record<string, number> = {};
      let possible = true;
      for (let j = 0; j < candidate.length; j++) {
        const char = candidate[j];
        wordFreq[char] = (wordFreq[char] || 0) + 1;
        if ((wordFreq[char] || 0) > (availableFreq[char] || 0)) {
          possible = false;
          break;
        }
      }

      if (possible) {
        return true; // Found at least 1 playable valid word!
      }
    }
  }

  return false;
}


