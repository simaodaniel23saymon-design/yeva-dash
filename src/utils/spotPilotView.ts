/**
 * Vista da página Spot Pilot (Real Spot Pilot, admin). Funções puras sobre as respostas de /api/spot-pilot/*.
 *
 * A interface só mostra e encaminha: o servidor valida armamento, entradas, TOTP, allowlist e limites e recusa
 * tudo o que não cumprir. Os passos e botões aqui calculados são apenas UX e nunca substituem essas validações.
 * Estados do piloto vêm sempre de /spot-pilot/*; o motor Spot legado (SPOT_BOT_ENABLED) e a página /spot não contam.
 */

import { PILOT_APPROVE_ERROR_MESSAGES } from './pilotApproval';
import type { PilotReadiness } from './pilotReadinessView';

export type PilotControlState = 'DISABLED' | 'ARMED' | 'ACTIVE' | 'PAUSED' | 'BLOCKED';

export type PilotControl = { exchangeAccountId: string; state: PilotControlState; reason: string | null; updatedBy: string | null; updatedAt: string | null };

export type PilotSafety = {
  spotLiveEnabled: boolean;
  spotKillSwitch: boolean;
  cexLiveWriteEnabledInBuild: boolean;
  realSpotPilotEnabled: boolean;
  realSpotPilotMaxNotional: number | null;
  realSpotPilotMaxNotionalCap?: number;
  realSpotPilotAccountIds?: string[];
  maxBuyOrdersPer24h?: number;
  maxAllowDecisionsPer24h?: number;
  requireApprovalForEveryOrder?: boolean;
  approvalTtlMs?: number;
  intentMaxAgeMs?: number;
  blockers: string[];
};

export type PilotStatusAccount = { id: string; userId: string; exchange?: string; isActive: boolean; control: PilotControl; authorizationBlockers?: string[] };

export type PilotStatusResponse = { safety: PilotSafety; executorWired: boolean; accounts: PilotStatusAccount[] };

export type ActivationCheck = { at: string; ok: boolean; reasons: string[]; by: string };

export type PilotDecision = {
  id: string;
  createdAt: string;
  symbol: string;
  side: string;
  notional: string | null;
  decision: string;
  reasons: string[];
  strategy?: string;
  reason?: string;
  idempotencyKey?: string;
};

export type PilotIntent = {
  idempotencyKey: string;
  intentId: string;
  symbol: string;
  side: string;
  quantity: number;
  notional: number;
  state: string;
  createdAt: string;
  updatedAt?: string;
  errorCode?: string | null;
};

export type PilotMismatch = { id: string; kind: string; severity: string; symbol: string | null; asset: string | null; lastSeenAt?: string };

export type PilotAccountDetail = {
  safety?: PilotSafety;
  control: PilotControl;
  activationChecks?: { readCheck: ActivationCheck | null; reconcile: ActivationCheck | null };
  activationCheckMaxAgeMs?: number;
  decisions: PilotDecision[];
  intents: PilotIntent[];
  mismatches: PilotMismatch[];
};

export type PilotApproval = { id: string; intentId: string; idempotencyKey: string; approvedBy: string; approvedAt: string; expiresAt?: string };

export type PilotHistory = { control: PilotControl; decisions: PilotDecision[]; approvals: PilotApproval[] };

export type StrategyPolicy = {
  maxPositions: number;
  maxEntriesPerCycle: number;
  takeProfitPct: number;
  stopLossPct: number;
  trailingActivatePct: number;
  trailingGivebackPct: number;
  momentumExitScoreDrop: number;
  minEntryQuote?: number;
  minStrategyEntryQuote?: number;
  entryPriceBufferPct?: number;
  autoExitMaxAllowPer24h?: number;
  exchangeSideStops?: boolean;
};

