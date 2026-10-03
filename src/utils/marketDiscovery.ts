/**
 * Fontes de moedas nas páginas Spot/Futures: Top Winners, Top Losers, Minhas moedas, Pesquisa.
 * Listas vêm do backend (ranking/radar existentes); aqui só ordenação, separação e sem duplicados.
 */

import type { FuturesMover, SpotCoin, SpotCoinsResponse } from '../types/spot';

export const SPOT_TOP_LIMIT = 10;
export const DASHBOARD_LIST_LIMIT = 5;

export function uniqueBySymbol<T extends { symbol: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.symbol) ? false : (seen.add(i.symbol), true)));
}

/** Top Winners Spot pela ordem do ranking (até 10). Sem scan recente ⇒ []. */
export function spotTopWinnerCoins(resp: SpotCoinsResponse | null, limit = SPOT_TOP_LIMIT): SpotCoin[] {
  if (!resp) return [];
  const by = new Map(resp.coins.map((c) => [c.symbol, c]));
  const order = resp.discovery?.topWinners ?? resp.coins.filter((c) => c.sources?.includes('TOP_WINNER')).map((c) => c.symbol);
  return uniqueBySymbol(order.map((s) => by.get(s)).filter((c): c is SpotCoin => c != null)).slice(0, limit);
}

/** Moedas do utilizador: preferência guardada ou posição REAL aberta. */
export function spotMyCoins(resp: SpotCoinsResponse | null): SpotCoin[] {
  if (!resp) return [];
  return uniqueBySymbol(resp.coins.filter((c) => (c.sources ? c.sources.includes('MY_COIN') : c.enabled || c.position != null)));
}

export function spotMarketUpdating(resp: SpotCoinsResponse | null): boolean {
  if (!resp) return true;
  return resp.discovery ? resp.discovery.marketState !== 'FRESH' : !resp.rankingFresh;
}

export const MOVER_STATE_LABEL: Record<FuturesMover['opportunityState'], string> = {
  SIGNAL: 'Sinal de momentum',
  MONITORED: 'Monitorizado',
};

export const SPOT_OPPORTUNITY_LABEL: Record<string, string> = {
  OPPORTUNITY: 'Oportunidade',
  WATCHING: 'Em observação',
  NO_SIGNAL: 'Sem sinal',
  OUTSIDE_RANKING: 'Monitorizado',
  UNKNOWN: 'Dados em atualização',
};
