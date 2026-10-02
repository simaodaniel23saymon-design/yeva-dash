/**
 * Resumo do Dashboard para o utilizador: mercado, oportunidades, estado das contas.
 * Diagnósticos de estratégia (REJECTED, MAX_POSITIONS, scores, fatores…) não passam por aqui —
 * ficam só na secção de diagnóstico do admin.
 */

export type OpportunityStatus = 'OPPORTUNITY' | 'WATCHING' | 'NONE';

export type MarketItem = {
  symbol: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  price: number | null;
  opportunity: OpportunityStatus;
};

const finiteOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function opportunityFrom(row: Record<string, unknown>): OpportunityStatus {
  const o = row.opportunity;
  if (o === 'OPPORTUNITY' || o === 'WATCHING' || o === 'NONE') return o;
  const d = String(row.decision ?? '').toUpperCase();
  if (d === 'APPROVED') return 'OPPORTUNITY';
  if (d === 'WATCH' || d === 'VALIDATING') return 'WATCHING';
  return 'NONE';
}

function directionFrom(row: Record<string, unknown>): MarketItem['direction'] {
  const d = row.direction;
  if (d === 'UP' || d === 'DOWN' || d === 'NEUTRAL') return d;
  if (row.side === 'WINNER') return 'UP';
  if (row.side === 'LOSER') return 'DOWN';
  return 'NEUTRAL';
}

/** Aceita a projeção USER e o payload ADMIN; devolve só campos de utilizador. */
export function toMarketItems(rows: readonly unknown[]): MarketItem[] {
  const out: MarketItem[] = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    if (typeof row.symbol !== 'string') continue;
    out.push({ symbol: row.symbol, direction: directionFrom(row), price: finiteOrNull(row.price), opportunity: opportunityFrom(row) });
  }
  return out;
}

export type MarketOverview = { up: number; down: number; opportunities: MarketItem[]; watching: number };

export function marketOverview(items: readonly MarketItem[]): MarketOverview {
  return {
    up: items.filter((i) => i.direction === 'UP').length,
    down: items.filter((i) => i.direction === 'DOWN').length,
    opportunities: items.filter((i) => i.opportunity === 'OPPORTUNITY'),
    watching: items.filter((i) => i.opportunity === 'WATCHING').length,
  };
}

export const NO_OPPORTUNITY_TEXT = 'Sem oportunidade no momento';

export const OPPORTUNITY_LABEL: Record<OpportunityStatus, string> = {
  OPPORTUNITY: 'Oportunidade',
  WATCHING: 'Em observação',
  NONE: 'Sem oportunidade',
};

/** Rótulo do mercado para o utilizador — nunca o motivo interno da estratégia. */
export function directionLabel(d: MarketItem['direction']): string {
  return d === 'UP' ? 'Em alta' : d === 'DOWN' ? 'Em baixa' : 'Lateral';
}

type SpotCoinLike = {
  symbol: string;
  base: string;
  price: number | null;
  change24hPct: number | null;
  strategyState: string;
};

export type MarketCard = {
  symbol: string;
  base: string;
  price: number | null;
  change24hPct: number | null;
  spot: OpportunityStatus | null;
  futures: OpportunityStatus | null;
};

const spotOpportunity = (s: string): OpportunityStatus | null =>
  s === 'OPPORTUNITY' ? 'OPPORTUNITY' : s === 'WATCHING' ? 'WATCHING' : s === 'UNKNOWN' ? null : 'NONE';

/** Cartões pequenos de mercado (BTC, ETH, SOL…): preço/24h do backend Spot + estado Spot e Futures. */
export function marketCards(coins: readonly SpotCoinLike[], items: readonly MarketItem[], limit = 6): MarketCard[] {
  const futures = new Map(items.map((i) => [i.symbol, i.opportunity]));
  return coins.slice(0, limit).map((c) => ({
    symbol: c.symbol,
    base: c.base,
    price: c.price,
    change24hPct: c.change24hPct,
    spot: spotOpportunity(c.strategyState),
    futures: futures.get(c.symbol) ?? null,
  }));
}

export type DashboardOpportunity = {
  key: string;
  base: string;
  change24hPct: number | null;
  market: 'SPOT' | 'FUTURES';
  to: '/spot' | '/futures';
};

/** Só oportunidades relevantes (Spot: estratégia OPPORTUNITY · Futures: projeção OPPORTUNITY). */
export function dashboardOpportunities(coins: readonly SpotCoinLike[], items: readonly MarketItem[]): DashboardOpportunity[] {
  const change = new Map(coins.map((c) => [c.symbol, c.change24hPct]));
  const spot = coins
    .filter((c) => c.strategyState === 'OPPORTUNITY')
    .map((c): DashboardOpportunity => ({ key: `S-${c.symbol}`, base: c.base, change24hPct: c.change24hPct, market: 'SPOT', to: '/spot' }));
  const fut = items
    .filter((i) => i.opportunity === 'OPPORTUNITY')
    .map((i): DashboardOpportunity => ({
      key: `F-${i.symbol}`,
      base: i.symbol.replace(/USDT$/, ''),
      change24hPct: change.get(i.symbol) ?? null,
      market: 'FUTURES',
      to: '/futures',
    }));
  return [...spot, ...fut];
}
