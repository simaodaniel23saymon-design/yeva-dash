import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BotRiskPreview, SpotCoin, SpotRealAccount } from '../types/spot';
import { EMPTY_TEXT, SPOT_TRADING_TEXT, accountValue, balanceText, spotAccountState, spotTradingState } from './dataStates';
import { CONFIG_ERROR_LABEL, CONFIRM_INTRO, CONFIRM_NOT_A_BUY, NOT_CONFIGURED, STOP_REQUIRED_TEXT, confirmationLines, riskPreviewRows } from './botConfigView';
import { uniqueBySymbol } from './marketDiscovery';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

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

const preview = (over: Partial<BotRiskPreview> = {}): BotRiskPreview => ({
  capitalUsdt: 200,
  initialEntryUsdt: 60,
  reserveUsdt: 140,
  maxExposureUsdt: 150,
  maxEntries: 3,
  stopLossPct: 4,
  takeProfitPct: 12,
  maxLossAtStopUsdt: 6,
  trailingStopPct: null,
  trailingActivationPct: 6,
  trailingGivebackPct: 3,
  reentryEnabled: true,
  reentryCondition: 'PULLBACK',
  reentryCooldownMin: 30,
  ...over,
});

describe('1-5 · estados da conta (separados, nunca null ⇒ zero)', () => {
  it('1 conectada + saldo zero ⇒ "$0.00 USDT"', () => {
    const s = spotAccountState(account({ balanceUsdt: 0, dataState: 'ZERO_BALANCE' }), false);
    expect(s).toBe('ZERO_BALANCE');
    expect(balanceText(s, 0)).toBe('$0.00 USDT');
  });
  it('2 conectada + leitura falhada ⇒ "Não foi possível atualizar o saldo."; nunca $0.00', () => {
    const s = spotAccountState(account({ dataState: 'DATA_UNAVAILABLE' }), false);
    expect(balanceText(s, null)).toBe('Não foi possível atualizar o saldo.');
    expect(accountValue(s, 0, String)).toBe('—');
  });
  it('3 conectada + dados antigos ⇒ "Dados desatualizados." com o último valor', () => {
    const s = spotAccountState(account({ balanceUsdt: 42, dataState: 'DATA_STALE' }), false);
    expect(s).toBe('DATA_STALE');
    expect(balanceText(s, 42)).toBe('$42.00 USDT');
    expect(balanceText(s, null)).toBe('Dados desatualizados.');
  });
  it('4 trading desativado ⇒ "Trading Spot desativado."', () => {
    expect(spotTradingState(account({ tradingState: 'TRADING_DISABLED' }))).toBe('TRADING_DISABLED');
    expect(spotTradingState(null)).toBe('TRADING_DISABLED');
    expect(SPOT_TRADING_TEXT.TRADING_DISABLED).toBe('Trading Spot desativado.');
  });
  it('5 trading disponível ⇒ "Trading Spot disponível."', () => {
    expect(spotTradingState(account({ tradingState: 'TRADING_AVAILABLE' }))).toBe('TRADING_AVAILABLE');
    expect(SPOT_TRADING_TEXT.TRADING_AVAILABLE).toBe('Trading Spot disponível.');
  });
  it('sem exchange ⇒ "Conecte uma exchange para continuar."', () => {
    expect(balanceText(spotAccountState(account({ status: 'NOT_CONNECTED', dataState: 'NOT_CONNECTED' }), false), null)).toBe('Conecte uma exchange para continuar.');
  });
});

