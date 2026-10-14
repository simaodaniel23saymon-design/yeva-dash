import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OwnerPilotAccount from '../components/spot/pilot/OwnerPilotAccount';
import {
  EMPTY_POSITIONS_TEXT,
  historyLine,
  ownerActionError,
  ownerActions,
  ownerReasonText,
  ownerStatusView,
  type OwnerAccountSummary,
  type OwnerControl,
  type OwnerPlatform,
  type PilotOverview,
} from './spotPilotOwner';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

const ACCT = 'acct-0001-aaaa-bbbb';
const NOW_ISO = '2026-10-14T10:00:00.000Z';

const control = (state: OwnerControl['state'], authorized: boolean): OwnerControl => ({
  state,
  updatedAt: NOW_ISO,
  reason: null,
  autoExecution: authorized ? { authorizedAt: NOW_ISO, maxNotionalQuote: 6 } : null,
  autoExecutionReasons: authorized ? [] : ['AUTO_EXECUTION_NOT_AUTHORIZED'],
});

const platform = (over: Partial<OwnerPlatform> = {}): OwnerPlatform => ({ available: true, blockers: [], entriesEnabled: true, loopRunning: true, maxNotionalPerOrder: 6, ...over });

function summary(state: OwnerControl['state'], authorized: boolean, display: OwnerAccountSummary['display']['state'], over: Partial<OwnerAccountSummary> = {}): OwnerAccountSummary {
  return {
    id: ACCT,
    exchange: 'BINANCE',
    market: 'SPOT',
    accountType: 'REAL',
    isActive: true,
    connectionStatus: 'CONNECTED',
    eligibilityReasons: [],
    control: control(state, authorized),
    display: { state: display, reasons: [] },
    engine: null,
    ...over,
  };
}

function overview(over: Partial<PilotOverview> = {}): PilotOverview {
  const s = summary('ACTIVE', true, 'ACTIVE');
  return {
    account: { id: ACCT, exchange: 'BINANCE', market: 'SPOT', accountType: 'REAL', isActive: true, connectionStatus: 'CONNECTED', eligibilityReasons: [] },
    control: s.control,
    display: s.display,
    engine: { state: 'NO_SIGNAL', reasons: [], lastTickAt: NOW_ISO, reconciledSinceBoot: true, consecutiveErrors: 0 },
    platform: platform(),
    limits: { maxNotionalPerOrder: 6, maxOpenExposure: 6, maxBuyOrdersPer24h: 6, buyOrdersLast24h: 1, maxPositions: 1, stopLossPct: 3, takeProfitPct: 5 },
    balance: { status: 'OK', usdtAvailable: 20.5, usdtLocked: 0, fetchedAt: NOW_ISO },
    exposure: { investedQuote: 0, openPositions: 0 },
    pnl: { realizedQuote: 0.12, unrealizedQuote: 0, totalQuote: 0.12, partial: false },
    positions: [],
    uncertainOrders: 0,
    pendingOrders: 0,
    history: [],
    authorizationEvents: [{ action: 'ACTIVATE', fromState: null, toState: 'ACTIVE', maxNotional: 6, at: NOW_ISO }],
    fetchedAt: NOW_ISO,
    ...over,
  };
}

const render = (s: OwnerAccountSummary, o: PilotOverview | null) =>
  renderToStaticMarkup(
    createElement(OwnerPilotAccount, {
      index: 0,
      summary: s,
      overview: o,
      overviewError: null,
      platform: platform(),
      policy: null,
      busy: false,
      message: null,
      onActivate: () => {},
      onPause: () => {},
      onResume: () => {},
      onDeactivate: () => {},
    })
  );

describe('Spot Pilot do utilizador · estado mostrado', () => {
  it('estados do servidor em português, sem "ativo" quando a plataforma pausa as entradas', () => {
    expect(ownerStatusView({ state: 'ACTIVE', reasons: [] }, { entriesEnabled: true }).label).toBe('Ativo');
    expect(ownerStatusView({ state: 'ACTIVE', reasons: [] }, { entriesEnabled: false }).label).toMatch(/entradas pausadas/);
    expect(ownerStatusView({ state: 'PAUSED', reasons: ['PILOT_PAUSED'] }, null).label).toBe('Em pausa');
    expect(ownerStatusView({ state: 'STARTING', reasons: [] }, null).label).toBe('A iniciar');
    const blocked = ownerStatusView({ state: 'BLOCKED', reasons: ['ENGINE_NOT_RUNNING'] }, null);
    expect(blocked).toMatchObject({ label: 'Bloqueado', tone: 'bad' });
    expect(blocked.notes).toEqual(['O motor do piloto não está a correr no servidor.']);
    expect(ownerStatusView({ state: 'INACTIVE', reasons: ['AUTO_EXECUTION_NOT_AUTHORIZED'] }, null)).toMatchObject({ label: 'Inativo', notes: [] });
    expect(ownerStatusView(null, null).label).toBe('A carregar');
  });

  it('motivos com prefixo PLATFORM_ e desconhecidos dão frases claras, sem repetidos', () => {
    expect(ownerReasonText(['PLATFORM_KILL_SWITCH_ACTIVE'])).toEqual(['A paragem de emergência geral está ligada no servidor.']);
    expect(ownerReasonText(['XYZ', 'ABC'])).toHaveLength(1);
  });
});

