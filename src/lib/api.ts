import axios from 'axios';

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

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('yevatrade_refresh_token');
    if (!refreshToken) return null;

    try {
      const res = await api.post('/auth/refresh', { refreshToken });
      const { token, refreshToken: newRefreshToken } = res.data;
      localStorage.setItem('yevatrade_token', token);
      if (newRefreshToken) {
        localStorage.setItem('yevatrade_refresh_token', newRefreshToken);
      }
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      return token as string;
    } catch {
      localStorage.removeItem('yevatrade_refresh_token');
      localStorage.removeItem('yevatrade_token');
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('yevatrade_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = String(error.config?.url ?? '');
    const isAuthAttempt = ['/auth/login', '/auth/register', '/auth/demo', '/auth/refresh'].some(path => requestUrl.includes(path));

    if (error.response?.status === 401 && !isAuthAttempt && !(error.config as { _retry?: boolean })?._retry) {
      (error.config as { _retry?: boolean })._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api(error.config);
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