export type StrategyAccountStatus = {
  accountId: string;
  state: string;
  reasons: string[];
  position: {
    symbol: string;
    quantity: number;
    averageEntryPrice: number | null;
    price: number | null;
    pnlPct: number | null;
    peakPct: number | null;
    stopLossPrice: number | null;
    takeProfitPrice: number | null;
    exitSignal: string | null;
  } | null;
  lastAction: { at: string; decision: string; side: string; symbol: string; state: string | null } | null;
  consecutiveErrors: number;
  reconciledSinceBoot?: boolean;
  lastTickAt: string;
  entryChecks?: EntryCheck[];
};

/** Validação Binance por símbolo da última tentativa de entrada — decisão da estratégia, não uma ordem. */
export type EntryCheck = {
  symbol: string;
  ok: boolean;
  reason: string | null;
  detail: string | null;
  quantity: string | null;
  entryNotional: string | null;
  exitAdverseNotional: string | null;
  requiredNotional: string | null;
};

export const ENTRY_CHECK_TEXT: Readonly<Record<string, string>> = Object.freeze({
  RULES_UNAVAILABLE: 'Filtros da Binance indisponíveis',
  RULES_STALE: 'Filtros da Binance desatualizados',
  RULES_INVALID: 'Filtros da Binance inválidos ou incompletos',
  SYMBOL_NOT_TRADING: 'Símbolo não negociável',
  QUOTE_NOT_USDT: 'Par sem cotação em USDT',
  SPOT_NOT_ALLOWED: 'Spot não permitido no símbolo',
  MARKET_NOT_ALLOWED: 'Ordens a mercado não permitidas',
  PRICE_UNAVAILABLE: 'Preço indisponível',
  AVG_PRICE_UNAVAILABLE: 'Preço médio indisponível',
  FEE_RATE_UNKNOWN: 'Dados de comissão insuficientes',
  BUDGET_INVALID: 'Orçamento da entrada inválido',
  QUANTITY_FILTER_INVALID: 'Filtro de quantidade inválido',
  ROUNDED_QTY_BELOW_MIN: 'Quantidade arredondada abaixo do mínimo',
  ENTRY_NOTIONAL_BELOW_MIN: 'Notional da entrada abaixo do mínimo',
  ENTRY_NOTIONAL_ABOVE_MAX: 'Notional da entrada acima do máximo',
  ENTRY_ABOVE_BUDGET: 'Entrada acima do limite',
  EXIT_QTY_BELOW_MIN: 'Quantidade vendável após comissão abaixo do mínimo',
  EXIT_NOTIONAL_BELOW_MIN: 'Venda a mercado prevista abaixo do mínimo',
  EXIT_SAFETY_MARGIN_INSUFFICIENT: 'Margem de segurança da saída insuficiente',
});

/** Estado do plano de entrada do readiness. Só ENTRY_DATA_UNAVAILABLE é bloqueio; as restantes são falta de oportunidade. */
export const ENTRY_PLAN_TEXT: Readonly<Record<string, string>> = Object.freeze({
  VALID_ENTRY: 'Entrada válida (compra e saída prevista passam os filtros)',
  NO_CANDIDATES: 'Sem oportunidade: nenhum Winner qualificado no ranking (não bloqueia)',
  NO_VALID_ENTRY: 'Sem oportunidade válida: candidatos rejeitados pelos filtros (não bloqueia; o motor não compra)',
  ENTRY_DATA_UNAVAILABLE: 'Bloqueio: dados da Binance em falta para validar a entrada',
  NOT_EVALUATED: 'Não avaliado: sem orçamento de entrada',
});

export function entryPlanText(p: { state: string; symbol: string | null; quantity: number | null } | null | undefined): string {
  if (!p) return '—';
  const t = ENTRY_PLAN_TEXT[p.state] ?? p.state;
  return p.state === 'VALID_ENTRY' && p.symbol ? `${t} · ${p.symbol} · qtd ${p.quantity ?? '—'}` : t;
}

