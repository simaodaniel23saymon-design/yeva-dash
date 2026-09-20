/**
 * Helpers de vista — ranking Winners/Losers (só análise).
 */

export const RANKING_STALE_MS = 15 * 60_000;

export type MomentumDecisionUi =
  | 'WATCH'
  | 'VALIDATING'
  | 'APPROVED'
  | 'REJECTED';

export type MomentumRankingRow = {
  symbol: string;
  side: 'WINNER' | 'LOSER' | 'NONE' | string;
  score: number;
  setupQuality: number;
  entryQuality: number;
  riskQuality: number;
  extensionRisk: number;
  factors?: { positive?: string[]; negative?: string[] };
  timestamp?: string;
  decision?: string;
  decisionReason?: string;
  riskReward?: number | null;
  price?: number | null;
  rank?: number;
  mtf?: {
    tf4h?: string;
    tf1h?: string;
    tf15m?: string;
    tf5m?: string;
  };
};

export type SymbolHistoryMetrics = {
  mfe: number | null;
  mae: number | null;
};

export function isRankingScanStale(
  scannedAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!scannedAt) return true;
  const t = Date.parse(scannedAt);
  if (!Number.isFinite(t)) return true;
  return nowMs - t > RANKING_STALE_MS;
}

export function splitWinnersLosers(items: MomentumRankingRow[]): {
  winners: MomentumRankingRow[];
  losers: MomentumRankingRow[];
} {
  const winners: MomentumRankingRow[] = [];
  const losers: MomentumRankingRow[] = [];
  for (const row of items || []) {
    if (row.side === 'WINNER') winners.push(row);
    else if (row.side === 'LOSER') losers.push(row);
  }
  const byRank = (a: MomentumRankingRow, b: MomentumRankingRow) =>
    (a.rank ?? 999) - (b.rank ?? 999) || b.score - a.score;
  winners.sort(byRank);
  losers.sort(byRank);
  return { winners, losers };
}

export function normalizeDecision(raw?: string): MomentumDecisionUi | null {
  const s = String(raw || '').toUpperCase();
  if (s === 'WATCH' || s === 'VALIDATING' || s === 'APPROVED' || s === 'REJECTED') {
    return s;
  }
  return null;
}

export function decisionBadgeClass(raw?: string): string {
  const d = normalizeDecision(raw);
  if (d === 'APPROVED') return 'border-cyan-30 bg-cyan-dim text-cyan';
  if (d === 'REJECTED') return 'border-red-30 bg-red-dim text-red';
  if (d === 'VALIDATING') return 'border-gold-30 bg-gold-dim text-gold';
  if (d === 'WATCH') return 'border-border2 text-text3';
  return 'border-border2 text-text3';
}

export function formatPrice(n?: number | null): string {
  if (n == null || !Number.isFinite(n) || !(n > 0)) return '—';
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export function formatScore(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return String(Math.round(n));
}

export function formatUpdatedAt(iso?: string | null): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return new Date(t).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMfeMae(m?: number | null): string {
  if (m == null || !Number.isFinite(m)) return '—';
  return m.toFixed(2);
}

export type RankingViewState =
  | 'loading'
  | 'error'
  | 'empty'
  | 'stale'
  | 'ready';

export function rankingViewState(input: {
  loading: boolean;
  error: string | null;
  winnerCount: number;
  loserCount: number;
  stale: boolean;
}): RankingViewState {
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  if (input.winnerCount === 0 && input.loserCount === 0) return 'empty';
  if (input.stale) return 'stale';
  return 'ready';
}
