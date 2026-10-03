/**
 * Helpers de vista da página Spot. Só formatação e rótulos:
 * estados e PnL vêm do backend, nada é calculado aqui.
 */

import type {
  SpotAccountSpotState,
  SpotCoin,
  SpotCoinDisplayState,
  SpotCoinExecutionPhase,
  SpotCoinExecutionState,
  SpotCoinPositionState,
  SpotCoinStrategyState,
  SpotExecutionStatus,
  SpotRealAccount,
  SpotRealPosition,
} from '../types/spot';
import { DATA_STATE_TEXT, SPOT_TRADING_TEXT, accountValue, balanceText, spotAccountState, spotTradingState } from './dataStates';

export const COIN_STATE_LABEL: Record<SpotCoinDisplayState, string> = {
  OFF: 'OFF',
  ON: 'ON',
  OPPORTUNITY: 'Oportunidade',
  WATCHING: 'Em observação',
  NO_SIGNAL: 'Sem sinal',
  OUTSIDE_RANKING: 'Fora do ranking',
};

/** Família Estratégia — independente da preferência, da posição e da execução. */
export const STRATEGY_STATE_LABEL: Record<SpotCoinStrategyState, string> = {
  OPPORTUNITY: 'Oportunidade',
  WATCHING: 'Em observação',
  NO_SIGNAL: 'Sem sinal',
  OUTSIDE_RANKING: 'Fora do ranking',
  UNKNOWN: 'Dados em atualização',
};

/** Família Posição REAL. */
export const POSITION_STATE_LABEL: Record<SpotCoinPositionState, string> = {
  NO_POSITION: 'Sem posição',
  OPEN: 'Aberta',
  CLOSING: 'A fechar',
  CLOSED: 'Fechada',
};

/** Família Execução (vista do utilizador). Execução real desativada nesta fase. */
export const EXECUTION_PHASE_LABEL: Record<SpotCoinExecutionPhase, string> = {
  DISABLED: 'Desativada',
  READY: 'Pronta',
  BLOCKED: 'Bloqueada',
  EXECUTING: 'Em execução',
  EXECUTED: 'Executada',
};

export function strategyTone(s: SpotCoinStrategyState): string {
  if (s === 'OPPORTUNITY') return 'text-cyan border-cyan-30';
  if (s === 'WATCHING') return 'text-text1 border-border2';
  return 'text-text3 border-border1';
}

/** Igual a deriveDisplayState do backend — usado só na atualização otimista do toggle. */
export function displayStateFor(enabled: boolean, s: SpotCoinStrategyState): SpotCoinDisplayState {
  if (!enabled) return 'OFF';
  return s === 'UNKNOWN' ? 'ON' : s;
}

export function withPreference(coin: SpotCoin, enabled: boolean): SpotCoin {
  return { ...coin, enabled, displayState: displayStateFor(enabled, coin.strategyState) };
}

export function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const digits = n >= 1000 ? 2 : n >= 1 ? 4 : 6;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}

export function fmtSignedPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function fmtUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Sinal só para valores não nulos depois de arredondar: nunca "-$0.00". */
export function fmtSignedUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const cents = Math.round(n * 100);
  const abs = (Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${cents > 0 ? '+' : cents < 0 ? '−' : ''}$${abs}`;
}

export function signTone(n: number | null): string {
  if (n == null || !Number.isFinite(n) || Math.round(n * 100) === 0) return 'text-text2';
  return n > 0 ? 'text-cyan' : 'text-red';
}

/** LIVE só quando o backend diz LIVE e o LIVE está ligado; tudo o resto é desativado. */
export function isExecutionLive(execution: SpotExecutionStatus | undefined, liveEnabled: boolean): boolean {
  return execution === 'LIVE' && liveEnabled;
}

export function executionLabel(execution: SpotExecutionStatus | undefined, liveEnabled: boolean): string {
  if (isExecutionLive(execution, liveEnabled)) return 'Execução disponível';
  return execution === 'PILOT' ? 'Piloto controlado' : 'Execução desativada';
}

export const SPOT_STATE_LABEL: Record<SpotAccountSpotState, string> = {
  READY: 'Pronta',
  PILOT: 'Piloto',
  DISABLED: 'Trading desativado',
};

/** Estado interno da última ordem real — diagnóstico de admin. */
export const EXECUTION_STATE_LABEL: Record<SpotCoinExecutionState, string> = {
  PENDING: 'Pendente',
  SUBMITTING: 'A enviar',
  UNKNOWN: 'Desconhecido · a reconciliar',
  SUBMITTED: 'Enviada',
  PARTIALLY_FILLED: 'Parcial',
  FILLED: 'Executada',
  CANCELLED: 'Cancelada',
  REJECTED: 'Rejeitada',
  REQUIRES_RECONCILIATION: 'Requer reconciliação',
  SETTLED: 'Liquidada',
};

/** Campo sem valor conhecido: traço (o estado da conta explica porquê). Nunca zero. */
export const NOT_AVAILABLE = '—';
export const BALANCE_UNAVAILABLE = DATA_STATE_TEXT.DATA_UNAVAILABLE;

const orNA = (s: string) => (s === '—' ? NOT_AVAILABLE : s);

/** Resumo REAL da conta Spot. Saldo segue o estado dos dados; restantes valores só com leitura válida. */
export function accountFacts(a: SpotRealAccount, execution: SpotExecutionStatus | undefined, liveEnabled: boolean): Array<[string, string]> {
  const s = spotAccountState(a, false);
  return [
    ['Conta', a.status === 'CONNECTED' ? 'Conectada' : 'Não conectada'],
    ['Saldo Spot', balanceText(s, a.balanceUsdt)],
    ['Disponível Spot', accountValue(s, a.availableUsdt, (v) => fmtUsd(v))],
    ['PnL REAL não realizado · Spot', accountValue(s, a.unrealizedPnl, (v) => fmtSignedUsd(v))],
    ['PnL REAL realizado · Spot', accountValue(s, a.realizedPnl, (v) => fmtSignedUsd(v))],
    ['Execução', execution === 'PILOT' ? executionLabel(execution, liveEnabled) : SPOT_TRADING_TEXT[spotTradingState(a)]],
  ];
}

/** Campos da posição REAL. Sem posição ⇒ null (a UI mostra "Sem posição aberta"). */
export function positionFacts(p: SpotRealPosition | null): Array<[string, string]> | null {
  if (!p) return null;
  return [
    ['Quantidade', p.quantity.toLocaleString('en-US', { maximumFractionDigits: 8 })],
    ['Entrada', orNA(fmtPrice(p.entryPrice))],
    ['Preço atual', orNA(fmtPrice(p.currentPrice))],
    ['PnL REAL não realizado', orNA(fmtSignedUsd(p.unrealizedPnl))],
    ['PnL REAL realizado', orNA(fmtSignedUsd(p.realizedPnl))],
    ['ROI', orNA(fmtSignedPct(p.roiPct))],
  ];
}