export function entryCheckText(c: EntryCheck): string {
  if (c.ok) return `${c.symbol}: válido · qtd ${c.quantity ?? '—'} · entrada ${c.entryNotional ?? '—'} USDT · venda adversa ${c.exitAdverseNotional ?? '—'} ≥ ${c.requiredNotional ?? '—'} USDT`;
  const t = (c.reason && ENTRY_CHECK_TEXT[c.reason]) || c.reason || 'Motivo desconhecido';
  return `${c.symbol}: ${t}${c.reason ? ` (${c.reason})` : ''}${c.detail ? ` · ${c.detail}` : ''}`;
}

export type StrategyStatus = {
  loopRunning: boolean;
  entriesEnabled: boolean;
  entriesStateLoaded?: boolean;
  strategyAccountIds: string[];
  blockers: string[];
  policy: StrategyPolicy;
  accounts: StrategyAccountStatus[];
};

/** Validade de uma verificação para efeitos de armamento (o servidor devolve o seu valor em activationCheckMaxAgeMs). */
export const DEFAULT_CHECK_MAX_AGE_MS = 30 * 60_000;

/** Só as contas da lista operacional configurada no servidor, pela ordem dessa lista. Nunca outras contas. */
export function operationalAccounts(status: PilotStatusResponse | null): PilotStatusAccount[] {
  const ids = status?.safety.realSpotPilotAccountIds ?? [];
  return ids.map((id) => status?.accounts.find((a) => a.id === id)).filter((a): a is PilotStatusAccount => a != null);
}

export type StepState = 'PENDING' | 'OK' | 'FAILED' | 'STALE';

export function checkStepState(check: ActivationCheck | null | undefined, nowMs: number, maxAgeMs = DEFAULT_CHECK_MAX_AGE_MS): StepState {
  if (!check) return 'PENDING';
  const at = Date.parse(check.at);
  if (!Number.isFinite(at) || nowMs - at > maxAgeMs) return 'STALE';
  return check.ok ? 'OK' : 'FAILED';
}

/** Bloqueios que impedem armar (igual ao critério do servidor: o estado atual e a posição aberta não contam). */
export function readinessArmBlockers(r: Pick<PilotReadiness, 'blockers'>): string[] {
  const positionOpen = r.blockers.includes('STRATEGY_POSITION_OPEN');
  return r.blockers.filter((b) => b !== 'PILOT_PAUSED' && b !== 'PILOT_BLOCKED' && !(positionOpen && (b === 'STRATEGY_POSITION_OPEN' || b === 'DRY_RUN_NO_ENTRY_SIZE')));
}

/**
 * Readiness só conta se tiver sido pedido nesta página, depois da última reconciliação e dentro da validade.
 * Um readiness anterior ou em cache fica STALE.
 */
export function readinessStepState(
  r: PilotReadiness | null,
  fetchedAtMs: number | null,
  reconcile: ActivationCheck | null | undefined,
  nowMs: number,
  maxAgeMs = DEFAULT_CHECK_MAX_AGE_MS
): StepState {
  if (!r || fetchedAtMs == null) return 'PENDING';
  const reconciledAt = reconcile ? Date.parse(reconcile.at) : NaN;
  if (nowMs - fetchedAtMs > maxAgeMs || (Number.isFinite(reconciledAt) && reconciledAt > fetchedAtMs)) return 'STALE';
  return readinessArmBlockers(r).length === 0 ? 'OK' : 'FAILED';
}

export const isArmed = (s: PilotControlState | null | undefined) => s === 'ARMED' || s === 'ACTIVE';

export type GuideInput = {
  accountId: string | null;
  inAllowlist: boolean;
  control: PilotControlState | null;
  readCheck: StepState;
  reconcile: StepState;
  readiness: StepState;
  entriesEnabled: boolean | null;
  strategyBlockers: string[];
  strategyAccountIds: string[];
  busy: boolean;
};

