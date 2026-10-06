import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';

/** Exchanges com ligação só de leitura (Fase 3.44). Binance continua também no fluxo dos bots. */
export type ReadOnlyExchange = 'BINANCE' | 'BITGET' | 'BYBIT';

export type ConnectionStatus =
  | 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'READ_ONLY' | 'BLOCKED' | 'INVALID_CREDENTIALS'
  | 'PERMISSION_BLOCKED' | 'CLOCK_BLOCKED' | 'ACCOUNT_UNAVAILABLE' | 'STALE' | 'ERROR';

export type AccountBalance =
  | { state: 'DATA_UNAVAILABLE'; stableUsd: null; asOf: string | null }
  | { state: 'OK' | 'DATA_STALE'; stableUsd: number; asOf: string };

/** Vista devolvida pelo backend: nunca contém chaves, secrets ou passphrases. */
export interface ExchangeAccountView {
  id: string;
  exchange: string;
  market: 'SPOT' | 'FUTURES' | null;
  accountType: string | null;
  connectionStatus: ConnectionStatus;
  statusReason: string | null;
  message: string;
  legacy: boolean;
  mode: 'LEGACY_BOTS' | 'READ_ONLY';
  readOnly: boolean;
  executionEnabled: false;
  notice: string | null;
  permissions: { read: string; trading: string; withdrawal: string; transfer: string } | null;
  warnings: string[];
  clockStatus: string | null;
  balance: AccountBalance | null;
  snapshotAt: string | null;
}

export interface ConnectResult {
  ok: boolean;
  status: ConnectionStatus | null;
  message: string;
  warnings: string[];
  code?: string;
}

const SLOW = { timeout: 30_000 };

function resultFromError(err: unknown): ConnectResult {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const d = err.response.data as { status?: ConnectionStatus; message?: string; code?: string; warnings?: string[] };
    if (d.message || d.code) {
      return { ok: false, status: d.status ?? null, message: d.message ?? getFriendlyError(err).message, warnings: d.warnings ?? [], code: d.code };
    }
  }
  return { ok: false, status: null, message: getFriendlyError(err).message, warnings: [] };
}

export function useExchangeAccounts() {
  const [accounts, setAccounts] = useState<ExchangeAccountView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ accounts: ExchangeAccountView[] }>('/exchange/accounts');
      setAccounts(res.data.accounts ?? []);
      setError('');
    } catch (err) {
      setError(getFriendlyError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Market enviado SEMPRE explicitamente (o backend recusa sem market). */
  const connect = useCallback(async (p: { exchange: ReadOnlyExchange; market: 'SPOT'; apiKey: string; apiSecret: string; passphrase?: string }): Promise<ConnectResult> => {
    try {
      const res = await api.post<{ status: ConnectionStatus; message: string; warnings?: string[] }>('/exchange/accounts/connect', p, SLOW);
      await refresh();
      return { ok: true, status: res.data.status, message: res.data.message, warnings: res.data.warnings ?? [] };
    } catch (err) {
      await refresh();
      return resultFromError(err);
    }
  }, [refresh]);

  const updateKeys = useCallback(async (accountId: string, p: { market: 'SPOT'; apiKey: string; apiSecret: string; passphrase?: string }): Promise<ConnectResult> => {
    try {
      const res = await api.put<{ status: ConnectionStatus; message: string; warnings?: string[] }>(`/exchange/accounts/${encodeURIComponent(accountId)}/keys`, p, SLOW);
      await refresh();
      return { ok: true, status: res.data.status, message: res.data.message, warnings: res.data.warnings ?? [] };
    } catch (err) {
      await refresh();
      return resultFromError(err);
    }
  }, [refresh]);

  const disconnect = useCallback(async (accountId: string): Promise<ConnectResult> => {
    try {
      await api.delete(`/exchange/accounts/${encodeURIComponent(accountId)}`);
      await refresh();
      return { ok: true, status: 'NOT_CONNECTED', message: 'Conta desligada.', warnings: [] };
    } catch (err) {
      return resultFromError(err);
    }
  }, [refresh]);

  const refreshSnapshot = useCallback(async (account: ExchangeAccountView): Promise<ConnectResult> => {
    if (!account.market) return { ok: false, status: null, message: 'Mercado da conta desconhecido.', warnings: [] };
    try {
      const res = await api.get<{ success: boolean; account: ExchangeAccountView | null }>(
        `/exchange/accounts/${encodeURIComponent(account.id)}/snapshot`,
        { ...SLOW, params: { market: account.market, refresh: '1' } }
      );
      await refresh();
      const a = res.data.account;
      return { ok: res.data.success, status: a?.connectionStatus ?? null, message: a?.message ?? '', warnings: a?.warnings ?? [] };
    } catch (err) {
      await refresh();
      return resultFromError(err);
    }
  }, [refresh]);

  return { accounts, loading, error, refresh, connect, updateKeys, disconnect, refreshSnapshot };
}

/** Rótulo curto do estado para a UI. Nunca "Trading disponível". */
export function statusLabel(s: ConnectionStatus): { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' } {
  switch (s) {
    case 'READ_ONLY':
      return { text: 'Read-only', tone: 'ok' };
    case 'CONNECTED':
      return { text: 'Connected', tone: 'ok' };
    case 'STALE':
      return { text: 'Stale', tone: 'warn' };
    case 'NOT_CONNECTED':
      return { text: 'Not connected', tone: 'muted' };
    case 'CONNECTING':
      return { text: 'Connecting', tone: 'warn' };
    default:
      return { text: 'Blocked', tone: 'bad' };
  }
}

/** Desconhecido ≠ zero. */
export function balanceLabel(b: AccountBalance | null): string | null {
  if (!b) return null;
  if (b.state === 'DATA_UNAVAILABLE') return 'Indisponível';
  const v = `$${b.stableUsd.toFixed(2)}`;
  return b.state === 'DATA_STALE' ? `${v} (desatualizado)` : v;
}

export const exchangeTitle = (ex: string) => (ex === 'BITGET' ? 'Bitget' : ex === 'BYBIT' ? 'Bybit' : ex === 'BINANCE' ? 'Binance' : ex);
export const marketTitle = (m: string | null) => (m === 'SPOT' ? 'Spot' : m === 'FUTURES' ? 'Futures' : '—');
