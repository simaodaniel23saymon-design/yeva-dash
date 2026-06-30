import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  clearAuthStorage,
  persistTokens,
  type AuthTokens,
} from '../lib/authStorage';

export interface User {
  id: string;
  email: string;
  name?: string;
  referralCode: string;
  plan?: string;
  isAdmin?: boolean;
  twoFAEnabled?: boolean;
  telegramLinked?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<{ requires2FA?: boolean }>;
  register: (email: string, password: string, referralCode?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface AuthResponse extends AuthTokens {
  requires2FA?: boolean;
  message?: string;
  user?: User;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchMe(): Promise<User> {
  const res = await api.get<User>('/auth/me');
  return res.data;
}

function applyAuthResponse(data: AuthResponse): User | null {
  persistTokens(data);
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => {
        clearAuthStorage();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (
    email: string,
    password: string,
    totpCode?: string
  ): Promise<{ requires2FA?: boolean }> => {
    const res = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
      ...(totpCode ? { totpCode } : {}),
    });

    if (res.data.requires2FA) return { requires2FA: true };

    applyAuthResponse(res.data);
    try {
      await refreshUser();
    } catch {
      if (res.data.user) setUser(res.data.user);
    }
    return {};
  };

  const register = async (email: string, password: string, referralCode?: string) => {
    const res = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      ...(referralCode ? { referralCode } : {}),
    });

    applyAuthResponse(res.data);
    try {
      await refreshUser();
    } catch {
      if (res.data.user) setUser(res.data.user);
    }
  };

  const loginDemo = async () => {
    const res = await api.post<AuthResponse>('/auth/demo');
    applyAuthResponse(res.data);
    await refreshUser();
  };

  const logout = async () => {
    const refreshToken = getRefreshTokenFromStorage();
    try {
      await api.post('/auth/logout', refreshToken ? { refreshToken } : undefined);
    } catch {
      /* ignora — limpa localmente */
    }
    clearAuthStorage();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginDemo, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function getRefreshTokenFromStorage(): string | null {
  return localStorage.getItem('refreshToken') || localStorage.getItem('yevatrade_refresh_token');
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return async () => {
    await logout();
    navigate('/login', { replace: true });
  };
}
