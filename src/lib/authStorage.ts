const TOKEN_KEYS = ['token', 'accessToken', 'yevatrade_token'] as const;
const REFRESH_KEYS = ['refreshToken', 'yevatrade_refresh_token'] as const;

export interface AuthTokens {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
}

export function getAccessToken(): string | null {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

export function getRefreshToken(): string | null {
  for (const key of REFRESH_KEYS) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

export function persistTokens(data: AuthTokens): string | null {
  const access = data.token || data.accessToken;
  if (access) {
    localStorage.setItem('token', access);
    localStorage.setItem('accessToken', access);
    localStorage.setItem('yevatrade_token', access);
  }
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('yevatrade_refresh_token', data.refreshToken);
  }
  return access ?? null;
}

export function clearAuthStorage(): void {
  [...TOKEN_KEYS, ...REFRESH_KEYS].forEach((key) => localStorage.removeItem(key));
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
