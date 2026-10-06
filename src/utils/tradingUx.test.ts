import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SpotVenue } from '../types/spot';
import { MARKET_MONITORED_TEXT, NO_OPPORTUNITY_TEXT, dashboardOpportunities, eligibleCountText, marketCards, marketOverview, toMarketItems } from './dashboardSummary';
import { ACTION_LABEL, marketStateLabel, venuesByType } from './exchangeCatalog';
import { futuresBots, futuresCoinCards, futuresPositionRows, whenConnected } from './futuresView';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
const sources = () => walk(root).map((p) => [path.relative(root, p).replace(/\\/g, '/'), fs.readFileSync(p, 'utf8')] as const);

/** Fixture no formato de GET /api/spot/venues (o backend é a fonte de verdade). */
function venue(over: Partial<SpotVenue> & Pick<SpotVenue, 'exchange' | 'type'>): SpotVenue {
  const cex = over.type === 'CEX';
  return {
    name: over.exchange,
    markets: cex ? ['SPOT', 'FUTURES'] : ['SPOT'],
    auth: cex ? 'API_KEY' : 'WALLET',
    status: 'COMING_SOON',
    accountConnected: false,
    marketDataAvailable: false,
    spotAvailable: false,
    tradingAvailable: false,
    liveEnabled: false,
    note: '',
    availability: 'Em breve.',
    spot: { status: 'COMING_SOON', trading: 'DISABLED' },
    futures: cex ? { status: 'COMING_SOON', trading: 'DISABLED' } : null,
    action: 'LEARN',
    connection: { method: cex ? 'API_KEY' : 'WALLET', fields: [], steps: [], requirements: [] },
    flow: cex ? [] : ['Wallet', 'Network', 'Protocol', 'Security', 'Simulation', 'User Signature'],
    ...over,
  };
}

const coin = (symbol: string, strategyState: string, change24hPct: number | null = 1) => ({
  symbol,
  base: symbol.replace(/USDT$/, ''),
  price: 100,
  change24hPct,
  strategyState,
});

