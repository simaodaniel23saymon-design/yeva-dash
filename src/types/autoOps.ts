/**
 * Tipos Auto-Ops (Operações por módulo).
 */

export type AutoOpsModuleId = 'gainers' | 'losers' | 'stable';
export type AutoOpsExecMode = 'PAPER' | 'REAL';

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
  mode?: AutoOpsExecMode;
  manual?: boolean;
};

export type AutoOpsFeedEvent = {
  id: string;
  at: string;
  action: string;
  symbol: string;
  side: string;
  qty: number;
  price: number;
  pnl: number | null;
  reason: string | null;
  mode: AutoOpsExecMode;
  line?: string;
  allocatedUsdt?: number | null;
  tpPrice?: number | null;
  slPrice?: number | null;
};

export type AutoOpsRealGate = {
  ready: boolean;
  reason: string;
  override: boolean;
  paperDays: number;
  profitFactor: number;
  maxDrawdownPct: number;
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
  allocationUsdt?: number;
  execMode?: AutoOpsExecMode;
  minNotionalUsdt?: number;
  availableBalanceUsdt?: number;
  defaultTpPct?: number;
  defaultSlPct?: number;
  onSummary?: string;
  realGate?: AutoOpsRealGate;
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
