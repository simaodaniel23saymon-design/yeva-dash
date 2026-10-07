import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BotCatalogEntry, BotRiskPreview, SpotCoin, SpotCoinsResponse, SpotRealAccount } from '../types/spot';
import { DATA_STATE_TEXT, EMPTY_TEXT, accountValue, balanceText, futuresAccountState, spotAccountState } from './dataStates';
import { BOT_STATUS_LABEL, NOT_CONFIGURED, botOptionLabel, configFromForm, formFromConfig, isSelectableHere, riskPreviewRows, suggestedSplit } from './botConfigView';
import { spotMarketUpdating, spotMyCoins, spotTopWinnerCoins, uniqueBySymbol } from './marketDiscovery';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
const NOW = Date.parse('2026-10-02T12:00:00Z');

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

const previewFixture = (over: Partial<BotRiskPreview> = {}): BotRiskPreview => ({
  capitalUsdt: 100,
  initialEntryUsdt: 30,
  reserveUsdt: 70,
  maxExposureUsdt: 100,
  maxEntries: 5,
  stopLossPct: 5,
  takeProfitPct: 10,
  maxLossAtStopUsdt: 5,
  trailingStopPct: null,
  trailingActivationPct: 6,
  trailingGivebackPct: 3,
  reentryEnabled: false,
  reentryCondition: null,
  reentryCooldownMin: null,
  ...over,
});

const coin = (symbol: string, over: Partial<SpotCoin> = {}): SpotCoin => ({
  symbol,
  base: symbol.replace(/USDT$/, ''),
  price: 1,
  change24hPct: 1,
  score: null,
  rank: null,
  enabled: false,
  strategyState: 'WATCHING',
  displayState: 'OFF',
  position: null,
  positionState: 'NO_POSITION',
  execution: 'DISABLED',
  executionPhase: 'DISABLED',
  executionState: null,
  sources: [],
  config: null,
  ...over,
});

const resp = (coins: SpotCoin[], discovery?: SpotCoinsResponse['discovery']): SpotCoinsResponse => ({
  exchange: 'BINANCE',
  bot: 'MOMENTUM_ROTATION',
  mode: 'REAL',
  execution: 'DISABLED',
  orderExecution: false,
  liveEnabled: false,
  account: account(),
  preferencesAvailable: true,
  rankingScannedAt: null,
  rankingFresh: true,
  marketScannedAt: null,
  marketStale: false,
  discovery,
  generatedAt: new Date(NOW).toISOString(),
  coins,
});

describe('1-4 · estados do saldo com textos exatos', () => {
  it('1 NOT_CONNECTED', () => {
    const s = spotAccountState(account({ status: 'NOT_CONNECTED', dataState: 'NOT_CONNECTED' }), false);
    expect(s).toBe('NOT_CONNECTED');
    expect(balanceText(s, null)).toBe('Conecte uma exchange para continuar.');
  });
  it('2 ZERO ⇒ "$0.00 USDT" (zero real)', () => {
    const s = spotAccountState(account({ balanceUsdt: 0, dataState: 'ZERO_BALANCE' }), false);
    expect(balanceText(s, 0)).toBe('$0.00 USDT');
  });
  it('3 DATA_UNAVAILABLE ⇒ "Não foi possível atualizar o saldo."; valores "—", nunca 0', () => {
    const s = spotAccountState(account({ dataState: 'DATA_UNAVAILABLE' }), false);
    expect(balanceText(s, null)).toBe('Não foi possível atualizar o saldo.');
    expect(accountValue(s, 0, String)).toBe('—');
    expect(spotAccountState(null, false)).toBe('DATA_UNAVAILABLE');
    expect(spotAccountState(null, true)).toBe('DATA_LOADING');
  });
  it('4 DATA_STALE ⇒ valor + "Dados desatualizados."', () => {
    expect(DATA_STATE_TEXT.DATA_STALE).toBe('Dados desatualizados.');
    expect(balanceText('DATA_STALE', 12.5)).toBe('$12.50 USDT');
    expect(balanceText('DATA_STALE', null)).toBe('Dados desatualizados.');
  });
  it('Futures: sem conta ≠ leitura falhada ≠ zero ≠ antigo', () => {
    const base = { loading: false, requestFailed: false, connected: true, balance: 10, updatedAt: new Date(NOW).toISOString(), nowMs: NOW };
    expect(futuresAccountState({ ...base, connected: false, dataState: 'NOT_CONNECTED' })).toBe('NOT_CONNECTED');
    expect(futuresAccountState({ ...base, connected: false, dataState: 'DATA_UNAVAILABLE' })).toBe('DATA_UNAVAILABLE');
    expect(futuresAccountState({ ...base, requestFailed: true })).toBe('DATA_UNAVAILABLE');
    expect(futuresAccountState({ ...base, balance: 0 })).toBe('ZERO_BALANCE');
    expect(futuresAccountState({ ...base, updatedAt: new Date(NOW - 10 * 60_000).toISOString() })).toBe('DATA_STALE');
    expect(futuresAccountState({ ...base, loading: true })).toBe('DATA_LOADING');
  });
});

