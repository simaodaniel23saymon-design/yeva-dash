import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  EMPTY_BINANCE_DATA,
  normalizeBinanceData,
  type BinanceData,
} from '../utils/binanceData';

const LIVE_STATUS_PATH = '/account/live-status';

export type { BinanceData };

export function useBinanceData(pollMs = 10000) {
  const [data, setData] = useState<BinanceData>(EMPTY_BINANCE_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  const refetch = useCallback(async (silent = false) => {
    const seq = ++requestSeqRef.current;
    if (!silent) setRefreshing(true);

    try {
      const res = await api.get<Record<string, unknown>>(LIVE_STATUS_PATH, {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (!mountedRef.current || seq !== requestSeqRef.current) return;

      setData(normalizeBinanceData(res.data));
      setError(null);
    } catch {
      if (mountedRef.current && seq === requestSeqRef.current) {
        setError('Não foi possível carregar dados da Binance.');
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
    refetch();

    if (pollMs <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }

    const intervalId = window.setInterval(() => refetch(true), pollMs);

    const onResume = () => {
      if (!document.hidden) refetch(true);
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
  }, [refetch, pollMs]);

  return {
    data,
    loading,
    refreshing,
    error,
    refetch: () => refetch(false),
  };
}
