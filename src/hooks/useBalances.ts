import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toUSDT } from '../utils/format';

export function useBalances(pollMs = 30000) {
  const [gasBalance, setGasBalance] = useState(0);
  const [binanceBalance, setBinanceBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let gas = 0;
    let binance = 0;

    try {
      const gasRes = await api.get<{ balance: number }>('/wallet/balance');
      gas = gasRes.data.balance ?? 0;
    } catch {
      try {
        const w = await api.get<{ balance: number }>('/wallet');
        gas = w.data.balance ?? 0;
      } catch { /* ignore */ }
    }

    try {
      const statusRes = await api.get<{ binanceBalance?: number; wallet?: { balance?: number } }>('/bots/status');
      binance = statusRes.data.binanceBalance ?? 0;
      if (!gas && statusRes.data.wallet?.balance != null) {
        gas = statusRes.data.wallet.balance;
      }
    } catch { /* ignore */ }

    setGasBalance(gas);
    setBinanceBalance(binance);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh().finally(() => { if (active) setLoading(false); });
    if (pollMs > 0) {
      const id = setInterval(refresh, pollMs);
      return () => { active = false; clearInterval(id); };
    }
    return () => { active = false; };
  }, [refresh, pollMs]);

  return {
    gasBalance,
    binanceBalance,
    gasUSDT: toUSDT(gasBalance),
    binanceUSDT: binanceBalance,
    loading,
    refresh,
  };
}
