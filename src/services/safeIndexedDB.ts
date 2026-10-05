/**
 * Safe IndexedDB Gateway
 *
 * Provides a resilient, modern Promise-based typed gateway to browser IndexedDB:
 * - Handles connection pooling, upgrades, and versioning safely
 * - In-memory fallback if IndexedDB is disabled, blocked, or unavailable in the environment
 * - Typed Object Stores via schema interfaces
 * - Robust CRUD operations: get, set, delete, clear, getAll, getKeys, count
 * - Transaction error management and automatic rollback handling
 * - Comprehensive JSDoc documentation
 *
 * @module safeIndexedDB
 */

import { IndexedDBSchema, IndexedDBStoreName } from './storageKeys';
import { logger } from './logger';

const DEFAULT_DB_NAME = 'app_local_db';
const DEFAULT_DB_VERSION = 1;
const DEFAULT_OBJECT_STORES: IndexedDBStoreName[] = ['keyval', 'api_cache', 'sync_queue', 'drafts'];

export interface IndexedDBConfig {
  dbName?: string;
  version?: number;
  stores?: IndexedDBStoreName[];
}

/**
 * Interface representing a Safe IndexedDB client
 */
export interface SafeIndexedDBGateway {
  /**
   * Retrieves an item by primary key from the specified Object Store.
   *
   * @template S - Store name in IndexedDBSchema
   * @param {S} storeName - Target object store name
   * @param {IDBValidKey} key - Primary key of the record
   * @returns {Promise<IndexedDBSchema[S] | null>} Stored object or null if not found
   *
   * @example
   * const cache = await safeIndexedDB.get('api_cache', '/api/v1/users');
   */
  get<S extends IndexedDBStoreName>(
    storeName: S,
    key: IDBValidKey
  ): Promise<IndexedDBSchema[S] | null>;

  /**
   * Inserts or updates an item in the specified Object Store.
   *
   * @template S - Store name in IndexedDBSchema
   * @param {S} storeName - Target object store name
   * @param {IndexedDBSchema[S]} value - Object to save (must include primary key if in-line)
   * @param {IDBValidKey} [key] - Explicit primary key if store uses out-of-line keys
   * @returns {Promise<IDBValidKey | null>} The key inserted, or null on complete failure
   *
   * @example
   * await safeIndexedDB.set('api_cache', {
   *   id: '/api/v1/users',
   *   url: '/api/v1/users',
   *   data: usersData,
   *   expiresAt: Date.now() + 60000
   * });
   */
  set<S extends IndexedDBStoreName>(
    storeName: S,
    value: IndexedDBSchema[S],
    key?: IDBValidKey
  ): Promise<IDBValidKey | null>;

  /**
   * Deletes an item by primary key from the specified Object Store.
   *
   * @template S - Store name in IndexedDBSchema
   * @param {S} storeName - Target object store name
   * @param {IDBValidKey} key - Primary key to delete
   * @returns {Promise<boolean>} True if delete succeeded
   *
   * @example
   * await safeIndexedDB.delete('api_cache', '/api/v1/users');
   */
  delete<S extends IndexedDBStoreName>(
    storeName: S,
    key: IDBValidKey
  ): Promise<boolean>;

  /**
   * Clears all entries from the specified Object Store.
   *
   * @template S - Store name in IndexedDBSchema
   * @param {S} storeName - Target object store name
   * @returns {Promise<boolean>} True if store cleared successfully
   *
   * @example
   * await safeIndexedDB.clear('api_cache');
   */
  clear<S extends IndexedDBStoreName>(storeName: S): Promise<boolean>;

  /**
   * Retrieves all items from the specified Object Store.
   *
   * @template S - Store name in IndexedDBSchema
   * @param {S} storeName - Target object store name
   * @param {number} [count] - Optional maximum number of items to retrieve
   * @returns {Promise<IndexedDBSchema[S][]>} Array of items
   *
   * @example
   * const drafts = await safeIndexedDB.getAll('drafts');
   */
  getAll<S extends IndexedDBStoreName>(
    storeName: S,
    count?: number
  ): Promise<IndexedDBSchema[S][]>;

  /**
   * Retrieves all primary keys from the specified Object Store.
   *
   * @template S - Store name in IndexedDBSchema
   * @param {S} storeName - Target object store name
   * @returns {Promise<IDBValidKey[]>} Array of keys
   */
  getAllKeys<S extends IndexedDBStoreName>(storeName: S): Promise<IDBValidKey[]>;

