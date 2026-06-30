import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  EMPTY_ACCOUNT_LIVE_STATUS,
  normalizeAccountLiveStatus,
  type AccountLiveStatus,
} from '../utils/accountSnapshot';

export type { AccountLiveStatus };

export function useAccountLiveStatus(pollMs = 10000) {
  const [data, setData] = useState<AccountLiveStatus>(EMPTY_ACCOUNT_LIVE_STATUS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get<Record<string, unknown>>('/account/live-status');
      setData(normalizeAccountLiveStatus(res.data));
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
