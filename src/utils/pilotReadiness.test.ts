import { describe, expect, it } from 'vitest';
import { readinessSummary, type PilotReadiness } from './pilotReadinessView';
import { pilotLabel } from './spotView';

const base: PilotReadiness = {
  accountId: 'acct-1',
  userIdMasked: '750dbd…',
  exchange: 'BINANCE',
  market: 'SPOT',
  controlState: 'DISABLED',
  pilotAccount: { configured: false, matches: false },
  readiness: 'NOT_READY',
  blockers: ['PILOT_ACCOUNT_NOT_CONFIGURED'],
  safety: { gates: ['KILL_SWITCH_ACTIVE'], realSpotPilotMaxNotional: null },
  executionContext: { executionContext: 'REAL_USER', market: 'SPOT', exchange: 'BINANCE', accountId: 'acct-1', paperAllowed: false },
};

const row = (r: PilotReadiness, k: string) => readinessSummary(r).find(([key]) => key === k)?.[1];

describe('readiness do piloto (admin)', () => {
  it('valores ausentes ficam "—", nunca 0', () => {
    expect(row(base, 'Saldo Spot')).toBe('—');
    expect(row(base, 'Limite do piloto')).toBe('—');
    expect(row(base, 'Máximo efetivo')).toBe('—');
    expect(row(base, 'Conta piloto')).toBe('Não configurada');
    expect(row(base, 'Contexto')).toBe('REAL_USER · Paper excluído');
  });

  it('mostra limites da estratégia, do piloto e o máximo efetivo', () => {
    const r: PilotReadiness = {
      ...base,
      pilotAccount: { configured: true, matches: true },
      limits: { strategyLimitUsdt: 50, pilotLimitUsdt: 25, effectiveLimitUsdt: 25 },
      spotBalance: { state: 'DATA_UNAVAILABLE', usdtFree: null, usdtLocked: null, futuresBalanceUsed: false },
      dryRun: { evaluated: true, decision: 'BLOCK', reasons: ['KILL_SWITCH_ACTIVE'] },
    };
    expect(row(r, 'Limite da estratégia')).toBe('50 USDT');
    expect(row(r, 'Limite do piloto')).toBe('25 USDT');
    expect(row(r, 'Máximo efetivo')).toBe('25 USDT');
    expect(row(r, 'Saldo Spot')).toBe('Dados indisponíveis · livre — · bloqueado —');
    expect(row(r, 'Risk Guard (dry-run)')).toBe('BLOCK');
    expect(row(r, 'Conta piloto')).toBe('Configurada (esta conta)');
  });
});

describe('/spot — linha Piloto', () => {
  it('só "Piloto controlado" quando o backend reporta PILOT', () => {
    expect(pilotLabel('PILOT')).toBe('Piloto controlado');
    expect(pilotLabel('DISABLED')).toBe('Não ativo');
    expect(pilotLabel(undefined)).toBe('Não ativo');
  });
});
