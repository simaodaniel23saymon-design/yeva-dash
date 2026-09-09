import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export type PerfRange = '24h' | '7d' | '30d' | '90d' | 'TOTAL';

export const PERF_RANGE_OPTIONS: PerfRange[] = ['24h', '7d', '30d', '90d', 'TOTAL'];

export interface MarketIndicator {
  adx: number;
  funding: number;
  oiChange: number;
  atr: number;
  atrPct: number;
  atrLabel: 'Alta' | 'Normal';
  adxLabel: 'Tendência' | 'Lateral';
  gridGate: 'ON' | 'OFF';
  gridReason: string;
}

export interface DashDcaCycle {
  avgEntry: number;
  totalQty: number;
  safetyFilled: number;
  safetyPlaced: number;
  maxSafetyOrders: number;
  tpPrice: number | null;
  slPrice: number | null;
  slOrderId?: string | null;
  missingSl?: boolean;
  nextSafetyPrice: number | null;
  nextSafetyQty: number | null;
  maxLossUsdt: number | null;
  levels: number;
}

export interface DashBotRow {
  id: string;
  symbol: string;
  strategy: string;
  status: string;
  statusLabel: string;
  pnlToday: number;
  lastTrade: string;
  gridEnabled: boolean;
  gridActive: boolean;
  botStatus: string;
  dcaCycle?: DashDcaCycle | null;
}

export interface DashTrade {
  id: string;
  symbol: string;
  type: string;
  side: string;
  entry: number | null;
  exit: number | null;
  pnl: number;
  reason: string;
  date: string;
}

export interface DashLog {
  timestamp: string;
  level: string;
  module: string;
  message: string;
}

export interface MlPrediction {
  regime: string;
  confidence: number;
  recommendedAction: string;
  intensity: number;
  source: string;
  enabled: boolean;
  shadowMode?: boolean;
  probabilities?: Record<string, number>;
}

export interface DashDcaPairStatus {
  symbol: string;
  status: string;
  statusLabel: string;
  minNotional: number | null;
  hasBot: boolean;
}

export interface PeriodTradeRef {
  id: string | null;
  symbol: string | null;
  pnl: number;
  date: string | null;
}

export interface PeriodCards {
  grossProfit: number;
  grossLoss: number;
  net: number;
  bestTrade: PeriodTradeRef | null;
  worstTrade: PeriodTradeRef | null;
  greenDays: number;
  fees: number;
}

export interface DashboardExtended {
  marketIndicators: Record<string, MarketIndicator>;
  mlPrediction?: Record<string, MlPrediction>;
  primarySymbol: string | null;
  bots: DashBotRow[];
  dcaPairs?: DashDcaPairStatus[];
  recentTrades: DashTrade[];
  performance: {
    labels: string[];
    trend: number[];
    grid: number[];
    total: number[];
  };
  metrics: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    totalTrades: number;
    netPnl?: number;
    fees?: number;
  };
  periodCards?: PeriodCards;
  logs: DashLog[];
  range: PerfRange;
  generatedAt: string;
}

const emptyCards: PeriodCards = {
  grossProfit: 0,
  grossLoss: 0,
  net: 0,
  bestTrade: null,
  worstTrade: null,
  greenDays: 0,
  fees: 0,
};

const empty: DashboardExtended = {
  marketIndicators: {},
  mlPrediction: {},
  primarySymbol: null,
  bots: [],
  recentTrades: [],
  performance: { labels: [], trend: [], grid: [], total: [] },
  metrics: { winRate: 0, profitFactor: 0, maxDrawdown: 0, totalTrades: 0, netPnl: 0, fees: 0 },
  periodCards: emptyCards,
  logs: [],
  range: '24h',
  generatedAt: '',
};

export function useDashboardExtended(enabled: boolean, range: PerfRange, pollMs = 10000) {
  const [data, setData] = useState<DashboardExtended>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<DashboardExtended>('/dashboard/extended', {
        params: { range },
      });
      setData(res.data);
      setError('');
    } catch {
      setError('Falha ao carregar painel extended');
    } finally {
      setLoading(false);
    }
  }, [enabled, range]);

  useEffect(() => {
    void load();
    if (!enabled) return;
    const id = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(id);
  }, [load, enabled, pollMs]);

  return { data, loading, error, refetch: load, setData };
}

export async function downloadHistoryCsv(range: PerfRange): Promise<void> {
  const res = await api.get<Blob>('/dashboard/history/export', {
    params: { range },
    responseType: 'blob',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yevatrade-history-${range}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useDashboardLogs(enabled: boolean, pollMs = 2000) {
  const [logs, setLogs] = useState<DashLog[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await api.get<{ logs: DashLog[] }>('/dashboard/logs', {
          params: { limit: 100 },
        });
        if (!cancelled) setLogs(res.data.logs || []);
      } catch {
        /* silencioso */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, pollMs]);

  return { logs, setLogs };
}
