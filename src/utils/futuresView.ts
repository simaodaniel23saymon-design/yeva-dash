/**
 * Helpers da página Futures. Só dados Futures (posições /exchange/positions, bots não-Spot);
 * nada de Spot entra aqui. Valores desconhecidos ficam null — a UI mostra o estado dos dados, nunca zero.
 */

import type { ExchangePosition, LiveBot } from './liveData';

export type FuturesPositionRow = {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number | null;
  markPrice: number | null;
  leverage: number | null;
  margin: number | null;
  unrealizedPnl: number | null;
};

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function futuresPositionRows(positions: readonly ExchangePosition[]): FuturesPositionRow[] {
  const out: FuturesPositionRow[] = [];
  for (const p of positions ?? []) {
    const amt = num(p.positionAmt);
    if (amt == null || amt === 0) continue;
    const declared = String(p.positionSide || '').toUpperCase();
    const side: 'LONG' | 'SHORT' = declared === 'SHORT' || (declared !== 'LONG' && amt < 0) ? 'SHORT' : 'LONG';
    out.push({
      symbol: p.symbol,
      side,
      quantity: Math.abs(amt),
      entryPrice: num(p.entryPrice),
      markPrice: num(p.markPrice),
      leverage: num(p.leverage),
      margin: num(p.initialMargin),
      unrealizedPnl: num(p.unrealizedProfit),
    });
  }
  return out;
}

/** Bots Futures do utilizador. Bots Spot (market=SPOT) nunca aparecem aqui. */
export function futuresBots<T extends Pick<LiveBot, 'market'>>(bots: readonly T[]): T[] {
  return (bots ?? []).filter((b) => String(b.market ?? 'FUTURES').toUpperCase() !== 'SPOT');
}

export type FuturesMarketRow = { symbol: string; price: number | null; change24hPct: number | null };

export type FuturesCoinCard = {
  symbol: string;
  base: string;
  price: number | null;
  change24hPct: number | null;
  side: 'LONG' | 'SHORT' | null;
  position: FuturesPositionRow | null;
  leverage: number | null;
  botRunning: boolean | null;
};

type FuturesBotLike = Pick<LiveBot, 'id' | 'market'> & { symbol?: string; pair?: string; leverage?: number; status?: string };

/**
 * Um cartão por moeda Futures (bots do utilizador + posições abertas). PnL, entrada e mark
 * vêm tal e qual de /exchange/positions; preço e 24h do Market Radar Futures. Sem dados Spot.
 */
export function futuresCoinCards(
  bots: readonly FuturesBotLike[],
  rows: readonly FuturesPositionRow[],
  market: readonly FuturesMarketRow[],
  botId: string | null = null
): FuturesCoinCard[] {
  const scoped = futuresBots(bots).filter((b) => !botId || b.id === botId);
  const symOf = (b: FuturesBotLike) => String(b.symbol ?? b.pair ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const symbols: string[] = [];
  for (const s of [...rows.filter((r) => !botId || scoped.some((b) => symOf(b) === r.symbol)).map((r) => r.symbol), ...scoped.map(symOf)]) {
    if (s && !symbols.includes(s)) symbols.push(s);
  }
  const m = new Map(market.map((x) => [x.symbol, x]));
  return symbols.map((symbol) => {
    const position = rows.find((r) => r.symbol === symbol) ?? null;
    const bot = scoped.find((b) => symOf(b) === symbol) ?? null;
    const botLev = bot?.leverage;
    return {
      symbol,
      base: symbol.replace(/USDT$/, ''),
      price: m.get(symbol)?.price ?? position?.markPrice ?? null,
      change24hPct: m.get(symbol)?.change24hPct ?? null,
      side: position?.side ?? null,
      position,
      leverage: position?.leverage ?? (typeof botLev === 'number' && Number.isFinite(botLev) ? botLev : null),
      botRunning: bot ? String(bot.status ?? '').toLowerCase() === 'running' : null,
    };
  });
}

/** Valor só quando a conta Futures está ligada; caso contrário null (nunca zero). */
export function whenConnected<T>(connected: boolean, value: T): T | null {
  return connected ? value : null;
}
