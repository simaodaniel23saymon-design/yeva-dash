/**
 * Helpers de vista da página Spot. Só formatação e rótulos:
 * estados e PnL vêm do backend, nada é calculado aqui.
 */

import type { SpotCoin, SpotCoinDisplayState, SpotCoinStrategyState, SpotVenue, SpotVenueStatus } from '../types/spot';

export const VENUE_STATUS_LABEL: Record<SpotVenueStatus, string> = {
  CONNECTED: 'Ligada',
  AVAILABLE: 'Disponível',
  NOT_CONNECTED: 'Não ligada',
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
    ['Conta', v.accountConnected ? 'Ligada' : v.auth === 'WALLET' ? 'Carteira (futuro)' : 'Não ligada'],
    ['Dados de mercado', v.marketDataAvailable ? 'Disponíveis' : 'Indisponíveis'],
    ['Trading Spot', v.tradingAvailable ? 'Ativo' : 'Não ativo'],
    ['LIVE', v.liveEnabled ? 'Ligado' : 'Desligado'],
  ];
}

export const COIN_STATE_LABEL: Record<SpotCoinDisplayState, string> = {
  OFF: 'OFF',
  ON: 'ON',
  WATCHING: 'A observar',
  POSITION_OPEN: 'Posição aberta',
  OUTSIDE_RANKING: 'Fora do ranking',
  INVALIDATED: 'Invalidada',
  EXITED: 'Saiu',
};

export function coinStateTone(s: SpotCoinDisplayState): string {
  if (s === 'POSITION_OPEN') return 'text-cyan border-cyan-30';
  if (s === 'WATCHING' || s === 'ON') return 'text-text1 border-border2';
  if (s === 'INVALIDATED') return 'text-red border-red-30';
  if (s === 'EXITED') return 'text-gold border-gold-30';
  return 'text-text3 border-border1';
}

/** Igual a deriveDisplayState do backend — usado só na atualização otimista do toggle. */
export function displayStateFor(enabled: boolean, s: SpotCoinStrategyState): SpotCoinDisplayState {
  if (s === 'POSITION_OPEN') return 'POSITION_OPEN';
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

export function modeLabel(mode: 'PAPER' | 'REAL', liveEnabled: boolean): string {
  if (mode === 'PAPER' || !liveEnabled) return 'PAPER · simulação';
  return 'LIVE';
}
