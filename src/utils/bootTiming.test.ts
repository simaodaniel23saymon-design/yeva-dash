import { describe, expect, it } from 'vitest';
import {
  MIN_BOOT_MS,
  bootProgressPct,
  shouldCompleteBoot,
} from './bootTiming';
import { BRAND_LOGO_SOURCES } from '../components/BrandLogo';

describe('bootTiming', () => {
  it('MIN_BOOT_MS é 12000', () => {
    expect(MIN_BOOT_MS).toBe(12_000);
  });

  it('não completa antes do mínimo mesmo com dados prontos', () => {
    expect(
      shouldCompleteBoot({ elapsedMs: 6000, dataReady: true, minMs: 12_000 })
    ).toBe(false);
  });

  it('após 12s sem dados → espera', () => {
    expect(
      shouldCompleteBoot({ elapsedMs: 15_000, dataReady: false, minMs: 12_000 })
    ).toBe(false);
  });

  it('após 12s com dados → completa', () => {
    expect(
      shouldCompleteBoot({ elapsedMs: 12_000, dataReady: true, minMs: 12_000 })
    ).toBe(true);
  });

  it('progresso fica sob 100% enquanto espera dados', () => {
    expect(
      bootProgressPct({ elapsedMs: 20_000, dataReady: false, minMs: 12_000 })
    ).toBe(92);
    expect(
      bootProgressPct({ elapsedMs: 12_000, dataReady: true, minMs: 12_000 })
    ).toBe(100);
  });
});

describe('BrandLogo sources', () => {
  it('usa logo oficial PNG (Y dourado), sem placeholder SVG A', () => {
    expect(BRAND_LOGO_SOURCES.png).toBe('/yeva-logo-horizontal.png');
    expect(BRAND_LOGO_SOURCES.icon).toBe('/favicon.png');
    expect(BRAND_LOGO_SOURCES.svg).toBe('/yeva-logo-horizontal.png');
  });
});
