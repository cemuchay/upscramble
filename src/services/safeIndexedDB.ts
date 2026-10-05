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
   */
  get<S extends IndexedDBStoreName>(
    storeName: S,
    key: IDBValidKey
  ): Promise<IndexedDBSchema[S] | null>;

  /**
   * Inserts or updates an item in the specified Object Store.
   */
  set<S extends IndexedDBStoreName>(
    storeName: S,
    value: IndexedDBSchema[S],
    key?: IDBValidKey
  ): Promise<IDBValidKey | null>;

  /**
   * Deletes an item by primary key from the specified Object Store.
   */
  delete<S extends IndexedDBStoreName>(
    storeName: S,
    key: IDBValidKey
  ): Promise<boolean>;

  /**
   * Clears all entries from the specified Object Store.
   */
  clear<S extends IndexedDBStoreName>(storeName: S): Promise<boolean>;

  /**
   * Retrieves all items from the specified Object Store.
   */
  getAll<S extends IndexedDBStoreName>(
    storeName: S,
    count?: number
  ): Promise<IndexedDBSchema[S][]>;

  /**
   * Retrieves all primary keys from the specified Object Store.
   */
  getAllKeys<S extends IndexedDBStoreName>(storeName: S): Promise<IDBValidKey[]>;

  /**
   * Counts the total number of records in the specified Object Store.
   */
  count<S extends IndexedDBStoreName>(storeName: S): Promise<number>;

  /**
   * Checks if native browser IndexedDB is supported and accessible.
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
  private dbPromise: Promise<IDBDatabase | null> | null = null;
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

    this.dbPromise = new Promise<IDBDatabase | null>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          this.storeNames.forEach((storeName) => {
            const nameStr = String(storeName);
            if (!db.objectStoreNames.contains(nameStr)) {
              // Create store with 'id' as keyPath by default
              db.createObjectStore(nameStr, { keyPath: 'id' });
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
    }).catch(() => {
      this.isNativeSupported = false;
      this.dbPromise = null;
      return null;
    });

    return this.dbPromise;
  }

  public async get<S extends IndexedDBStoreName>(
    storeName: S,
    key: IDBValidKey
  ): Promise<IndexedDBSchema[S] | null> {
    const sName = String(storeName);
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.get(sName, key);
      }

      return new Promise<IndexedDBSchema[S] | null>((resolve) => {
        try {
          const transaction = db.transaction([sName], 'readonly');
          const store = transaction.objectStore(sName);
          const request = store.get(key);

          request.onsuccess = () => {
            resolve((request.result as IndexedDBSchema[S]) ?? null);
          };

          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error getting key "${String(key)}" from store "${sName}"`, { error: request.error });
            resolve(this.memoryFallback.get(sName, key));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction failure reading "${String(key)}"`, { error: txError });
          resolve(this.memoryFallback.get(sName, key));
        }
      });
    } catch {
      return this.memoryFallback.get(sName, key);
    }
  }

  public async set<S extends IndexedDBStoreName>(
    storeName: S,
    value: IndexedDBSchema[S],
    key?: IDBValidKey
  ): Promise<IDBValidKey | null> {
    const sName = String(storeName);
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.set(sName, value, key);
      }

      return new Promise<IDBValidKey | null>((resolve) => {
        try {
          const transaction = db.transaction([sName], 'readwrite');
          const store = transaction.objectStore(sName);

          const request = store.keyPath ? store.put(value) : store.put(value, key);

          request.onsuccess = () => {
            this.memoryFallback.set(sName, value, key);
            resolve(request.result);
          };

          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error storing item into "${sName}"`, { error: request.error });
            resolve(this.memoryFallback.set(sName, value, key));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error writing to "${sName}"`, { error: txError });
          resolve(this.memoryFallback.set(sName, value, key));
        }
      });
    } catch {
      return this.memoryFallback.set(sName, value, key);
    }
  }

  public async delete<S extends IndexedDBStoreName>(
    storeName: S,
    key: IDBValidKey
  ): Promise<boolean> {
    const sName = String(storeName);
    try {
      this.memoryFallback.delete(sName, key);
      const db = await this.getDB();
      if (!db) return true;

      return new Promise<boolean>((resolve) => {
        try {
          const transaction = db.transaction([sName], 'readwrite');
          const store = transaction.objectStore(sName);
          const request = store.delete(key);

          request.onsuccess = () => resolve(true);
          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error deleting key "${String(key)}" from "${sName}"`, { error: request.error });
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
    const sName = String(storeName);
    try {
      this.memoryFallback.clear(sName);
      const db = await this.getDB();
      if (!db) return true;

      return new Promise<boolean>((resolve) => {
        try {
          const transaction = db.transaction([sName], 'readwrite');
          const store = transaction.objectStore(sName);
          const request = store.clear();

          request.onsuccess = () => resolve(true);
          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error clearing store "${sName}"`, { error: request.error });
            resolve(false);
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error clearing "${sName}"`, { error: txError });
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
    const sName = String(storeName);
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.getAll(sName, count);
      }

      return new Promise<IndexedDBSchema[S][]>((resolve) => {
        try {
          const transaction = db.transaction([sName], 'readonly');
          const store = transaction.objectStore(sName);
          const request = store.getAll(undefined, count);

          request.onsuccess = () => {
            resolve((request.result as IndexedDBSchema[S][]) || []);
          };

          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error getting all items from "${sName}"`, { error: request.error });
            resolve(this.memoryFallback.getAll(sName, count));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error getAll on "${sName}"`, { error: txError });
          resolve(this.memoryFallback.getAll(sName, count));
        }
      });
    } catch {
      return this.memoryFallback.getAll(sName, count);
    }
  }

  public async getAllKeys<S extends IndexedDBStoreName>(storeName: S): Promise<IDBValidKey[]> {
    const sName = String(storeName);
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.getAllKeys(sName);
      }

      return new Promise<IDBValidKey[]>((resolve) => {
        try {
          const transaction = db.transaction([sName], 'readonly');
          const store = transaction.objectStore(sName);
          const request = store.getAllKeys();

          request.onsuccess = () => {
            resolve(request.result || []);
          };

          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error getting all keys from "${sName}"`, { error: request.error });
            resolve(this.memoryFallback.getAllKeys(sName));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error getAllKeys on "${sName}"`, { error: txError });
          resolve(this.memoryFallback.getAllKeys(sName));
        }
      });
    } catch {
      return this.memoryFallback.getAllKeys(sName);
    }
  }

  public async count<S extends IndexedDBStoreName>(storeName: S): Promise<number> {
    const sName = String(storeName);
    try {
      const db = await this.getDB();
      if (!db) {
        return this.memoryFallback.count(sName);
      }

      return new Promise<number>((resolve) => {
        try {
          const transaction = db.transaction([sName], 'readonly');
          const store = transaction.objectStore(sName);
          const request = store.count();

          request.onsuccess = () => resolve(request.result || 0);
          request.onerror = () => {
            logger.warn(`SafeIndexedDB: Error counting items in "${sName}"`, { error: request.error });
            resolve(this.memoryFallback.count(sName));
          };
        } catch (txError) {
          logger.warn(`SafeIndexedDB: Transaction error count on "${sName}"`, { error: txError });
          resolve(this.memoryFallback.count(sName));
        }
      });
    } catch {
      return this.memoryFallback.count(sName);
    }
  }
}

export const safeIndexedDB: SafeIndexedDBGateway = new SafeIndexedDB();

export default safeIndexedDB;
