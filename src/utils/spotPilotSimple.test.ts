import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PilotAccountCard, { type PilotAccountActions, type PilotCardMessage } from '../components/spot/pilot/PilotAccountCard';
import {
  accountHeadline,
  accountSummary,
  emptyAccountData,
  loadPilotOverview,
  NO_OPPORTUNITY_TEXT,
  OPPORTUNITY_FOUND_TEXT,
  opportunityView,
  pendingPurchases,
  plainReasons,
  riskRules,
  safetyControls,
  searchAction,
  wizardSteps,
  type PilotAccountData,
  type PilotGet,
  type PilotReadinessFull,
  type ViewInput,
} from './spotPilotSimple';
import { operationalAccounts, type PilotAccountDetail, type PilotControlState, type PilotIntent, type PilotStatusResponse, type StrategyStatus } from './spotPilotView';

const FOUNDER = '9d6b3fe3-3630-4161-9551-a69ed3359917';
const CLAUDIO = '59ac3737-4bbb-48e8-8b92-fa74d67a95e8';
const THIRD = 'fdc34633-0000-4000-8000-000000000000';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const MIN = 60_000;

/** Nenhum código interno (MAIÚSCULAS_COM_SUBLINHADO) em texto destinado ao utilizador. */
const CODE = /\b[A-Z][A-Z0-9]+_[A-Z0-9_]+\b/;

const control = (id: string, state: PilotControlState) => ({ exchangeAccountId: id, state, reason: null, updatedBy: null, updatedAt: iso(60 * MIN) });

const safety = {
  spotLiveEnabled: true,
  spotKillSwitch: false,
  cexLiveWriteEnabledInBuild: true,
  realSpotPilotEnabled: true,
  realSpotPilotMaxNotional: 6,
  realSpotPilotMaxNotionalCap: 50,
  realSpotPilotAccountIds: [FOUNDER, CLAUDIO],
  blockers: [],
};

const status = (states: Record<string, PilotControlState> = {}): PilotStatusResponse => ({
  safety,
  executorWired: true,
  accounts: [FOUNDER, CLAUDIO, THIRD].map((id) => ({ id, userId: `u-${id.slice(0, 4)}`, isActive: true, control: control(id, states[id] ?? 'DISABLED') })),
});

const policy = { maxPositions: 1, maxEntriesPerCycle: 1, takeProfitPct: 4, stopLossPct: 2, trailingActivatePct: 2, trailingGivebackPct: 1, momentumExitScoreDrop: 20 };

const strategy = (over: Partial<StrategyStatus> = {}): StrategyStatus => ({
  loopRunning: true,
  entriesEnabled: false,
  strategyAccountIds: [FOUNDER, CLAUDIO],
  blockers: [],
  policy,
  accounts: [],
  ...over,
});

type DetailOpts = { state?: PilotControlState; read?: boolean | null; readAgo?: number; readReasons?: string[]; reconcile?: boolean | null; reconcileAgo?: number; intents?: PilotIntent[] };

const detail = (id: string, o: DetailOpts = {}): PilotAccountDetail => ({
  safety: { ...safety, intentMaxAgeMs: 10 * MIN, approvalTtlMs: 5 * MIN },
  control: control(id, o.state ?? 'DISABLED'),
  activationChecks: {
    readCheck: o.read == null ? null : { at: iso(o.readAgo ?? 5 * MIN), ok: o.read, reasons: o.readReasons ?? [], by: 'admin' },
    reconcile: o.reconcile == null ? null : { at: iso(o.reconcileAgo ?? 4 * MIN), ok: o.reconcile, reasons: o.reconcile ? [] : ['BALANCE_MISMATCH'], by: 'admin' },
  },
  activationCheckMaxAgeMs: 30 * MIN,
  decisions: [],
  intents: o.intents ?? [],
  mismatches: [],
});

