import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AutoOpsStatusResponse } from '../types/autoOps';
import { splitAutoOpsStatus } from './autoOpsScope';

const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe('splitAutoOpsStatus', () => {
  it('PAPER_ADMIN ⇒ laboratório completo', () => {
    const v = splitAutoOpsStatus({ scope: 'PAPER_ADMIN', scannedAt: null, modules: [{ id: 'gainers' } as never] });
    expect(v.restricted).toBe(false);
    expect(v.adminModules).toHaveLength(1);
  });

  it('REAL_USER ⇒ vista restrita (só mercado)', () => {
    const v = splitAutoOpsStatus({ scope: 'REAL_USER', paperRestricted: true, scannedAt: null, modules: [{ id: 'gainers' } as never] });
    expect(v.restricted).toBe(true);
    expect(v.adminModules).toEqual([]);
    expect(v.marketModules).toHaveLength(1);
  });

  it('sem scope (backend antigo) ou vazio ⇒ restrita (fail-closed)', () => {
    expect(splitAutoOpsStatus({ scannedAt: null, modules: [] } as unknown as AutoOpsStatusResponse).restricted).toBe(true);
    expect(splitAutoOpsStatus(null).restricted).toBe(true);
  });
});

describe('páginas Auto-Ops', () => {
  it('controlos, posição Paper e feed só renderizam fora da vista restrita', () => {
    for (const f of ['components/operations/AutoOpsMomentumPage.tsx', 'components/operations/AutoOpsStablePage.tsx']) {
      const src = read(f);
      expect(src, f).toMatch(/\{restricted && marketModule && <AutoOpsMarketPanel module=\{marketModule\} \/>\}/);
      expect(src, f).toMatch(/\{!restricted && module && \(/);
    }
  });

  it('o painel de mercado não mostra feed, PnL, posição Paper nem controlos', () => {
    const src = read('components/operations/AutoOpsMarketPanel.tsx');
    expect(src).not.toMatch(/AutoOpsActionFeed|AutoOpsPositionCard|modulePnl|realGate|execMode|toggle|manual-enter|api\./);
  });
});
