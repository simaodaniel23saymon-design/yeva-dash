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
  botId?: string;
  _id?: string;
  pair?: string;
  symbol?: string;
  market?: string;
  status: string;
  isRunning?: boolean;
  running?: boolean;
  isActive?: boolean;
  leverage?: number;
  capitalPerSide?: number;
  tpDailyPct?: number;
  maxLossPct?: number;
  mode?: string;
}

type BotLike = {
  id?: string;
  botId?: string;
  _id?: string;
  status?: unknown;
  isRunning?: boolean;
  running?: boolean;
  isActive?: boolean;
  active?: boolean;
};

const RUNNING_STATUSES = new Set(['running', 'active', 'started', 'live', 'on', 'true', '1']);
const STOPPED_STATUSES = new Set([
  'stopped', 'stop', 'paused', 'inactive', 'idle', 'off', 'false', '0',
  'created', 'configured', 'ready', 'disabled',
]);

export function normalizeBotStatus(
  status: unknown,
  extras?: Pick<BotLike, 'isRunning' | 'running' | 'isActive' | 'active'>,
): 'running' | 'stopped' {
  if (extras?.isRunning === true || extras?.running === true) return 'running';
  if (extras?.isRunning === false || extras?.running === false) return 'stopped';
  if (extras?.isActive === true || extras?.active === true) return 'running';
  if (extras?.isActive === false || extras?.active === false) return 'stopped';

  const s = String(status ?? '').trim().toLowerCase();
  if (!s) return 'stopped';
  if (RUNNING_STATUSES.has(s)) return 'running';
  if (STOPPED_STATUSES.has(s)) return 'stopped';
  if (s.includes('stop') || s.includes('pause') || s.includes('idle') || s.includes('off')) return 'stopped';
  if (s.includes('run') || s.includes('activ') || s.includes('live')) return 'running';
  return 'stopped';
}

export function normalizeLiveBot<T extends LiveBot>(bot: T): T {
  const raw = bot as T & BotLike;
  return {
    ...bot,
    id: resolveBotId(raw),
    symbol: bot.symbol ?? bot.pair,
    pair: bot.pair ?? bot.symbol,
    status: normalizeBotStatus(raw.status, raw),
  };
}

export async function fetchBotsList(): Promise<LiveBot[]> {
  try {
    const res = await api.get<{ bots?: LiveBot[] } | LiveBot[]>('/bots');
    const data = res.data;
    const list = Array.isArray(data) ? data : (data.bots ?? []);
    return list.map(normalizeLiveBot);
  } catch {
    try {
      const res = await api.get<{ bots: LiveBot[] }>('/bots/status');
      return (res.data.bots ?? []).map(normalizeLiveBot);
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

export async function stopBotById(botId: string): Promise<void> {
  const id = String(botId ?? '').trim();
  if (!id) throw new Error('ID do bot inválido.');
  await api.post(`/bots/${encodeURIComponent(id)}/stop`);
}

export async function startBotById(botId: string): Promise<void> {
  const id = String(botId ?? '').trim();
  if (!id) throw new Error('ID do bot inválido.');
  await api.post(`/bots/${encodeURIComponent(id)}/start`);
}

export async function deleteBotById(botId: string): Promise<void> {
  const id = String(botId ?? '').trim();
  if (!id) throw new Error('ID do bot inválido.');
  try {
    await api.delete(`/bots/${encodeURIComponent(id)}`);
  } catch {
    await api.post(`/bots/${encodeURIComponent(id)}/delete`);
  }
}

export async function deleteStoppedBots(): Promise<number> {
  try {
    const res = await api.delete<{ deleted?: number; count?: number }>('/bots/stopped');
    return res.data.deleted ?? res.data.count ?? 0;
  } catch {
    try {
      const res = await api.post<{ deleted?: number; count?: number }>('/bots/delete-stopped');
      return res.data.deleted ?? res.data.count ?? 0;
    } catch {
      const res = await api.post<{ deleted?: number; count?: number }>('/bots/cleanup');
      return res.data.deleted ?? res.data.count ?? 0;
    }
  }
}

export function isBotStopped(status: string): boolean {
  return !isBotRunning(status);
}

export function resolveBotId(bot: { id?: string; botId?: string; _id?: string } | null | undefined): string {
  return String(bot?.id ?? bot?.botId ?? bot?._id ?? '').trim();
}

export function isBotRunning(status: string): boolean {
  return normalizeBotStatus(status) === 'running';
}

export function botPair(bot?: Pick<LiveBot, 'pair' | 'symbol'> | null, fallback = 'BTCUSDT'): string {
  return bot?.pair ?? bot?.symbol ?? fallback;
}

export function parseNum(value: string | number | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function safeErrorMessage(err: unknown, fallback: string): string {
  return getFriendlyError(err).message || fallback;
}