const readiness = (id: string, over: Partial<PilotReadinessFull> = {}): PilotReadinessFull => ({
  accountId: id,
  userIdMasked: null,
  exchange: 'BINANCE',
  market: 'SPOT',
  controlState: 'DISABLED',
  pilotAccount: { configured: true, matches: true },
  readiness: 'READY',
  blockers: [],
  safety: { gates: [], realSpotPilotMaxNotional: 6 },
  executionContext: { executionContext: 'REAL', market: 'SPOT', exchange: 'BINANCE', accountId: id, paperAllowed: false },
  spotBalance: { state: 'CONNECTED', usdtFree: id === FOUNDER ? 50.72 : 21.81, usdtLocked: 0, futuresBalanceUsed: false },
  availableSpotBalanceUsdt: id === FOUNDER ? 50.72 : 21.81,
  entryPlan: { state: 'NO_VALID_ENTRY', symbol: null, quantity: null, budgetQuote: 5.94, selectionReasons: [], checks: [] },
  ...over,
});

const pendingBuy = (key = 'k-1', ageMs = 2 * MIN): PilotIntent => ({
  idempotencyKey: key,
  intentId: `i-${key}`,
  symbol: 'SOLUSDT',
  side: 'BUY',
  quantity: 0.039,
  notional: 5.85,
  state: 'PENDING',
  createdAt: iso(ageMs),
});

function account(id: string, o: DetailOpts & { readiness?: PilotReadinessFull | null; readinessAgo?: number } = {}): PilotAccountData {
  const s = status();
  const base = emptyAccountData(s.accounts.find((a) => a.id === id)!);
  const r = o.readiness === undefined ? readiness(id) : o.readiness;
  return {
    ...base,
    account: { ...base.account, control: control(id, o.state ?? 'DISABLED') },
    detail: detail(id, o),
    history: {
      control: control(id, o.state ?? 'DISABLED'),
      decisions: (o.intents ?? []).map((x) => ({ id: `d-${x.idempotencyKey}`, createdAt: x.createdAt, symbol: x.symbol, side: x.side, notional: String(x.notional), decision: 'ALLOW', reasons: [], reason: 'STRATEGY_OPEN score=72', idempotencyKey: x.idempotencyKey })),
      approvals: [],
    },
    readiness: r,
    readinessAtMs: r ? NOW - (o.readinessAgo ?? 3 * MIN) : null,
  };
}

const view = (data: PilotAccountData, strat: StrategyStatus | null = strategy(), busy = false): ViewInput => ({ data, safety, strategy: strat, nowMs: NOW, busy });

const READY = { read: true, reconcile: true } as const;

