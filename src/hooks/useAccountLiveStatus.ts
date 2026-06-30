import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export interface AccountLiveStatus {
  gasBalance: number;
  binanceBalance: number;
  exchangeConnected: boolean;
  openPnl: number;
  activeBots: number;
  todayResult: number;
  margin: number;
}

const EMPTY: AccountLiveStatus = {
  gasBalance: 0,
  binanceBalance: 0,
  exchangeConnected: false,
  openPnl: 0,
  activeBots: 0,
  todayResult: 0,
  margin: 0,
};

function normalize(raw: Record<string, unknown>): AccountLiveStatus {
  const num = (keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
    }
    return 0;
  };
  return {
    gasBalance: num(['gasBalance', 'gas_balance']),
    binanceBalance: num(['binanceBalance', 'binance_balance']),
    exchangeConnected: Boolean(raw.exchangeConnected ?? raw.exchange_connected),
    openPnl: num(['openPnl', 'open_pnl']),
    activeBots: num(['activeBots', 'active_bots']),
    todayResult: num(['todayResult', 'today_result']),
    margin: num(['margin', 'usedMargin', 'used_margin']),
  };
}

export function useAccountLiveStatus(pollMs = 10000) {
  const [data, setData] = useState<AccountLiveStatus>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get<Record<string, unknown>>('/account/live-status');
      setData(normalize(res.data));
      setLastUpdate(new Date());
      setError(null);
    } catch {
      setError('Não foi possível carregar o estado ao vivo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollMs <= 0) return;
    const id = setInterval(() => refresh(true), pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { data, loading, refreshing, lastUpdate, error, refresh };
}
