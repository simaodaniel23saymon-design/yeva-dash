import { describe, expect, it } from 'vitest';
import {
  buildSrOverlayLines,
  calcEma,
  calcSma,
  formatAPlusSetupBadge,
  formatEntryTpSlNotify,
  formatLevelTitle,
  formatPlannedRrCard,
  formatSrLevelTitle,
  isBreakevenSl,
} from './chartOverlays';

describe('formatLevelTitle', () => {
  it('ENTRY / TP / SL (BE)', () => {
    expect(formatLevelTitle('ENTRY', 103.33)).toBe('ENTRY 103.33');
    expect(formatLevelTitle('TP', 104.88)).toBe('TP 104.88');
    expect(formatLevelTitle('SL', 103.41, { be: true })).toBe('SL 103.41 (BE)');
  });

  it('A+ SETUP e R:R card + S1/R1', () => {
    expect(formatAPlusSetupBadge()).toBe('A+ SETUP');
    expect(formatPlannedRrCard({ rr: 2.1, slPct: 3.2, tpPct: 6.4 })).toBe(
      'R:R 2.1 · SL 3.2% · TP 6.4%'
    );
    expect(formatSrLevelTitle('S1', 0.1698)).toMatch(/^S1 /);
    expect(buildSrOverlayLines({ s1: 10, r1: 12 })).toHaveLength(2);
  });
});

describe('formatEntryTpSlNotify', () => {
  it('formato completo', () => {
    expect(
      formatEntryTpSlNotify({ entry: 103.33, tp: 104.88, sl: 103.41, slIsBe: true })
    ).toBe('ENTRY 103.33 · TP 104.88 · SL 103.41 (BE)');
  });
});

describe('isBreakevenSl', () => {
  it('LONG BE quando SL >= entry', () => {
    expect(isBreakevenSl('LONG', 100, 100)).toBe(true);
    expect(isBreakevenSl('LONG', 100, 99)).toBe(false);
  });
});

describe('MA', () => {
  it('SMA 3', () => {
    const r = calcSma([1, 2, 3, 4], 3);
    expect(r[2]).toBe(2);
    expect(r[3]).toBe(3);
  });

  it('EMA produz valores após período', () => {
    const r = calcEma([1, 2, 3, 4, 5], 3);
    expect(r[1]).toBeNull();
    expect(r[2]).not.toBeNull();
  });
});