describe('assistente de ativação em três passos', () => {
  it('conta nova: só o passo 1 está disponível; nada corre sozinho', () => {
    const [v, c, a] = wizardSteps(view(account(FOUNDER, { readiness: null })));
    expect([v.title, v.button, v.status, v.enabled]).toEqual(['Verificar a conta', 'Verificar a minha conta', 'todo', true]);
    expect([c.title, c.button, c.status, c.enabled]).toEqual(['Confirmar a conta', 'Confirmar a minha conta', 'locked', false]);
    expect([a.title, a.button, a.enabled]).toEqual(['Ativar o piloto', 'Ativar o meu bot', false]);
    expect(a.notes.join(' ')).toMatch(/passo 1/);
    expect(accountHeadline(view(account(FOUNDER, { readiness: null }))).title).toBe('A preparar');
  });

  it('depois da verificação, o passo 2 fica disponível', () => {
    const [v, c, a] = wizardSteps(view(account(FOUNDER, { read: true })));
    expect(v.status).toBe('done');
    expect(c.enabled).toBe(true);
    expect(a.enabled).toBe(false);
    expect(a.notes.join(' ')).toMatch(/passo 2/);
  });

  it('verificação e confirmação recentes e sem bloqueios: pronto para ativar', () => {
    const i = view(account(FOUNDER, READY));
    const [, , a] = wizardSteps(i);
    expect(a.enabled).toBe(true);
    expect(a.status).toBe('todo');
    expect(accountHeadline(i).title).toBe('Pronto para ativar');
  });

  it('erro na verificação: passo 1 falha com frase clara, sem códigos', () => {
    const i = view(account(FOUNDER, { read: false, readReasons: ['KEY_HAS_FUTURES'] }));
    const [v, c, a] = wizardSteps(i);
    expect(v.status).toBe('failed');
    expect(v.notes).toContain('A tua chave da Binance tem Futures ligado. O piloto só aceita chaves apenas com Spot.');
    expect(c.enabled).toBe(false);
    expect(a.enabled).toBe(false);
    const h = accountHeadline(i);
    expect(h.title).toBe('Existe algo que precisa da tua atenção');
    for (const t of [...v.notes, h.subtitle, ...h.attention]) expect(t).not.toMatch(CODE);
  });

  it('erro na confirmação: passo 2 falha e ativar fica bloqueado', () => {
    const [, c, a] = wizardSteps(view(account(FOUNDER, { read: true, reconcile: false })));
    expect(c.status).toBe('failed');
    expect(c.notes.join(' ')).toMatch(/não coincide/);
    expect(a.enabled).toBe(false);
  });

  it('verificações expiradas impedem a ativação', () => {
    const [v, , a] = wizardSteps(view(account(FOUNDER, { read: true, readAgo: 31 * MIN, reconcile: true })));
    expect(v.status).toBe('expired');
    expect(a.enabled).toBe(false);
    expect(a.notes.join(' ')).toMatch(/expirou/);
  });

  it('bloqueios do servidor impedem ativar; códigos desconhecidos viram frase genérica', () => {
    const r = readiness(FOUNDER, { readiness: 'NOT_READY', blockers: ['STRATEGY_FEE_RATE_UNKNOWN', 'SOMETHING_NEW'] });
    const [, , a] = wizardSteps(view(account(FOUNDER, { ...READY, readiness: r })));
    expect(a.enabled).toBe(false);
    expect(a.status).toBe('failed');
    expect(a.notes).toContain('Não conseguimos confirmar a comissão da tua conta Binance.');
    expect(a.notes.some((n) => /Detalhes técnicos/.test(n))).toBe(true);
    for (const n of a.notes) expect(n).not.toMatch(CODE);
  });

  it('verificação de segurança anterior à confirmação fica desatualizada', () => {
    const [, , a] = wizardSteps(view(account(FOUNDER, { ...READY, reconcileAgo: 1 * MIN, readinessAgo: 2 * MIN })));
    expect(a.enabled).toBe(false);
    expect(a.notes.join(' ')).toMatch(/Verificar outra vez/);
  });

  it('com uma operação em curso, nenhum botão fica ativo', () => {
    const steps = wizardSteps(view(account(FOUNDER, READY), strategy(), true));
    expect(steps.every((s) => !s.enabled)).toBe(true);
  });
});

describe('estados em português claro', () => {
  it('«Bot ativo» só com a conta realmente armada, nunca só pelas flags de produção', () => {
    const disabled = view(account(FOUNDER, READY), strategy({ entriesEnabled: true }));
    expect(accountHeadline(disabled).title).not.toBe('Bot ativo');
    const armed = view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy({ entriesEnabled: false }));
    expect(accountHeadline(armed)).toMatchObject({ title: 'Bot ativo', subtitle: expect.stringMatching(/Entradas pausadas/) });
    const searching = view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy({ entriesEnabled: true }));
    expect(accountHeadline(searching).subtitle).toBe('A procurar oportunidades.');
  });

  it('resumo: ligação, saldo, limite, estado do bot, entradas e última atualização', () => {
    const rows = accountSummary(view(account(FOUNDER, READY)), new Date(NOW).toISOString());
    const m = Object.fromEntries(rows.map((r) => [r.label, r.value]));
    expect(m['Ligação à Binance']).toBe('Conta ligada');
    expect(m['Saldo disponível (USDT)']).toBe('50.72 USDT');
    expect(m['Limite por conta']).toBe('6.00 USDT');
    expect(m['Estado do bot']).toBe('Desligado');
    expect(m['Entradas']).toBe('Entradas pausadas');
    expect(m['Última atualização']).not.toBe('—');
  });

  it('sem leitura do servidor, a vista não inventa ligação nem saldo', () => {
    const data = { ...account(FOUNDER, { readiness: null }), readinessError: 'Não conseguimos confirmar se está tudo pronto. Tenta outra vez.' };
    const m = Object.fromEntries(accountSummary(view(data), null).map((r) => [r.label, r.value]));
    expect(m['Ligação à Binance']).toBe('Não foi possível confirmar');
    expect(m['Saldo disponível (USDT)']).toBe('—');
  });

  it('plainReasons remove repetidos e nunca devolve códigos', () => {
    const out = plainReasons(['KEY_HAS_UNIVERSAL_TRANSFER', 'KEY_HAS_INTERNAL_TRANSFER', 'BTCUSDT:SYMBOL_NOT_TRADING']);
    expect(out).toHaveLength(2);
    for (const t of out) expect(t).not.toMatch(CODE);
  });
});

