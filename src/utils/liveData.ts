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
  ordersPerSide?: number;
  spacing?: number;
  tpDailyPct?: number;
  maxLossPct?: number;
  trailingStopEnabled?: boolean;
  trailingStopActivation?: number;
  trailingStopCallback?: number;
  minProfitUsdt?: number;
  dynamicSpacingEnabled?: boolean;
  lastCloseReason?: string;
  lastGrossPnl?: number;
  lastNetPnl?: number;
  lastBinanceFees?: number;
  lastFunding?: number;
  lastYevaFee?: number;
  engineState?: string;
  peakNetPnlUsdt?: number;
  mode?: string;
  riskMode?: string;
  /** DEMO | REAL — vindo da API */
  accountType?: string;
  exchange?: string;
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

export function normalizeAccountType(value: unknown, exchange?: unknown): 'DEMO' | 'REAL' {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'DEMO' || raw === 'TESTNET') return 'DEMO';
  const ex = String(exchange ?? '').trim().toUpperCase();
  if (ex === 'DEMO') return 'DEMO';
  return 'REAL';
}

export function isDemoBot(bot?: Pick<LiveBot, 'accountType' | 'exchange'> | null): boolean {
  return normalizeAccountType(bot?.accountType, bot?.exchange) === 'DEMO';
}

export function normalizeLiveBot<T extends LiveBot>(bot: T): T {
  const raw = bot as T & BotLike & { accountType?: string; exchange?: string };
  return {
    ...bot,
    id: resolveBotId(raw),
    symbol: bot.symbol ?? bot.pair,
    pair: bot.pair ?? bot.symbol,
    status: normalizeBotStatus(raw.status, raw),
    accountType: normalizeAccountType(raw.accountType, raw.exchange),
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

export interface RealWalletStats {
  availableBalance: number;
  unrealizedPnL: number;
  dailyPnL: number;
  netBalance: number;
}

type RealWalletStatsRaw = Record<string, unknown>;

function pickNum(raw: RealWalletStatsRaw, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) {
      return parseNum(value as string | number);
    }
  }
  return 0;
}

export function normalizeRealWalletStats(raw: RealWalletStatsRaw): RealWalletStats {
  return {
    availableBalance: pickNum(raw, 'availableBalance', 'available_balance'),
    unrealizedPnL: pickNum(raw, 'unrealizedPnL', 'unrealizedPnl', 'unrealized_pnl'),
    dailyPnL: pickNum(raw, 'dailyPnL', 'dailyPnl', 'daily_pnl'),
    netBalance: pickNum(raw, 'netBalance', 'net_balance'),
  };
}

export async function fetchWalletRealStats(): Promise<RealWalletStats | null> {
  try {
    const res = await api.get<RealWalletStatsRaw>('/wallet/real-stats');
    return normalizeRealWalletStats(res.data);
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

function deleteBotError(err: unknown): { status?: number; code?: string; message: string } {
  const friendly = getFriendlyError(err);
  const ax = err as { response?: { status?: number; data?: { code?: string; error?: string } } };
  return {
    status: ax.response?.status,
    code: ax.response?.data?.code,
    message: ax.response?.data?.error ?? friendly.message,
  };
}

export async function deleteBotById(botId: string): Promise<void> {
  const id = String(botId ?? '').trim();
  if (!id) throw new Error('ID do bot inválido.');
  const path = `/bots/${encodeURIComponent(id)}`;
  try {
    await api.delete(path);
    return;
  } catch (err) {
    const { status, code, message } = deleteBotError(err);
    if (status === 400 && code === 'BOT_RUNNING') {
      throw new Error(message || 'Pare o bot antes de apagar.');
    }
    if (status === 404) {
      throw new Error(message || 'Bot não encontrado.');
    }
    if (status !== 500) {
      throw new Error(message || 'Não foi possível apagar o bot.');
    }
  }
  try {
    await api.delete(`${path}/force`);
  } catch (err) {
    throw new Error(deleteBotError(err).message || 'Não foi possível apagar o bot.');
  }
}

export async function deleteStoppedBots(): Promise<number> {
  try {
    const res = await api.delete<{ deleted?: number; count?: number }>('/bots/purge-stopped');
    return res.data.deleted ?? res.data.count ?? 0;
  } catch {
    const res = await api.delete<{ deleted?: number; count?: number }>('/bots/stopped');
    return res.data.deleted ?? res.data.count ?? 0;
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
