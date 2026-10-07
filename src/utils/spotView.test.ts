import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SpotCoin, SpotRealAccount } from '../types/spot';
import {
  COIN_STATE_LABEL,
  EXECUTION_PHASE_LABEL,
  EXECUTION_STATE_LABEL,
  NOT_AVAILABLE,
  POSITION_STATE_LABEL,
  STRATEGY_STATE_LABEL,
  accountFacts,
  displayStateFor,
  executionLabel,
  fmtPrice,
  fmtSignedPct,
  fmtSignedUsd,
  fmtUsd,
  positionFacts,
  withPreference,
} from './spotView';

function coin(over: Partial<SpotCoin>): SpotCoin {
  return {
    symbol: 'BTCUSDT',
    base: 'BTC',
    price: 84630,
    change24hPct: 2.41,
    score: 68.4,
    rank: 1,
    enabled: false,
    strategyState: 'WATCHING',
    displayState: 'OFF',
    position: null,
    positionState: 'NO_POSITION',
    execution: 'DISABLED',
    executionPhase: 'DISABLED',
    executionState: null,
    ...over,
  };
}

const account = (over: Partial<SpotRealAccount> = {}): SpotRealAccount => ({
  exchange: 'BINANCE',
  status: 'CONNECTED',
  spotState: 'DISABLED',
  futuresState: 'UNKNOWN',
  balanceUsdt: null,
  availableUsdt: null,
  unrealizedPnl: null,
  realizedPnl: null,
  roiPct: null,
  dataSource: 'NONE',
  ...over,
});

describe('modo e execução', () => {
  it('REAL com execução DISABLED ⇒ Execução desativada; disponível só com LIVE e liveEnabled', () => {
    expect(executionLabel('DISABLED', false)).toBe('Execução desativada');
    expect(executionLabel('DISABLED', true)).toBe('Execução desativada');
    expect(executionLabel('LIVE', false)).toBe('Execução desativada');
    expect(executionLabel(undefined, true)).toBe('Execução desativada');
    expect(executionLabel('LIVE', true)).toBe('Execução disponível');
    expect(executionLabel('PILOT', false)).toBe('Piloto controlado');
  });

  it('famílias de estado separadas e todas com rótulo', () => {
    expect(Object.keys(STRATEGY_STATE_LABEL).sort()).toEqual(['NO_SIGNAL', 'OPPORTUNITY', 'OUTSIDE_RANKING', 'UNKNOWN', 'WATCHING']);
    expect(Object.keys(POSITION_STATE_LABEL).sort()).toEqual(['CLOSED', 'CLOSING', 'NO_POSITION', 'OPEN']);
    expect(Object.keys(EXECUTION_PHASE_LABEL).sort()).toEqual(['BLOCKED', 'DISABLED', 'EXECUTED', 'EXECUTING', 'READY']);
    expect(Object.keys(EXECUTION_STATE_LABEL)).toHaveLength(10);
  });

  it('rótulos do utilizador não expõem estados internos do motor', () => {
    const userLabels = [...Object.values(STRATEGY_STATE_LABEL), ...Object.values(POSITION_STATE_LABEL), ...Object.values(EXECUTION_PHASE_LABEL)].join(' ');
    expect(userLabels).not.toMatch(/REJECTED|MAX_POSITIONS|STRUCTURE|EXTENSION|threshold|score/i);
  });
});

describe('coin ON/OFF', () => {
  it('ON/OFF muda só a preferência e o estado mostrado; não cria posição', () => {
    const c = coin({ strategyState: 'WATCHING', displayState: 'OFF' });
    const on = withPreference(c, true);
    expect(on.enabled).toBe(true);
    expect(on.displayState).toBe('WATCHING');
    expect(on.position).toBeNull();
    expect(on.execution).toBe('DISABLED');
    expect(withPreference(on, false).displayState).toBe('OFF');
  });

  it('com posição REAL, OFF não mexe na posição', () => {
    const position = { quantity: 1, entryPrice: 100, currentPrice: 110, unrealizedPnl: 10, realizedPnl: 0, roiPct: 10, updatedAt: '2026-10-02T12:00:00Z' };
    const off = withPreference(coin({ enabled: true, displayState: 'WATCHING', position }), false);
    expect(off.displayState).toBe('OFF');
    expect(off.position).toEqual(position);
  });

  it('estados da estratégia mantêm-se separados', () => {
    expect(displayStateFor(true, 'OUTSIDE_RANKING')).toBe('OUTSIDE_RANKING');
    expect(displayStateFor(true, 'UNKNOWN')).toBe('ON');
    expect(displayStateFor(false, 'OUTSIDE_RANKING')).toBe('OFF');
    expect(COIN_STATE_LABEL.OUTSIDE_RANKING).toBe('Fora do ranking');
    expect(Object.keys(COIN_STATE_LABEL).sort()).toEqual(['NO_SIGNAL', 'OFF', 'ON', 'OPPORTUNITY', 'OUTSIDE_RANKING', 'WATCHING']);
  });
});

