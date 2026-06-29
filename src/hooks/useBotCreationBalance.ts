import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { MIN_DEPOSIT } from '../utils/constants';
import { formatMoney, toUSDT } from '../utils/format';
import { fetchWalletRealStats } from '../utils/liveData';

export function isDemoPlan(plan?: string | null): boolean {
  return String(plan ?? '').trim().toUpperCase() === 'DEMO';
}

async function fetchDemoWalletBalance(): Promise<number> {
  try {
    const res = await api.get<{ balance: number }>('/wallet/balance');
    return toUSDT(res.data.balance ?? 0);
  } catch {
    const res = await api.get<{ balance: number }>('/wallet');
    return toUSDT(res.data.balance ?? 0);
  }
}

async function fetchRealExchangeBalance(): Promise<number> {
  const stats = await fetchWalletRealStats();
  return stats?.availableBalance ?? 0;
}

export function useBotCreationBalance(pollMs = 30000) {
  const { user } = useAuth();
  const isDemo = isDemoPlan(user?.plan);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const value = isDemo ? await fetchDemoWalletBalance() : await fetchRealExchangeBalance();
      setBalance(value);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh().finally(() => { if (active) setLoading(false); });

    if (pollMs <= 0) return () => { active = false; };

    const id = setInterval(refresh, pollMs);
    return () => { active = false; clearInterval(id); };
  }, [refresh, pollMs]);

  const hasInsufficientBalance = !isDemo && balance < MIN_DEPOSIT;

  const balanceLabel = isDemo
    ? `Saldo Demo: ${formatMoney(balance)} (Fictício)`
    : `Saldo Binance: ${formatMoney(balance)} (Real)`;

  return {
    isDemo,
    balance,
    loading,
    refresh,
    hasInsufficientBalance,
    balanceLabel,
    insufficientMessage: hasInsufficientBalance
      ? `Saldo insuficiente. Mínimo ${MIN_DEPOSIT} USDT.`
      : '',
  };
}
