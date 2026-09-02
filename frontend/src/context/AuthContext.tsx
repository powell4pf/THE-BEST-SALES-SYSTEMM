import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { clearAuthTokens, loadAuthTokens, saveAuthTokens } from '../lib/session';
import { decodeJwt, isJwtExpired } from '../lib/jwt';
import type { AuthResponse } from '../lib/apiTypes';

type AuthUser = { id: string; displayName: string; email: string; roles: string[] };
type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  register: (displayName: string, email: string, password: string, confirmPassword: string, phoneNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);
const USER_KEY = 'nurtured-choice.user';

function saveAuthResponse(response: AuthResponse) {
  saveAuthTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAtUtc: response.expiresAtUtc });
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
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearAuthTokens();
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem('authToken');
    window.localStorage.removeItem('authUser');
    setUser(null); setToken(null);
  }, []);

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

  const completeLogin = useCallback((response: AuthResponse) => { const nextUser = saveAuthResponse(response); setToken(response.accessToken); setUser(nextUser); }, []);
  const loginWithPassword = useCallback(async (email: string, password: string) => completeLogin(await api.loginPassword({ email, password })), [completeLogin]);
  const loginWithGoogle = useCallback(async (googleToken: string) => completeLogin(await api.loginGoogle({ idToken: googleToken })), [completeLogin]);
  const register = useCallback(async (displayName: string, email: string, password: string, confirmPassword: string, phoneNumber?: string) => completeLogin(await api.register({ displayName, email, password, confirmPassword, phoneNumber })), [completeLogin]);
  const logout = useCallback(async () => { const tokens = loadAuthTokens(); try { if (tokens?.refreshToken) await api.logout(tokens.refreshToken); } finally { clearSession(); } }, [clearSession]);

  return <AuthContext.Provider value={{ user, token, isAuthenticated: Boolean(token), isLoading, loginWithPassword, loginWithGoogle, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function hasFullAdministrativeAccess(roles: string[]) {
  return roles.some((role) => role === 'Super Administrator' || role === 'Administrator' || role === 'CEO');
}
