export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
};

const AUTH_KEY = 'nurtured-choice.auth';

export function loadAuthTokens(): AuthTokens | null {
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function saveAuthTokens(tokens: AuthTokens): void {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(tokens));
}

export function clearAuthTokens(): void {
  window.localStorage.removeItem(AUTH_KEY);
}

