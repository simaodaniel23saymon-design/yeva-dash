import { describe, expect, it } from 'vitest';
import {
  pickRecentTrades,
  buildEquityPoints,
  formatActualizadoLabel,
} from './dashboardFocus';

describe('dashboardFocus', () => {
  it('pickRecentTrades: últimos 10 por data', () => {
    const trades = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      date: new Date(2026, 0, i + 1).toISOString(),
      pnl: i,
    }));
    const out = pickRecentTrades(trades, 10);
    expect(out).toHaveLength(10);
    expect(out[0]!.id).toBe('14');
    expect(out[9]!.id).toBe('5');
  });

  it('buildEquityPoints alinha labels e total', () => {
    const pts = buildEquityPoints({
      labels: ['d1', 'd2'],
      total: [10, 25],
    });
    expect(pts).toEqual([
      { label: 'd1', equity: 10 },
      { label: 'd2', equity: 25 },
    ]);
  });

  it('formatActualizadoLabel', () => {
    const d = new Date('2026-09-14T22:05:09');
    expect(formatActualizadoLabel(d)).toMatch(/^ACTUALIZADO /);
  });
});
