/**
 * Smart Error Deduplication Logger
 * Prevents redundant logging of duplicate errors within a configurable time window (TTL).
 */

export interface LogPayload {
  message: string;
  name?: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  level: 'error' | 'warn' | 'info';
  metadata?: Record<string, unknown>;
  suppressedCount?: number;
}

interface CacheEntry {
  lastLogged: number;
  count: number;
}

class SmartLogger {
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  private maxCacheSize: number;
  private remoteEndpoint?: string;

  constructor(options?: { ttlMs?: number; maxCacheSize?: number; remoteEndpoint?: string }) {
    this.ttlMs = options?.ttlMs ?? 60_000; // Default 1 minute deduplication window
    this.maxCacheSize = options?.maxCacheSize ?? 100;
    this.remoteEndpoint = options?.remoteEndpoint;
  }

  /**
   * Generates a unique fingerprint for an error based on name, message, and top stack frame
   */
  private getFingerprint(error: Error | string, componentStack?: string): string {
    if (typeof error === 'string') {
      return `str:${error}`;
    }

    const topStackLine = error.stack
      ? error.stack.split('\n')[1]?.trim() || ''
      : '';
    const compStackLine = componentStack
      ? componentStack.split('\n')[1]?.trim() || ''
      : '';

    return `${error.name}:${error.message}:${topStackLine}:${compStackLine}`;
  }

  /**
   * Prunes oldest entries if cache exceeds maximum allowed size
   */
  private pruneCache(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastLogged > this.ttlMs) {
        this.cache.delete(key);
      }
    }

    // If still oversized, remove oldest items
    if (this.cache.size > this.maxCacheSize) {
      const excess = this.cache.size - this.maxCacheSize;
      const keys = Array.from(this.cache.keys()).slice(0, excess);
      keys.forEach((k) => this.cache.delete(k));
    }
  }

  /**
   * Logs an error message or Error object with automatic deduplication
   */
  public logError(
    error: Error | string,
    componentStack?: string,
    metadata?: Record<string, unknown>
  ): boolean {
    const now = Date.now();
    const fingerprint = this.getFingerprint(error, componentStack);
    const existing = this.cache.get(fingerprint);

    if (existing && now - existing.lastLogged < this.ttlMs) {
      // Increment duplicate count and suppress logging
      existing.count += 1;
      return false;
    }

    const suppressedCount = existing ? existing.count : 0;

    // Update or set cache
    this.cache.set(fingerprint, {
      lastLogged: now,
      count: 0,
    });

    this.pruneCache();

    const isErrorObj = error instanceof Error;
    const payload: LogPayload = {
      message: isErrorObj ? error.message : String(error),
      name: isErrorObj ? error.name : 'CustomError',
      stack: isErrorObj ? error.stack : undefined,
      componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      level: 'error',
      metadata,
      suppressedCount: suppressedCount > 0 ? suppressedCount : undefined,
    };

    this.send(payload);
    return true;
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      console.warn(`[SmartLogger] Warn: ${message}`, metadata);
    }
  }

  public error(message: string, metadata?: Record<string, unknown>): void {
    this.logError(message, undefined, metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      console.info(`[SmartLogger] Info: ${message}`, metadata);
    }
  }

  /**
   * Dispatches the log payload to console and optionally to a remote logging endpoint
   */
  private send(payload: LogPayload): void {
    // 1. Console Output with clear styling
    const suppressionNote = payload.suppressedCount
      ? ` (suppressed ${payload.suppressedCount} previous duplicate occurrences)`
      : '';

    console.groupCollapsed(
      `%c[SmartLogger] Error: ${payload.message}${suppressionNote}`,
      'color: #ef4444; font-weight: bold;'
    );
    console.error('Error Details:', {
      name: payload.name,
      message: payload.message,
      stack: payload.stack,
      componentStack: payload.componentStack,
      url: payload.url,
      timestamp: payload.timestamp,
      metadata: payload.metadata,
    });
    console.groupEnd();

    // 2. Remote endpoint dispatch (if configured)
    if (this.remoteEndpoint && typeof fetch !== 'undefined') {
      try {
        fetch(this.remoteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch((err) => {
          console.warn('[SmartLogger] Failed to dispatch error log remotely:', err);
        });
      } catch (err) {
        console.warn('[SmartLogger] Exception while dispatching remote error:', err);
      }
    }
  }

  /**
   * Clears in-memory deduplication cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const logger = new SmartLogger({
  ttlMs: 60_000,
  maxCacheSize: 100,
  remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
});

export default logger;
