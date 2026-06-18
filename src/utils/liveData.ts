import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';

export interface ExchangeStats {
  balance: number;
  availableMargin: number;
  usedMargin: number;
  totalPnl: number;
  botsCount: number;
  runningBotsCount: number;
  positionsCount: number;
  exchange: string | null;
  accountType: string | null;
}

export interface ExchangePosition {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unrealizedProfit: string;
  initialMargin: string;
  leverage: string;
}

export interface LiveBot {
  id: string;
  pair?: string;
  symbol?: string;
  market?: string;
  status: string;
  leverage?: number;
  capitalPerSide?: number;
  tpDailyPct?: number;
  maxLossPct?: number;
  mode?: string;
}

export async function fetchBotsList(): Promise<LiveBot[]> {
  try {
    const res = await api.get<{ bots?: LiveBot[] } | LiveBot[]>('/bots');
    const data = res.data;
    if (Array.isArray(data)) return data;
    return data.bots ?? [];
  } catch {
    try {
      const res = await api.get<{ bots: LiveBot[] }>('/bots/status');
      return res.data.bots ?? [];
    } catch {
      return [];
    }
  }
}

export async function fetchExchangePositions(): Promise<ExchangePosition[]> {
  try {
    const res = await api.get<{ positions: ExchangePosition[] }>('/exchange/positions');
    return res.data.positions ?? [];
  } catch {
    return [];
  }
}

export async function fetchExchangeStats(): Promise<ExchangeStats | null> {
  try {
    const res = await api.get<ExchangeStats>('/exchange/stats');
    return res.data;
  } catch {
    return null;
  }
}

export async function stopAllBots(): Promise<void> {
  try {
    await api.post('/bots/stop-all');
  } catch {
    await api.post('/bots/stop');
  }
}

export function isBotRunning(status: string): boolean {
  return status === 'running' || status === 'ACTIVE';
}

export function botPair(bot: LiveBot): string {
  return bot.pair ?? bot.symbol ?? '—';
}

export function parseNum(value: string | number | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function safeErrorMessage(err: unknown, fallback: string): string {
  return getFriendlyError(err).message || fallback;
}