describe('procurar oportunidades (separado de ativar)', () => {
  it('só aparece depois de ativar e só fica disponível com as entradas desligadas', () => {
    expect(searchAction(view(account(FOUNDER, READY))).visible).toBe(false);
    const off = searchAction(view(account(FOUNDER, { ...READY, state: 'ARMED' })));
    expect(off).toMatchObject({ visible: true, on: false, enabled: true });
    const on = searchAction(view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy({ entriesEnabled: true })));
    expect(on).toMatchObject({ on: true, enabled: false });
  });

  it('conta fora da estratégia ou bloqueio global: não deixa começar', () => {
    const notStrategy = searchAction(view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy({ strategyAccountIds: [CLAUDIO] })));
    expect(notStrategy.enabled).toBe(false);
    const killed = searchAction(view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy({ blockers: ['KILL_SWITCH_ACTIVE'] })));
    expect(killed.enabled).toBe(false);
    expect(killed.notes).toContain('A paragem de emergência geral está ligada no servidor.');
  });
});

describe('oportunidades de mercado', () => {
  const checks = [
    { symbol: 'BTCUSDT', ok: false, reason: 'ROUNDED_QTY_BELOW_MIN', detail: 'x', quantity: null, entryNotional: null, exitAdverseNotional: null, requiredNotional: null },
    { symbol: 'ETHUSDT', ok: false, reason: 'EXIT_NOTIONAL_BELOW_MIN', detail: 'y', quantity: null, entryNotional: null, exitAdverseNotional: null, requiredNotional: null },
  ];

  it('sem oportunidade válida: mensagem pedida e moedas analisadas pela ordem do ranking', () => {
    const sa = { accountId: FOUNDER, state: 'NO_SIGNAL', reasons: [], position: null, lastAction: null, consecutiveErrors: 0, lastTickAt: iso(MIN), entryChecks: checks };
    const o = opportunityView(view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy({ entriesEnabled: true, accounts: [sa] })));
    expect(o.kind).toBe('NONE');
    expect(o.message).toBe(NO_OPPORTUNITY_TEXT);
    expect(o.symbol).toBeNull();
    expect(o.candidatesSource).toBe('BOT');
    expect(o.candidates.map((c) => c.symbol)).toEqual(['BTCUSDT', 'ETHUSDT']);
    for (const c of o.candidates) {
      expect(c.ok).toBe(false);
      expect(c.text).not.toMatch(CODE);
    }
  });

  it('oportunidade válida antes de ativar: pré-visualização, sem proposta', () => {
    const plan = {
      state: 'VALID_ENTRY',
      symbol: 'SOLUSDT',
      quantity: 0.039,
      budgetQuote: 5.94,
      selectionReasons: [],
      checks: [checks[0], { symbol: 'SOLUSDT', ok: true, reason: null, detail: null, quantity: '0.039', entryNotional: '5.85', exitAdverseNotional: '5.36', requiredNotional: '5.1' }],
    };
    const o = opportunityView(view(account(FOUNDER, { ...READY, readiness: readiness(FOUNDER, { entryPlan: plan }) })));
    expect(o.kind).toBe('PREVIEW_VALID');
    expect(o.symbol).toBe('SOLUSDT');
    expect(o.valueUsdt).toBe(5.85);
    expect(o.message).toMatch(/só propõe compras depois de ativado/);
    expect(o.proposalState).toBeNull();
    expect(o.candidates.find((c) => c.chosen)?.symbol).toBe('SOLUSDT');
  });

  it('proposta pendente: oportunidade encontrada, mas nada enviado nem executado', () => {
    const i = view(account(FOUNDER, { ...READY, state: 'ARMED', intents: [pendingBuy()] }), strategy({ entriesEnabled: true }));
    const o = opportunityView(i);
    expect(o.kind).toBe('PROPOSED');
    expect(o.message).toBe(OPPORTUNITY_FOUND_TEXT);
    expect(o.symbol).toBe('SOLUSDT');
    expect(o.valueUsdt).toBe(5.85);
    expect(o.reason).toMatch(/pontuação 72/);
    expect(o.proposalState).toMatch(/ainda não enviada/);
    expect(o.proposalState).not.toMatch(/^Executada/);
    expect(o.approvalState).toBe('Ainda não aprovada.');
    expect(accountHeadline(i).title).toBe('À espera da tua aprovação');
  });

  it('compras pendentes: aprovar só com o bot ativo e dentro da validade; rejeitar sempre', () => {
    const armed = pendingPurchases(view(account(FOUNDER, { ...READY, state: 'ARMED', intents: [pendingBuy('a'), pendingBuy('b', 11 * MIN)] })));
    expect(armed.map((p) => [p.idempotencyKey, p.canApprove, p.canReject, p.expired])).toEqual([
      ['a', true, true, false],
      ['b', false, true, true],
    ]);
    const paused = pendingPurchases(view(account(FOUNDER, { ...READY, state: 'PAUSED', intents: [pendingBuy('a')] })));
    expect(paused[0].canApprove).toBe(false);
  });

  it('ordem enviada sem confirmação não é apresentada como executada', () => {
    const o = opportunityView(view(account(FOUNDER, { ...READY, state: 'ARMED', intents: [{ ...pendingBuy(), state: 'SUBMITTED' }] })));
    expect(o.kind).toBe('SENT');
    expect(o.message).toMatch(/Ainda não há confirmação/);
  });

  it('regras de risco não prometem proteção absoluta', () => {
    const rules = riskRules(strategy(), safety).join(' ');
    expect(rules).toMatch(/não há ordem de proteção colocada na Binance/);
    expect(rules).toMatch(/slippage/);
    expect(rules).not.toMatch(/proteção (total|absoluta|garantida)/i);
  });
});

