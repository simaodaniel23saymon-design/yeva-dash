import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  referralCode: string;
  plan?: string;
  twoFAEnabled?: boolean;
  telegramLinked?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<{ requires2FA?: boolean }>;
  register: (email: string, password: string, referralCode?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

interface AuthResponse {
  token: string;
  accessToken?: string;
  refreshToken: string;
  user: User;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('yevatrade_token');
    if (savedToken) {
      setToken(savedToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      api.get<User>('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('yevatrade_token');
          localStorage.removeItem('yevatrade_refresh_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, totpCode?: string): Promise<{ requires2FA?: boolean }> => {
    const res = await api.post<Partial<AuthResponse> & { requires2FA?: boolean }>('/auth/login', {
      email,
      password,
      ...(totpCode ? { totpCode } : {}),
    });

    // Backend pediu código 2FA
    if (res.data.requires2FA) {
      return { requires2FA: true };
    }

    const { token: newToken, refreshToken, user: newUser } = res.data as AuthResponse;
    localStorage.setItem('yevatrade_token', newToken);
    localStorage.setItem('yevatrade_refresh_token', refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    return {};
  };

  const register = async (email: string, password: string, referralCode?: string) => {
    const res = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      ...(referralCode ? { referralCode } : {}),
    });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('yevatrade_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  };

  const loginDemo = async () => {
    const res = await api.post<AuthResponse>('/auth/demo');
    const { token: newToken, refreshToken, user: newUser } = res.data;
    localStorage.setItem('yevatrade_token', newToken);
    localStorage.setItem('yevatrade_refresh_token', refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('yevatrade_token');
    localStorage.removeItem('yevatrade_refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
