import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canAccessSpotPilot, routeAccess } from './access';
import type { PilotReadiness } from './pilotReadinessView';
import {
  armDisabledReasons,
  checkStepState,
  DEFAULT_CHECK_MAX_AGE_MS,
  ENTRY_CHECK_TEXT,
  entryCheckText,
  entryPlanText,
  operationalAccounts,
  pilotActionError,
  pilotEvents,
  policyRows,
  readinessArmBlockers,
  readinessStepState,
  reasonText,
  resumeEntriesDisabledReasons,
  type GuideInput,
  type PilotStatusResponse,
  type StrategyPolicy,
} from './spotPilotView';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

const FOUNDER = '9d6b3fe3-3630-4161-9551-a69ed3359917';
const CLAUDIO = '59ac3737-4bbb-48e8-8b92-fa74d67a95e8';
const THIRD = 'fdc34633-0000-0000-0000-000000000000';
const NOW = Date.UTC(2026, 9, 13, 18, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();

const control = (accountId: string, state: 'DISABLED' | 'ARMED' | 'ACTIVE' | 'PAUSED' | 'BLOCKED' = 'DISABLED') => ({ exchangeAccountId: accountId, state, reason: null, updatedBy: null, updatedAt: null });

function statusWith(ids: string[]): PilotStatusResponse {
  return {
    executorWired: true,
    safety: { spotLiveEnabled: true, spotKillSwitch: false, cexLiveWriteEnabledInBuild: true, realSpotPilotEnabled: true, realSpotPilotMaxNotional: 15, realSpotPilotAccountIds: ids, blockers: [] },
    accounts: [FOUNDER, CLAUDIO, THIRD].map((id) => ({ id, userId: `user-${id.slice(0, 4)}`, isActive: true, control: control(id) })),
  };
}

const readiness = (blockers: string[]): PilotReadiness => ({
  accountId: FOUNDER,
  userIdMasked: null,
  exchange: 'BINANCE',
  market: 'SPOT',
  controlState: 'DISABLED',
  pilotAccount: { configured: true, matches: true },
  readiness: blockers.length ? 'NOT_READY' : 'READY',
  blockers,
  safety: { gates: ['PILOT_STATE_DISABLED'], realSpotPilotMaxNotional: 15 },
  executionContext: { executionContext: 'REAL_USER', market: 'SPOT', exchange: 'BINANCE', accountId: FOUNDER, paperAllowed: false },
});

const okCheck = (ageMs = 60_000) => ({ at: iso(NOW - ageMs), ok: true, reasons: [], by: 'admin' });

const guide = (over: Partial<GuideInput> = {}): GuideInput => ({
  accountId: FOUNDER,
  inAllowlist: true,
  control: 'DISABLED',
  readCheck: 'OK',
  reconcile: 'OK',
  readiness: 'OK',
  entriesEnabled: false,
  strategyBlockers: [],
  strategyAccountIds: [FOUNDER],
  busy: false,
  ...over,
});

const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

describe('acesso e allowlist', () => {
  it('só administradores acedem à página', () => {
    expect(canAccessSpotPilot({ isAdmin: true })).toBe(true);
    expect(canAccessSpotPilot({ isAdmin: false })).toBe(false);
    expect(canAccessSpotPilot(null)).toBe(false);
    expect(routeAccess({ loading: false, user: { isAdmin: false }, requireAdmin: true })).toBe('denied');
  });

  it('rota /spot-pilot exige admin e a navegação só mostra a entrada a administradores', () => {
    expect(read('App.tsx')).toMatch(/path="\/spot-pilot" element=\{<AppRoute element=\{<SpotPilotPage \/>\} requireAdmin denied=\{\{ kind: 'page', area: 'Spot Pilot' \}\} \/>\}/);
    expect(read('components/Layout.tsx')).toMatch(/\{canAccessSpotPilot\(user\) && \(\s*<NavLink to="\/spot-pilot"/);
  });

  it('mostra só as contas da lista operacional do servidor (Claudio e a terceira conta excluídos)', () => {
    expect(operationalAccounts(statusWith([FOUNDER])).map((a) => a.id)).toEqual([FOUNDER]);
    expect(operationalAccounts(statusWith([])).length).toBe(0);
    expect(operationalAccounts(null).length).toBe(0);
  });

  it('conta na allowlist mas ausente da resposta não é inventada', () => {
    const s = statusWith(['00000000-0000-0000-0000-000000000000']);
    expect(operationalAccounts(s)).toEqual([]);
  });

  it('armar fica desativado para conta fora da allowlist', () => {
    expect(armDisabledReasons(guide({ inAllowlist: false }))).toContain('Conta fora da lista operacional do servidor.');
  });
});

describe('etapas do assistente', () => {
  it('leitura/reconciliação: por fazer, falhada, expirada, aprovada', () => {
    expect(checkStepState(null, NOW)).toBe('PENDING');
    expect(checkStepState({ ...okCheck(), ok: false, reasons: ['BALANCE_MISMATCH'] }, NOW)).toBe('FAILED');
    expect(checkStepState(okCheck(DEFAULT_CHECK_MAX_AGE_MS + 1), NOW)).toBe('STALE');
    expect(checkStepState(okCheck(), NOW)).toBe('OK');
  });

  it('readiness com bloqueios ⇒ falhou; só o estado atual ou a posição aberta ⇒ aprovado', () => {
    const fetched = NOW - 1000;
    expect(readinessStepState(readiness(['KILL_SWITCH_ACTIVE']), fetched, okCheck(), NOW)).toBe('FAILED');
    expect(readinessStepState(readiness([]), fetched, okCheck(), NOW)).toBe('OK');
    expect(readinessStepState(readiness(['PILOT_PAUSED']), fetched, okCheck(), NOW)).toBe('OK');
    expect(readinessArmBlockers(readiness(['STRATEGY_POSITION_OPEN', 'DRY_RUN_NO_ENTRY_SIZE']))).toEqual([]);
    expect(readinessArmBlockers(readiness(['DRY_RUN_NO_ENTRY_SIZE']))).toEqual(['DRY_RUN_NO_ENTRY_SIZE']);
  });

  it('readiness anterior à reconciliação ou antigo não conta', () => {
    expect(readinessStepState(readiness([]), NOW - 120_000, okCheck(60_000), NOW)).toBe('STALE');
    expect(readinessStepState(readiness([]), NOW - DEFAULT_CHECK_MAX_AGE_MS - 1, null, NOW)).toBe('STALE');
    expect(readinessStepState(null, null, okCheck(), NOW)).toBe('PENDING');
  });

  it('armar sem pré-condições ⇒ desativado com os motivos', () => {
    const r = armDisabledReasons(guide({ readCheck: 'PENDING', reconcile: 'FAILED', readiness: 'STALE' }));
    expect(r).toEqual([
      'Falta uma verificação de leitura bem-sucedida e recente.',
      'Falta uma reconciliação bem-sucedida e recente, sem divergências.',
      'Falta um readiness sem bloqueios, pedido depois da reconciliação.',
    ]);
    expect(armDisabledReasons(guide())).toEqual([]);
    expect(armDisabledReasons(guide({ control: 'ARMED' }))).toContain('A conta já está armada.');
    expect(armDisabledReasons(guide({ busy: true }))).toContain('Operação em curso.');
  });

  it('retomar entradas antes do armamento ⇒ desativado', () => {
    expect(resumeEntriesDisabledReasons(guide({ control: 'DISABLED' }))).toContain('Arma a conta primeiro.');
    expect(resumeEntriesDisabledReasons(guide({ control: 'PAUSED' }))).toContain('Arma a conta primeiro.');
    expect(resumeEntriesDisabledReasons(guide({ control: 'ARMED' }))).toEqual([]);
    expect(resumeEntriesDisabledReasons(guide({ control: 'ARMED', strategyBlockers: ['KILL_SWITCH_ACTIVE'] }))).toEqual(['Bloqueios globais ativos: KILL_SWITCH_ACTIVE.']);
    expect(resumeEntriesDisabledReasons(guide({ control: 'ARMED', strategyAccountIds: [] }))).toContain('A conta não está configurada para a estratégia automática.');
    expect(resumeEntriesDisabledReasons(guide({ control: 'ARMED', entriesEnabled: true }))).toContain('As entradas já estão ligadas.');
    expect(resumeEntriesDisabledReasons(guide({ control: 'ARMED', entriesEnabled: null }))).toContain('Estado das entradas desconhecido.');
  });
});

describe('política do servidor', () => {
  const policy: StrategyPolicy = { maxPositions: 1, maxEntriesPerCycle: 1, takeProfitPct: 10, stopLossPct: 3, trailingActivatePct: 6, trailingGivebackPct: 3, momentumExitScoreDrop: 15, autoExitMaxAllowPer24h: 24 };
  const safety = { ...statusWith([FOUNDER]).safety, maxBuyOrdersPer24h: 2, maxAllowDecisionsPer24h: 6 };

  it('valores iguais à especificação ⇒ sem divergência', () => {
    const rows = policyRows(policy, safety);
    expect(rows.every((r) => !r.diverges)).toBe(true);
    expect(rows.find((r) => r.key === 'maxNotional')?.server).toBe('15 USDT');
    expect(rows.find((r) => r.key === 'tp')?.server).toBe('10%');
  });

  it('valor divergente: mostra o do servidor e assinala', () => {
    const rows = policyRows({ ...policy, stopLossPct: 4 }, { ...safety, realSpotPilotMaxNotional: 6 });
    const sl = rows.find((r) => r.key === 'sl')!;
    expect(sl).toMatchObject({ server: '4%', diverges: true, reference: '3%' });
    expect(rows.find((r) => r.key === 'maxNotional')).toMatchObject({ server: '6 USDT', diverges: true });
  });

  it('sem dados ⇒ "—" e nunca valores inventados', () => {
    const rows = policyRows(null, null);
    expect(rows.every((r) => r.server === '—' && !r.diverges)).toBe(true);
  });
});

describe('erros das ações', () => {
  it('falha de TOTP', () => {
    expect(pilotActionError(httpError(401, { error: 'TOTP_INVALID' })).message).toMatch(/Código TOTP inválido/);
    expect(pilotActionError(httpError(429, { error: 'TOTP_LOCKED' })).message).toMatch(/Demasiadas tentativas/);
    expect(pilotActionError(httpError(403, { error: 'TOTP_NOT_CONFIGURED' })).message).toMatch(/2FA/);
  });

  it('armar recusado devolve motivos e bloqueios do readiness', () => {
    const e = pilotActionError(httpError(409, { error: 'ARM_PRECONDITIONS_FAILED', reasons: ['ARM_RECONCILE_REQUIRED'], readinessBlockers: ['KILL_SWITCH_ACTIVE'] }));
    expect(e.code).toBe('ARM_PRECONDITIONS_FAILED');
    expect(e.reasons).toEqual(['ARM_RECONCILE_REQUIRED']);
    expect(e.readinessBlockers).toEqual(['KILL_SWITCH_ACTIVE']);
  });

  it('retomar recusado antes do armamento', () => {
    const e = pilotActionError(httpError(409, { error: 'ENTRIES_PRECONDITIONS_FAILED', reasons: ['NO_ARMED_STRATEGY_ACCOUNT'] }));
    expect(e.message).toMatch(/recusou retomar entradas/);
    expect(e.reasons).toEqual(['NO_ARMED_STRATEGY_ACCOUNT']);
  });

  it('sem resposta ⇒ resultado incerto; 403 ⇒ só admins', () => {
    expect(pilotActionError(new Error('Network')).message).toMatch(/pode ou não ter sido aplicada/);
    expect(pilotActionError(httpError(403, {})).message).toMatch(/Apenas administradores/);
  });
});

describe('histórico', () => {
  it('distingue decisão, intenção e execução confirmada, do mais recente para o mais antigo', () => {
    const ev = pilotEvents({
      checks: { readCheck: okCheck(300_000), reconcile: { ...okCheck(200_000), ok: false, reasons: ['BALANCE_MISMATCH'] } },
      history: {
        control: control(FOUNDER),
        decisions: [{ id: 'd1', createdAt: iso(NOW - 100_000), symbol: 'BTCUSDT', side: 'BUY', notional: '14.85', decision: 'AWAITING_APPROVAL', reasons: ['FIRST_ORDER_APPROVAL_REQUIRED'] }],
        approvals: [],
      },
      intents: [
        { idempotencyKey: 'k1', intentId: 'i1aaaaaaaa', symbol: 'BTCUSDT', side: 'BUY', quantity: 0.0002, notional: 14.8, state: 'PENDING', createdAt: iso(NOW - 90_000) },
        { idempotencyKey: 'k2', intentId: 'i2aaaaaaaa', symbol: 'ETHUSDT', side: 'BUY', quantity: 0.004, notional: 14.7, state: 'FILLED', createdAt: iso(NOW - 50_000) },
      ],
    });
    expect(ev.map((e) => e.kind)).toEqual(['EXECUTION', 'INTENT', 'DECISION', 'RECONCILE', 'READ_CHECK']);
    expect(ev[1].detail).toMatch(/não enviada/);
    expect(ev[3].tone).toBe('bad');
  });
});

describe('página Spot Pilot — fontes', () => {
  const page = read('pages/SpotPilotPage.tsx');
  const view = read('utils/spotPilotView.ts');
  const simple = read('utils/spotPilotSimple.ts');
  const card = read('components/spot/pilot/PilotAccountCard.tsx');
  const tech = read('components/spot/pilot/PilotTechnicalDetails.tsx');

  it('só usa os endpoints do piloto real; nada do Spot legado nem do Momentum Paper', () => {
    const urls = [...page.matchAll(/api\.(get|post)<?[^(]*\(\s*[`']([^`']+)[`']/g)].map((m) => m[2]);
    expect(urls.length).toBeGreaterThan(5);
    for (const u of urls) expect(u.startsWith('/spot-pilot/')).toBe(true);
    const reads = [...simple.matchAll(/get<[^>]+>\(\s*[`']([^`']+)[`']/g)].map((m) => m[1]);
    expect(reads.length).toBeGreaterThanOrEqual(5);
    for (const u of reads) expect(u.startsWith('/spot-pilot/')).toBe(true);
    for (const src of [page, simple, card, tech]) {
      expect(src).not.toMatch(/SPOT_BOT_ENABLED[^)]*\?/);
      expect(src).not.toMatch(/useSpot|\/spot-ui|[`'"]\/spot\/|spot-paper/);
    }
  });

  it('nenhuma operação corre no carregamento: o efeito inicial só lê o estado', () => {
    const refresh = page.slice(page.indexOf('const refreshReadiness = useCallback'), page.indexOf('useEffect(() => {'));
    expect(refresh).toContain('const refresh = useCallback');
    expect(refresh).not.toMatch(/api\.post/);
    const effect = page.slice(page.indexOf('useEffect(() => {'), page.indexOf('async function run'));
    expect(effect).not.toMatch(/api\.post|doReadCheck|doReconcile|doRecheck|confirmDialog|confirmApprove|openDialog|openReview/);
    expect(simple).not.toMatch(/\bpost\b|api\./);
    expect(page).toMatch(/const get: PilotGet = \(url, config\) => api\.get\(url, config\);/);
    for (const src of [card, tech]) expect(src).not.toMatch(/\bapi\b|useEffect/);
  });

  it('ativar e começar a procurar são pedidos separados', () => {
    const arm = page.slice(page.indexOf("if (kind === 'ARM') {"), page.indexOf("} else if (kind === 'RESUME')"));
    expect(arm).toContain('/state');
    expect(arm).not.toMatch(/entries/);
    const resume = page.slice(page.indexOf("} else if (kind === 'RESUME')"), page.indexOf("} else if (kind === 'PAUSE_ENTRIES')"));
    expect(resume).toContain('/spot-pilot/strategy/entries');
    expect(resume).not.toMatch(/\/state/);
  });

  it('aprovar uma compra exige revisão, confirmação e código TOTP, pelo fluxo existente', () => {
    expect(page).toMatch(/disabled=\{busy \|\| !reviewAck \|\| approveTotp\.length !== PILOT_TOTP_LENGTH\}/);
    expect(page).toMatch(/submitPilotApproval\(\(url, body, config\) => api\.post\(url, body, config\)/);
    expect(page).not.toMatch(/\/approve/);
    expect(page).toMatch(/api\.post\(`\/spot-pilot\/accounts\/\$\{accountId\}\/reject`, \{ idempotencyKey \}\)/);
  });

  it('armar e retomar enviam TOTP sem repetição automática; pausar, desarmar e kill switch não pedem TOTP', () => {
    expect(page).toMatch(/\{ state: 'ARMED', totpCode: code \}, \{ skipAuthRetry: true \}/);
    expect(page).toMatch(/\{ enabled: true, totpCode: code \}, \{ skipAuthRetry: true \}/);
    expect(page).toMatch(/api\.post\('\/spot-pilot\/strategy\/entries', \{ enabled: false \}\)/);
    expect(page).toMatch(/\{ state: 'PAUSED', reason:/);
    expect(page).toMatch(/\{ state: 'DISABLED', reason:/);
  });

  it('pausa de entradas é distinta do kill switch, que exige confirmação escrita e avisa das saídas', () => {
    expect(page).toContain("dialog.kind === 'KILL' && killWord !== KILL_CONFIRM_WORD");
    expect(page).toMatch(/incluindo as saídas automáticas/);
    expect(page).toMatch(/Não é uma pausa/);
    const pause = page.slice(page.indexOf("kind === 'PAUSE_ENTRIES'"), page.indexOf("kind === 'DISARM'"));
    expect(pause).not.toMatch(/DISABLED/);
  });

  it('todas as ações confirmam e o estado é relido do servidor depois de sucesso ou erro', () => {
    expect(page).toMatch(/!ack \|\|/);
    const run = page.slice(page.indexOf('async function run'), page.indexOf('const doReadCheck'));
    expect(run).toMatch(/finally \{\s*await refresh\(\);/);
    expect(run).toMatch(/catch \(e\) \{\s*const error = pilotActionError\(e\);/);
  });

  it('o código TOTP é limpo antes do pedido e nunca registado nem persistido', () => {
    expect(page).toMatch(/closeDialog\(\);\s*if \(kind === 'ARM'\)/);
    expect(page).toMatch(/const code = approveTotp;\s*setApproveTotp\(''\);/);
    for (const src of [page, view, simple, card, tech]) {
      expect(src).not.toMatch(/console\.|localStorage|sessionStorage/);
      expect(src).not.toMatch(/apiKey|secret|signature|keyFingerprint/i);
    }
  });

  it('sem stop na exchange: a página não promete proteção absoluta', () => {
    expect(page).toMatch(/não há ordem de proteção colocada na Binance/i);
    expect(page).toMatch(/slippage/);
    expect(tech).toMatch(/Não há ordem de proteção colocada na Binance/);
    for (const src of [page, simple, card, tech]) expect(src).not.toMatch(/proteção (total|absoluta|garantida)/i);
  });
});

describe('validação Binance por símbolo', () => {
  it('motivos de bloqueio em português, com código e detalhe; válido mostra a venda adversa', () => {
    const base = { quantity: null, entryNotional: null, exitAdverseNotional: null, requiredNotional: null };
    expect(entryCheckText({ symbol: 'BTCUSDT', ok: false, reason: 'EXIT_NOTIONAL_BELOW_MIN', detail: '4.4<5.1', ...base })).toBe(
      'BTCUSDT: Venda a mercado prevista abaixo do mínimo (EXIT_NOTIONAL_BELOW_MIN) · 4.4<5.1'
    );
    expect(entryCheckText({ symbol: 'XUSDT', ok: false, reason: 'NEW_CODE', detail: null, ...base })).toBe('XUSDT: NEW_CODE (NEW_CODE)');
    expect(
      entryCheckText({ symbol: 'SOLUSDT', ok: true, reason: null, detail: null, quantity: '0.039', entryNotional: '5.85', exitAdverseNotional: '5.358', requiredNotional: '5.1' })
    ).toBe('SOLUSDT: válido · qtd 0.039 · entrada 5.85 USDT · venda adversa 5.358 ≥ 5.1 USDT');
    for (const k of ['RULES_STALE', 'FEE_RATE_UNKNOWN', 'ROUNDED_QTY_BELOW_MIN', 'EXIT_SAFETY_MARGIN_INSUFFICIENT', 'SYMBOL_NOT_TRADING', 'QUANTITY_FILTER_INVALID']) {
      expect(ENTRY_CHECK_TEXT[k]).toBeTruthy();
    }
  });

  it('plano de entrada do readiness: falta de oportunidade distinta de bloqueio', () => {
    expect(entryPlanText({ state: 'VALID_ENTRY', symbol: 'ETHUSDT', quantity: 0.000118 })).toBe('Entrada válida (compra e saída prevista passam os filtros) · ETHUSDT · qtd 0.000118');
    expect(entryPlanText({ state: 'NO_VALID_ENTRY', symbol: null, quantity: null })).toMatch(/não bloqueia/);
    expect(entryPlanText({ state: 'NO_CANDIDATES', symbol: null, quantity: null })).toMatch(/não bloqueia/);
    expect(entryPlanText({ state: 'ENTRY_DATA_UNAVAILABLE', symbol: null, quantity: null })).toMatch(/^Bloqueio/);
    expect(entryPlanText(null)).toBe('—');
    expect(reasonText('STRATEGY_FEE_RATE_UNKNOWN')).toMatch(/comissão/);
    expect(reasonText('KEY_HAS_FUTURES')).toMatch(/Futures.*\(KEY_HAS_FUTURES\)$/);
    expect(reasonText('KEY_HAS_MARGIN')).toMatch(/Margem.*\(KEY_HAS_MARGIN\)$/);
  });
});
