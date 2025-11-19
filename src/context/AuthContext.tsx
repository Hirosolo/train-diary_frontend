import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import * as api from '../api';
import { useDashboardRefresh } from './DashboardRefreshContext';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const AUTH_CACHE_KEY = 'authCache';

const getTodayStamp = () => new Date().toISOString().slice(0, 10);

interface AuthCachePayload {
  user: User;
  token: string;
  expiresAt: number;
  lastActivityDate: string;
}

const persistAuthCache = (
  user: User,
  token: string,
  overrides: Partial<Omit<AuthCachePayload, 'user' | 'token'>> = {}
): AuthCachePayload => {
  const payload: AuthCachePayload = {
    user,
    token,
    expiresAt: overrides.expiresAt ?? Date.now() + CACHE_TTL_MS,
    lastActivityDate: overrides.lastActivityDate ?? getTodayStamp(),
  };
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(payload));
  api.setToken(token);
  return payload;
};

const readCachedAuth = (): AuthCachePayload | null => {
  const raw = localStorage.getItem(AUTH_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.user &&
      typeof parsed.token === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed as AuthCachePayload;
    }
  } catch {
    return null;
  }
  return null;
};

const migrateLegacyAuth = (): AuthCachePayload | null => {
  const legacyToken = localStorage.getItem('token');
  const legacyUser = localStorage.getItem('user');
  if (!legacyToken || !legacyUser) return null;
  try {
    const parsedUser = JSON.parse(legacyUser);
    if (parsedUser?.user_id) {
      return persistAuthCache(parsedUser, legacyToken);
    }
  } catch {
    return null;
  }
  return null;
};

interface User {
  user_id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
  refreshAuthCache: (reason?: string) => void;
  cacheExpiresAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheMeta, setCacheMeta] = useState<AuthCachePayload | null>(null);
  const { subscribe } = useDashboardRefresh();

  const clearAuthState = useCallback(() => {
    setUser(null);
    setTokenState(null);
    setCacheMeta(null);
    api.setToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(AUTH_CACHE_KEY);
  }, []);

  type LoginResult = Awaited<ReturnType<typeof api.login>> & { user?: User };

  const login = async (email: string, password: string) => {
    const res: LoginResult = await api.login({ email, password });
    if (res.token && res.user) {
      setUser(res.user);
      setTokenState(res.token);
      const payload = persistAuthCache(res.user, res.token);
      setCacheMeta(payload);
    }
    return res;
  };

  const register = async (username: string, email: string, password: string) => {
    return api.register({ username, email, password });
  };

  const logout = () => {
    clearAuthState();
  };

  const refreshAuthCache = useCallback(
    (_reason?: string) => {
      if (!user || !token) return;
      const payload = persistAuthCache(user, token);
      setCacheMeta(payload);
    },
    [user, token]
  );

  React.useEffect(() => {
    // Subscribe to dashboard-level refresh events (e.g. when workouts/meals change)
    if (!subscribe) return;
    const unsubscribe = subscribe(() => {
      try {
        refreshAuthCache('dashboard-refresh');
      } catch (e) {
        // noop
      }
    });
    return () => unsubscribe();
  }, [subscribe, refreshAuthCache]);

  React.useEffect(() => {
    const hydrateAuth = () => {
      let cached = readCachedAuth();
      if (!cached) {
        cached = migrateLegacyAuth();
      }

      if (!cached) {
        setLoading(false);
        return;
      }

      if (!cached.expiresAt || cached.expiresAt <= Date.now()) {
        clearAuthState();
        setLoading(false);
        return;
      }

      const today = getTodayStamp();
      if (cached.lastActivityDate !== today || cached.expiresAt - Date.now() < CACHE_TTL_MS / 2) {
        cached = persistAuthCache(cached.user, cached.token, {
          lastActivityDate: today,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      setUser(cached.user);
      setTokenState(cached.token);
      setCacheMeta(cached);
      api.setToken(cached.token);
      setLoading(false);
    };

    hydrateAuth();
  }, [clearAuthState]);

  React.useEffect(() => {
    if (!cacheMeta?.expiresAt) return;
    const remaining = cacheMeta.expiresAt - Date.now();
    if (remaining <= 0) {
      clearAuthState();
      return;
    }
    const timer = window.setTimeout(() => {
      clearAuthState();
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [cacheMeta?.expiresAt, clearAuthState]);

  React.useEffect(() => {
    if (!user || !token) return;
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const delay = midnight.getTime() - now.getTime();
    const timer = window.setTimeout(() => {
      refreshAuthCache('midnight-refresh');
    }, delay);
    return () => window.clearTimeout(timer);
  }, [user, token, refreshAuthCache, cacheMeta?.lastActivityDate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        loading,
        refreshAuthCache,
        cacheExpiresAt: cacheMeta?.expiresAt ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}; 