describe('Spot Pilot do utilizador · botões', () => {
  it('inativo e elegível ⇒ só "Ativar"; conta não elegível ⇒ ativar desativado com o motivo', () => {
    const a = ownerActions(summary('DISABLED', false, 'INACTIVE'), platform(), false);
    expect(a).toMatchObject({ activate: { visible: true, enabled: true }, pause: false, resume: false, deactivate: false });
    const b = ownerActions(summary('DISABLED', false, 'INACTIVE', { eligibilityReasons: ['ACCOUNT_MARKET_NOT_SPOT'] }), platform(), false);
    expect(b.activate).toMatchObject({ visible: true, enabled: false });
    expect(b.activate.notes).toContain('Esta ligação não é de Spot. O piloto só opera em Spot.');
  });

  it('ativo ⇒ pausar e desativar; em pausa ⇒ retomar e desativar; modo antigo ARMED ⇒ ativar novamente', () => {
    expect(ownerActions(summary('ACTIVE', true, 'ACTIVE'), platform(), false)).toMatchObject({ activate: { visible: false }, pause: true, resume: false, deactivate: true });
    expect(ownerActions(summary('PAUSED', true, 'PAUSED'), platform(), false)).toMatchObject({ activate: { visible: false }, pause: false, resume: true, deactivate: true });
    expect(ownerActions(summary('ARMED', false, 'INACTIVE'), platform(), false)).toMatchObject({ activate: { visible: true, enabled: true }, deactivate: true });
  });

  it('plataforma indisponível ou pedido em curso ⇒ nada ativável', () => {
    expect(ownerActions(summary('DISABLED', false, 'INACTIVE'), platform({ available: false, blockers: ['KILL_SWITCH_ACTIVE'] }), false).activate.enabled).toBe(false);
    expect(ownerActions(summary('ACTIVE', true, 'ACTIVE'), platform(), true)).toMatchObject({ pause: false, deactivate: false });
  });

  it('erros das ações: TOTP, pré-condições e sem resposta', () => {
    const http = (status: number, data: unknown) => Object.assign(new Error('x'), { response: { status, data } });
    expect(ownerActionError(http(401, { error: 'TOTP_REPLAYED' }))).toMatchObject({ code: 'TOTP_REPLAYED', message: 'Este código já foi usado. Aguarda o próximo código.' });
    const pre = ownerActionError(http(409, { error: 'ACTIVATION_PRECONDITIONS_FAILED', reasons: ['READ_CHECK_FAILED', 'KEY_HAS_WITHDRAWALS'] }));
    expect(pre.notes).toContain('A tua chave da Binance permite levantamentos. Por segurança, o piloto não a aceita.');
    expect(ownerActionError(new Error('net')).message).toMatch(/servidor/);
  });
});

describe('Spot Pilot do utilizador · cartões e histórico', () => {
  it('ativo sem posições ⇒ "À procura de oportunidades válidas."; saldo, PnL e limite visíveis', () => {
    const html = render(summary('ACTIVE', true, 'ACTIVE'), overview());
    expect(html).toContain(EMPTY_POSITIONS_TEXT);
    expect(html).toContain('20.50 USDT');
    expect(html).toContain('+0.12 USDT');
    expect(html).toContain('6.00 USDT');
    expect(html).toContain('Pausar novas compras');
    expect(html).toContain('Desativar');
    expect(html).not.toContain('Ativar piloto automático');
    expect(html).not.toMatch(/aprova(r|ção) (cada|esta) compra/i);
  });

  it('cartão de posição: investido, valor atual, PnL, entrada, SL/TP; preço indisponível nunca inventado', () => {
    const pos = {
      symbol: 'SOLUSDT', status: 'OPEN' as const, quantity: 0.04, averageEntryPrice: 150, currentPrice: 153, priceStatus: 'LIVE' as const, investedQuote: 6, currentValueQuote: 6.12,
      changePct: 2, unrealizedPnlQuote: 0.12, realizedPnlQuote: 0, feesNotIncluded: false, stopLossPrice: 145.5, takeProfitPrice: 157.5, openedAt: NOW_ISO, lastFillAt: NOW_ISO,
      updatedAt: NOW_ISO, managedByStrategy: true,
    };
    const html = render(summary('ACTIVE', true, 'ACTIVE'), overview({ positions: [pos], exposure: { investedQuote: 6, openPositions: 1 } }));
    expect(html).toContain('SOLUSDT');
    expect(html).toContain('+2.00%');
    expect(html).toContain('6.12 USDT');
    expect(html).toContain('145.50');
    expect(html).toContain('157.50');
    expect(html).not.toContain(EMPTY_POSITIONS_TEXT);
    const noPrice = render(summary('ACTIVE', true, 'ACTIVE'), overview({ positions: [{ ...pos, priceStatus: 'UNAVAILABLE', currentPrice: null, currentValueQuote: null, changePct: null, unrealizedPnlQuote: null }] }));
    expect(noPrice).toContain('Preço indisponível');
  });

  it('inativo ⇒ botão "Ativar" e sem texto de procura', () => {
    const html = render(summary('DISABLED', false, 'INACTIVE'), overview({ control: control('DISABLED', false), display: { state: 'INACTIVE', reasons: ['AUTO_EXECUTION_NOT_AUTHORIZED'] } }));
    expect(html).toContain('Ativar piloto automático');
    expect(html).not.toContain(EMPTY_POSITIONS_TEXT);
    expect(html).toContain('Inativo');
  });

  it('histórico: enviada ≠ executada', () => {
    const sent = historyLine({ at: NOW_ISO, side: 'BUY', symbol: 'BTCUSDT', state: 'SUBMITTED', executed: false, estimatedQuote: 6, executedQuantity: null, executedQuote: null, averagePrice: null, reason: '' });
    expect(sent.state).toBe('Enviada — execução por confirmar');
    expect(sent.value).toContain('estimado');
    const done = historyLine({ at: NOW_ISO, side: 'SELL', symbol: 'BTCUSDT', state: 'SETTLED', executed: true, estimatedQuote: 6, executedQuantity: 0.0001, executedQuote: 6.1, averagePrice: 61000, reason: '' });
    expect(done).toMatchObject({ title: 'Venda BTCUSDT', state: 'Executada', tone: 'ok' });
  });
});

