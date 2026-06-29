import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';

export type ExchangeName = 'Binance' | 'Bybit';
export type MarketType = 'FUTURES' | 'SPOT';
export type AccountMode = 'real' | 'demo';

export interface ExchangeStatusData {
  connected: boolean;
  exchange?: {
    exchange?: string;
    market?: string;
    accountType?: string;
    apiKeyMasked?: string;
    createdAt?: string;
  } | null;
}

export interface TestConnectionResult {
  success: boolean;
  balance?: number;
  error?: string;
}

function normalizeExchange(name: string): ExchangeName {
  return name.toUpperCase().includes('BYBIT') ? 'Bybit' : 'Binance';
}

export function useExchange(pollMs = 0, options?: { fetchBalance?: boolean }) {
  const shouldFetchBalance = options?.fetchBalance !== false;
  const [status, setStatus] = useState<ExchangeStatusData>({ connected: false });
  const [exchangeBalance, setExchangeBalance] = useState<number | null>(null);
  const [serverIp, setServerIp] = useState('134.209.81.127');
  const [loading, setLoading] = useState(true);

  const fetchServerIp = useCallback(async () => {
    try {
      const res = await api.get<{ ip: string }>('/test/ip');
      if (res.data.ip) setServerIp(res.data.ip);
    } catch { /* fallback IP */ }
  }, []);

  const testConnection = useCallback(async (params: {
    apiKey?: string;
    apiSecret?: string;
    exchange: ExchangeName;
    market: MarketType;
    testnet: boolean;
  }): Promise<TestConnectionResult> => {
    try {
      const res = await api.post<{ success: boolean; balance?: number; error?: string }>(
        '/exchange/test-connection',
        {
          apiKey: params.apiKey,
          apiSecret: params.apiSecret,
          exchange: params.exchange,
          market: params.market,
          testnet: params.testnet,
        }
      );
      if (res.data.success && res.data.balance != null) {
        setExchangeBalance(res.data.balance);
      }
      return res.data;
    } catch (err: unknown) {
      return { success: false, error: getFriendlyError(err).message };
    }
  }, []);

  const refreshBalance = useCallback(async (market: MarketType = 'FUTURES') => {
    if (!status.connected || !status.exchange?.exchange) return;
    const ex = normalizeExchange(status.exchange.exchange);
    const testnet = status.exchange.accountType === 'demo' || status.exchange.accountType === 'DEMO';
    const result = await testConnection({ exchange: ex, market, testnet });
    if (result.success && result.balance != null) setExchangeBalance(result.balance);
  }, [status, testConnection]);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await api.get<ExchangeStatusData>('/exchange/status');
      setStatus(res.data);
      return res.data;
    } catch {
      try {
        const list = await api.get<{ exchange: string; isActive: boolean }[]>('/exchanges');
        const active = list.data.find(a => a.exchange !== 'DEMO' && a.isActive);
        const s: ExchangeStatusData = { connected: !!active, exchange: active ?? null };
        setStatus(s);
        return s;
      } catch {
        setStatus({ connected: false });
        return { connected: false };
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchServerIp(), refreshStatus()])
      .finally(() => { if (active) setLoading(false); });
    if (pollMs > 0) {
      const id = setInterval(refreshStatus, pollMs);
      return () => { active = false; clearInterval(id); };
    }
    return () => { active = false; };
  }, [fetchServerIp, refreshStatus, pollMs]);

  useEffect(() => {
    if (status.connected && shouldFetchBalance) refreshBalance();
  }, [status.connected, status.exchange?.exchange, shouldFetchBalance, refreshBalance]);

  return {
    status,
    isConnected: status.connected,
    exchangeBalance,
    serverIp,
    loading,
    refreshStatus,
    refreshBalance,
    testConnection,
    setExchangeBalance,
  };
}