describe('Dashboard (1–4)', () => {
  it('1 · utilizador não vê Paper: o Dashboard não pede métricas Paper nem mostra o laboratório', () => {
    const page = read('pages/DashboardPage.tsx');
    expect(page).toMatch(/useMomentumRanking\(60_000\)/);
    expect(page).not.toMatch(/spot-paper|paperPnl|MomentumWinnersLosersSection|DashboardLogsTerminal|momentum\/metrics/);
  });

  it('2 · utilizador não vê REJECTED nem motivos internos', () => {
    const items = toMarketItems([
      { symbol: 'BTCUSDT', side: 'WINNER', decision: 'REJECTED', decisionReason: 'MAX_POSITIONS', score: 80, factors: { negative: ['EXTENSION_RISK'] }, price: 60000 },
      { symbol: 'ETHUSDT', side: 'LOSER', decision: 'APPROVED', decisionReason: 'STRUCTURE', price: 3000 },
    ]);
    expect(JSON.stringify(items)).not.toMatch(/REJECTED|APPROVED|MAX_POSITIONS|STRUCTURE|EXTENSION_RISK|score|factors/);
    expect(marketOverview(items).opportunities.map((o) => o.symbol)).toEqual(['ETHUSDT']);
    expect(read('pages/DashboardPage.tsx')).not.toMatch(/decisionReason|REJECTED|MAX_POSITIONS|EXTENSION_RISK|score/);
  });

  it('3 · utilizador vê oportunidades relevantes com [Ver Spot]/[Ver Futures]; sem nenhuma ⇒ texto vazio', () => {
    const items = toMarketItems([{ symbol: 'SOLUSDT', direction: 'UP', price: 150, opportunity: 'OPPORTUNITY' }]);
    const coins = [coin('BTCUSDT', 'OPPORTUNITY', 2.07), coin('ETHUSDT', 'WATCHING'), coin('SOLUSDT', 'NO_SIGNAL', -1)];
    expect(dashboardOpportunities(coins, items)).toEqual([
      { key: 'S-BTCUSDT', base: 'BTC', change24hPct: 2.07, market: 'SPOT', to: '/spot' },
      { key: 'F-SOLUSDT', base: 'SOL', change24hPct: -1, market: 'FUTURES', to: '/futures' },
    ]);
    expect(dashboardOpportunities([coin('ETHUSDT', 'WATCHING')], [])).toEqual([]);
    const many = Array.from({ length: 9 }, (_, i) => coin(`C${i}USDT`, 'OPPORTUNITY'));
    expect(dashboardOpportunities(many, [])).toHaveLength(5);
    expect(NO_OPPORTUNITY_TEXT).toBe('Sem oportunidade elegível no momento.');
    expect(MARKET_MONITORED_TEXT).toBe('Mercado monitorado');
    expect(eligibleCountText(0)).toBe('0 oportunidades elegíveis');
    const cards = marketCards(coins, items);
    expect(cards[0]).toMatchObject({ base: 'BTC', price: 100, spot: 'OPPORTUNITY', futures: null });
    expect(marketCards([coin('XRPUSDT', 'UNKNOWN')], [])[0].spot).toBeNull();
    const page = read('pages/DashboardPage.tsx');
    for (const t of ['Ver Spot', 'Ver Futures', 'Abrir Spot', 'Abrir Futures', 'Gerir exchanges', 'Saldo Spot', 'Saldo Futures', 'PnL Spot', 'PnL Futures', 'Posições Spot', 'Posições Futures', 'Explorar mercado', 'Spot · Top Winners', 'Futures · Top Winners', 'Futures · Top Losers']) {
      expect(page).toContain(t);
    }
    expect(page).not.toMatch(/k="Saldo"|k="PnL"|k="Posições"/);
  });

  it('4 · admin vê diagnóstico no Strategy Lab (rota /admin exige isAdmin)', () => {
    const lab = read('components/admin/StrategyLabPanel.tsx');
    expect(lab).toMatch(/useMomentumRanking\(60_000, true\)/);
    expect(lab).toMatch(/<MomentumWinnersLosersSection ranking=\{ranking\} \/>/);
    expect(lab).toMatch(/to="\/spot-paper"/);
    expect(read('pages/AdminPage.tsx')).toMatch(/tab === 'strategy-lab' && <StrategyLabPanel/);
    expect(read('App.tsx')).toMatch(/path="\/admin" element=\{<AppRoute element=\{<AdminPage \/>\} requireAdmin \/>\}/);
    const section = read('components/dashboard/MomentumWinnersLosersSection.tsx');
    expect(section).toMatch(/decisionReason/);
  });
});