describe('página Spot Pilot — fontes', () => {
  const page = read('pages/SpotPilotPage.tsx');
  const card = read('components/spot/pilot/OwnerPilotAccount.tsx');
  const panel = read('components/spot/SpotPilotAdminPanel.tsx');

  it('só usa endpoints do dono (/me, overview, activate/pause/resume/deactivate); nunca envia userId', () => {
    const urls = [...page.matchAll(/api\.(get|post)<?[^(]*\(\s*[`']([^`']+)[`']/g)].map((m) => m[2]);
    expect(urls).toEqual(
      expect.arrayContaining(['/spot-pilot/me', '/spot-pilot/accounts/${a.id}/overview', '/spot-pilot/accounts/${accountId}/activate', '/spot-pilot/accounts/${id}/pause', '/spot-pilot/accounts/${id}/resume', '/spot-pilot/accounts/${id}/deactivate'])
    );
    for (const u of urls) expect(u.startsWith('/spot-pilot/')).toBe(true);
    expect(page).not.toMatch(/userId/);
    expect(page).not.toMatch(/\/approve|\/state`|strategy\/entries/);
  });

  it('ativar: confirmação dos riscos + TOTP num único pedido sem repetição automática; pausar/retomar/desativar sem TOTP', () => {
    expect(page).toMatch(/\{ acknowledgeRisk: true, totpCode: code \}, \{ skipAuthRetry: true \}/);
    expect(page).toMatch(/disabled=\{busy \|\| !ack \|\| !twoFactorReady \|\| totp\.length !== TOTP_LENGTH\}/);
    expect(page).toMatch(/setTotp\(''\);\s*setDialogError\(null\);\s*busyRef\.current = true;/);
    expect(page).toMatch(/api\.post\(`\/spot-pilot\/accounts\/\$\{id\}\/pause`\)/);
    expect(page).toMatch(/api\.post\(`\/spot-pilot\/accounts\/\$\{id\}\/deactivate`\)/);
  });

  it('o estado é relido do servidor depois de cada ação; o carregamento só lê', () => {
    const run = page.slice(page.indexOf('async function run'), page.indexOf('const openDialog'));
    expect(run).toMatch(/finally \{\s*await refresh\(\);/);
    const refresh = page.slice(page.indexOf('const refresh = useCallback'), page.indexOf('useEffect(() => {'));
    expect(refresh).not.toMatch(/api\.post/);
  });

  it('códigos e segredos nunca registados nem persistidos; sem promessas de proteção absoluta', () => {
    for (const src of [page, card, panel]) {
      expect(src).not.toMatch(/console\.|localStorage|sessionStorage/);
      expect(src).not.toMatch(/apiKey|secret|signature|keyFingerprint/i);
      expect(src).not.toMatch(/proteção (total|absoluta|garantida)|sem risco|lucro garantido/i);
    }
  });

  it('painel de administração só usa as rotas de plataforma (sem dados de contas de terceiros)', () => {
    const urls = [...panel.matchAll(/api\.(get|post)<?[^(]*\(\s*[`']([^`']+)[`']/g)].map((m) => m[2]);
    expect(urls.sort()).toEqual(['/spot-pilot/platform/entries', '/spot-pilot/platform/status']);
    expect(panel).toMatch(/enabled \? \{ enabled, totpCode: code \} : \{ enabled \}/);
  });
});