/** Motivos (UX) para o botão Armar ficar desativado. O servidor volta a validar tudo. */
export function armDisabledReasons(i: GuideInput): string[] {
  const r: string[] = [];
  if (i.busy) r.push('Operação em curso.');
  if (!i.accountId || !i.inAllowlist) r.push('Conta fora da lista operacional do servidor.');
  if (isArmed(i.control)) r.push('A conta já está armada.');
  if (i.readCheck !== 'OK') r.push('Falta uma verificação de leitura bem-sucedida e recente.');
  if (i.reconcile !== 'OK') r.push('Falta uma reconciliação bem-sucedida e recente, sem divergências.');
  if (i.readiness !== 'OK') r.push('Falta um readiness sem bloqueios, pedido depois da reconciliação.');
  return r;
}

/** Motivos (UX) para Retomar entradas ficar desativado. O servidor volta a validar tudo. */
export function resumeEntriesDisabledReasons(i: GuideInput): string[] {
  const r: string[] = [];
  if (i.busy) r.push('Operação em curso.');
  if (i.entriesEnabled == null) r.push('Estado das entradas desconhecido.');
  if (i.entriesEnabled === true) r.push('As entradas já estão ligadas.');
  if (!i.accountId || !i.strategyAccountIds.includes(i.accountId)) r.push('A conta não está configurada para a estratégia automática.');
  if (!isArmed(i.control)) r.push('Arma a conta primeiro.');
  if (i.strategyBlockers.length) r.push(`Bloqueios globais ativos: ${i.strategyBlockers.join(', ')}.`);
  return r;
}

/** Valores da especificação do piloto, só para assinalar divergências. A interface mostra sempre o valor do servidor. */
export const PILOT_SPEC_REFERENCE = Object.freeze({
  maxNotional: 15,
  maxBuysPer24h: 2,
  maxAllowPer24h: 6,
  maxPositions: 1,
  takeProfitPct: 10,
  stopLossPct: 3,
  trailingActivatePct: 6,
  trailingGivebackPct: 3,
  autoExitMaxAllowPer24h: 24,
});

export type PolicyRow = { key: string; label: string; server: string; diverges: boolean; reference: string };

const num = (n: number | null | undefined, unit = '') => (n == null || !Number.isFinite(n) ? '—' : `${n}${unit}`);

export function policyRows(policy: StrategyPolicy | null, safety: PilotSafety | null): PolicyRow[] {
  const R = PILOT_SPEC_REFERENCE;
  const row = (key: string, label: string, value: number | null | undefined, ref: number, unit: string): PolicyRow => ({
    key,
    label,
    server: num(value, unit),
    reference: `${ref}${unit}`,
    diverges: value != null && Number.isFinite(value) && value !== ref,
  });
  return [
    row('maxNotional', 'Exposição máxima configurada (por ordem, ciclo e conta)', safety?.realSpotPilotMaxNotional, R.maxNotional, ' USDT'),
    row('maxBuys', 'Compras por 24 h', safety?.maxBuyOrdersPer24h, R.maxBuysPer24h, ''),
    row('maxAllow', 'Decisões ALLOW de entrada por 24 h', safety?.maxAllowDecisionsPer24h, R.maxAllowPer24h, ''),
    row('maxPositions', 'Posições por conta', policy?.maxPositions, R.maxPositions, ''),
    row('tp', 'Take Profit', policy?.takeProfitPct, R.takeProfitPct, '%'),
    row('sl', 'Stop Loss', policy?.stopLossPct, R.stopLossPct, '%'),
    row('trailAct', 'Trailing stop ativa a', policy?.trailingActivatePct, R.trailingActivatePct, '%'),
    row('trailGive', 'Trailing stop: recuo', policy?.trailingGivebackPct, R.trailingGivebackPct, '%'),
    row('autoExit', 'Saídas automáticas por 24 h', policy?.autoExitMaxAllowPer24h, R.autoExitMaxAllowPer24h, ''),
  ];
}

export const CONTROL_STATE_TEXT: Record<PilotControlState, string> = {
  DISABLED: 'Não armada (desativada)',
  ARMED: 'Armada (aguarda a primeira ordem)',
  ACTIVE: 'Armada e ativa',
  PAUSED: 'Desarmada (pausa: só saídas automáticas)',
  BLOCKED: 'Bloqueada (divergência crítica)',
};

