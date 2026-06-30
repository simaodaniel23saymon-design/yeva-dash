import { api } from '../lib/api';

export interface PerformanceFeeStats {
  total: { amount: number; count: number };
  today: { amount: number; count: number };
  last30Days: { amount: number; count: number };
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

  return {
    total: readBucket(payload.total),
    today: readBucket(payload.today),
    last30Days: readBucket(payload.last30Days),
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