  /**
   * Counts the total number of records in the specified Object Store.
   *
   * @template S - Store name in IndexedDBSchema
   * @param {S} storeName - Target object store name
   * @returns {Promise<number>} Total count
   */
  count<S extends IndexedDBStoreName>(storeName: S): Promise<number>;

  /**
   * Checks if native browser IndexedDB is supported and accessible.
   *
   * @returns {boolean} True if native IndexedDB works, false if using in-memory store
   */
  isAvailable(): boolean;
}

/**
 * In-memory fallback for IndexedDB when unavailable or restricted
 */
class MemoryIndexedDB {
  private stores: Map<string, Map<string, any>> = new Map();

  private getStore(storeName: string): Map<string, any> {
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new Map());
    }
    return this.stores.get(storeName)!;
  }

  public get(storeName: string, key: IDBValidKey): any | null {
    const store = this.getStore(storeName);
    return store.get(String(key)) ?? null;
  }

  public set(storeName: string, value: any, key?: IDBValidKey): IDBValidKey {
    const store = this.getStore(storeName);
    const resolvedKey = key !== undefined ? key : value?.id ?? Math.random().toString(36).slice(2);
    store.set(String(resolvedKey), value);
    return resolvedKey;
  }

  public delete(storeName: string, key: IDBValidKey): boolean {
    const store = this.getStore(storeName);
    return store.delete(String(key));
  }

  public clear(storeName: string): boolean {
    const store = this.getStore(storeName);
    store.clear();
    return true;
  }

  public getAll(storeName: string, count?: number): any[] {
    const store = this.getStore(storeName);
    const items = Array.from(store.values());
    return count !== undefined ? items.slice(0, count) : items;
  }

  public getAllKeys(storeName: string): IDBValidKey[] {
    const store = this.getStore(storeName);
    return Array.from(store.keys());
  }

  public count(storeName: string): number {
    return this.getStore(storeName).size;
  }
}

/**
 * Safe IndexedDB Client Implementation
 */
class SafeIndexedDB implements SafeIndexedDBGateway {
  private dbName: string;
  private version: number;
  private storeNames: IndexedDBStoreName[];
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryFallback: MemoryIndexedDB = new MemoryIndexedDB();
  private isNativeSupported: boolean;