export const REASON_TEXT: Readonly<Record<string, string>> = Object.freeze({
  KILL_SWITCH_ACTIVE: 'Kill switch global ativo',
  LIVE_DISABLED: 'Execução real desligada no servidor',
  PILOT_DISABLED: 'Piloto desligado no servidor',
  PILOT_MAX_NOTIONAL_MISSING: 'Limite do piloto não configurado',
  PILOT_MAX_NOTIONAL_ABOVE_CAP: 'Limite configurado acima do teto compilado',
  LIVE_WRITE_NOT_ENABLED_IN_BUILD: 'Escritas desligadas nesta build',
  PILOT_STATE_DISABLED: 'Conta não armada',
  PILOT_PAUSED: 'Conta em pausa',
  PILOT_BLOCKED: 'Conta bloqueada',
  NOT_PILOT_ACCOUNT: 'Conta fora da lista operacional',
  PILOT_ACCOUNT_NOT_CONFIGURED: 'Nenhuma conta piloto configurada',
  PILOT_ACCOUNT_NOT_GRANTED: 'Conta fora do registo compilado',
  ARM_READ_CHECK_REQUIRED: 'Falta a verificação de leitura',
  ARM_READ_CHECK_FAILED: 'A última verificação de leitura falhou',
  ARM_READ_CHECK_STALE: 'A verificação de leitura expirou; repete-a',
  ARM_RECONCILE_REQUIRED: 'Falta a reconciliação',
  ARM_RECONCILE_FAILED: 'A última reconciliação falhou ou encontrou divergências',
  ARM_RECONCILE_STALE: 'A reconciliação expirou; repete-a',
  ARM_READINESS_NOT_READY: 'Readiness com bloqueios no momento do pedido',
  READINESS_UNAVAILABLE: 'Readiness indisponível',
  NO_ARMED_STRATEGY_ACCOUNT: 'Nenhuma conta da estratégia está armada',
  STRATEGY_ACCOUNTS_NOT_CONFIGURED: 'Nenhuma conta configurada para a estratégia',
  STRATEGY_ENTRY_BELOW_MINIMUM: 'Entrada abaixo do mínimo vendável no Stop Loss',
  STRATEGY_FEE_RATE_UNKNOWN: 'Taxa de comissão da conta desconhecida (entradas bloqueadas)',
  STRATEGY_ENTRY_DATA_UNAVAILABLE: 'Dados da Binance em falta para validar entradas',
  STRATEGY_POSITION_OPEN: 'Posição da estratégia aberta',
  DRY_RUN_NO_ENTRY_SIZE: 'Sem tamanho de entrada para a simulação',
  RECONCILIATION_FAILED: 'Reconciliação falhou',
  BALANCE_MISMATCH: 'Saldo na Binance abaixo do rastreado',
  BALANCE_UNKNOWN: 'Saldo do ativo desconhecido',
  CRITICAL_RECONCILIATION_MISMATCH: 'Divergência crítica em aberto',
  CREDENTIALS_INVALID: 'Credenciais inválidas',
  ACCOUNT_NOT_FOUND: 'Conta não encontrada',
  PERMISSIONS_UNAVAILABLE: 'Permissões da chave não lidas',
  KEY_HAS_WITHDRAWALS: 'Chave com levantamentos ativos',
  KEY_HAS_INTERNAL_TRANSFER: 'Chave com transferências internas ativas',
  KEY_HAS_UNIVERSAL_TRANSFER: 'Chave com transferências universais ativas',
  KEY_HAS_FUTURES: 'Chave com Futures ativo (o piloto exige chave só Spot)',
  KEY_HAS_MARGIN: 'Chave com Margem ativa (o piloto exige chave só Spot)',
  OPEN_ORDERS_UNAVAILABLE: 'Ordens abertas não lidas',
  NOT_ELIGIBLE: 'Conta não elegível',
});

