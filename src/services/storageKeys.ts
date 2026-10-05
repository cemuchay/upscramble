/**
 * Centralized Storage Schema & Keys Contract
 * 
 * Defines all valid keys and their corresponding value types for:
 * - safeLocalStorage
 * - safeSessionStorage
 * - safeIndexedDB
 * 
 * Centralizing keys and types prevents typo bugs, scattered magic strings,
 * and enables end-to-end type safety with autocomplete across the entire application.
 */

export interface UserSessionProfile {
  username: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Type map for LocalStorage keys and their values
 */
export interface LocalStorageSchema {
  /** Application visual theme ('light' | 'dark') */
  'app_theme': 'light' | 'dark';
  /** Zustand base persistent store cache */
  'app_storage': unknown;
  /** Zustand auth persistent store cache */
  'auth_storage': unknown;
  /** JWT or OAuth Bearer token string */
  'token': string;
  /** Active user profile information cached locally */
  'auth_user': UserSessionProfile;
  /** Remembered user preference flags */
  'user_preferences': {
    notificationsEnabled: boolean;
    compactView: boolean;
    language: string;
  };
  /** Cached banner dismissal flags */
  'banner_dismissed': boolean;
  /** Generic debug flags */
  'debug_mode': boolean;
}

/**
 * Allowed LocalStorage keys
 */
export type LocalStorageKey = keyof LocalStorageSchema;

/**
 * Type map for SessionStorage keys and their values
 */
export interface SessionStorageSchema {
  /** Temporary authentication or session tokens */
  'session_auth_token': AuthTokens;
  /** Temporary navigation or redirect path after login */
  'redirect_after_login': string;
  /** Active multi-step wizard / form draft */
  'form_draft': Record<string, unknown>;
  /** Tab-specific session state flags */
  'tab_active_session': boolean;
  /** One-time notification suppression flag */
  'welcome_shown': boolean;
}

/**
 * Allowed SessionStorage keys
 */
export type SessionStorageKey = keyof SessionStorageSchema;

/**
 * Type map for IndexedDB Object Stores and their record structures
 */
export interface IndexedDBSchema {
  /** Generic offline key-value cache store */
  'keyval': {
    id: string;
    value: unknown;
    updatedAt: number;
  };
  /** Offline cached API response data */
  'api_cache': {
    id: string;
    url: string;
    data: unknown;
    expiresAt: number;
  };
  /** Offline mutation queue / sync tasks */
  'sync_queue': {
    id: string;
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    payload: unknown;
    createdAt: number;
    retryCount: number;
  };
  /** Local application files / drafts / blobs */
  'drafts': {
    id: string;
    title: string;
    content: string;
    updatedAt: number;
  };
}

/**
 * Allowed IndexedDB Object Store names
 */
export type IndexedDBStoreName = keyof IndexedDBSchema;
