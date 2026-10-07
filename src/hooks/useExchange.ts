import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';
import { isDemoExchangeAccount } from '../utils/exchangeStatus';

/** Fluxo dos bots (chaves com trading): só Binance. Bitget/Bybit ligam-se pelo fluxo só de leitura. */
export type ExchangeName = 'Binance';
export type MarketType = 'FUTURES' | 'SPOT';
export type AccountMode = 'real' | 'demo';

export interface ExchangeStatusData {
  /** Conta Binance dos bots validada (nunca "existe alguma conta"). */
  connected: boolean;
  /** Mais do que uma conta Binance de bots: as rotas antigas exigem accountId. */
  ambiguous?: boolean;
  exchange?: {
    id?: string;
    exchange?: string;
    market?: string | null;
    accountType?: string | null;
    connectionStatus?: string;
    apiKeyMasked?: string;
    createdAt?: string;
  } | null;
}

export interface TestConnectionResult {
  success: boolean;
  balance?: number;
  error?: string;
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
    accountId?: string;
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
          accountId: params.accountId,
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
    if (
      !status.connected ||
      status.exchange?.exchange?.toUpperCase() !== 'BINANCE' ||
      status.ambiguous ||
      isDemoExchangeAccount({
        exchange: status.exchange?.exchange,
        accountType: status.exchange?.accountType ?? undefined,
      })
    ) return;
    const testnet = status.exchange.accountType === 'demo' || status.exchange.accountType === 'DEMO';
    const result = await testConnection({ exchange: 'Binance', market, testnet, accountId: status.exchange.id });
    if (result.success && result.balance != null) setExchangeBalance(result.balance);
  }, [status, testConnection]);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await api.get<ExchangeStatusData>('/exchange/status');
      const nextStatus: ExchangeStatusData = {
        ...res.data,
        connected:
          res.data.connected &&
          res.data.exchange?.exchange?.toUpperCase() === 'BINANCE' &&
          !res.data.ambiguous,
      };
      setStatus(nextStatus);
      return nextStatus;
    } catch {
      // Estado desconhecido nunca é apresentado como ligado.
      setStatus({ connected: false });
      return { connected: false };
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
    isDemoAccount: isDemoExchangeAccount({
      exchange: status.exchange?.exchange,
      accountType: status.exchange?.accountType ?? undefined,
    }),
    exchangeBalance,
    serverIp,
    loading,
    refreshStatus,
    refreshBalance,
    testConnection,
    setExchangeBalance,
  };
}