describe('duas contas independentes; terceira excluída', () => {
  it('só as contas da allowlist do servidor, pela ordem dela', () => {
    expect(operationalAccounts(status()).map((a) => a.id)).toEqual([FOUNDER, CLAUDIO]);
  });

  it('carregamento só faz GET às duas contas autorizadas; a terceira nunca é pedida', async () => {
    const calls: string[] = [];
    const get: PilotGet = async <T,>(url: string) => {
      calls.push(url);
      if (url === '/spot-pilot/status') return { data: status() as T };
      if (url === '/spot-pilot/strategy/status') return { data: strategy() as T };
      if (url.endsWith('/history')) return { data: { control: control(FOUNDER, 'DISABLED'), decisions: [], approvals: [] } as T };
      return { data: detail(url.split('/')[3]) as T };
    };
    const o = await loadPilotOverview(get);
    expect(o.accounts.map((a) => a.account.id)).toEqual([FOUNDER, CLAUDIO]);
    expect(calls.some((u) => u.includes(THIRD))).toBe(false);
    expect(calls.every((u) => u.startsWith('/spot-pilot/'))).toBe(true);
    expect(calls.some((u) => /read-check|reconcile|\/state|\/approve|\/reject|\/entries/.test(u))).toBe(false);
  });

  it('erro numa conta não afeta a outra', async () => {
    const get: PilotGet = async <T,>(url: string) => {
      if (url === '/spot-pilot/status') return { data: status() as T };
      if (url === '/spot-pilot/strategy/status') return { data: strategy() as T };
      if (url.includes(CLAUDIO)) throw new Error('falha');
      if (url.endsWith('/history')) return { data: { control: control(FOUNDER, 'DISABLED'), decisions: [], approvals: [] } as T };
      return { data: detail(FOUNDER) as T };
    };
    const o = await loadPilotOverview(get);
    expect(o.accounts[0]).toMatchObject({ error: null });
    expect(o.accounts[1].detail).toBeNull();
    expect(o.accounts[1].error).toMatch(/Não conseguimos ler/);
  });

  it('saldo, estado, propostas e ativação de cada conta são independentes', () => {
    const strat = strategy({ entriesEnabled: true });
    const founder = view(account(FOUNDER, { ...READY, state: 'ARMED', intents: [pendingBuy()] }), strat);
    const claudio = view(account(CLAUDIO, { readiness: readiness(CLAUDIO) }), strat);
    expect(accountHeadline(founder).title).toBe('À espera da tua aprovação');
    expect(accountHeadline(claudio).title).toBe('A preparar');
    expect(pendingPurchases(claudio)).toEqual([]);
    expect(wizardSteps(claudio)[2].enabled).toBe(false);
    const bal = (i: ViewInput) => accountSummary(i, null).find((r) => r.label.startsWith('Saldo'))?.value;
    expect([bal(founder), bal(claudio)]).toEqual(['50.72 USDT', '21.81 USDT']);
  });

  it('readiness de outra conta nunca é usado', () => {
    const data = account(CLAUDIO, { ...READY, readiness: readiness(FOUNDER) });
    expect(wizardSteps(view(data))[2].enabled).toBe(false);
    expect(accountSummary(view(data), null).find((r) => r.label.startsWith('Saldo'))?.value).toBe('—');
  });
});

