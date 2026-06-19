import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

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
});

let refreshPromise: Promise<boolean> | null = null;

/** Renova a sessão via cookie HttpOnly (refresh token no servidor). */
export async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      await api.post('/auth/refresh');
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/demo', '/auth/refresh', '/auth/logout'];

function isAuthRequest(url: string): boolean {
  return AUTH_PATHS.some((path) => url.includes(path));
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const requestUrl = String(config?.url ?? '');

    if (status === 401 && config && !isAuthRequest(requestUrl) && !config._retry) {
      config._retry = true;
      const refreshed = await refreshSession();
      if (refreshed) return api(config);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
