import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SpotCoin, SpotVenue } from '../types/spot';
import {
  COIN_STATE_LABEL,
  VENUE_STATUS_LABEL,
  displayStateFor,
  fmtPrice,
  fmtSignedPct,
  fmtSignedUsd,
  fmtUsd,
  modeLabel,
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
    lastExit: null,
    lastDecision: null,
    ...over,
  };
}

describe('exchange selector', () => {
  it('Binance ligada: Gerir; trading Spot não ativo; LIVE desligado', () => {
    const v = venue({});
    expect(venueAction(v)).toEqual({ label: 'Gerir', to: '/exchanges' });
    expect(Object.fromEntries(venueFacts(v))).toEqual({
      Ligação: 'Ligada',
      Conta: 'Ligada',
      'Dados de mercado': 'Disponíveis',
      'Trading Spot': 'Não ativo',
      LIVE: 'Desligado',
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
    expect(facts['Trading Spot']).toBe('Não ativo');
  });

  it('todos os estados permitidos têm rótulo', () => {
    expect(Object.keys(VENUE_STATUS_LABEL).sort()).toEqual(['AVAILABLE', 'COMING_SOON', 'CONNECTED', 'NOT_CONNECTED', 'NOT_SUPPORTED']);
  });
});

describe('bot selector', () => {
  it('Momentum PAPER aparece como simulação; nunca LIVE com o LIVE desligado', () => {
    expect(modeLabel('PAPER', false)).toBe('PAPER · simulação');
    expect(modeLabel('PAPER', true)).toBe('PAPER · simulação');
    expect(modeLabel('REAL', false)).toBe('PAPER · simulação');
  });
});

describe('coin ON/OFF', () => {
  it('ON/OFF muda só a preferência e o estado mostrado; posição e PnL ficam iguais', () => {
    const c = coin({ strategyState: 'WATCHING', displayState: 'OFF' });
    const on = withPreference(c, true);
    expect(on.enabled).toBe(true);
    expect(on.displayState).toBe('WATCHING');
    expect(on.position).toBeNull();
    expect(withPreference(on, false).displayState).toBe('OFF');
  });

  it('com posição aberta, OFF continua a mostrar a posição', () => {
    const position = { cycleId: 'c1', status: 'OPEN', openedAt: null, capitalUsed: 100, paperPnl: 4.82, returnPct: 4.82, entries: 1 };
    const off = withPreference(coin({ enabled: true, strategyState: 'POSITION_OPEN', displayState: 'POSITION_OPEN', position }), false);
    expect(off.displayState).toBe('POSITION_OPEN');
    expect(off.position).toEqual(position);
  });

  it('estados da estratégia mantêm-se separados', () => {
    expect(displayStateFor(true, 'OUTSIDE_RANKING')).toBe('OUTSIDE_RANKING');
    expect(displayStateFor(true, 'INVALIDATED')).toBe('INVALIDATED');
    expect(displayStateFor(true, 'EXITED')).toBe('EXITED');
    expect(displayStateFor(true, 'UNKNOWN')).toBe('ON');
    expect(displayStateFor(false, 'OUTSIDE_RANKING')).toBe('OFF');
    expect(COIN_STATE_LABEL.OUTSIDE_RANKING).toBe('Fora do ranking');
  });
});

describe('posição e PnL', () => {
  it('formata a posição paper vinda do backend', () => {
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
});
