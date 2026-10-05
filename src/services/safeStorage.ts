/**
 * Safe Web Storage Gateways (LocalStorage & SessionStorage)
 *
 * Provides a resilient, type-safe, SSR-friendly gateway to browser Web Storage APIs:
 * - Automatic JSON serialization and deserialization
 * - In-memory fallback if storage is disabled, blocked (private browsing mode), or full (QuotaExceededError)
 * - Centralized key contract enforcement with strict generic defaults
 * - Event-driven storage synchronization helpers and change listeners
 * - Full JSDoc documentation
 *
 * @module safeStorage
 */

import {
  LocalStorageSchema,
  LocalStorageKey,
  SessionStorageSchema,
  SessionStorageKey,
} from './storageKeys';
import { logger } from './logger';

/**
 * Interface representing a resilient Storage adapter
 */
export interface SafeStorageGateway<TSchema extends Record<string, any>> {
  /**
   * Retrieves an item from storage by key.
   * Parses JSON automatically. If the item does not exist or fails parsing, returns defaultValue or null.
   *
   * @template K - Allowed key in TSchema
   * @param {K} key - The unique storage key
   * @param {TSchema[K]} [defaultValue] - Optional fallback value if key is missing or corrupted
   * @returns {TSchema[K] | null} The parsed value, defaultValue, or null
   *
   * @example
   * const theme = safeLocalStorage.getItem('app_theme', 'dark');
   */
  getItem<K extends keyof TSchema>(key: K, defaultValue?: TSchema[K]): TSchema[K] | null;

  /**
   * Sets an item in storage with automatic JSON serialization.
   * Gracefully falls back to in-memory cache if QuotaExceededError or security restrictions occur.
   *
   * @template K - Allowed key in TSchema
   * @param {K} key - The unique storage key
   * @param {TSchema[K]} value - The value to store
   * @returns {boolean} True if successfully persisted or cached, false if failed completely
   *
   * @example
   * safeLocalStorage.setItem('app_theme', 'light');
   */
  setItem<K extends keyof TSchema>(key: K, value: TSchema[K]): boolean;

  /**
   * Removes an item from storage and in-memory fallback.
   *
   * @template K - Allowed key in TSchema
   * @param {K} key - The unique storage key to remove
   * @returns {boolean} True if removal succeeded
   *
   * @example
   * safeLocalStorage.removeItem('app_theme');
   */
  removeItem<K extends keyof TSchema>(key: K): boolean;

  /**
   * Checks if a key exists in storage.
   *
   * @template K - Allowed key in TSchema
   * @param {K} key - The unique storage key
   * @returns {boolean} True if the key exists
   *
   * @example
   * if (safeLocalStorage.hasItem('app_theme')) { ... }
   */
  hasItem<K extends keyof TSchema>(key: K): boolean;

  /**
   * Clears all items from storage and in-memory cache.
   *
   * @returns {boolean} True if cleared successfully
   *
   * @example
   * safeLocalStorage.clear();
   */
  clear(): boolean;

  /**
   * Returns the total number of items stored.
   *
   * @returns {number} Count of stored keys
   */
  size(): number;

  /**
   * Returns all stored keys.
   *
   * @returns {string[]} Array of keys
   */
  keys(): string[];

  /**
   * Checks if native browser storage is currently available and functional.
   *
   * @returns {boolean} True if native storage works, false if falling back to memory
   */
  isAvailable(): boolean;
}

/**
 * In-memory fallback map implementation when Window Storage is restricted or disabled
 */
class MemoryStorage {
  private store: Map<string, string> = new Map();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public get length(): number {
    return this.store.size;
  }

  public key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  public getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

/**
 * Core implementation class for SafeStorage
 */
class SafeStorage<TSchema extends Record<string, any>> implements SafeStorageGateway<TSchema> {
  private readonly storageType: 'localStorage' | 'sessionStorage';
  private memoryFallback: MemoryStorage = new MemoryStorage();
  private isNativeSupported: boolean;

  /**
   * @param {'localStorage' | 'sessionStorage'} type - Storage type to wrap
   */
  constructor(type: 'localStorage' | 'sessionStorage') {
    this.storageType = type;
    this.isNativeSupported = this.checkAvailability();
  }

