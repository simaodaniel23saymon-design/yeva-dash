import { api } from '../lib/api';

export interface PerformanceFeeLedgerRow {
  id: string;
  amount: number;
  profit: number;
  billable?: number;
  netAfterFee?: number | null;
  cycleId?: string | null;
  status?: string;
  note?: string | null;
  botId?: string;
  createdAt: string;
  user?: { email: string; id?: string };
}

export interface PerformanceFeeStats {
  total: { amount: number; count: number };
  today: { amount: number; count: number };
  last30Days: { amount: number; count: number };
  recent: PerformanceFeeLedgerRow[];
}

function readBucket(block: unknown): { amount: number; count: number } {
  if (!block || typeof block !== 'object') {
    return { amount: 0, count: 0 };
  }
  const row = block as Record<string, unknown>;
  const amountRaw = row.amount ?? row.feeAmount ?? row.total ?? 0;
  const amount = Number(amountRaw);
  const count = Number(row.count ?? 0);
  return {
    amount: Number.isFinite(amount) ? amount : 0,
    count: Number.isFinite(count) ? count : 0,
  };
}

/** Normaliza GET /admin/stats/performance-fees (suporta wrapper `data`) */
export function parsePerformanceFeeStats(raw: unknown): PerformanceFeeStats | null {
  if (!raw || typeof raw !== 'object') return null;

  let payload = raw as Record<string, unknown>;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    payload = payload.data as Record<string, unknown>;
  }

  if (!payload.total || typeof payload.total !== 'object') return null;

  const recentRaw = Array.isArray(payload.recent) ? payload.recent : [];
  const recent: PerformanceFeeLedgerRow[] = recentRaw.map((item) => {
    const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const user =
      r.user && typeof r.user === 'object'
        ? (r.user as { email: string; id?: string })
        : undefined;
    return {
      id: String(r.id ?? ''),
      amount: Number(r.amount ?? r.feeAmount ?? 0) || 0,
      profit: Number(r.profit ?? 0) || 0,
      billable: r.billable != null ? Number(r.billable) : undefined,
      netAfterFee: r.netAfterFee != null ? Number(r.netAfterFee) : null,
      cycleId: (r.cycleId as string) ?? null,
      status: String(r.status ?? 'PAID'),
      note: (r.note as string) ?? null,
      botId: r.botId as string | undefined,
      createdAt: String(r.createdAt ?? r.paidAt ?? ''),
      user,
    };
  });

  return {
    total: readBucket(payload.total),
    today: readBucket(payload.today),
    last30Days: readBucket(payload.last30Days),
    recent,
  };
}

/** Valores da API já vêm em USDT (ex.: 7.618909) — não aplicar conversão micro */
export function formatPerformanceFee(value: number | null | undefined): string {
  const n = value ?? 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function fetchPerformanceFeeStats(): Promise<PerformanceFeeStats | null> {
  try {
    const res = await api.get<unknown>('/admin/stats/performance-fees');
    return parsePerformanceFeeStats(res.data);
  } catch {
    return null;
  }
}

export async function fetchUserPerformanceFees(
  userId: string
): Promise<
  Array<{
    id: string;
    date: string;
    cycleId?: string | null;
    profit: number;
    fee: number;
    status: string;
    note?: string | null;
  }>
> {
  try {
    const res = await api.get(`/admin/users/${userId}/performance-fees`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}
