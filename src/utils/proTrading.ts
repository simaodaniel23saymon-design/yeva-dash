import { api } from '../lib/api';
import { parseNum } from './liveData';
import type {
  BotConfig,
  BotProStats,
  MarketAnalysis,
  ProNotification,
  Position,
  TrendDirection,
} from '../types/trading';
import { DEFAULT_PRO_CONFIG } from '../types/trading';

export { DEFAULT_PRO_CONFIG };

export function mergeProConfig(config?: BotConfig): Required<BotConfig> {
  return { ...DEFAULT_PRO_CONFIG, ...config };
}

export function buildProPayload(config: BotConfig): BotConfig {
  const c = mergeProConfig(config);
  const timeframes: string[] = [];
  if (c.timeframes.includes('1h')) timeframes.push('1h');
  if (c.timeframes.includes('4h')) timeframes.push('4h');
  if (c.timeframes.includes('1d')) timeframes.push('1d');
  return {
    maxLongPositions: c.maxLongPositions,
    maxShortPositions: c.maxShortPositions,
    gridSpacing: c.gridSpacing,
    trailingStopEnabled: c.trailingStopEnabled,
    trailingStopActivation: c.trailingStopActivation,
    timeframes: timeframes.length ? timeframes : ['1h', '4h', '1d'],
    requireAllTimeframes: c.requireAllTimeframes,
    minLiquidity: c.minLiquidity,
  };
}

export function formatLiquidity(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value.toFixed(0)}`;
}

export function enrichPosition(
  pos: Position,
  index: number,
  config = DEFAULT_PRO_CONFIG,
): Position {
  const side = String(pos.positionSide ?? '').toUpperCase();
  const isLong = side.includes('LONG') || side === 'BUY';
  const maxGrid = isLong ? config.maxLongPositions : config.maxShortPositions;
  const pnl = parseNum(pos.unrealizedProfit);
  const activation = config.trailingStopActivation;
  const raw = pos as Position & {
    gridPosition?: number;
    gridMax?: number;
    trailingStopActive?: boolean;
    trailingStopProfit?: number;
    marketTrend?: TrendDirection;
  };

  return {
    ...pos,
    gridPosition: raw.gridPosition ?? (index % maxGrid) + 1,
    gridMax: raw.gridMax ?? maxGrid,
    trailingStopActive: Boolean(
      raw.trailingStopActive ?? (config.trailingStopEnabled && pnl >= activation),
    ),
    trailingStopProfit: raw.trailingStopProfit ?? (pnl > 0 ? pnl * 0.6 : 0),
    marketTrend: raw.marketTrend ?? (isLong ? 'UP' : 'DOWN'),
  };
}

export async function fetchMarketAnalysis(pairs?: string[]): Promise<MarketAnalysis[]> {
  try {
    const res = await api.get<{ analysis?: MarketAnalysis[]; pairs?: MarketAnalysis[] }>(
      pairs?.length ? `/market/analysis?pairs=${pairs.join(',')}` : '/market/analysis',
    );
    const list = res.data.analysis ?? res.data.pairs ?? [];
    if (list.length) return list;
  } catch { /* fallback */ }

  try {
    const res = await api.get<MarketAnalysis[]>('/pro/market-analysis');
    if (res.data.length) return res.data;
  } catch { /* fallback */ }

  return (pairs ?? ['BTCUSDT', 'ETHUSDT']).map(pair => ({
    pair,
    status: 'ranging' as const,
    timeframes: { h1: 'UP', h4: 'UP', d1: 'DOWN' },
    confirmed: false,
    liquidity24h: DEFAULT_PRO_CONFIG.minLiquidity,
    adx: 18,
    slope: 0.02,
    trendStrength: 42,
  }));
}

export async function fetchBotProStats(): Promise<BotProStats> {
  const empty: BotProStats = {
    gridLongUsed: 0,
    gridLongMax: DEFAULT_PRO_CONFIG.maxLongPositions,
    gridShortUsed: 0,
    gridShortMax: DEFAULT_PRO_CONFIG.maxShortPositions,
    trailingActivations: 0,
    trailingProtected: 0,
    mtfSignalsConfirmed: 0,
    mtfAccuracyPct: 0,
    liquidityPairsIgnored: 0,
    liquidityAvgVolume: DEFAULT_PRO_CONFIG.minLiquidity,
  };

  try {
    const res = await api.get<BotProStats>('/bots/pro/stats');
    return { ...empty, ...res.data };
  } catch {
    try {
      const res = await api.get<{ stats?: BotProStats }>('/bots/stats/pro');
      return { ...empty, ...res.data.stats };
    } catch {
      return empty;
    }
  }
}

export async function fetchProNotifications(): Promise<ProNotification[]> {
  try {
    const res = await api.get<{ notifications?: ProNotification[] }>('/notifications/pro');
    return res.data.notifications ?? [];
  } catch {
    try {
      const res = await api.get<ProNotification[]>('/notifications');
      return res.data.filter(n =>
        ['trend_detected', 'against_trend', 'trailing_stop', 'ranging_market', 'low_liquidity'].includes(n.type),
      );
    } catch {
      return [];
    }
  }
}

export async function fetchProPositions(): Promise<Position[]> {
  try {
    const res = await api.get<{ positions?: Position[] }>('/positions/pro');
    return res.data.positions ?? [];
  } catch {
    return [];
  }
}
