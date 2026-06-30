import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  EMPTY_ACCOUNT_LIVE_STATUS,
  normalizeAccountLiveStatus,
  sumPositionsUnrealizedPnl,
  type AccountLiveStatus,
} from '../utils/accountSnapshot';

const LIVE_STATUS_PATH = '/account/live-status';

async function enrichOpenPnlFromExchange(status: AccountLiveStatus): Promise<AccountLiveStatus> {
  if (!status.exchangeConnected) return status;
  if (status.openPnl !== 0) return status;

  try {
    const posRes = await api.get<{ positions?: { unrealizedProfit?: string | number }[] }>(
      '/exchange/positions',
      { params: { _: Date.now() }, headers: { 'Cache-Control': 'no-cache' } },
    );
    const positions = posRes.data.positions ?? [];
    if (positions.length === 0) return status;
    return { ...status, openPnl: sumPositionsUnrealizedPnl(positions) };
  } catch {
    return status;
  }
}

export type { AccountLiveStatus };

export function useAccountLiveStatus(pollMs = 10000) {
  const [data, setData] = useState<AccountLiveStatus>(EMPTY_ACCOUNT_LIVE_STATUS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (silent = false) => {
    const seq = ++requestSeqRef.current;
    if (!silent) setRefreshing(true);

    try {
      const res = await api.get<Record<string, unknown>>(LIVE_STATUS_PATH, {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (!mountedRef.current || seq !== requestSeqRef.current) return;

      const normalized = normalizeAccountLiveStatus(res.data);
      const enriched = await enrichOpenPnlFromExchange(normalized);

      if (!mountedRef.current || seq !== requestSeqRef.current) return;

      setData(enriched);
      setLastUpdate(new Date());
      setError(null);
    } catch {
      if (mountedRef.current && seq === requestSeqRef.current) {
        setError('Não foi possível carregar o estado ao vivo.');
      }
    } finally {
      if (mountedRef.current && seq === requestSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    if (pollMs <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }

    const intervalId = window.setInterval(() => {
      refresh(true);
    }, pollMs);

    const onResume = () => {
      if (!document.hidden) refresh(true);
    };

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);

    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [refresh, pollMs]);

  return { data, loading, refreshing, lastUpdate, error, refresh };
}