export function reasonText(code: string): string {
  const t = REASON_TEXT[code];
  return t ? `${t} (${code})` : code;
}

const ACTION_ERROR_TEXT: Readonly<Record<string, string>> = Object.freeze({
  ARM_PRECONDITIONS_FAILED: 'O servidor recusou armar: as pré-condições não estão cumpridas.',
  ENTRIES_PRECONDITIONS_FAILED: 'O servidor recusou retomar entradas: as pré-condições não estão cumpridas.',
  ACCOUNT_NOT_AUTHORIZED_FOR_PILOT: 'Conta não autorizada para o piloto.',
  CRITICAL_RECONCILIATION_MISMATCH: 'Há divergências críticas em aberto. Reconcilia e resolve-as antes de armar.',
  ALREADY_ACTIVE: 'A conta já está ativa.',
  STATE_NOT_ALLOWED: 'Estado não permitido.',
  ENABLED_REQUIRED: 'Pedido inválido.',
});

type HttpErrorLike = { response?: { status?: number; data?: { error?: unknown; reasons?: unknown; readinessBlockers?: unknown } } };

export type ActionError = { message: string; code: string | null; reasons: string[]; readinessBlockers: string[] };

const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 30) : []);

/** Mensagem de erro de uma ação do piloto. Sem resposta ⇒ resultado incerto: atualizar antes de repetir. */
export function pilotActionError(err: unknown): ActionError {
  const e = err as HttpErrorLike;
  if (!e || typeof e !== 'object' || !e.response) {
    return { message: 'Sem resposta do servidor. A operação pode ou não ter sido aplicada: atualiza o estado antes de repetir.', code: null, reasons: [], readinessBlockers: [] };
  }
  const status = Number(e.response.status ?? 0);
  const raw = typeof e.response.data?.error === 'string' ? e.response.data.error : '';
  const code = /^[A-Z][A-Z0-9_]{2,63}$/.test(raw) ? raw : null;
  const reasons = strList(e.response.data?.reasons);
  const readinessBlockers = strList(e.response.data?.readinessBlockers);
  let message: string;
  if (code && code.startsWith('TOTP_')) message = PILOT_APPROVE_ERROR_MESSAGES[code] ?? `TOTP recusado (${code}).`;
  else if (code && ACTION_ERROR_TEXT[code]) message = ACTION_ERROR_TEXT[code];
  else if (code && PILOT_APPROVE_ERROR_MESSAGES[code]) message = PILOT_APPROVE_ERROR_MESSAGES[code];
  else if (status === 401) message = 'Sessão expirada. Volta a iniciar sessão; nada foi alterado.';
  else if (status === 403) message = 'Apenas administradores podem controlar o piloto.';
  else message = `Pedido recusado (HTTP ${status || '?'}${code ? ` · ${code}` : ''}). Atualiza o estado antes de repetir.`;
  return { message, code, reasons, readinessBlockers };
}

export type PilotEventKind = 'READ_CHECK' | 'RECONCILE' | 'STATE' | 'DECISION' | 'APPROVAL' | 'INTENT' | 'EXECUTION';

export type PilotEvent = { at: string; kind: PilotEventKind; title: string; detail: string; tone: 'ok' | 'warn' | 'bad' | 'info' };

const EVENT_KIND_TEXT: Record<PilotEventKind, string> = {
  READ_CHECK: 'Verificação de leitura',
  RECONCILE: 'Reconciliação',
  STATE: 'Estado da conta',
  DECISION: 'Decisão do Risk Guard (não é uma ordem)',
  APPROVAL: 'Aprovação TOTP (não é uma ordem)',
  INTENT: 'Intenção de ordem',
  EXECUTION: 'Execução confirmada',
};

export const eventKindText = (k: PilotEventKind) => EVENT_KIND_TEXT[k];