describe('controlos de segurança', () => {
  it('pausar só com entradas ligadas; desativar só com o bot ativo; paragem de emergência fora de DISABLED', () => {
    expect(safetyControls(view(account(FOUNDER, READY)))).toEqual({ pauseEntries: false, disarm: false, kill: false });
    expect(safetyControls(view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy({ entriesEnabled: true })))).toEqual({ pauseEntries: true, disarm: true, kill: true });
    expect(safetyControls(view(account(FOUNDER, { ...READY, state: 'PAUSED' })))).toEqual({ pauseEntries: false, disarm: false, kill: true });
    expect(safetyControls(view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy(), true))).toEqual({ pauseEntries: false, disarm: false, kill: false });
  });
});

describe('cartão da conta (render)', () => {
  const noop = () => {};
  const actions: PilotAccountActions = {
    onVerify: noop,
    onConfirm: noop,
    onRecheck: noop,
    onActivate: noop,
    onStartSearch: noop,
    onReview: noop,
    onPauseEntries: noop,
    onDisarm: noop,
    onKill: noop,
  };
  const render = (i: ViewInput, message: PilotCardMessage | null = null) => renderToStaticMarkup(createElement(PilotAccountCard, { view: i, index: 0, lastUpdated: null, actions, message }));
  const visibleText = (html: string) =>
    html
      .replace(/<details[^>]*data-testid="pilot-technical-details"[\s\S]*$/, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x27;/g, "'");

  it('mostra as áreas pedidas; detalhes técnicos fechados por omissão', () => {
    const html = render(view(account(FOUNDER, { read: false, readReasons: ['KEY_HAS_FUTURES'] })));
    for (const t of ['Verificar a conta', 'Confirmar a conta', 'Ativar o piloto', 'Oportunidades de mercado', 'Compras à espera da tua aprovação', 'Controlos de segurança', 'Detalhes técnicos']) {
      expect(html).toContain(t);
    }
    expect(html).toMatch(/<details class="[^"]*" data-testid="pilot-technical-details">/);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain('KEY_HAS_FUTURES');
    expect(visibleText(html)).not.toMatch(CODE);
  });

  it('«Começar a procurar oportunidades» só aparece depois de ativar', () => {
    expect(render(view(account(FOUNDER, READY)))).not.toContain('pilot-search-action');
    const html = render(view(account(FOUNDER, { ...READY, state: 'ARMED' })));
    expect(html).toContain('pilot-search-action');
    expect(html).toContain('aplica-se a todas as contas com o bot ativo');
  });

  it('proposta pendente tem «Rever compra»; sem proposta, mensagem clara', () => {
    expect(render(view(account(FOUNDER, { ...READY, state: 'ARMED', intents: [pendingBuy()] })))).toContain('Rever compra');
    expect(render(view(account(FOUNDER, READY)))).toContain('Não há compras à espera.');
  });

  it('paragem de emergência é distinta da pausa e explica as saídas', () => {
    const html = render(view(account(FOUNDER, { ...READY, state: 'ARMED' }), strategy({ entriesEnabled: true })));
    expect(html).toContain('Pausar entradas');
    expect(html).toContain('Paragem de emergência desta conta');
    expect(html).toContain('Não é uma pausa');
  });

  it('mensagem de erro aparece no passo a que pertence', () => {
    const html = render(view(account(FOUNDER, { readiness: null })), { where: 'VERIFY', ok: false, text: 'A verificação não passou.', notes: ['Detalhe claro.'] });
    const step1 = html.slice(html.indexOf('pilot-step-VERIFY'), html.indexOf('pilot-step-CONFIRM'));
    expect(step1).toContain('A verificação não passou.');
    expect(step1).toContain('Detalhe claro.');
  });
});