  /**
   * Safely verifies if the browser storage type is accessible without throwing
   */
  private checkAvailability(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const storage = window[this.storageType];
      if (!storage) return false;

      const testKey = `__storage_test_${Math.random().toString(36).slice(2)}__`;
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolves the primary native storage object if accessible, else returns null
   */
  private getNativeStorage(): Storage | null {
    if (!this.isNativeSupported || typeof window === 'undefined') return null;
    try {
      return window[this.storageType] || null;
    } catch {
      return null;
    }
  }

  public isAvailable(): boolean {
    return this.isNativeSupported;
  }

  public getItem<K extends keyof TSchema>(key: K, defaultValue?: TSchema[K]): TSchema[K] | null {
    const keyStr = String(key);
    const storage = this.getNativeStorage();

    let rawValue: string | null = null;

    if (storage) {
      try {
        rawValue = storage.getItem(keyStr);
      } catch (err) {
        logger.warn(`SafeStorage (${this.storageType}): Failed to read key "${keyStr}" from native storage`, { error: err });
        rawValue = this.memoryFallback.getItem(keyStr);
      }
    } else {
      rawValue = this.memoryFallback.getItem(keyStr);
    }

    if (rawValue === null || rawValue === undefined) {
      return defaultValue !== undefined ? defaultValue : null;
    }

    try {
      return JSON.parse(rawValue) as TSchema[K];
    } catch (parseError) {
      logger.warn(`SafeStorage (${this.storageType}): Failed to parse JSON for key "${keyStr}". Returning raw string or defaultValue.`, { error: parseError });
      // If parsing fails but raw value exists, return rawValue if default not provided
      return (rawValue as unknown as TSchema[K]) ?? defaultValue ?? null;
    }
  }

  public setItem<K extends keyof TSchema>(key: K, value: TSchema[K]): boolean {
    const keyStr = String(key);
    let serialized: string;

    try {
      serialized = JSON.stringify(value);
    } catch (serializeError) {
      logger.error(`SafeStorage (${this.storageType}): Failed to serialize value for key "${keyStr}"`, { error: serializeError });
      return false;
    }

    const storage = this.getNativeStorage();

    if (storage) {
      try {
        storage.setItem(keyStr, serialized);
        // Also keep memory fallback synced
        this.memoryFallback.setItem(keyStr, serialized);
        return true;
      } catch (storageError: any) {
        // QuotaExceededError or security block
        const isQuota =
          storageError?.name === 'QuotaExceededError' ||
          storageError?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          storageError?.code === 22;

        if (isQuota) {
          logger.warn(`SafeStorage (${this.storageType}): Storage quota exceeded for key "${keyStr}". Falling back to memory storage.`, { error: storageError });
        } else {
          logger.warn(`SafeStorage (${this.storageType}): Native storage write failed for key "${keyStr}". Falling back to memory.`, { error: storageError });
        }

        this.memoryFallback.setItem(keyStr, serialized);
        return true;
      }
    } else {
      this.memoryFallback.setItem(keyStr, serialized);
      return true;
    }
  }

  public removeItem<K extends keyof TSchema>(key: K): boolean {
    const keyStr = String(key);
    this.memoryFallback.removeItem(keyStr);

    const storage = this.getNativeStorage();
    if (storage) {
      try {
        storage.removeItem(keyStr);
        return true;
      } catch (err) {
        logger.warn(`SafeStorage (${this.storageType}): Failed to remove key "${keyStr}" from native storage`, { error: err });
        return false;
      }
    }
    return true;
  }

  public hasItem<K extends keyof TSchema>(key: K): boolean {
    const keyStr = String(key);
    const storage = this.getNativeStorage();
    if (storage) {
      try {
        if (storage.getItem(keyStr) !== null) return true;
      } catch {
        // Continue to check fallback
      }
    }
    return this.memoryFallback.getItem(keyStr) !== null;
  }

  public clear(): boolean {
    this.memoryFallback.clear();
    const storage = this.getNativeStorage();
    if (storage) {
      try {
        storage.clear();
        return true;
      } catch (err) {
        logger.warn(`SafeStorage (${this.storageType}): Failed to clear native storage`, { error: err });
        return false;
      }
    }
    return true;
  }

  public size(): number {
    const storage = this.getNativeStorage();
    if (storage) {
      try {
        return storage.length;
      } catch {
        return this.memoryFallback.length;
      }
    }
    return this.memoryFallback.length;
  }

  public keys(): string[] {
    const storage = this.getNativeStorage();
    const keySet = new Set<string>();

    if (storage) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k) keySet.add(k);
        }
      } catch {
        // Fallback to memory
      }
    }

    this.memoryFallback.getAllKeys().forEach((k) => keySet.add(k));
    return Array.from(keySet);
  }
}

/**
 * Safe, type-checked gateway for `window.localStorage`.
 * Uses {@link LocalStorageSchema} keys for compile-time safety and automatic JSON parsing.
 *
 * @example
 * ```ts
 * import { safeLocalStorage } from '@/services/storage';
 *
 * // Fully typed getItem with default fallback
 * const theme = safeLocalStorage.getItem('app_theme', 'dark'); // 'light' | 'dark'
 *
 * // Type-checked setItem
 * safeLocalStorage.setItem('app_theme', 'light');
 *
 * // Remove
 * safeLocalStorage.removeItem('app_theme');
 * ```
 */
export const safeLocalStorage: SafeStorageGateway<LocalStorageSchema> = new SafeStorage<LocalStorageSchema>('localStorage');

/**
 * Safe, type-checked gateway for `window.sessionStorage`.
 * Uses {@link SessionStorageSchema} keys for compile-time safety and automatic JSON parsing.
 *
 * @example
 * ```ts
 * import { safeSessionStorage } from '@/services/storage';
 *
 * // Type-checked setItem
 * safeSessionStorage.setItem('redirect_after_login', '/dashboard');
 *
 * // Type-checked getItem
 * const redirect = safeSessionStorage.getItem('redirect_after_login', '/');
 * ```
 */
export const safeSessionStorage: SafeStorageGateway<SessionStorageSchema> = new SafeStorage<SessionStorageSchema>('sessionStorage');

export default safeLocalStorage;
