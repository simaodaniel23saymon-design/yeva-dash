import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  persistTokens,
} from './authStorage';

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
  withCredentials: false,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/demo', '/auth/refresh', '/auth/logout'];

function isAuthRequest(url: string): boolean {
  return AUTH_PATHS.some((path) => url.includes(path));
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function redirectToLogin(expired = false): void {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/login')) return;
  clearAuthStorage();
  window.location.href = expired ? '/login?expired=true' : '/login';
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
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        redirectToLogin(true);
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newToken = persistTokens(response.data);
        if (!newToken) throw new Error('Refresh sem token');

        onRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        redirectToLogin(true);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 429) {
      const retryAfter = data?.retryAfter ?? 60;
      const message = data?.error ?? `Muitas tentativas. Aguarda ${retryAfter} segundos.`;
      console.error(message);
    }

    return Promise.reject(error);
  }
);
