import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toUSDT } from '../utils/format';
import { normalizeAccountLiveStatus } from '../utils/accountSnapshot';

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
      const liveRes = await api.get<Record<string, unknown>>('/account/live-status');
      const live = normalizeAccountLiveStatus(liveRes.data);
      if (live.exchangeConnected) {
        binance = live.binanceBalance;
      }
    } catch { /* fallback abaixo */ }

    if (!binance) {
      try {
        const statsRes = await api.get<{ balance?: number; availableBalance?: number }>('/exchange/stats');
        binance = statsRes.data.balance ?? statsRes.data.availableBalance ?? 0;
      } catch { /* ignore */ }
    }

    if (!gas) {
      try {
        const statusRes = await api.get<{ wallet?: { balance?: number } }>('/bots/status');
        if (statusRes.data.wallet?.balance != null) {
          gas = statusRes.data.wallet.balance;
        }
      } catch { /* ignore */ }
    }

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