const INTENT_STATE_TEXT: Record<string, string> = {
  PENDING: 'aguarda aprovação (não enviada)',
  SUBMITTING: 'em envio (resultado incerto)',
  SUBMITTED: 'submetida à Binance, sem execução confirmada',
  UNKNOWN: 'resultado incerto: inspecionar antes de qualquer ação',
  REQUIRES_RECONCILIATION: 'requer reconciliação',
  PARTIALLY_FILLED: 'parcialmente executada',
  FILLED: 'executada',
  SETTLED: 'executada e liquidada',
  CANCELLED: 'cancelada',
  REJECTED: 'rejeitada/bloqueada (não executada)',
};

export function intentStateText(state: string): string {
  return INTENT_STATE_TEXT[state] ?? state;
}

/** Eventos ordenados do mais recente para o mais antigo. Só dados devolvidos pelo servidor; sem chaves nem códigos. */
export function pilotEvents(i: {
  checks?: PilotAccountDetail['activationChecks'];
  control?: PilotControl | null;
  history?: PilotHistory | null;
  intents?: PilotIntent[];
  lastAction?: StrategyAccountStatus['lastAction'];
}): PilotEvent[] {
  const out: PilotEvent[] = [];
  const rc = i.checks?.readCheck;
  if (rc) out.push({ at: rc.at, kind: 'READ_CHECK', title: rc.ok ? 'Leitura OK' : 'Leitura falhou', detail: rc.reasons.map(reasonText).join(' · '), tone: rc.ok ? 'ok' : 'bad' });
  const rec = i.checks?.reconcile;
  if (rec) out.push({ at: rec.at, kind: 'RECONCILE', title: rec.ok ? 'Reconciliação OK' : 'Reconciliação com problemas', detail: rec.reasons.map(reasonText).join(' · '), tone: rec.ok ? 'ok' : 'bad' });
  if (i.control?.updatedAt) {
    out.push({ at: i.control.updatedAt, kind: 'STATE', title: CONTROL_STATE_TEXT[i.control.state] ?? i.control.state, detail: i.control.reason ?? '', tone: i.control.state === 'BLOCKED' ? 'bad' : 'info' });
  }
  for (const d of i.history?.decisions ?? []) {
    out.push({
      at: d.createdAt,
      kind: 'DECISION',
      title: `${d.symbol} ${d.side} · ${d.decision}`,
      detail: [d.notional ? `~${Number(d.notional).toFixed(2)} USDT` : '', ...d.reasons].filter(Boolean).join(' · '),
      tone: d.decision === 'ALLOW' ? 'ok' : d.decision === 'BLOCK' ? 'bad' : 'warn',
    });
  }
  for (const a of i.history?.approvals ?? []) {
    out.push({ at: a.approvedAt, kind: 'APPROVAL', title: `Intent ${a.intentId.slice(0, 8)} aprovado`, detail: a.expiresAt ? `válida até ${new Date(a.expiresAt).toLocaleTimeString('pt-PT')}` : '', tone: 'info' });
  }
  for (const it of i.intents ?? []) {
    out.push({
      at: it.updatedAt ?? it.createdAt,
      kind: it.state === 'FILLED' || it.state === 'SETTLED' ? 'EXECUTION' : 'INTENT',
      title: `${it.symbol} ${it.side} ${it.quantity} (~${it.notional.toFixed(2)} USDT)`,
      detail: intentStateText(it.state) + (it.errorCode ? ` · ${it.errorCode}` : ''),
      tone: it.state === 'REJECTED' || it.state === 'UNKNOWN' ? 'bad' : it.state === 'FILLED' || it.state === 'SETTLED' ? 'ok' : 'warn',
    });
  }
  const la = i.lastAction;
  if (la && (la.state === 'FILLED' || la.state === 'SETTLED')) {
    out.push({ at: la.at, kind: 'EXECUTION', title: `${la.symbol} ${la.side}`, detail: intentStateText(la.state), tone: 'ok' });
  }
  return out.filter((e) => Number.isFinite(Date.parse(e.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
