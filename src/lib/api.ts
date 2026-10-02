import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  persistTokens,
} from './authStorage';
import { accessTokenExpiresWithin, bearerToken } from './authToken';

const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://api.yevatrade.com' : 'http://localhost:3001');

function buildBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  const withoutApi = trimmed.replace(/\/api$/i, '');
  return `${withoutApi}/api`;
}

export const api = axios.create({
  baseURL: buildBaseUrl(RAW_API_URL),
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/demo', '/auth/refresh', '/auth/logout'];

function isAuthRequest(url: string): boolean {
  return AUTH_PATHS.some((path) => url.includes(path));
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** Renovar antes de expirar evita a rajada de 401 de todos os pollings quando o access token (15 min) caduca. */
const PROACTIVE_REFRESH_WINDOW_MS = 30_000;

let refreshPromise: Promise<string | null> | null = null;

/** Um único /auth/refresh em voo — o endpoint tem rate limit de 5/min por IP. */
function refreshSessionOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = tryRefreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Bearer só para sessões legacy em localStorage; cookies HttpOnly não são legíveis via JS */
api.interceptors.request.use(async (config) => {
  let token = getAccessToken();
  if (
    token &&
    !isAuthRequest(String(config.url ?? '')) &&
    accessTokenExpiresWithin(token, PROACTIVE_REFRESH_WINDOW_MS)
  ) {
    try {
      token = await refreshSessionOnce();
    } catch (refreshError) {
      redirectToLogin(true);
      throw refreshError;
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

function redirectToLogin(expired = false): void {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/login')) return;
  clearAuthStorage();
  window.location.href = expired ? '/login?expired=true' : '/login';
}

async function tryRefreshSession(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  const response = await api.post(
    '/auth/refresh',
    refreshToken ? { refreshToken } : {},
  );
  return persistTokens(response.data);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ expired?: boolean; error?: string; retryAfter?: number }>) => {
    const originalRequest = error.config as RetryConfig | undefined;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    const data = error.response?.data;
    const requestUrl = String(originalRequest.url ?? '');

    if (status === 401 && data?.expired) {
      redirectToLogin(true);
      return Promise.reject(error);
    }

    if (status === 401 && !isAuthRequest(requestUrl) && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const sentToken = bearerToken(originalRequest.headers.Authorization);
        const currentToken = getAccessToken();
        // Pedido saiu com um token que entretanto já foi renovado: repetir sem novo refresh.
        if (!currentToken || currentToken === sentToken) {
          await refreshSessionOnce();
        }
        return api(originalRequest);
      } catch (refreshError) {
        redirectToLogin(true);
        return Promise.reject(refreshError);
      }
    }

    if (status === 429) {
      const retryAfter = data?.retryAfter ?? 60;
      const message = data?.error ?? `Muitas tentativas. Aguarda ${retryAfter} segundos.`;
      console.error(message);
    }

    return Promise.reject(error);
  },
);
