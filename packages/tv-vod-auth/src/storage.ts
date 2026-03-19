import type { User } from '@digitalvirgo/drm-player';

const STORAGE_KEY = 'tv_vod_user';

export interface AuthStorage {
  getUser(): User | null;
  setUser(user: User): void;
  removeUser(): void;
}

export function createLocalStorageAuth(): AuthStorage {
  return {
    getUser() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    setUser(user: User) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    },
    removeUser() {
      localStorage.removeItem(STORAGE_KEY);
    },
  };
}

export function createMemoryAuth(): AuthStorage {
  let stored: User | null = null;
  return {
    getUser: () => stored,
    setUser: (u) => { stored = u; },
    removeUser: () => { stored = null; },
  };
}
