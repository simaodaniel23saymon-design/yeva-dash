import { api } from '../lib/api';
import { parseNum } from './liveData';
import type {
  BotConfig,
  BotCycleStats,
  BotProStats,
  MarketAnalysis,
  ProNotification,
  Position,
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
    dynamicSpacingEnabled: c.dynamicSpacingEnabled,
    tpDailyPct: c.tpDailyPct,
    minProfitUsdt: c.minProfitUsdt,
    maxLossPct: c.maxLossPct,
    trailingStopEnabled: c.trailingStopEnabled,
    trailingStopActivation: c.trailingStopActivation,
    trailingStopCallback: c.trailingStopCallback,
    trailingStopActivationUsdt: c.trailingStopActivationUsdt,
    trailingStopCallbackUsdt: c.trailingStopCallbackUsdt,
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

/** Passa posição Binance sem estimativas locais */
export function enrichPosition(pos: Position): Position {
  return { ...pos };
}

export async function fetchBotCycleStats(botId: string): Promise<{ cycle?: BotCycleStats; auditLog?: unknown[] } | null> {
  try {
    const res = await api.get<{ cycle?: BotCycleStats; auditLog?: unknown[] }>(`/bots/${encodeURIComponent(botId)}/cycle`);
    return res.data;
  } catch {
    return null;
  }
}

export async function fetchMarketAnalysis(pairs?: string[]): Promise<MarketAnalysis[]> {
  try {
    const res = await api.get<{ analysis?: MarketAnalysis[]; pairs?: MarketAnalysis[] }>(
      pairs?.length ? `/market/analysis?pairs=${pairs.join(',')}` : '/market/analysis',
    );
    const list = res.data.analysis ?? res.data.pairs ?? [];
    if (list.length) return list;
  } catch { /* silencioso */ }

  try {
    const res = await api.get<MarketAnalysis[]>('/pro/market-analysis');
    if (res.data.length) return res.data;
  } catch { /* silencioso */ }

  return [];
}

const EMPTY_STATS: BotProStats = {
  gridLongUsed: 0,
  gridLongMax: 0,
  gridShortUsed: 0,
  gridShortMax: 0,
  trailingActivations: 0,
  trailingProtected: 0,
  mtfSignalsConfirmed: 0,
  mtfAccuracyPct: 0,
  liquidityPairsIgnored: 0,
  liquidityAvgVolume: 0,
};

export async function fetchBotProStats(): Promise<BotProStats> {
  try {
    const res = await api.get<BotProStats>('/bots/pro/stats');
    return { ...EMPTY_STATS, ...res.data };
  } catch {
    try {
      const res = await api.get<{ stats?: BotProStats }>('/bots/stats/pro');
      return { ...EMPTY_STATS, ...res.data.stats };
    } catch {
      return EMPTY_STATS;
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

export function sumPositionPnl(positions: { unrealizedProfit?: string | number }[]): number {
  return positions.reduce((sum, p) => sum + parseNum(p.unrealizedProfit), 0);
}