describe('Spot (5–9)', () => {
  const page = read('pages/SpotPage.tsx');
  const row = read('components/spot/SpotCoinRow.tsx');

  it('5 · Spot é REAL: barra com Exchange, Bot, Conta, Saldo Spot e Execução', () => {
    for (const t of ['label="Exchange"', 'label="Bot"', 'label="Conta"', 'label="Saldo Spot"', 'label="Execução"']) expect(page).toContain(t);
  });

  it('6 · botão diz ATIVAR (nunca COMPRAR); ATIVAR abre configuração; DESATIVAR não vende', () => {
    expect(row).toMatch(/\{draftState \? 'ATIVAR' : 'Configurar'\}/);
    expect(row).toMatch(/>\s*Continuar configuração\s*</);
    expect(row).toMatch(/>\s*DESATIVAR\s*</);
    expect(row).toMatch(/onClick=\{\(\) => onConfigure\(coin\)\}/);
    expect(row).toMatch(/Não vende nem fecha a posição/);
    for (const src of [row, page, read('components/spot/BotConfigPanel.tsx')]) expect(src).not.toMatch(/COMPRAR|>\s*Comprar\s*</);
    expect(read('hooks/useSpot.ts').match(/api\.(put|patch|delete)\(/g)).toEqual(['api.put(', 'api.put(']);
  });

  it('7 · sem fallback Paper', () => {
    for (const src of [page, row, read('hooks/useSpot.ts')]) expect(src).not.toMatch(/spot-paper|paperPnl|paperScope|SpotPaperPage|'PAPER'/);
  });

  it('8 · quatro famílias de estado separadas; sem posição ⇒ "Sem posição aberta"', () => {
    for (const t of ['label="Estratégia"', 'label="Posição"', 'label="Execução"', 'Preferência', 'Sem posição aberta.']) expect(row).toContain(t);
    expect(row).toMatch(/\{showDiagnostics && \(/);
  });

  it('9 · PnL REAL separado: rótulos "PnL REAL", score só em diagnóstico', () => {
    expect(read('utils/spotView.ts')).toMatch(/PnL REAL não realizado/);
    expect(row.slice(0, row.indexOf('{showDiagnostics &&'))).not.toMatch(/coin\.score|coin\.rank/);
  });
});

describe('Futures (10–11)', () => {
  it('10 · página Futures com Exchange, Bot, Conta, Margem e Alavancagem em cartões', () => {
    const page = read('pages/FuturesPage.tsx');
    expect(read('App.tsx')).toMatch(/path="\/futures" element=\{<AppRoute element=\{<FuturesPage \/>\} \/>\}/);
    for (const t of ['label="Exchange"', 'label="Bot"', 'label="Conta"', 'label="Margem"', 'label="Alavancagem"']) expect(page).toContain(t);
    expect(page).not.toMatch(/<table/);
  });

  it('11 · Futures isolado de Spot: sem /spot/coins; bots Spot excluídos; PnL do backend', () => {
    expect(read('pages/FuturesPage.tsx')).not.toMatch(/\/spot\/coins|SpotCoin|spot-paper/);
    const rows = futuresPositionRows([
      { symbol: 'BTCUSDT', positionSide: 'BOTH', positionAmt: '-0.01', entryPrice: '60000', markPrice: '59000', unrealizedProfit: '10', initialMargin: '30', leverage: '20' },
    ]);
    const bots = [
      { id: 'a', market: 'FUTURES', status: 'running', symbol: 'ETHUSDT', leverage: 5 },
      { id: 'b', market: 'SPOT', status: 'running', symbol: 'SOLUSDT' },
    ];
    expect(futuresBots(bots).map((b) => b.id)).toEqual(['a']);
    const cards = futuresCoinCards(bots, rows, [{ symbol: 'BTCUSDT', price: 59100, change24hPct: -1.2 }]);
    expect(cards.map((c) => c.symbol)).toEqual(['BTCUSDT', 'ETHUSDT']);
    expect(cards[0]).toMatchObject({ side: 'SHORT', price: 59100, change24hPct: -1.2, leverage: 20 });
    expect(cards[0].position?.unrealizedPnl).toBe(10);
    expect(cards[1]).toMatchObject({ side: null, position: null, leverage: 5, change24hPct: null, botRunning: true });
    expect(futuresCoinCards(bots, rows, [], 'a').map((c) => c.symbol)).toEqual(['ETHUSDT']);
    expect(whenConnected(false, 0)).toBeNull();
  });
});

describe('Exchanges (12–16)', () => {
  const venues = [
    venue({ exchange: 'BINANCE', type: 'CEX', status: 'CONNECTED', accountConnected: true, action: 'MANAGE', spot: { status: 'CONNECTED', trading: 'DISABLED' }, futures: { status: 'CONNECTED', trading: 'BOTS' }, connection: { method: 'API_KEY', fields: ['API Key', 'API Secret'], steps: [], requirements: [] } }),
    venue({ exchange: 'BITGET', type: 'CEX' }),
    venue({ exchange: 'BYBIT', type: 'CEX' }),
    venue({ exchange: 'HYPERLIQUID', type: 'DEX', markets: ['PERP'], spot: null }),
    venue({ exchange: 'UNISWAP', type: 'DEX' }),
  ];

  it('12 · catálogo não está duplicado no frontend: só o backend lista exchanges', () => {
    for (const f of ['utils/exchangeCatalog.ts', 'components/exchanges/ExchangeHub.tsx', 'pages/DashboardPage.tsx', 'pages/FuturesPage.tsx']) {
      expect(read(f), f).not.toMatch(/['"](BITGET|BYBIT|HYPERLIQUID|UNISWAP|PANCAKESWAP|SOLANA)['"]/);
    }
    expect(read('hooks/useExchangeCatalog.ts')).toMatch(/api\.get<SpotVenuesResponse>\('\/spot\/venues'\)/);
    expect(read('components/exchanges/ExchangeHub.tsx')).not.toMatch(/EXCHANGE_CATALOG/);
  });

  it('13 · Binance conectada: Spot e Futures independentes; conectada ≠ trading', () => {
    const b = venues[0];
    expect(marketStateLabel(b.spot)).toBe('Conectada · trading desativado');
    expect(marketStateLabel(b.futures)).toBe('Conectada · via bots');
    expect(ACTION_LABEL[b.action]).toBe('Gerir');
  });

  it('14 · Bitget e Bybit: Em breve, ação "Saber como funciona", sem campos de credenciais', () => {
    for (const v of venues.slice(1, 3)) {
      expect(marketStateLabel(v.spot)).toBe('Em breve');
      expect(ACTION_LABEL[v.action]).toBe('Saber como funciona');
      expect(v.connection.fields).toEqual([]);
    }
  });

  it('15 · DEX: Em breve, carteira, mercado não suportado aparece como tal', () => {
    for (const v of venuesByType(venues, 'DEX')) {
      expect(v.auth).toBe('WALLET');
      expect(v.status).toBe('COMING_SOON');
    }
    expect(marketStateLabel(null)).toBe('Não suportado');
  });

  it('16 · CEX vs DEX separados no Hub e no seletor "Conectar exchange"', () => {
    expect(venuesByType(venues, 'CEX').map((v) => v.exchange)).toEqual(['BINANCE', 'BITGET', 'BYBIT']);
    expect(venuesByType(venues, 'DEX').map((v) => v.exchange)).toEqual(['HYPERLIQUID', 'UNISWAP']);
    const hub = read('components/exchanges/ExchangeHub.tsx');
    expect(hub).toMatch(/data-testid="hub-connect-selector"/);
    expect(hub).toMatch(/aria-modal="true"/);
    expect(hub).toMatch(/\(\['CEX', 'DEX'\] as const\)/);
  });
});

describe('Ligação (17–20)', () => {
  const hub = read('components/exchanges/ExchangeHub.tsx');

  it('17 · CEX usa credenciais API só no formulário, depois de "Conectar" (nunca na listagem)', () => {
    expect(hub).toMatch(/const hasForm = v\.type === 'CEX' && v\.connection\.fields\.length > 0/);
    expect(hub).toMatch(/\{step === 'connect' && hasForm && \(/);
    expect(hub.slice(hub.indexOf('function VenueCard'), hub.indexOf('function Details'))).not.toMatch(/binanceConnect/);
    expect(read('pages/ExchangesPage.tsx')).toMatch(/Testar conexão/);
  });

  it('18 · DEX usa carteira: botão desativado, sem campos', () => {
    const dexBlock = hub.slice(hub.indexOf("v.type === 'DEX' && ("), hub.indexOf("v.type === 'CEX' && v.action === 'LEARN'"));
    expect(dexBlock).not.toMatch(/<input|<textarea/);
    expect(dexBlock).toMatch(/<button type="button" disabled/);
  });

  it('19 · nunca pede chave privada nem seed phrase', () => {
    expect(hub).not.toMatch(/<input|<textarea/);
    for (const [rel, src] of sources()) expect(src, rel).not.toMatch(/placeholder="[^"]*(seed|private key|chave privada)/i);
  });

  it('20 · sem segredos nos tipos; chave só mascarada', () => {
    const types = walk(path.join(root, 'types')).map((p) => fs.readFileSync(p, 'utf8')).join('\n');
    expect(types).not.toMatch(/secret|apiKey\b|privateKey|seed/i);
    expect(read('hooks/useExchange.ts')).toMatch(/apiKeyMasked\?: string/);
    expect(read('components/spot/SpotPilotAdminPanel.tsx')).not.toMatch(/secret|apiKey|signature/i);
  });
});

describe('Execução (21–24)', () => {
  it('21 · UI nunca chama endpoints de ordem (Binance direto ou API de ordens)', () => {
    const offenders = sources()
      .filter(([, src]) => /\/api\/v3\/(order|account|myTrades|openOrders)|\/fapi\/v\d\/(order|account|positionRisk)|X-MBX-APIKEY|signature=/.test(src))
      .map(([rel]) => rel);
    expect(offenders).toEqual([]);
    const writes = sources().flatMap(([rel, src]) => [...src.matchAll(/api\.(post|put|patch)\(\s*[`'"]([^`'"]+)/g)].map((m) => `${rel} ${m[2]}`));
    expect(writes.filter((w) => /order|execute|spot-bots/i.test(w))).toEqual([]);
  });

  it('22/23 · contextos Paper e REAL não se cruzam na UI: Spot REAL sem Paper; Paper só no Strategy Lab/admin', () => {
    expect(read('pages/SpotPage.tsx')).not.toMatch(/spot-paper|paperPnl|paperScope|SpotPaperPage/);
    expect(read('pages/DashboardPage.tsx')).not.toMatch(/spot-paper/);
    expect(read('pages/SpotPaperPage.tsx')).not.toMatch(/\/spot\/coins|\/spot-pilot/);
  });

  it('24 · LIVE continua desligado: nenhum botão para ligar LIVE', () => {
    for (const [rel, src] of sources()) expect(src, rel).not.toMatch(/enable.?live|ativar live|ligar live/i);
  });
});

describe('PRO / estados vazios', () => {
  it('PRO Intelligence: só conceitos, sem promessas de retorno', () => {
    const pro = read('components/pro/ProIntelligencePreview.tsx');
    for (const c of ['Early Momentum', 'Launch Radar', 'Volume Surge', 'Liquidity Change', 'New Listing', 'Smart Wallet Activity', 'Security Alert']) expect(pro).toContain(c);
    expect(pro).not.toMatch(/300%|lucro garantido|ganha|captura \d+/i);
    expect(pro).not.toMatch(/api\.(get|post)/);
  });

  it('estados vazios de produto com os textos exatos; nunca "Não disponível" genérico, undefined/NaN', () => {
    const pages = ['pages/DashboardPage.tsx', 'pages/SpotPage.tsx', 'pages/FuturesPage.tsx', 'components/spot/SpotCoinRow.tsx'].map(read).join('\n');
    const states = read('utils/dataStates.ts');
    for (const t of [
      'Conecte uma exchange para continuar.',
      '$0.00 USDT',
      'Não foi possível atualizar os dados.',
      'Sem oportunidade elegível no momento.',
      'Dados em atualização.',
      'Sem posição aberta.',
      'Não foi possível atualizar o saldo.',
      'Dados desatualizados.',
      'Trading Spot desativado.',
      'Trading Spot disponível.',
      'Mercado em atualização',
      'Adicione uma moeda para começar.',
      'Nenhuma moeda encontrada.',
    ]) {
      expect(states).toContain(t);
    }
    for (const k of ['EMPTY_TEXT.CONNECT', 'EMPTY_TEXT.NO_POSITION', 'EMPTY_TEXT.DATA_ERROR', 'EMPTY_TEXT.NO_OPPORTUNITY', 'balanceText(']) expect(pages).toContain(k);
    expect(pages + read('utils/spotView.ts')).not.toMatch(/Não disponível|Saldo indisponível|Dados indisponíveis|Nenhuma exchange conectada/);
    expect(pages).not.toMatch(/>undefined<|>NaN<|-\$0\.00/);
  });
});
