import { botPair, isBotRunning, type ExchangePosition, type LiveBot } from './liveData';

export interface KlinePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerSnapshot {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
}

export function collectTradingPairs(
  bots: LiveBot[],
  positions: ExchangePosition[],
  fallback = 'BTCUSDT',
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const add = (raw?: string) => {
    const sym = (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!sym || seen.has(sym)) return;
    seen.add(sym);
    ordered.push(sym.endsWith('USDT') ? sym : `${sym}USDT`);
  };

  positions.forEach(p => add(p.symbol));
  bots.filter(b => isBotRunning(b.status)).forEach(b => add(botPair(b)));
  bots.forEach(b => add(botPair(b)));
  add(fallback);

  return ordered;
}

export function resolveAutoChartSymbol(
  bots: LiveBot[],
  positions: ExchangePosition[],
  fallback = 'BTCUSDT',
): string {
  if (positions[0]?.symbol) return positions[0].symbol.toUpperCase();
  const running = bots.find(b => isBotRunning(b.status));
  if (running) return botPair(running);
  if (bots[0]) return botPair(bots[0]);
  return fallback;
}

export type ChartMarket = 'FUTURES' | 'SPOT';

const BINANCE_FUTURES = 'https://fapi.binance.com';
const BINANCE_SPOT = 'https://api.binance.com';

let futuresSymbolsCache: string[] | null = null;
let spotSymbolsCache: string[] | null = null;

function normalizeSymbol(symbol: string): string {
  const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return sym.endsWith('USDT') ? sym : `${sym}USDT`;
}

function marketBase(market: ChartMarket): string {
  return market === 'SPOT' ? BINANCE_SPOT : BINANCE_FUTURES;
}

export async function fetchBinanceSymbolList(market: ChartMarket): Promise<string[]> {
  if (market === 'FUTURES' && futuresSymbolsCache) return futuresSymbolsCache;
  if (market === 'SPOT' && spotSymbolsCache) return spotSymbolsCache;

  const base = marketBase(market);
  const path = market === 'SPOT' ? '/api/v3/exchangeInfo' : '/fapi/v1/exchangeInfo';
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error('Não foi possível carregar pares Binance.');

  const data = await res.json() as { symbols: Array<{ symbol: string; status: string; quoteAsset: string }> };
  const list = data.symbols
    .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
    .map(s => s.symbol)
    .sort();

  if (market === 'FUTURES') futuresSymbolsCache = list;
  else spotSymbolsCache = list;

  return list;
}

export async function fetchBinanceKlines(
  symbol: string,
  interval = '1h',
  limit = 72,
  market: ChartMarket = 'FUTURES',
): Promise<KlinePoint[]> {
  const sym = normalizeSymbol(symbol);
  const base = marketBase(market);
  const path = market === 'SPOT' ? '/api/v3/klines' : '/fapi/v1/klines';
  const res = await fetch(
    `${base}${path}?symbol=${sym}&interval=${interval}&limit=${limit}`,
  );
  if (!res.ok) throw new Error('Não foi possível carregar o gráfico.');
  const raw: number[][] = await res.json();
  return raw.map(k => ({
    time: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

export async function fetchBinanceTicker(
  symbol: string,
  market: ChartMarket = 'FUTURES',
): Promise<TickerSnapshot | null> {
  const sym = normalizeSymbol(symbol);
  try {
    const base = marketBase(market);
    const path = market === 'SPOT' ? '/api/v3/ticker/24hr' : '/fapi/v1/ticker/24hr';
    const res = await fetch(`${base}${path}?symbol=${sym}`);
    if (!res.ok) return null;
    const t = await res.json();
    return {
      symbol: sym,
      price: Number(t.lastPrice),
      change24h: Number(t.priceChangePercent),
      high24h: Number(t.highPrice),
      low24h: Number(t.lowPrice),
    };
  } catch {
    return null;
  }
}

export function formatPairLabel(symbol: string): string {
  return symbol.toUpperCase().replace(/USDT$/, '');
}
