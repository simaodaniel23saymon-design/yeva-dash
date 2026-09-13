import { api } from '../lib/api';
import { fetchBotsList } from './liveData';

export interface HistoryRound {
  id: string;
  pnl: number;
  cycles: number;
  closeReason?: string;
  side?: string;
  openedAt: string;
  closedAt?: string;
  bot: { pair: string; market: string; exchangeAccount: { exchange: string } };
}

export interface HistoryTransaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  network?: string;
  note?: string;
  createdAt: string;
}

export interface UserHistory {
  rounds: HistoryRound[];
  transactions: HistoryTransaction[];
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function normalizeRound(raw: Record<string, unknown>, index: number): HistoryRound {
  const botRaw = (raw.bot ?? {}) as Record<string, unknown>;
  const exRaw = (botRaw.exchangeAccount ?? {}) as Record<string, unknown>;
  const closeReason = raw.closeReason ?? raw.status ?? raw.reason;
  return {
    id: String(raw.id ?? raw._id ?? `round-${index}`),
    pnl: Number(raw.pnl ?? raw.profit ?? 0),
    cycles: Number(raw.cycles ?? raw.cycleCount ?? 1),
    closeReason: closeReason ? String(closeReason) : undefined,
    side: raw.side ? String(raw.side) : undefined,
    openedAt: String(raw.openedAt ?? raw.createdAt ?? new Date().toISOString()),
    closedAt: raw.closedAt ? String(raw.closedAt) : undefined,
    bot: {
      pair: String(botRaw.pair ?? botRaw.symbol ?? raw.pair ?? raw.symbol ?? '—'),
      market: String(botRaw.market ?? raw.market ?? 'FUTURES'),
      exchangeAccount: { exchange: String(exRaw.exchange ?? raw.exchange ?? 'BINANCE') },
    },
  };
}

function normalizeTransaction(raw: Record<string, unknown>, index: number): HistoryTransaction {
  const amount = Number(raw.amount ?? 0);
  const fee = Number(raw.fee ?? 0);
  const netAmount = Number(raw.netAmount ?? raw.net ?? amount - fee);
  const note = raw.note != null ? String(raw.note) : undefined;
  return {
    id: String(raw.id ?? raw._id ?? `tx-${index}`),
    type: String(raw.type ?? raw.kind ?? '—'),
    amount,
    fee,
    netAmount,
    status: String(raw.status ?? '—'),
    network: raw.network ? String(raw.network) : undefined,
    note: note || undefined,
    createdAt: String(raw.createdAt ?? raw.date ?? new Date().toISOString()),
  };
}

function normalizeHistoryPayload(payload: unknown): UserHistory {
  const root = (payload ?? {}) as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;

  const roundsRaw = asArray<Record<string, unknown>>(
    data.rounds ?? data.tradingRounds ?? data.tradeCycles ?? root.rounds ?? root.tradeCycles,
  );
  const txRaw = asArray<Record<string, unknown>>(
    data.transactions ?? data.payments ?? root.transactions,
  );

  return {
    rounds: roundsRaw.map(normalizeRound),
    transactions: txRaw.map(normalizeTransaction),
  };
}

async function fetchRoundsFallback(): Promise<HistoryRound[]> {
  const paths = ['/history/rounds', '/rounds', '/bots/rounds'];
  for (const path of paths) {
    try {
      const res = await api.get(path);
      const list = asArray<Record<string, unknown>>(res.data?.rounds ?? res.data?.tradeCycles ?? res.data);
      if (list.length) return list.map(normalizeRound);
    } catch {
      /* tenta próximo */
    }
  }
  return [];
}

async function fetchTransactionsFallback(): Promise<HistoryTransaction[]> {
  const paths = ['/payments/transactions', '/wallet/transactions', '/history/transactions'];
  for (const path of paths) {
    try {
      const res = await api.get(path);
      const list = asArray<Record<string, unknown>>(res.data?.transactions ?? res.data);
      if (list.length) return list.map(normalizeTransaction);
    } catch {
      /* tenta próximo */
    }
  }
  return [];
}

/** Agrega trades fechados de todos os bots como histórico de operações */
async function fetchTradesAsRounds(): Promise<HistoryRound[]> {
  try {
    const bots = await fetchBotsList();
    const results = await Promise.all(
      bots.map(async (bot, botIndex) => {
        const id = bot.id ?? bot.botId ?? bot._id;
        if (!id) return [];
        try {
          const res = await api.get<{ trades?: Record<string, unknown>[] }>(`/bots/${id}/trades`);
          return asArray<Record<string, unknown>>(res.data.trades).map((t, i) =>
            normalizeRound(
              {
                ...t,
                id: t.id ?? `${id}-trade-${i}`,
                bot: { pair: bot.pair ?? bot.symbol, market: bot.market, exchangeAccount: { exchange: 'BINANCE' } },
              },
              botIndex * 100 + i,
            ),
          );
        } catch {
          return [];
        }
      }),
    );
    return results.flat().sort(
      (a, b) => new Date(b.closedAt ?? b.openedAt).getTime() - new Date(a.closedAt ?? a.openedAt).getTime(),
    );
  } catch {
    return [];
  }
}

export async function fetchUserHistory(): Promise<UserHistory> {
  try {
    const res = await api.get('/history', {
      params: { _: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    const normalized = normalizeHistoryPayload(res.data);
    if (normalized.rounds.length || normalized.transactions.length) {
      return normalized;
    }
  } catch {
    /* fallback */
  }

  const [rounds, transactions, tradeRounds] = await Promise.all([
    fetchRoundsFallback(),
    fetchTransactionsFallback(),
    fetchTradesAsRounds(),
  ]);

  const mergedRounds = rounds.length ? rounds : tradeRounds;

  return {
    rounds: mergedRounds,
    transactions,
  };
}
