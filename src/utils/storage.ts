import type { User } from '../services/AuthContext';

const STORAGE_KEYS = {
  token: 'sapee_token',
  refreshToken: 'sapee_refresh_token',
  user: 'sapee_user',
  theme: 'sapee_theme',
  sidebar: 'sapee_sidebar',
  userEmail: 'sapee_user_email',
  auditLogs: 'sapee_audit_logs',
  hasVisited: 'sapee_has_visited',
  skipTour: 'sapee_skip_tour',
} as const;

type ThemeValue = 'dark' | 'light';
type SidebarValue = 'collapsed' | 'expanded';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  token: {
    get(): string | null {
      return localStorage.getItem(STORAGE_KEYS.token);
    },
    set(value: string): void {
      localStorage.setItem(STORAGE_KEYS.token, value);
    },
    clear(): void {
      localStorage.removeItem(STORAGE_KEYS.token);
    },
  },

  refreshToken: {
    get(): string | null {
      return localStorage.getItem(STORAGE_KEYS.refreshToken);
    },
    set(value: string): void {
      localStorage.setItem(STORAGE_KEYS.refreshToken, value);
    },
    clear(): void {
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
    },
  },

  user: {
    get(): User | null {
      return safeParse<User | null>(localStorage.getItem(STORAGE_KEYS.user), null);
    },
    set(value: User): void {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(value));
    },
    clear(): void {
      localStorage.removeItem(STORAGE_KEYS.user);
    },
  },

  theme: {
    get(): ThemeValue {
      return (localStorage.getItem(STORAGE_KEYS.theme) as ThemeValue) || 'light';
    },
    set(value: ThemeValue): void {
      localStorage.setItem(STORAGE_KEYS.theme, value);
    },
  },

  sidebar: {
    get(): SidebarValue | null {
      return localStorage.getItem(STORAGE_KEYS.sidebar) as SidebarValue | null;
    },
    set(value: SidebarValue): void {
      localStorage.setItem(STORAGE_KEYS.sidebar, value);
    },
  },

  userEmail: {
    get(): string | null {
      return localStorage.getItem(STORAGE_KEYS.userEmail);
    },
    set(value: string): void {
      localStorage.setItem(STORAGE_KEYS.userEmail, value);
    },
  },

  auditLogs: {
    get<T = unknown>(): T[] {
      return safeParse<T[]>(localStorage.getItem(STORAGE_KEYS.auditLogs), []);
    },
    set<T = unknown>(value: T[]): void {
      localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(value));
    },
  },

  hasVisited: {
    get(): boolean {
      return localStorage.getItem(STORAGE_KEYS.hasVisited) === 'true';
    },
    set(value: boolean): void {
      localStorage.setItem(STORAGE_KEYS.hasVisited, String(value));
    },
    clear(): void {
      localStorage.removeItem(STORAGE_KEYS.hasVisited);
    },
  },

  skipTour: {
    get(): boolean {
      return localStorage.getItem(STORAGE_KEYS.skipTour) === 'true';
    },
    set(value: boolean): void {
      localStorage.setItem(STORAGE_KEYS.skipTour, String(value));
    },
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },
};
