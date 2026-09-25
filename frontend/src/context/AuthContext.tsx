import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { clearAuthTokens, loadAuthTokens, saveAuthTokens } from '../lib/session';
import { decodeJwt, isJwtExpired } from '../lib/jwt';
import type { AuthResponse } from '../lib/apiTypes';
import { clearOfflineAccess, saveOfflineAccess, verifyOfflineAccess } from '../lib/offlineAuth';

type AuthUser = { id: string; displayName: string; email: string; roles: string[] };
type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isOfflineSession: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  unlockOffline: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  register: (displayName: string, email: string, password: string, confirmPassword: string, phoneNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);
const USER_KEY = 'nurtured-choice.user';
const LAST_ACTIVITY_KEY = 'nurtured-choice.last-activity-at';
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

function recordLastActivity(): void {
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

function lastActivityIsExpired(): boolean {
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return false;
  const lastActivity = Number(raw);
  return !Number.isFinite(lastActivity) || Date.now() - lastActivity >= IDLE_TIMEOUT_MS;
}

function saveAuthResponse(response: AuthResponse) {
  saveAuthTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAtUtc: response.expiresAtUtc });
  recordLastActivity();
  const user = { id: response.userId, displayName: response.displayName, email: response.email, roles: response.roles ?? [] };
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

function loadStoredUser(): AuthUser | null {
  try { const raw = window.localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) as AuthUser : null; } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearAuthTokens();
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    window.localStorage.removeItem('authToken');
    window.localStorage.removeItem('authUser');
    setUser(null); setToken(null); setIsOfflineSession(false);
  }, []);

  const expireSession = useCallback(() => {
    const refreshToken = loadAuthTokens()?.refreshToken;
    clearSession();
    if (refreshToken) void api.logout(refreshToken).catch(() => undefined);
  }, [clearSession]);

  useEffect(() => {
    const tokens = loadAuthTokens();
    if (tokens?.accessToken && !isJwtExpired(tokens.accessToken)) {
      setToken(tokens.accessToken);
      const storedUser = loadStoredUser() ?? (() => { const payload = decodeJwt(tokens.accessToken); return payload?.sub && payload.email ? { id: payload.sub, email: payload.email, displayName: payload.name ?? payload.email, roles: [] } : null; })();
      setUser(storedUser);
      void api.getCurrentUser().then((currentUser) => {
        const refreshedUser = { id: currentUser.userId, email: currentUser.email, displayName: currentUser.displayName, roles: currentUser.roles };
        window.localStorage.setItem(USER_KEY, JSON.stringify(refreshedUser));
        setUser(refreshedUser);
      }).catch(() => undefined);
    } else {
      clearSession();
    }
    setIsLoading(false);
  }, [clearSession]);

  useEffect(() => {
    if (!token && !isOfflineSession) return;

    const expireIfIdle = () => {
      if (lastActivityIsExpired()) expireSession();
    };
    const handleActivity = () => {
      if (!lastActivityIsExpired()) recordLastActivity();
      else expireSession();
    };
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;

    if (!window.localStorage.getItem(LAST_ACTIVITY_KEY)) recordLastActivity();
    expireIfIdle();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    window.addEventListener('focus', expireIfIdle);
    window.addEventListener('pageshow', expireIfIdle);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY && event.newValue === null) expireSession();
    };
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', expireIfIdle);
    const timer = window.setInterval(expireIfIdle, 30_000);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      window.removeEventListener('focus', expireIfIdle);
      window.removeEventListener('pageshow', expireIfIdle);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', expireIfIdle);
      window.clearInterval(timer);
    };
  }, [token, isOfflineSession, expireSession]);

  const completeLogin = useCallback((response: AuthResponse) => { const nextUser = saveAuthResponse(response); setToken(response.accessToken); setUser(nextUser); setIsOfflineSession(false); }, []);
  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const response = await api.loginPassword({ email, password });
    completeLogin(response);
    try { await saveOfflineAccess(email, password, { id: response.userId, displayName: response.displayName, email: response.email, roles: response.roles ?? [] }); } catch { /* Offline access is optional when browser cryptography is unavailable. */ }
  }, [completeLogin]);
  const unlockOffline = useCallback(async (email: string, password: string) => {
    const access = await verifyOfflineAccess(email, password);
    setUser(access.user);
    setToken(null);
    recordLastActivity();
    setIsOfflineSession(true);
  }, []);
  const loginWithGoogle = useCallback(async (googleToken: string) => completeLogin(await api.loginGoogle({ idToken: googleToken })), [completeLogin]);
  const register = useCallback(async (displayName: string, email: string, password: string, confirmPassword: string, phoneNumber?: string) => {
    const response = await api.register({ displayName, email, password, confirmPassword, phoneNumber });
    completeLogin(response);
    try { await saveOfflineAccess(email, password, { id: response.userId, displayName: response.displayName, email: response.email, roles: response.roles ?? [] }); } catch { /* Offline access is optional when browser cryptography is unavailable. */ }
  }, [completeLogin]);
  const logout = useCallback(async () => { const tokens = loadAuthTokens(); try { if (tokens?.refreshToken && navigator.onLine) await api.logout(tokens.refreshToken); } finally { clearOfflineAccess(); clearSession(); } }, [clearSession]);

  return <AuthContext.Provider value={{ user, token, isAuthenticated: Boolean(token) || isOfflineSession, isOfflineSession, isLoading, loginWithPassword, unlockOffline, loginWithGoogle, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function hasFullAdministrativeAccess(roles: string[]) {
  return roles.some((role) => role === 'Super Administrator' || role === 'Administrator' || role === 'CEO');
}