describe('5-8 · fontes de moedas', () => {
  it('5 Top Winners Spot: ordem do ranking, até 10, sem duplicados; scan antigo ⇒ "Mercado em atualização"', () => {
    const coins = Array.from({ length: 12 }, (_, i) => coin(`W${i}USDT`, { sources: ['TOP_WINNER'] }));
    const order = [...coins.map((c) => c.symbol)].reverse();
    const top = spotTopWinnerCoins(resp(coins, { marketState: 'FRESH', updatedAt: null, topWinners: order, myCoins: [] }));
    expect(top).toHaveLength(10);
    expect(top[0].symbol).toBe('W11USDT');
    expect(spotMarketUpdating(resp(coins, { marketState: 'UPDATING', updatedAt: '2026-10-02T10:00:00Z', topWinners: [], myCoins: [] }))).toBe(true);
    expect(EMPTY_TEXT.MARKET_UPDATING).toBe('Mercado em atualização');
    expect(read('pages/SpotPage.tsx')).toMatch(/\{EMPTY_TEXT\.LAST_SCAN\}: \{fmtWhen\(/);
  });
  it('Minhas moedas: preferência ou posição; sem duplicados com Top Winners na mesma lista', () => {
    const c = [coin('AUSDT', { sources: ['TOP_WINNER', 'MY_COIN'], enabled: true }), coin('BUSDT', { sources: ['TOP_WINNER'] }), coin('AUSDT', { sources: ['MY_COIN'] })];
    expect(spotMyCoins(resp(c)).map((x) => x.symbol)).toEqual(['AUSDT']);
    expect(uniqueBySymbol(c).map((x) => x.symbol)).toEqual(['AUSDT', 'BUSDT']);
  });
  it('6/7 Futures: abas Top Winners e Top Losers a partir de /market/movers; sem dados Spot', () => {
    const page = read('pages/FuturesPage.tsx');
    expect(page).toMatch(/api\s*\.get<FuturesMoversResponse>\('\/market\/movers'\)/);
    for (const t of ["'TOP_WINNERS'", "'TOP_LOSERS'", "'MY_COINS'", "'SEARCH'"]) expect(page).toContain(t);
    expect(page).not.toMatch(/\/spot\/coins|SpotCoin\b|spot-paper/);
  });
  it('8 pesquisa manual: Spot via /spot/search, Futures via /market/search', () => {
    expect(read('hooks/useSpot.ts')).toMatch(/api\.get<SpotSearchResponse>\('\/spot\/search'/);
    expect(read('pages/FuturesPage.tsx')).toMatch(/api\.get<FuturesSearchResponse>\('\/market\/search'/);
  });
});

describe('9-11 · seletor de bots', () => {
  const b = (over: Partial<BotCatalogEntry>): BotCatalogEntry => ({ id: 'X', name: 'X', market: 'SPOT', status: 'AVAILABLE', configurable: 'HERE', execution: 'DISABLED', exchanges: ['BINANCE'], note: '', ...over });
  it('9 AVAILABLE + HERE ⇒ selecionável', () => {
    expect(isSelectableHere(b({}))).toBe(true);
    expect(botOptionLabel(b({ name: 'Momentum Rotation' }))).toBe('Momentum Rotation');
  });
  it('10 COMING_SOON ⇒ não selecionável, "Em breve"', () => {
    expect(isSelectableHere(b({ status: 'COMING_SOON', configurable: null }))).toBe(false);
    expect(botOptionLabel(b({ name: 'Y', status: 'COMING_SOON' }))).toBe('Y · Em breve');
  });
  it('11 NOT_SUPPORTED / DISABLED / gerido em Bots ⇒ não configurável aqui', () => {
    expect(isSelectableHere(b({ status: 'NOT_SUPPORTED', configurable: null }))).toBe(false);
    expect(isSelectableHere(b({ status: 'DISABLED', configurable: null }))).toBe(false);
    expect(isSelectableHere(b({ configurable: 'BOTS_PAGE' }))).toBe(false);
    expect(botOptionLabel(b({ name: 'DCA', configurable: 'BOTS_PAGE' }))).toBe('DCA · gerido em Bots');
    expect(Object.keys(BOT_STATUS_LABEL).sort()).toEqual(['AVAILABLE', 'COMING_SOON', 'DISABLED', 'NOT_SUPPORTED']);
    expect(read('pages/SpotPage.tsx')).toMatch(/disabled=\{!isSelectableHere\(b\)\}/);
  });
});

describe('12-18 · configuração e ativação', () => {
  const cfg = {
    capitalTotalUsdt: 100,
    entryCapitalUsdt: 30,
    reserveUsdt: 70,
    maxPerCoinUsdt: null,
    maxEntries: 5,
    stopLossPct: null,
    trailingStopPct: null,
    takeProfitPct: 10,
    trailingActivationPct: 6,
    trailingGivebackPct: 3,
    reentryEnabled: false,
    reentryCondition: null,
    reentryCooldownMin: null,
  };
  it('12-16 formulário: vazio ⇒ null ("não configurado"), números preservados, vírgula aceite', () => {
    const f = formFromConfig(cfg);
    expect(f.stopLossPct).toBe('');
    const back = configFromForm({ ...f, stopLossPct: '7,5', reentryEnabled: true, reentryCondition: 'PULLBACK', reentryCooldownMin: '60' });
    expect(back).toMatchObject({ capitalTotalUsdt: 100, stopLossPct: 7.5, maxPerCoinUsdt: null, reentryEnabled: true, reentryCondition: 'PULLBACK', reentryCooldownMin: 60 });
    expect(configFromForm({ ...f, capitalTotalUsdt: 'abc' }).capitalTotalUsdt).toBe('abc');
  });
  it('sugestão do config da estratégia só com capital definido', () => {
    const d = { source: 'SPOT_ROTATION_CONFIG' as const, initialAllocationPct: 30, reservePct: 70, maxEntries: 5, takeProfitPct: 10, trailingActivationPct: 6, trailingGivebackPct: 3, stopLossPct: null, minEntryUsdt: 1, trailingSupported: true };
    expect(suggestedSplit(100, d)).toEqual({ entry: 30, reserve: 70 });
    expect(suggestedSplit(null, d)).toBeNull();
  });
  it('risk preview: null ⇒ "não configurado"; sem stop ⇒ "sem stop configurado"', () => {
    const rows = Object.fromEntries(riskPreviewRows(previewFixture({ stopLossPct: null, maxLossAtStopUsdt: null })));
    expect(rows).toMatchObject({ Capital: '$100.00 USDT', 'Exposição máxima': '$100.00 USDT', Stop: NOT_CONFIGURED, 'Take Profit': '10%', 'Perda máxima no stop': 'sem stop configurado' });
  });
  it('17 ATIVAR: rever risco no backend antes de gravar; botão ATIVAR só depois do preview válido', () => {
    const panel = read('components/spot/BotConfigPanel.tsx');
    expect(panel).toMatch(/\{!review \? \(/);
    expect(panel).toMatch(/Rever risco/);
    expect(panel).toMatch(/>\s*ATIVAR\s*</);
    expect(panel).toMatch(/data-testid="bot-risk-preview"/);
    for (const g of ['base', 'protection', 'exit', 'reentry']) expect(panel + read('utils/botConfigView.ts')).toMatch(new RegExp(`'${g}'|bot-config-group-${g}`));
    for (const l of ['Capital total', 'Capital por entrada', 'Reserva', 'Máximo por moeda', 'Máximo de entradas', 'Stop Loss', 'Trailing Stop', 'Take Profit', 'Ativação do trailing', 'Recuo do trailing']) {
      expect(read('utils/botConfigView.ts')).toContain(l);
    }
  });
  it('18 DESATIVAR: PUT enabled=false sem config (backend mantém a config e a posição)', () => {
    expect(read('hooks/useSpot.ts')).toMatch(/api\.put\('\/spot\/preferences', \{ exchange, bot, symbol, enabled: false \}\)/);
  });
});

describe('19-30 · segurança da UI', () => {
  it('19/25/29 ATIVAR só grava configuração: nenhum endpoint de ordem no frontend', () => {
    for (const f of ['hooks/useSpot.ts', 'components/spot/BotConfigPanel.tsx', 'pages/SpotPage.tsx', 'pages/FuturesPage.tsx', 'pages/DashboardPage.tsx']) {
      expect(read(f), f).not.toMatch(/\/order|newOrder|createOrder|\/spot-bots|\/api\/v3|fapi/i);
    }
  });
  it('21/22 utilizador só vê dados REAL; sem fallback Paper', () => {
    for (const f of ['pages/SpotPage.tsx', 'pages/DashboardPage.tsx', 'pages/FuturesPage.tsx', 'utils/dataStates.ts', 'utils/marketDiscovery.ts']) {
      expect(read(f), f).not.toMatch(/spot-paper|paperPnl|paperScope|'PAPER'/);
    }
  });
  it('23 admin: Strategy Lab com Paper, Diagnostics, Rejects, Risk, Scores, Experiments', () => {
    const lab = read('components/admin/StrategyLabPanel.tsx');
    for (const t of ['Paper Lab', 'Execution diagnostics', 'Rejects', 'Risk diagnostics', 'Scores', 'Experiments']) expect(lab).toContain(t);
  });
  it('26 configuração nunca pede seed/chave privada/API secret', () => {
    const src = read('components/spot/BotConfigPanel.tsx') + read('utils/botConfigView.ts');
    expect(src).not.toMatch(/seed|private key|chave privada|secret|apiKey/i);
  });
  it('PRO: Opportunity/Signal/Momentum/Discovery/Risk, sem promessas', () => {
    const pro = read('components/pro/ProIntelligencePreview.tsx');
    for (const k of ['Opportunity', 'Signal', 'Momentum', 'Discovery', 'Risk']) expect(pro).toContain(`kind: '${k}'`);
    expect(pro).not.toMatch(/300%|200%|lucro garantido/i);
  });
});
