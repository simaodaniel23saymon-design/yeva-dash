import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDemoExchangeAccount, shouldAutoTestConnection } from './exchangeStatus';

describe('exchangeStatus', () => {
  it('detecta conta DEMO da plataforma', () => {
    expect(isDemoExchangeAccount({ exchange: 'DEMO' })).toBe(true);
    expect(isDemoExchangeAccount({ exchange: 'BINANCE', accountType: 'DEMO' })).toBe(true);
    expect(isDemoExchangeAccount({ exchange: 'BINANCE' })).toBe(false);
    expect(isDemoExchangeAccount(null)).toBe(false);
  });

  it('teste automático só para conta real ligada fora do modo edição', () => {
    expect(shouldAutoTestConnection({ connected: true, account: { exchange: 'BINANCE' }, editMode: false })).toBe(true);
    expect(shouldAutoTestConnection({ connected: true, account: { exchange: 'DEMO' }, editMode: false })).toBe(false);
    expect(shouldAutoTestConnection({ connected: false, account: null, editMode: false })).toBe(false);
    expect(shouldAutoTestConnection({ connected: true, account: { exchange: 'BINANCE' }, editMode: true })).toBe(false);
  });

  it('página Exchanges não faz polling de test-connection', () => {
    const src = readFileSync(resolve(__dirname, '../pages/ExchangesPage.tsx'), 'utf8');
    expect(src).not.toMatch(/setInterval\(\s*fetchBalance/);
    expect(src).toMatch(/useExchange\(0,\s*\{\s*fetchBalance:\s*false\s*\}\)/);
  });
});
