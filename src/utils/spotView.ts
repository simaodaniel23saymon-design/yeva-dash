/**
 * Helpers de vista da página Spot. Só formatação e rótulos:
 * estados e PnL vêm do backend, nada é calculado aqui.
 */

import type {
  SpotCoin,
  SpotCoinDisplayState,
  SpotCoinStrategyState,
  SpotExecutionStatus,
  SpotRealAccount,
  SpotRealPosition,
  SpotVenue,
  SpotVenueStatus,
} from '../types/spot';

export const VENUE_STATUS_LABEL: Record<SpotVenueStatus, string> = {
  CONNECTED: 'CONNECTED',
  AVAILABLE: 'Disponível',
  NOT_CONNECTED: 'NOT CONNECTED',
  COMING_SOON: 'Em breve',
  NOT_SUPPORTED: 'Não suportada',
};

export function venueStatusTone(status: SpotVenueStatus): string {
  if (status === 'CONNECTED') return 'text-cyan border-cyan-30';
  if (status === 'COMING_SOON' || status === 'NOT_SUPPORTED') return 'text-text3 border-border2';
  return 'text-text2 border-border2';
}

export type VenueAction = { label: string; to: string | null };

export function venueAction(v: SpotVenue): VenueAction {
  if (v.status === 'CONNECTED') return { label: 'Gerir', to: '/exchanges' };
  if (v.status === 'NOT_CONNECTED' && v.auth === 'API_KEY') return { label: 'Ligar', to: '/exchanges' };
  return { label: 'Ver', to: null };
}

/** Linhas do painel da exchange. "Trading Spot: ativo" só com execução real validada. */
export function venueFacts(v: SpotVenue): Array<[string, string]> {
  return [
    ['Ligação', VENUE_STATUS_LABEL[v.status]],
    ['Conta', v.accountConnected ? 'CONNECTED' : v.auth === 'WALLET' ? 'Carteira (futuro)' : 'NOT CONNECTED'],
    ['Dados de mercado', v.marketDataAvailable ? 'Disponíveis' : 'Indisponíveis'],
    ['Trading Spot', v.tradingAvailable ? 'LIVE' : 'DISABLED'],
    ['LIVE', v.liveEnabled ? 'LIVE' : 'DISABLED'],
  ];
}

export const COIN_STATE_LABEL: Record<SpotCoinDisplayState, string> = {
  OFF: 'OFF',
  ON: 'ON',
  WATCHING: 'A observar',
  OUTSIDE_RANKING: 'Fora do ranking',
};

export function coinStateTone(s: SpotCoinDisplayState): string {
  if (s === 'WATCHING' || s === 'ON') return 'text-text1 border-border2';
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

export function fmtSignedUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}$${abs}`;
}

export function signTone(n: number | null): string {
  if (n == null || !Number.isFinite(n) || n === 0) return 'text-text2';
  return n > 0 ? 'text-cyan' : 'text-red';
}

/** LIVE só quando o backend diz LIVE e o LIVE está ligado; tudo o resto é DISABLED. */
export function isExecutionLive(execution: SpotExecutionStatus | undefined, liveEnabled: boolean): boolean {
  return execution === 'LIVE' && liveEnabled;
}

export function executionLabel(execution: SpotExecutionStatus | undefined, liveEnabled: boolean): string {
  return isExecutionLive(execution, liveEnabled) ? 'LIVE' : 'Trading Disabled';
}

export const NOT_AVAILABLE = 'Não disponível';

const orNA = (s: string) => (s === '—' ? NOT_AVAILABLE : s);

/** Resumo REAL da conta. Valores null ficam "Não disponível" (nunca zero). */
export function accountFacts(a: SpotRealAccount, execution: SpotExecutionStatus | undefined, liveEnabled: boolean): Array<[string, string]> {
  return [
    ['Conta', a.status === 'CONNECTED' ? 'CONNECTED' : 'NOT CONNECTED'],
    ['Balance', orNA(fmtUsd(a.balanceUsdt))],
    ['REAL PnL não realizado', orNA(fmtSignedUsd(a.unrealizedPnl))],
    ['REAL PnL realizado', orNA(fmtSignedUsd(a.realizedPnl))],
    ['ROI', orNA(fmtSignedPct(a.roiPct))],
    ['Execução', isExecutionLive(execution, liveEnabled) ? 'LIVE' : 'Execution not enabled'],
  ];
}

/** Campos da posição REAL. Sem posição ⇒ null (a UI mostra "No active position"). */
export function positionFacts(p: SpotRealPosition | null): Array<[string, string]> | null {
  if (!p) return null;
  return [
    ['Quantidade', p.quantity.toLocaleString('en-US', { maximumFractionDigits: 8 })],
    ['Entrada', fmtPrice(p.entryPrice)],
    ['Preço atual', fmtPrice(p.currentPrice)],
    ['REAL PnL não realizado', fmtSignedUsd(p.unrealizedPnl)],
    ['REAL PnL realizado', fmtSignedUsd(p.realizedPnl)],
    ['ROI', fmtSignedPct(p.roiPct)],
  ];
}
