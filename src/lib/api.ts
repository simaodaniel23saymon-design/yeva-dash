import axios from 'axios';

// Origem do backend. Usada como fallback caso VITE_API_URL não esteja definida
// no build (ex.: variável esquecida no painel da Cloudflare).
const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://api.yevatrade.com' : 'http://localhost:3001');

// Garante que o baseURL termina exatamente em /api — o backend monta todas as
// rotas sob /api. Funciona quer a VITE_API_URL inclua /api ou não (sem duplicar).
function buildBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');            // remove barras finais
  const withoutApi = trimmed.replace(/\/api$/i, '');  // remove /api final, se existir
  return `${withoutApi}/api`;
}

export const api = axios.create({
  baseURL: buildBaseUrl(RAW_API_URL),
  withCredentials: true,
  timeout: 15000,
});

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

    if (error.response?.status === 401 && !isAuthAttempt && !(error.config as any)?._retry) {
      const refreshToken = localStorage.getItem('yevatrade_refresh_token');
      if (refreshToken) {
        try {
          (error.config as any)._retry = true;
          const res = await api.post('/auth/refresh', { refreshToken });
          const { token, refreshToken: newRefreshToken } = res.data;
          localStorage.setItem('yevatrade_token', token);
          localStorage.setItem('yevatrade_refresh_token', newRefreshToken);
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          error.config.headers.Authorization = `Bearer ${token}`;
          return api(error.config);
        } catch {
          localStorage.removeItem('yevatrade_refresh_token');
        }
      }
      localStorage.removeItem('yevatrade_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
