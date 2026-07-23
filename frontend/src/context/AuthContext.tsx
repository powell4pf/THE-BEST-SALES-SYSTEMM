import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { AuthResponse } from '../lib/apiTypes';
import { clearAuthTokens, loadAuthTokens, saveAuthTokens, type AuthTokens } from '../lib/session';
import { decodeJwt, isJwtExpired } from '../lib/jwt';

type AuthUser = {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
};

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string, confirmPassword: string, phoneNumber?: string) => Promise<void>;
  loginWithGoogle: (idToken: string, phoneNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  tokens: AuthTokens | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(response: AuthResponse): AuthUser {
  return {
    userId: response.userId,
    email: response.email,
    displayName: response.displayName,
    roles: response.roles
  };
}

function userFromToken(tokens: AuthTokens | null): AuthUser | null {
  if (!tokens?.accessToken) {
    return null;
  }

  const payload = decodeJwt(tokens.accessToken);
  if (!payload) {
    return null;
  }

  const roles = Array.isArray(payload.role) ? payload.role : payload.role ? [payload.role] : [];

  return {
    userId: payload.sub ?? '',
    email: payload.email ?? '',
    displayName: payload.name ?? payload.email ?? 'User',
    roles
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadAuthTokens();
    if (stored) {
      setTokens(stored);
      setUser(userFromToken(stored));
    }
    setReady(true);
  }, []);

  const persist = (response: AuthResponse) => {
    const nextTokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAtUtc: response.expiresAtUtc
    };
    saveAuthTokens(nextTokens);
    setTokens(nextTokens);
    setUser(toAuthUser(response));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isAuthenticated: Boolean(tokens?.refreshToken || (tokens?.accessToken && !isJwtExpired(tokens.accessToken))),
      user,
      tokens,
      loginWithPassword: async (email: string, password: string) => {
        const response = await api.loginPassword({ email, password });
        persist(response);
      },
      register: async (displayName: string, email: string, password: string, confirmPassword: string, phoneNumber?: string) => {
        const response = await api.register({ displayName, email, password, confirmPassword, phoneNumber });
        persist(response);
      },
      loginWithGoogle: async (idToken: string, phoneNumber?: string) => {
        const response = await api.loginGoogle({ idToken, phoneNumber });
        persist(response);
      },
      logout: async () => {
        if (tokens?.refreshToken) {
          try {
            await api.logout(tokens.refreshToken);
          } catch {
            // Ignore logout failures and clear local session anyway.
          }
        }
        clearAuthTokens();
        setTokens(null);
        setUser(null);
      }
    }),
    [ready, tokens, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
