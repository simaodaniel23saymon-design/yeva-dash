import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SpotCoin, SpotRealAccount, SpotVenue } from '../types/spot';
import {
  COIN_STATE_LABEL,
  NOT_AVAILABLE,
  VENUE_STATUS_LABEL,
  accountFacts,
  displayStateFor,
  executionLabel,
  fmtPrice,
  fmtSignedPct,
  fmtSignedUsd,
  fmtUsd,
  positionFacts,
  venueAction,
  venueFacts,
  withPreference,
} from './spotView';

function venue(over: Partial<SpotVenue>): SpotVenue {
  return {
    exchange: 'BINANCE',
    name: 'Binance',
    type: 'CEX',
    markets: ['SPOT'],
    auth: 'API_KEY',
    status: 'CONNECTED',
    accountConnected: true,
    marketDataAvailable: true,
    spotAvailable: true,
    tradingAvailable: false,
    liveEnabled: false,
    note: '',
    ...over,
  };
}

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
    execution: 'DISABLED',
    ...over,
  };
}

const account = (over: Partial<SpotRealAccount> = {}): SpotRealAccount => ({
  exchange: 'BINANCE',
  status: 'CONNECTED',
  balanceUsdt: null,
  unrealizedPnl: null,
  realizedPnl: null,
  roiPct: null,
  dataSource: 'NONE',
  ...over,
});

describe('exchange selector', () => {
  it('Binance ligada: Gerir; trading Spot DISABLED; LIVE DISABLED', () => {
    const v = venue({});
    expect(venueAction(v)).toEqual({ label: 'Gerir', to: '/exchanges' });
    expect(Object.fromEntries(venueFacts(v))).toEqual({
      Ligação: 'CONNECTED',
      Conta: 'CONNECTED',
      'Dados de mercado': 'Disponíveis',
      'Trading Spot': 'DISABLED',
      LIVE: 'DISABLED',
    });
  });

  it('CEX não ligada: Ligar', () => {
    expect(venueAction(venue({ exchange: 'BYBIT', status: 'NOT_CONNECTED', accountConnected: false }))).toEqual({ label: 'Ligar', to: '/exchanges' });
  });

  it('DEX em breve: só Ver, sem ligação nem conta por API key', () => {
    const v = venue({ exchange: 'UNISWAP', name: 'Uniswap', type: 'DEX', auth: 'WALLET', status: 'COMING_SOON', accountConnected: false, marketDataAvailable: false, spotAvailable: false });
    expect(venueAction(v)).toEqual({ label: 'Ver', to: null });
    const facts = Object.fromEntries(venueFacts(v));
    expect(facts['Ligação']).toBe('Em breve');
    expect(facts['Conta']).toBe('Carteira (futuro)');
    expect(facts['Trading Spot']).toBe('DISABLED');
  });

  it('todos os estados permitidos têm rótulo', () => {
    expect(Object.keys(VENUE_STATUS_LABEL).sort()).toEqual(['AVAILABLE', 'COMING_SOON', 'CONNECTED', 'NOT_CONNECTED', 'NOT_SUPPORTED']);
  });
});

describe('modo e execução', () => {
  it('REAL com execução DISABLED ⇒ Trading Disabled; LIVE só com LIVE e liveEnabled', () => {
    expect(executionLabel('DISABLED', false)).toBe('Trading Disabled');
    expect(executionLabel('DISABLED', true)).toBe('Trading Disabled');
    expect(executionLabel('LIVE', false)).toBe('Trading Disabled');
    expect(executionLabel(undefined, true)).toBe('Trading Disabled');
    expect(executionLabel('LIVE', true)).toBe('LIVE');
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
    expect(Object.keys(COIN_STATE_LABEL).sort()).toEqual(['OFF', 'ON', 'OUTSIDE_RANKING', 'WATCHING']);
  });
});

describe('conta e posição REAL', () => {
  it('sem posição ⇒ null (UI mostra No active position)', () => {
    expect(positionFacts(null)).toBeNull();
  });

  it('posição REAL mostra os valores do backend tal e qual', () => {
    const facts = Object.fromEntries(positionFacts({ quantity: 0.5, entryPrice: 80000, currentPrice: 84000, unrealizedPnl: 2000, realizedPnl: -5, roiPct: 5, updatedAt: 'x' })!);
    expect(facts).toEqual({
      Quantidade: '0.5',
      Entrada: '$80,000.00',
      'Preço atual': '$84,000.00',
      'REAL PnL não realizado': '+$2,000.00',
      'REAL PnL realizado': '−$5.00',
      ROI: '+5.00%',
    });
  });

  it('conta sem fonte real ⇒ Não disponível, nunca zero; execução não ativa', () => {
    const facts = Object.fromEntries(accountFacts(account(), 'DISABLED', false));
    expect(facts).toEqual({
      Conta: 'CONNECTED',
      Balance: NOT_AVAILABLE,
      'REAL PnL não realizado': NOT_AVAILABLE,
      'REAL PnL realizado': NOT_AVAILABLE,
      ROI: NOT_AVAILABLE,
      Execução: 'Execution not enabled',
    });
    expect(Object.fromEntries(accountFacts(account({ status: 'NOT_CONNECTED' }), 'DISABLED', false)).Conta).toBe('NOT CONNECTED');
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

  it('sem dados ⇒ traço, nunca zero inventado', () => {
    expect(fmtUsd(null)).toBe('—');
    expect(fmtSignedUsd(null)).toBe('—');
    expect(fmtSignedPct(null)).toBe('—');
    expect(fmtPrice(null)).toBe('—');
  });
});

describe('segurança do frontend Spot', () => {
  const files = [
    'types/spot.ts',
    'utils/spotView.ts',
    'hooks/useSpot.ts',
    'pages/SpotPage.tsx',
    'components/spot/ExchangeList.tsx',
    'components/spot/SpotCoinRow.tsx',
  ].map((f) => [f, fs.readFileSync(path.join(__dirname, '..', f), 'utf8')] as const);

  it('não usa segredos nem endpoints de ordens, e não chama o Spot DCA real', () => {
    for (const [f, src] of files) {
      expect(src, f).not.toMatch(/apiSecret|secretKey|apiKey|MASTER_ENCRYPTION|signature|\/api\/v3\/order|createOrder|cancelOrder|spot-bots|test-connection/i);
    }
  });

  it('o único pedido de escrita é a preferência', () => {
    const hook = files.find(([f]) => f === 'hooks/useSpot.ts')![1];
    expect(hook.match(/api\.(post|put|patch|delete)\(/g)).toEqual(['api.put(']);
    expect(hook).toMatch(/api\.put\('\/spot\/preferences'/);
  });

  it('não há botão para ligar LIVE', () => {
    for (const [f, src] of files) expect(src, f).not.toMatch(/enable.?live|ativar live|ligar live/i);
  });

  it('a vista REAL não usa dados nem links do Spot Paper', () => {
    for (const [f, src] of files) expect(src, f).not.toMatch(/spot-paper|paperPnl|paperScope|cycleId|lastExit|PnL paper/i);
  });
});
