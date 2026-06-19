import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

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

interface LoginResponse {
  requires2FA?: boolean;
  message?: string;
  user?: User;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchMe(): Promise<User> {
  const res = await api.get<User>('/auth/me');
  return res.data;
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
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (
    email: string,
    password: string,
    totpCode?: string
  ): Promise<{ requires2FA?: boolean }> => {
    const res = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
      ...(totpCode ? { totpCode } : {}),
    });

    if (res.data.requires2FA) return { requires2FA: true };

    try {
      await refreshUser();
    } catch {
      if (res.data.user) setUser(res.data.user);
    }
    return {};
  };

  const register = async (email: string, password: string, referralCode?: string) => {
    await api.post('/auth/register', {
      email,
      password,
      ...(referralCode ? { referralCode } : {}),
    });
    try {
      await refreshUser();
    } catch {
      setUser(null);
    }
  };

  const loginDemo = async () => {
    await api.post('/auth/demo');
    await refreshUser();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* cookies podem já estar limpos */
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginDemo, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

/** Hook para logout com redirecionamento */
export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return async () => {
    await logout();
    navigate('/login', { replace: true });
  };
}