describe('conta e posição REAL', () => {
  it('sem posição ⇒ null (UI mostra Sem posição aberta)', () => {
    expect(positionFacts(null)).toBeNull();
  });

  it('posição REAL mostra os valores do backend tal e qual', () => {
    const facts = Object.fromEntries(positionFacts({ quantity: 0.5, entryPrice: 80000, currentPrice: 84000, unrealizedPnl: 2000, realizedPnl: -5, roiPct: 5, updatedAt: 'x' })!);
    expect(facts).toEqual({
      Quantidade: '0.5',
      Entrada: '$80,000.00',
      'Preço atual': '$84,000.00',
      'PnL REAL não realizado': '+$2,000.00',
      'PnL REAL realizado': '−$5.00',
      ROI: '+5.00%',
    });
  });

  it('conta sem leitura real ⇒ "Não foi possível atualizar o saldo.", restantes valores "—", nunca zero', () => {
    const facts = Object.fromEntries(accountFacts(account({ dataState: 'DATA_UNAVAILABLE' }), 'DISABLED', false));
    expect(facts).toEqual({
      Conta: 'Conectada',
      'Saldo Spot': 'Não foi possível atualizar o saldo.',
      'Disponível Spot': NOT_AVAILABLE,
      'PnL REAL não realizado · Spot': NOT_AVAILABLE,
      'PnL REAL realizado · Spot': NOT_AVAILABLE,
      Execução: 'Trading Spot desativado.',
      Piloto: 'Não ativo',
    });
    expect(NOT_AVAILABLE).toBe('—');
    expect(Object.keys(facts)).not.toContain('Saldo');
    expect(JSON.stringify(facts)).not.toMatch(/Não disponível|\$0\.00/);
    const nc = Object.fromEntries(accountFacts(account({ status: 'NOT_CONNECTED', dataState: 'NOT_CONNECTED' }), 'DISABLED', false));
    expect(nc).toMatchObject({ Conta: 'Não conectada', 'Saldo Spot': 'Conecte uma exchange para continuar.' });
  });

  it('conta Binance com dados reais: saldo e disponível Spot do backend; zero real ⇒ "$0.00 USDT"', () => {
    const facts = Object.fromEntries(
      accountFacts(account({ spotState: 'READY', futuresState: 'ENABLED', balanceUsdt: 120, availableUsdt: 100, dataSource: 'BINANCE_SPOT', dataState: 'CONNECTED' }), 'DISABLED', false)
    );
    expect(facts).toMatchObject({ 'Saldo Spot': '$120.00 USDT', 'Disponível Spot': '$100.00', Execução: 'Trading Spot desativado.' });
    expect(Object.fromEntries(accountFacts(account({ balanceUsdt: 0, availableUsdt: 0, dataSource: 'BINANCE_SPOT', dataState: 'ZERO_BALANCE' }), 'DISABLED', false))['Saldo Spot']).toBe('$0.00 USDT');
    expect(Object.fromEntries(accountFacts(account({ spotState: 'PILOT' }), 'PILOT', false))).toMatchObject({ Execução: 'Piloto controlado' });
    expect(Object.fromEntries(accountFacts(account({ tradingState: 'TRADING_AVAILABLE' }), 'DISABLED', false))).toMatchObject({ Execução: 'Trading Spot disponível.' });
  });
});

describe('formatação', () => {
  it('formata valores vindos do backend', () => {
    expect(fmtUsd(100)).toBe('$100.00');
    expect(fmtSignedUsd(4.82)).toBe('+$4.82');
    expect(fmtSignedUsd(-1.5)).toBe('−$1.50');
    expect(fmtSignedPct(4.82)).toBe('+4.82%');
    expect(fmtPrice(84630)).toBe('$84,630.00');
  });

  it('sem dados ⇒ traço, nunca zero inventado, NaN ou undefined', () => {
    expect(fmtUsd(null)).toBe('—');
    expect(fmtSignedUsd(null)).toBe('—');
    expect(fmtSignedPct(null)).toBe('—');
    expect(fmtPrice(null)).toBe('—');
    for (const f of [fmtUsd, fmtSignedUsd, fmtSignedPct, fmtPrice]) {
      expect(f(Number.NaN)).toBe('—');
      expect(f(undefined as unknown as null)).toBe('—');
    }
  });

  it('nunca mostra -$0.00', () => {
    expect(fmtSignedUsd(-0)).toBe('$0.00');
    expect(fmtSignedUsd(-0.004)).toBe('$0.00');
    expect(fmtSignedUsd(0.004)).toBe('$0.00');
  });
});

describe('segurança do frontend Spot', () => {
  const files = [
    'types/spot.ts',
    'utils/spotView.ts',
    'hooks/useSpot.ts',
    'pages/SpotPage.tsx',
    'components/spot/SpotCoinRow.tsx',
    'components/spot/BotConfigPanel.tsx',
    'utils/botConfigView.ts',
    'utils/dataStates.ts',
    'utils/marketDiscovery.ts',
  ].map((f) => [f, fs.readFileSync(path.join(__dirname, '..', f), 'utf8')] as const);

  it('não usa segredos nem endpoints de ordens, e não chama o Spot DCA real', () => {
    for (const [f, src] of files) {
      expect(src, f).not.toMatch(/apiSecret|secretKey|apiKey|MASTER_ENCRYPTION|signature|\/api\/v3\/order|createOrder|cancelOrder|spot-bots|test-connection/i);
    }
  });

  it('escritas: só a preferência/config (PUT) e a validação sem gravar (POST preview)', () => {
    const hook = files.find(([f]) => f === 'hooks/useSpot.ts')![1];
    const writes = [...hook.matchAll(/api\.(post|put|patch|delete)(?:<[^>]+>)?\(\s*'([^']+)'/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(writes).toEqual(['post /spot/bot-config/preview', 'put /spot/preferences', 'put /spot/preferences', 'put /spot/preferences']);
    expect(hook).not.toMatch(/api\.(patch|delete)\(/);
  });

  it('não há botão para ligar LIVE', () => {
    for (const [f, src] of files) expect(src, f).not.toMatch(/enable.?live|ativar live|ligar live/i);
  });

  it('a vista REAL não usa dados nem links do Spot Paper', () => {
    for (const [f, src] of files) expect(src, f).not.toMatch(/spot-paper|paperPnl|paperScope|cycleId|lastExit|PnL paper/i);
  });
});