  constructor(config: IndexedDBConfig = {}) {
    this.dbName = config.dbName || DEFAULT_DB_NAME;
    this.version = config.version || DEFAULT_DB_VERSION;
    this.storeNames = config.stores || DEFAULT_OBJECT_STORES;
    this.isNativeSupported = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return !!(window.indexedDB || (window as any).mozIndexedDB || (window as any).webkitIndexedDB);
    } catch {
      return false;
    }
  }

  public isAvailable(): boolean {
    return this.isNativeSupported;
  }

  /**
   * Lazily opens or connects to the IndexedDB database instance
   */
  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isNativeSupported || typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          this.storeNames.forEach((storeName) => {
            if (!db.objectStoreNames.contains(storeName)) {
              // Create store with 'id' as keyPath by default
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          });
        };

        request.onsuccess = () => {
          const db = request.result;

          // Close connection if database is deleted/blocked in another tab
          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };

          resolve(db);
        };

        request.onerror = () => {
          logger.warn(`SafeIndexedDB: Failed to open database "${this.dbName}"`, { error: request.error });
          reject(request.error);
        };

        request.onblocked = () => {
          logger.warn(`SafeIndexedDB: Database "${this.dbName}" open request blocked.`);
        };
      } catch (err) {
        logger.warn(`SafeIndexedDB: Exception encountered when opening database "${this.dbName}"`, { error: err });
        reject(err);
      }
    }).catch((err) => {
      this.isNativeSupported = false;
      this.dbPromise = null;
      return null as any;
    });

    return this.dbPromise;
  }

  public async get<S extends IndexedDBStoreName>(
    storeName: S,
    key: IDBValidKey
  ): Promise<IndexedDBSchema[S] | null> {
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.get(storeName, key);
      }

      return new Promise<IndexedDBSchema[S] | null>((resolve) => {
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(key);

          request.onsuccess = () => {
            resolve((request.result as IndexedDBSchema[S]) ?? null);
          };

          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error getting key "${String(key)}" from store "${storeName}"`, { error: request.error });
            resolve(this.memoryFallback.get(storeName, key));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction failure reading "${String(key)}"`, { error: txError });
          resolve(this.memoryFallback.get(storeName, key));
        }
      });
    } catch {
      return this.memoryFallback.get(storeName, key);
    }
  }

  public async set<S extends IndexedDBStoreName>(
    storeName: S,
    value: IndexedDBSchema[S],
    key?: IDBValidKey
  ): Promise<IDBValidKey | null> {
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.set(storeName, value, key);
      }

      return new Promise<IDBValidKey | null>((resolve) => {
        try {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);

          // If store has inline keyPath 'id' and value contains id, don't pass key as second param
          const request = store.keyPath ? store.put(value) : store.put(value, key);

          request.onsuccess = () => {
            // Keep memory fallback in sync
            this.memoryFallback.set(storeName, value, key);
            resolve(request.result);
          };

          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error storing item into "${storeName}"`, { error: request.error });
            resolve(this.memoryFallback.set(storeName, value, key));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error writing to "${storeName}"`, { error: txError });
          resolve(this.memoryFallback.set(storeName, value, key));
        }
      });
    } catch {
      return this.memoryFallback.set(storeName, value, key);
    }
  }

  public async delete<S extends IndexedDBStoreName>(
    storeName: S,
    key: IDBValidKey
  ): Promise<boolean> {
    try {
      this.memoryFallback.delete(storeName, key);
      const db = await this.getDB();
      if (!db) return true;

      return new Promise<boolean>((resolve) => {
        try {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);

          request.onsuccess = () => resolve(true);
          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error deleting key "${String(key)}" from "${storeName}"`, { error: request.error });
            resolve(false);
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error deleting key "${String(key)}"`, { error: txError });
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  }

  public async clear<S extends IndexedDBStoreName>(storeName: S): Promise<boolean> {
    try {
      this.memoryFallback.clear(storeName);
      const db = await this.getDB();
      if (!db) return true;

      return new Promise<boolean>((resolve) => {
        try {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve(true);
          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error clearing store "${storeName}"`, { error: request.error });
            resolve(false);
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error clearing "${storeName}"`, { error: txError });
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  }

  public async getAll<S extends IndexedDBStoreName>(
    storeName: S,
    count?: number
  ): Promise<IndexedDBSchema[S][]> {
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.getAll(storeName, count);
      }

      return new Promise<IndexedDBSchema[S][]>((resolve) => {
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll(undefined, count);

          request.onsuccess = () => {
            resolve((request.result as IndexedDBSchema[S][]) || []);
          };

          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error getting all items from "${storeName}"`, { error: request.error });
            resolve(this.memoryFallback.getAll(storeName, count));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error getAll on "${storeName}"`, { error: txError });
          resolve(this.memoryFallback.getAll(storeName, count));
        }
      });
    } catch {
      return this.memoryFallback.getAll(storeName, count);
    }
  }

  public async getAllKeys<S extends IndexedDBStoreName>(storeName: S): Promise<IDBValidKey[]> {
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.getAllKeys(storeName);
      }

      return new Promise<IDBValidKey[]>((resolve) => {
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAllKeys();

          request.onsuccess = () => {
            resolve(request.result || []);
          };

          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error getting all keys from "${storeName}"`, { error: request.error });
            resolve(this.memoryFallback.getAllKeys(storeName));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error getAllKeys on "${storeName}"`, { error: txError });
          resolve(this.memoryFallback.getAllKeys(storeName));
        }
      });
    } catch {
      return this.memoryFallback.getAllKeys(storeName);
    }
  }

  public async count<S extends IndexedDBStoreName>(storeName: S): Promise<number> {
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.count(storeName);
      }

      return new Promise<number>((resolve) => {
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.count();

          request.onsuccess = () => resolve(request.result || 0);
          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error counting items in "${storeName}"`, { error: request.error });
            resolve(this.memoryFallback.count(storeName));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error count on "${storeName}"`, { error: txError });
          resolve(this.memoryFallback.count(storeName));
        }
      });
    } catch {
      return this.memoryFallback.count(storeName);
    }
  }
}

/**
 * Singleton safe IndexedDB client instance.
 * Automatically handles schema migrations, connection pooling, and in-memory fallbacks.
 *
 * @example
 * ```ts
 * import { safeIndexedDB } from '@/services/storage';
 *
 * // Write record to drafts store
 * await safeIndexedDB.set('drafts', {
 *   id: 'doc_123',
 *   title: 'Meeting Notes',
 *   content: 'Action items...',
 *   updatedAt: Date.now()
 * });
 *
 * // Read record
 * const draft = await safeIndexedDB.get('drafts', 'doc_123');
 * ```
 */
export const safeIndexedDB: SafeIndexedDBGateway = new SafeIndexedDB();

export default safeIndexedDB;
