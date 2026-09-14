/**
 * Helpers puros do dashboard limpo (Vitest).
 */

export type DashTradeLike = {
  id: string;
  date: string;
  pnl: number;
};

/** Últimos N trades por data (mais recentes primeiro). */
export function pickRecentTrades<T extends DashTradeLike>(
  trades: T[],
  limit = 10
): T[] {
  return [...(trades || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, Math.max(0, limit));
}

/** Pontos de equity a partir da série performance.total (cumulativo já no API). */
export function buildEquityPoints(input: {
  labels: string[];
  total: number[];
}): Array<{ label: string; equity: number }> {
  const labels = input.labels || [];
  const total = input.total || [];
  const n = Math.min(labels.length, total.length);
  const out: Array<{ label: string; equity: number }> = [];
  for (let i = 0; i < n; i++) {
    out.push({
      label: labels[i]!,
      equity: Number(total[i]) || 0,
    });
  }
  return out;
}

export function formatActualizadoLabel(d: Date): string {
  return `ACTUALIZADO ${d.toLocaleTimeString('pt-PT')}`;
}
