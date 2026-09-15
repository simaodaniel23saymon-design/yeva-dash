/**
 * Overlays de posição + médias móveis (puro, testável).
 */

export type PositionOverlay = {
  symbol: string;
  side: 'LONG' | 'SHORT' | string;
  qty: number;
  entry: number;
  tp: number | null;
  sl: number | null;
  /** Stop em breakeven */
  slIsBe?: boolean;
  uPnl?: number;
  /** Idade em ms desde openedAt */
  ageMs?: number;
  safetyFilled?: number;
  maxSafetyOrders?: number;
  /** Timestamp candle de entrada (ms) se conhecido */
  entryTimeMs?: number | null;
};

export function formatPriceLabel(value: number): string {
  if (!(value > 0) || !Number.isFinite(value)) return '—';
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(6);
}

/** "ENTRY 103.33" / "TP 104.88" / "SL 103.41 (BE)" */
export function formatLevelTitle(
  kind: 'ENTRY' | 'TP' | 'SL',
  price: number,
  opts?: { be?: boolean }
): string {
  const base = `${kind} ${formatPriceLabel(price)}`;
  if (kind === 'SL' && opts?.be) return `${base} (BE)`;
  return base;
}

/** Notificação: "ENTRY x · TP y · SL z (BE)" */
export function formatEntryTpSlNotify(input: {
  entry: number;
  tp?: number | null;
  sl?: number | null;
  slIsBe?: boolean;
}): string {
  const parts = [`ENTRY ${formatPriceLabel(input.entry)}`];
  if (input.tp != null && input.tp > 0) {
    parts.push(`TP ${formatPriceLabel(input.tp)}`);
  }
  if (input.sl != null && input.sl > 0) {
    parts.push(
      input.slIsBe
        ? `SL ${formatPriceLabel(input.sl)} (BE)`
        : `SL ${formatPriceLabel(input.sl)}`
    );
  }
  return parts.join(' · ');
}

export function isBreakevenSl(
  side: string,
  entry: number,
  sl: number | null | undefined
): boolean {
  if (sl == null || !(sl > 0) || !(entry > 0)) return false;
  const s = String(side).toUpperCase();
  if (s === 'SHORT') return sl <= entry * 1.0001;
  return sl >= entry * 0.9999;
}

export function formatAge(ageMs: number | undefined): string {
  if (ageMs == null || !(ageMs >= 0)) return '—';
  const m = Math.floor(ageMs / 60000);
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

/** SMA simples sobre closes. */
export function calcSma(closes: number[], period: number): Array<number | null> {
  const out: Array<number | null> = [];
  for (let i = 0; i < closes.length; i++) {
    if (i + 1 < period) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    out.push(sum / period);
  }
  return out;
}

/** EMA clássica. */
export function calcEma(closes: number[], period: number): Array<number | null> {
  const out: Array<number | null> = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    const c = closes[i];
    if (i + 1 < period) {
      out.push(null);
      continue;
    }
    if (ema == null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      ema = sum / period;
    } else {
      ema = c * k + ema * (1 - k);
    }
    out.push(ema);
  }
  return out;
}

export type MaKey = 'MA20' | 'MA50' | 'MA200' | 'EMA9' | 'EMA21';

export const MA_DEFS: Array<{ key: MaKey; kind: 'sma' | 'ema'; period: number; color: string }> = [
  { key: 'MA20', kind: 'sma', period: 20, color: '#f0b90b' },
  { key: 'MA50', kind: 'sma', period: 50, color: '#1e88e5' },
  { key: 'MA200', kind: 'sma', period: 200, color: '#e040fb' },
  { key: 'EMA9', kind: 'ema', period: 9, color: '#26a69a' },
  { key: 'EMA21', kind: 'ema', period: 21, color: '#ff7043' },
];

/** Badge Conservative Mode */
export function formatAPlusSetupBadge(): string {
  return 'A+ SETUP';
}

/** "R:R 2.1 · SL 3.2% · TP 6.4%" */
export function formatPlannedRrCard(input: {
  rr: number;
  slPct: number;
  tpPct: number;
}): string {
  return `R:R ${input.rr.toFixed(1)} · SL ${input.slPct.toFixed(1)}% · TP ${input.tpPct.toFixed(1)}%`;
}

/** Títulos S1 / R1 no gráfico */
export function formatSrLevelTitle(kind: 'S1' | 'R1', price: number): string {
  return `${kind} ${formatPriceLabel(price)}`;
}

export function buildSrOverlayLines(input: {
  s1?: number | null;
  r1?: number | null;
}): Array<{ kind: 'S1' | 'R1'; price: number; title: string }> {
  const out: Array<{ kind: 'S1' | 'R1'; price: number; title: string }> = [];
  if (input.s1 != null && Number.isFinite(input.s1) && input.s1 > 0) {
    out.push({ kind: 'S1', price: input.s1, title: formatSrLevelTitle('S1', input.s1) });
  }
  if (input.r1 != null && Number.isFinite(input.r1) && input.r1 > 0) {
    out.push({ kind: 'R1', price: input.r1, title: formatSrLevelTitle('R1', input.r1) });
  }
  return out;
}
