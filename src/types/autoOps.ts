/**
 * Tipos Auto-Ops (Operações por módulo).
 */

export type AutoOpsModuleId = 'gainers' | 'losers' | 'stable';

export type Trigger = { label: string; tone: 'green' | 'red' | 'neutral' };

export type AutoOpsCandidate = {
  symbol: string;
  change24hPct: number;
  quoteVolume24h: number;
  regime: string;
  price: number;
  atrPct?: number;
  fundingPct?: number;
  trigger: Trigger;
  autoOk?: boolean;
  filterReason?: string | null;
};

export type AutoOpsOpen = {
  symbol: string;
  side: string;
  entryPrice: number;
  quantity: number;
  unrealizedPnl: number | null;
  openedAt?: string;
  slPrice?: number | null;
  tpPrice?: number | null;
  trailStop?: number | null;
  allocatedUsdt?: number;
  marginUsdt?: number;
  ageMs?: number;
  mode?: 'PAPER' | 'REAL';
  manual?: boolean;
};

export type AutoOpsFeedEvent = {
  id: string;
  at: string;
  action: 'entrada' | 'saida' | 'cancel' | 'parcial';
  symbol: string;
  side: string;
  qty: number;
  price: number;
  pnl: number | null;
  reason: string | null;
  mode: 'PAPER' | 'REAL';
};

export type StableCycle = {
  id: string;
  symbol: string;
  side: string;
  avgEntry: number;
  pnl?: number | null;
  quantity?: number;
  allocatedUsdt?: number;
  marginUsdt?: number;
  tpPrice?: number | null;
  slPrice?: number | null;
  tpPct?: number;
  slPct?: number;
  stableMode: boolean;
  openedAt: string;
  ageMs?: number;
  mode?: 'REAL';
};

export type AutoOpsModule = {
  id: AutoOpsModuleId;
  emoji: string;
  label: string;
  title: string;
  enabled: boolean;
  state: string;
  open: AutoOpsOpen | null;
  modulePnl: number;
  modulePnlDay?: number;
  autoBadge: string | null;
  candidates: AutoOpsCandidate[];
  feed?: AutoOpsFeedEvent[];
  rules: { title: string; side: string; bullets: string[] };
  stable?: {
    pairs: string[];
    preset: { deviationPct: number; takeProfitPct: number; stopLossPct: number };
    bidirectional: boolean;
    activeCycles: StableCycle[];
    cyclesCount: number;
  };
};
