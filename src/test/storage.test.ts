import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeLocalStorage, safeSessionStorage } from '../services/safeStorage';
import { safeIndexedDB } from '../services/safeIndexedDB';

describe('Safe Storage Utilities', () => {
  beforeEach(() => {
    safeLocalStorage.clear();
    safeSessionStorage.clear();
  });

  describe('safeLocalStorage', () => {
    it('stores and retrieves typed values correctly', () => {
      safeLocalStorage.setItem('app_theme', 'dark');
      const retrieved = safeLocalStorage.getItem('app_theme');
      expect(retrieved).toBe('dark');
    });

    it('returns defaultValue when key is missing', () => {
      const missing = safeLocalStorage.getItem('app_theme', 'light');
      expect(missing).toBe('light');
    });

    it('handles complex structured objects', () => {
      const user = {
        username: 'alice',
        email: 'alice@example.com',
        role: 'Admin',
      };
      safeLocalStorage.setItem('auth_user', user);
      const retrieved = safeLocalStorage.getItem('auth_user');
      expect(retrieved).toEqual(user);
    });

    it('removes keys and checks hasItem correctly', () => {
      safeLocalStorage.setItem('debug_mode', true);
      expect(safeLocalStorage.hasItem('debug_mode')).toBe(true);

      safeLocalStorage.removeItem('debug_mode');
      expect(safeLocalStorage.hasItem('debug_mode')).toBe(false);
      expect(safeLocalStorage.getItem('debug_mode')).toBeNull();
    });

    it('returns stored keys and size', () => {
      safeLocalStorage.setItem('banner_dismissed', true);
      safeLocalStorage.setItem('app_theme', 'light');

      expect(safeLocalStorage.size()).toBeGreaterThanOrEqual(2);
      expect(safeLocalStorage.keys()).toContain('banner_dismissed');
      expect(safeLocalStorage.keys()).toContain('app_theme');
    });
  });

  describe('safeSessionStorage', () => {
    it('stores and retrieves session data safely', () => {
      safeSessionStorage.setItem('redirect_after_login', '/dashboard');
      expect(safeSessionStorage.getItem('redirect_after_login')).toBe('/dashboard');
    });

    it('handles session tokens', () => {
      const tokenPayload = {
        accessToken: 'abc123token',
        expiresAt: 1800000000,
      };
      safeSessionStorage.setItem('session_auth_token', tokenPayload);
      expect(safeSessionStorage.getItem('session_auth_token')).toEqual(tokenPayload);
    });
  });

  describe('safeIndexedDB', () => {
    it('performs CRUD operations seamlessly', async () => {
      const draft = {
        id: 'draft_101',
        title: 'My First Post',
        content: 'Hello world...',
        updatedAt: Date.now(),
      };

      // Set
      await safeIndexedDB.set('drafts', draft);

      // Get
      const saved = await safeIndexedDB.get('drafts', 'draft_101');
      expect(saved).toEqual(draft);

      // Count
      const count = await safeIndexedDB.count('drafts');
      expect(count).toBeGreaterThanOrEqual(1);

      // GetAll
      const allDrafts = await safeIndexedDB.getAll('drafts');
      expect(allDrafts.some((d) => d.id === 'draft_101')).toBe(true);

      // Delete
      const deleted = await safeIndexedDB.delete('drafts', 'draft_101');
      expect(deleted).toBe(true);

      const afterDelete = await safeIndexedDB.get('drafts', 'draft_101');
      expect(afterDelete).toBeNull();
    });
  });
});
