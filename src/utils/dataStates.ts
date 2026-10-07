/**
 * Estados de dados da conta e textos de estado vazio. Nunca "Não disponível" genérico:
 * cada situação tem o seu texto, e um valor desconhecido nunca aparece como zero.
 */

import type { AccountDataState, AccountTradingState, SpotRealAccount } from '../types/spot';

const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type UiDataState = AccountDataState | 'DATA_LOADING';

export const DATA_STATE_TEXT: Record<Exclude<UiDataState, 'CONNECTED'>, string> = {
  NOT_CONNECTED: 'Conecte uma exchange para continuar.',
  ZERO_BALANCE: '$0.00 USDT',
  DATA_UNAVAILABLE: 'Não foi possível atualizar o saldo.',
  DATA_STALE: 'Dados desatualizados.',
  DATA_LOADING: 'A carregar…',
};

export const TRADING_DISABLED_TEXT = 'Trading desativado';

/** Estado de trading da conta Spot (separado do estado do saldo). */
export const SPOT_TRADING_TEXT: Record<AccountTradingState, string> = {
  TRADING_DISABLED: 'Trading Spot desativado.',
  TRADING_AVAILABLE: 'Trading Spot disponível.',
};

export function spotTradingState(account: SpotRealAccount | null): AccountTradingState {
  return account?.tradingState === 'TRADING_AVAILABLE' ? 'TRADING_AVAILABLE' : 'TRADING_DISABLED';
}

export const EMPTY_TEXT = {
  CONNECT: 'Conecte uma exchange para continuar.',
  ZERO: '$0.00 USDT',
  DATA_ERROR: 'Não foi possível atualizar os dados.',
  NO_OPPORTUNITY: 'Sem oportunidade elegível no momento.',
  UPDATING: 'Dados em atualização.',
  NO_POSITION: 'Sem posição aberta.',
  TRADING_DISABLED: 'Trading desativado.',
  MARKET_UPDATING: 'Mercado em atualização',
  LAST_SCAN: 'Último scan',
  MY_COINS_EMPTY: 'Adicione uma moeda para começar.',
  SEARCH_EMPTY: 'Nenhuma moeda encontrada.',
} as const;

export const STALE_MS = 5 * 60_000;

/** Estado da conta Spot: o backend decide (dataState); sem resposta ⇒ a carregar ou indisponível. */
export function spotAccountState(account: SpotRealAccount | null, loading: boolean): UiDataState {
  if (!account) return loading ? 'DATA_LOADING' : 'DATA_UNAVAILABLE';
  if (account.dataState) return account.dataState;
  if (account.status !== 'CONNECTED') return 'NOT_CONNECTED';
  if (account.balanceUsdt == null) return 'DATA_UNAVAILABLE';
  return account.balanceUsdt === 0 ? 'ZERO_BALANCE' : 'CONNECTED';
}

/**
 * Estado da conta Futures a partir de /account/live-status. O backend distingue "sem conta"
 * (NOT_CONNECTED) de "leitura falhou" (DATA_UNAVAILABLE); pedido falhado ⇒ DATA_UNAVAILABLE.
 */
export function futuresAccountState(i: {
  loading: boolean;
  requestFailed: boolean;
  dataState?: 'NOT_CONNECTED' | 'CONNECTED' | 'DATA_UNAVAILABLE';
  connected: boolean;
  balance: number | null;
  updatedAt?: string | null;
  nowMs?: number;
}): UiDataState {
  if (i.loading) return 'DATA_LOADING';
  if (i.requestFailed) return 'DATA_UNAVAILABLE';
  const base = i.dataState ?? (i.connected ? 'CONNECTED' : 'NOT_CONNECTED');
  if (base !== 'CONNECTED') return base;
  const at = i.updatedAt ? Date.parse(i.updatedAt) : NaN;
  if (Number.isFinite(at) && (i.nowMs ?? Date.now()) - at > STALE_MS) return 'DATA_STALE';
  if (i.balance == null) return 'DATA_UNAVAILABLE';
  return i.balance === 0 ? 'ZERO_BALANCE' : 'CONNECTED';
}

/** Estados em que os valores da conta podem ser mostrados. */
export function hasAccountValues(s: UiDataState): boolean {
  return s === 'CONNECTED' || s === 'ZERO_BALANCE' || s === 'DATA_STALE';
}

/** Texto do saldo: valor em USDT quando há leitura; caso contrário o texto do estado. */
export function balanceText(s: UiDataState, balance: number | null): string {
  if (s === 'ZERO_BALANCE') return DATA_STATE_TEXT.ZERO_BALANCE;
  if ((s === 'CONNECTED' || s === 'DATA_STALE') && balance != null && Number.isFinite(balance)) return `${fmtUsd(balance)} USDT`;
  if (s === 'CONNECTED') return DATA_STATE_TEXT.DATA_UNAVAILABLE;
  return DATA_STATE_TEXT[s];
}

/** Valor de um campo da conta (PnL, posições): só com leitura válida; caso contrário "—". */
export function accountValue<T>(s: UiDataState, value: T | null | undefined, fmt: (v: T) => string): string {
  if (!hasAccountValues(s) || value == null) return '—';
  return fmt(value);
}

export function dataStateTone(s: UiDataState): string {
  if (s === 'CONNECTED' || s === 'ZERO_BALANCE') return 'text-text1';
  if (s === 'DATA_STALE') return 'text-text2';
  return 'text-text2';
}

export function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