describe('6-10 · ativação REAL', () => {
  it('6 sem stop ⇒ "Configure uma proteção de perda antes de ativar."', () => {
    expect(CONFIG_ERROR_LABEL.STOP_LOSS_REQUIRED).toBe('Configure uma proteção de perda antes de ativar.');
    expect(STOP_REQUIRED_TEXT).toBe(CONFIG_ERROR_LABEL.STOP_LOSS_REQUIRED);
    const panel = read('components/spot/BotConfigPanel.tsx');
    expect(panel).toMatch(/e\.code === 'STOP_LOSS_REQUIRED'/);
    expect(panel).toContain('STOP_REQUIRED_TEXT');
  });
  it('7 com stop: resumo de risco com todos os campos e confirmação com os números da config', () => {
    const rows = Object.fromEntries(riskPreviewRows(preview()));
    expect(Object.keys(rows)).toEqual(['Capital', 'Entrada inicial', 'Reserva', 'Exposição máxima', 'Stop', 'Take Profit', 'Trailing', 'Máximo de entradas', 'Reentrada', 'Perda máxima no stop']);
    expect(rows).toMatchObject({ Capital: '$200.00 USDT', 'Entrada inicial': '$60.00 USDT', Reserva: '$140.00 USDT', 'Exposição máxima': '$150.00 USDT', Stop: '4%', 'Take Profit': '12%', 'Máximo de entradas': '3 entradas' });
    expect(rows.Trailing).toContain('6%');
    expect(rows.Reentrada).toContain('30 min');
    expect(confirmationLines(preview())).toEqual([
      'Você está configurando este bot para esta moeda.',
      'Capital máximo: $150.00',
      'Entrada inicial: $60.00',
      'Stop: 4%',
      'Take Profit: 12%',
      'Ativar esta configuração não significa comprar imediatamente.',
    ]);
  });
  it('7b valores não configurados nunca viram zero na confirmação', () => {
    const lines = confirmationLines(preview({ maxExposureUsdt: null, takeProfitPct: null }));
    expect(lines[1]).toBe(`Capital máximo: ${NOT_CONFIGURED}`);
    expect(lines[4]).toBe(`Take Profit: ${NOT_CONFIGURED}`);
  });
  it('fluxo: validar → resumo → confirmação → guardar; botões [Cancelar] [Confirmar ativação]', () => {
    const panel = read('components/spot/BotConfigPanel.tsx');
    expect(panel).toMatch(/data-testid="bot-risk-preview"/);
    expect(panel).toMatch(/onClick=\{\(\) => setConfirming\(true\)\}/);
    expect(panel).toMatch(/data-testid="bot-activation-confirm"/);
    expect(panel).toMatch(/>\s*Confirmar ativação\s*</);
    expect(panel).toMatch(/if \(!form \|\| !review \|\| !confirming\) return;/);
    expect(CONFIRM_INTRO).toBe('Você está configurando este bot para esta moeda.');
    expect(CONFIRM_NOT_A_BUY).toBe('Ativar esta configuração não significa comprar imediatamente.');
  });
  it('8-10 ativação só grava preferência: nenhuma ordem, posição ou fill no frontend; nunca COMPRAR', () => {
    for (const f of ['hooks/useSpot.ts', 'components/spot/BotConfigPanel.tsx', 'components/spot/SpotCoinRow.tsx', 'components/admin/PaperConfigLab.tsx', 'pages/SpotPage.tsx']) {
      const src = read(f);
      expect(src, f).not.toMatch(/\/order|newOrder|createOrder|\/fills?\b|\/positions?\/open|\/spot-bots|\/api\/v3|fapi/i);
      expect(src, f).not.toMatch(/>\s*COMPRAR\s*</);
    }
    expect(read('hooks/useSpot.ts')).toMatch(/api\.put\('\/spot\/preferences', \{ exchange, bot, symbol, enabled: true, config \}\)/);
  });
});

describe('11 · PAPER experimental (admin)', () => {
  it('admin guarda config experimental com context=PAPER, só no Strategy Lab', () => {
    const lab = read('components/admin/PaperConfigLab.tsx');
    expect(lab).toMatch(/context: LAB_CONTEXT/);
    expect(lab).toMatch(/LAB_CONTEXT = 'PAPER'/);
    expect(lab).toMatch(/context=\{LAB_CONTEXT\}/);
    expect(read('components/admin/StrategyLabPanel.tsx')).toContain('<PaperConfigLab />');
  });
});

describe('12-15 · estados vazios Spot e duplicados', () => {
  const page = read('pages/SpotPage.tsx');
  it('12 Top Winners sem ranking ⇒ "Mercado em atualização", "Último scan", [Atualizar]', () => {
    expect(EMPTY_TEXT.MARKET_UPDATING).toBe('Mercado em atualização');
    expect(EMPTY_TEXT.LAST_SCAN).toBe('Último scan');
    expect(page).toMatch(/data-testid="spot-winners-refresh"/);
    expect(page).toMatch(/s\.reload\(\)/);
    expect(page).toMatch(/>\s*Atualizar\s*</);
  });
  it('13 Minhas moedas vazio ⇒ "Adicione uma moeda para começar." + [Pesquisar moeda]', () => {
    expect(EMPTY_TEXT.MY_COINS_EMPTY).toBe('Adicione uma moeda para começar.');
    expect(page).toMatch(/setTab\('SEARCH'\)/);
    expect(page).toMatch(/>\s*Pesquisar moeda\s*</);
  });
  it('14 pesquisa sem resultado ⇒ "Nenhuma moeda encontrada."', () => {
    expect(EMPTY_TEXT.SEARCH_EMPTY).toBe('Nenhuma moeda encontrada.');
    expect(page).toContain('EMPTY_TEXT.SEARCH_EMPTY');
  });
  it('15 duplicados removidos por símbolo', () => {
    const c = (symbol: string) => ({ symbol }) as SpotCoin;
    expect(uniqueBySymbol([c('AUSDT'), c('BUSDT'), c('AUSDT')]).map((x) => x.symbol)).toEqual(['AUSDT', 'BUSDT']);
  });
});

describe('16-18 · Paper/Real e LIVE', () => {
  it('16 utilizador nunca vê Paper: páginas e hook Spot sem contexto PAPER', () => {
    for (const f of ['pages/SpotPage.tsx', 'hooks/useSpot.ts', 'components/spot/SpotCoinRow.tsx', 'pages/DashboardPage.tsx']) {
      expect(read(f), f).not.toMatch(/'PAPER'|PaperConfigLab|spot-paper/);
    }
  });
  it('17 admin vê Paper no Strategy Lab', () => {
    const lab = read('components/admin/StrategyLabPanel.tsx');
    expect(lab).toContain('Paper Lab');
    expect(lab).toContain('PaperConfigLab');
  });
  it('18 LIVE desligado ⇒ a UI nunca anuncia execução disponível sem LIVE', () => {
    const page = read('pages/SpotPage.tsx');
    expect(page).toMatch(/SPOT_TRADING_TEXT\[spotTradingState\(account\)\]/);
    expect(read('components/spot/BotConfigPanel.tsx')).toMatch(/Execução real desativada/);
  });
});
