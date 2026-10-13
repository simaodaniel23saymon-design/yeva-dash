/**
 * Vista simplificada do Spot Pilot para quem não é técnico. Funções puras sobre as respostas de /api/spot-pilot/*.
 *
 * O servidor continua a ser a fonte de verdade: valida armamento, entradas, TOTP, allowlist e limites. Aqui só se
 * traduz o estado devolvido para português claro e se decide que botões fazem sentido (UX). Nada é inventado: sem
 * dados do servidor, a vista diz que não sabe.
 */

import type { PilotReadiness } from './pilotReadinessView';
import { isIntentExpired } from './pilotApproval';
import {
  checkStepState,
  DEFAULT_CHECK_MAX_AGE_MS,
  isArmed,
  operationalAccounts,
  readinessArmBlockers,
  readinessStepState,
  type ActivationCheck,
  type EntryCheck,
  type PilotAccountDetail,
  type PilotDecision,
  type PilotHistory,
  type PilotIntent,
  type PilotSafety,
  type PilotStatusAccount,
  type PilotStatusResponse,
  type StepState,
  type StrategyAccountStatus,
  type StrategyStatus,
} from './spotPilotView';

export type PilotReadinessFull = PilotReadiness & {
  availableSpotBalanceUsdt?: number | null;
  baseline?: { openOrders: number | null; realPositions: Array<{ symbol: string; quantity: number; costBasisQuote: number }>; openMismatches: number | null } | null;
  bot?: PilotReadiness['bot'] & { config?: { entryCapitalUsdt: number | null; maxExposureUsdt: number | null } | null };
};

export type ReadCheckResult = {
  ok: boolean;
  reasons?: string[];
  activationCheck?: ActivationCheck;
  eligibility?: { eligible: boolean; reasons: string[] };
  account?: { status: string; canTrade: boolean | null; usdtFree: number | null; usdtLocked: number | null };
  openOrders?: { status: string; count: number } | null;
};

export type ReconcileResult = {
  ok: boolean;
  reasons: string[];
  activationCheck?: ActivationCheck;
  openCriticalMismatches: number | null;
  balances: Array<{ symbol: string; asset: string; tracked: number; exchangeTotal: number | null; status: string }>;
  controlBlocked: boolean;
};

/** Dados de UMA conta. Nunca partilhados entre contas. */
export type PilotAccountData = {
  id: string;
  account: PilotStatusAccount;
  detail: PilotAccountDetail | null;
  history: PilotHistory | null;
  readiness: PilotReadinessFull | null;
  readinessAtMs: number | null;
  readinessError: string | null;
  readResult: ReadCheckResult | null;
  reconcileResult: ReconcileResult | null;
  loadError: string | null;
};

export const emptyAccountData = (account: PilotStatusAccount): PilotAccountData => ({
  id: account.id,
  account,
  detail: null,
  history: null,
  readiness: null,
  readinessAtMs: null,
  readinessError: null,
  readResult: null,
  reconcileResult: null,
  loadError: null,
});

// ─── Carregamento (só leituras) ────────────────────────────────────────────

export type PilotGet = <T>(url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data: T }>;

export const READINESS_PARAMS = Object.freeze({ symbol: 'BTCUSDT', symbols: 'ETHUSDT' });

/** Estado geral + detalhe e histórico de cada conta autorizada pelo servidor. Só pedidos GET. */
export async function loadPilotOverview(get: PilotGet): Promise<{
  status: PilotStatusResponse;
  strategy: StrategyStatus;
  accounts: Array<{ account: PilotStatusAccount; detail: PilotAccountDetail | null; history: PilotHistory | null; error: string | null }>;
}> {
  const [s, st] = await Promise.all([get<PilotStatusResponse>('/spot-pilot/status'), get<StrategyStatus>('/spot-pilot/strategy/status')]);
  const accounts = await Promise.all(
    operationalAccounts(s.data).map(async (account) => {
      try {
        const [d, h] = await Promise.all([
          get<PilotAccountDetail>(`/spot-pilot/accounts/${account.id}`),
          get<PilotHistory>(`/spot-pilot/accounts/${account.id}/history`, { params: { limit: 30 } }),
        ]);
        return { account, detail: d.data, history: h.data, error: null };
      } catch {
        return { account, detail: null, history: null, error: 'Não conseguimos ler os dados desta conta. Tenta atualizar.' };
      }
    })
  );
  return { status: s.data, strategy: st.data, accounts };
}

/** Verificação "está tudo pronto?" de uma conta (o servidor só lê; nunca cria ordens). */
export async function loadPilotReadiness(get: PilotGet, accountId: string): Promise<PilotReadinessFull> {
  return (await get<PilotReadinessFull>(`/spot-pilot/accounts/${accountId}/readiness`, { params: { ...READINESS_PARAMS } })).data;
}

// ─── Linguagem clara ───────────────────────────────────────────────────────

export const accountLabel = (id: string, index: number) => `Conta ${index + 1} · ${id.slice(0, 8)}…`;

export const usdt = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(2)} USDT`);

/** Motivos do servidor em frases curtas. Os códigos ficam nos Detalhes técnicos. */
export const PLAIN_REASON: Readonly<Record<string, string>> = Object.freeze({
  ARM_READ_CHECK_REQUIRED: 'Falta verificar a conta (passo 1).',
  ARM_READ_CHECK_FAILED: 'A verificação da conta falhou. Corrige o problema e repete o passo 1.',
  ARM_READ_CHECK_STALE: 'A verificação da conta expirou. Repete o passo 1.',
  ARM_RECONCILE_REQUIRED: 'Falta confirmar a conta (passo 2).',
  ARM_RECONCILE_FAILED: 'A confirmação da conta encontrou diferenças. Resolve-as antes de ativar.',
  ARM_RECONCILE_STALE: 'A confirmação da conta expirou. Repete o passo 2.',
  ARM_READINESS_NOT_READY: 'O servidor encontrou um bloqueio de segurança no momento de ativar.',
  READINESS_UNAVAILABLE: 'Não conseguimos confirmar se está tudo pronto. Tenta outra vez.',
  KEY_HAS_FUTURES: 'A tua chave da Binance tem Futures ligado. O piloto só aceita chaves apenas com Spot.',
  KEY_HAS_MARGIN: 'A tua chave da Binance tem Margem ligada. O piloto só aceita chaves apenas com Spot.',
  KEY_HAS_WITHDRAWALS: 'A tua chave da Binance permite levantamentos. Por segurança, o piloto não a aceita.',
  KEY_HAS_INTERNAL_TRANSFER: 'A tua chave da Binance permite transferências. Por segurança, o piloto não a aceita.',
  KEY_HAS_UNIVERSAL_TRANSFER: 'A tua chave da Binance permite transferências. Por segurança, o piloto não a aceita.',
  KEY_NOT_IP_RESTRICTED: 'A tua chave da Binance não está restrita ao IP do servidor.',
  KEY_READING_DISABLED: 'A tua chave da Binance não permite leitura.',
  SPOT_TRADING_PERMISSION_MISSING: 'A tua chave da Binance não permite negociar em Spot.',
  KEY_PERMISSIONS_UNKNOWN: 'Não conseguimos ler as permissões da tua chave da Binance.',
  KEY_PERMISSIONS_STALE: 'As permissões da chave estão desatualizadas. Verifica a conta outra vez.',
  KEY_TRADING_AUTHORITY_EXPIRED: 'A autorização de negociação da tua chave expirou.',
  PERMISSIONS_UNAVAILABLE: 'Não conseguimos ler as permissões da tua chave da Binance.',
  CREDENTIALS_INVALID: 'Não conseguimos usar a chave da Binance guardada.',
  ACCOUNT_NOT_FOUND: 'Conta não encontrada.',
  ACCOUNT_NOT_OWNED: 'A chave não pertence ao dono desta conta.',
  ACCOUNT_CANNOT_TRADE: 'A Binance indica que esta conta não pode negociar.',
  ACCOUNT_SNAPSHOT_UNKNOWN: 'Não conseguimos ler a tua conta Binance agora.',
  ACCOUNT_SNAPSHOT_UNAVAILABLE: 'Não conseguimos ler a tua conta Binance agora.',
  ACCOUNT_SNAPSHOT_STALE: 'Os dados da conta Binance estão desatualizados.',
  ACCOUNT_UNAVAILABLE: 'Não conseguimos ler a tua conta Binance agora.',
  OPEN_ORDERS_UNAVAILABLE: 'Não conseguimos ler as ordens abertas na Binance.',
  NOT_ELIGIBLE: 'Esta conta não cumpre os requisitos do piloto.',
  RECONCILIATION_FAILED: 'A confirmação com a Binance falhou.',
  BALANCE_MISMATCH: 'O saldo na Binance não coincide com o registado pelo bot.',
  BALANCE_UNKNOWN: 'Não conseguimos confirmar o saldo de uma moeda.',
  CRITICAL_RECONCILIATION_MISMATCH: 'Há uma diferença importante entre o bot e a Binance por resolver.',
  STRATEGY_FEE_RATE_UNKNOWN: 'Não conseguimos confirmar a comissão da tua conta Binance.',
  STRATEGY_ENTRY_DATA_UNAVAILABLE: 'Faltam dados da Binance para validar compras.',
  STRATEGY_ENTRY_BELOW_MINIMUM: 'O limite por conta é demasiado baixo para uma compra segura.',
  KILL_SWITCH_ACTIVE: 'A paragem de emergência geral está ligada no servidor.',
  LIVE_DISABLED: 'As ordens reais estão desligadas no servidor.',
  PILOT_DISABLED: 'O piloto está desligado no servidor.',
  PILOT_MAX_NOTIONAL_MISSING: 'O limite por conta não está configurado no servidor.',
  PILOT_MAX_NOTIONAL_ABOVE_CAP: 'O limite configurado no servidor é demasiado alto.',
  LIVE_WRITE_NOT_ENABLED_IN_BUILD: 'Esta versão do servidor não permite ordens reais.',
  NOT_PILOT_ACCOUNT: 'Esta conta não está autorizada para o piloto.',
  PILOT_ACCOUNT_NOT_CONFIGURED: 'Nenhuma conta autorizada no servidor.',
  PILOT_ACCOUNT_NOT_GRANTED: 'Esta conta não está autorizada para o piloto.',
  ACCOUNT_NOT_AUTHORIZED_FOR_PILOT: 'Esta conta não está autorizada para o piloto.',
  NO_ARMED_STRATEGY_ACCOUNT: 'Ativa primeiro o bot numa conta (passo 3).',
  STRATEGY_ACCOUNTS_NOT_CONFIGURED: 'Nenhuma conta está configurada para procurar oportunidades.',
  PILOT_BLOCKED: 'A conta está bloqueada por uma diferença com a Binance.',
});

const GENERIC_REASON = 'Há uma verificação de segurança por cumprir (vê os Detalhes técnicos).';

/** Frases claras, sem códigos e sem repetidos. Motivos por símbolo (ex.: BTCUSDT:SYMBOL_…) contam como genéricos. */
export function plainReasons(codes: readonly string[]): string[] {
  const out = codes.map((c) => PLAIN_REASON[c] ?? GENERIC_REASON);
  return [...new Set(out)];
}

/** Motivo de rejeição de uma moeda pelos filtros da Binance, em linguagem clara. */
export const CANDIDATE_REASON: Readonly<Record<string, string>> = Object.freeze({
  RULES_UNAVAILABLE: 'não conseguimos ler as regras da Binance para esta moeda',
  RULES_STALE: 'as regras da Binance para esta moeda estão desatualizadas',
  RULES_INVALID: 'as regras da Binance para esta moeda estão incompletas',
  SYMBOL_NOT_TRADING: 'a moeda não está disponível para negociação',
  QUOTE_NOT_USDT: 'a Binance não permite esta compra em USDT',
  SPOT_NOT_ALLOWED: 'a Binance não permite comprar esta moeda em Spot',
  MARKET_NOT_ALLOWED: 'a Binance não permite ordens a mercado nesta moeda',
  PRICE_UNAVAILABLE: 'preço indisponível neste momento',
  AVG_PRICE_UNAVAILABLE: 'preço médio indisponível neste momento',
  FEE_RATE_UNKNOWN: 'não conseguimos confirmar a comissão da tua conta',
  BUDGET_INVALID: 'o valor disponível para a compra não é válido',
  QUANTITY_FILTER_INVALID: 'as regras de quantidade desta moeda são inválidas',
  ROUNDED_QTY_BELOW_MIN: 'o teu limite não chega para a quantidade mínima desta moeda',
  ENTRY_NOTIONAL_BELOW_MIN: 'o teu limite não chega para o valor mínimo de compra desta moeda',
  ENTRY_NOTIONAL_ABOVE_MAX: 'a compra ultrapassaria o máximo permitido pela Binance',
  ENTRY_ABOVE_BUDGET: 'a compra ultrapassaria o teu limite',
  EXIT_QTY_BELOW_MIN: 'depois da comissão, a quantidade para vender ficaria abaixo do mínimo da Binance',
  EXIT_NOTIONAL_BELOW_MIN: 'se o preço descesse até ao stop, a venda ficaria abaixo do mínimo da Binance',
  EXIT_SAFETY_MARGIN_INSUFFICIENT: 'a margem de segurança para vender no stop é insuficiente',
});

export type CandidateLine = { symbol: string; ok: boolean; chosen: boolean; text: string; valueUsdt: number | null };

export function candidateLines(checks: readonly EntryCheck[], chosenSymbol: string | null): CandidateLine[] {
  return checks.map((c) => {
    const value = c.entryNotional != null && Number.isFinite(Number(c.entryNotional)) ? Number(c.entryNotional) : null;
    const chosen = c.ok && c.symbol === chosenSymbol;
    const text = c.ok
      ? chosen
        ? `cumpre todas as regras${value != null ? ` (cerca de ${usdt(value)})` : ''} — escolhida`
        : `cumpre as regras${value != null ? ` (cerca de ${usdt(value)})` : ''}`
      : (c.reason && CANDIDATE_REASON[c.reason]) || 'não cumpre uma regra de segurança';
    return { symbol: c.symbol, ok: c.ok, chosen, text, valueUsdt: value };
  });
}

/** "STRATEGY_OPEN score=72" → frase para o utilizador. Sem pontuação conhecida, frase genérica. */
export function proposalReasonText(reason: string | null | undefined): string {
  const m = /score=(\d+(?:\.\d+)?)/.exec(String(reason ?? ''));
  return m
    ? `Moeda entre as mais fortes do ranking de tendência (pontuação ${Number(m[1])}).`
    : 'Moeda escolhida pelo ranking de tendência do bot.';
}

export const INTENT_PLAIN: Readonly<Record<string, string>> = Object.freeze({
  PENDING: 'À espera da tua aprovação (ainda não enviada à Binance)',
  SUBMITTING: 'A enviar à Binance — resultado ainda por confirmar',
  SUBMITTED: 'Enviada à Binance — execução ainda não confirmada',
  UNKNOWN: 'Resultado incerto — precisa de verificação antes de qualquer ação',
  REQUIRES_RECONCILIATION: 'Precisa de confirmação com a Binance',
  PARTIALLY_FILLED: 'Executada em parte',
  FILLED: 'Executada',
  SETTLED: 'Executada e concluída',
  CANCELLED: 'Cancelada',
  REJECTED: 'Rejeitada (não foi executada)',
});

export const intentPlain = (state: string) => INTENT_PLAIN[state] ?? 'Estado desconhecido (vê os Detalhes técnicos)';

const UNCERTAIN_STATES = new Set(['UNKNOWN', 'SUBMITTING', 'REQUIRES_RECONCILIATION']);
const SENT_STATES = new Set(['SUBMITTED', 'PARTIALLY_FILLED']);

// ─── Estado geral da conta ─────────────────────────────────────────────────

export type ViewInput = {
  data: PilotAccountData;
  safety: PilotSafety | null;
  strategy: StrategyStatus | null;
  nowMs: number;
  busy: boolean;
};

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral';

export type AccountHeadline = { title: string; subtitle: string; tone: Tone; attention: string[] };

function strategyAccount(i: ViewInput): StrategyAccountStatus | null {
  return i.strategy?.accounts.find((a) => a.accountId === i.data.id) ?? null;
}

function steps(i: ViewInput) {
  const checks = i.data.detail?.activationChecks;
  const maxAge = i.data.detail?.activationCheckMaxAgeMs ?? DEFAULT_CHECK_MAX_AGE_MS;
  const read = checkStepState(checks?.readCheck, i.nowMs, maxAge);
  const reconcile = checkStepState(checks?.reconcile, i.nowMs, maxAge);
  const r = i.data.readiness && i.data.readiness.accountId === i.data.id ? i.data.readiness : null;
  const readiness = readinessStepState(r, i.data.readinessAtMs, checks?.reconcile, i.nowMs, maxAge);
  return { read, reconcile, readiness, readinessReport: r, checks };
}

export function controlState(i: ViewInput) {
  return i.data.detail?.control.state ?? i.data.account.control?.state ?? null;
}

/** Problemas que precisam de atenção do utilizador (frases claras). Vazio ⇒ nada a assinalar. */
export function attentionItems(i: ViewInput): string[] {
  const out: string[] = [];
  const st = controlState(i);
  const sa = strategyAccount(i);
  const s = steps(i);
  if (i.data.loadError) out.push(i.data.loadError);
  if (st === 'BLOCKED') out.push('A conta foi bloqueada por uma diferença com a Binance. Confirma a conta (passo 2) e resolve a diferença.');
  if ((i.data.detail?.mismatches.length ?? 0) > 0) out.push('Há diferenças entre o bot e a Binance por resolver.');
  if ((i.data.detail?.intents ?? []).some((x) => UNCERTAIN_STATES.has(x.state))) out.push('Há uma ordem com resultado incerto. Não repitas a ordem: pede a verificação no painel de administração.');
  if (sa?.reasons.includes('POSITION_UNPROTECTED')) out.push('Há uma posição aberta sem saída automática enquanto os controlos de segurança estiverem fechados.');
  if (isArmed(st) && sa && ['ERROR', 'EXIT_BLOCKED', 'RECONCILIATION_REQUIRED'].includes(sa.state)) out.push('O bot encontrou um problema nesta conta e parou de agir até ser resolvido.');
  if (s.read === 'FAILED') out.push('A última verificação da conta falhou.');
  if (s.reconcile === 'FAILED') out.push('A última confirmação da conta encontrou diferenças.');
  if (s.readinessReport) {
    const blockers = readinessArmBlockers(s.readinessReport).filter((b) => b !== 'PILOT_STATE_DISABLED');
    out.push(...plainReasons(blockers));
  }
  if (i.data.readinessError) out.push(i.data.readinessError);
  if (i.strategy && i.strategy.blockers.length) out.push(...plainReasons(i.strategy.blockers));
  return [...new Set(out)];
}

export function pendingIntents(i: ViewInput): PilotIntent[] {
  return (i.data.detail?.intents ?? []).filter((x) => x.state === 'PENDING');
}

export function accountHeadline(i: ViewInput): AccountHeadline {
  const st = controlState(i);
  const s = steps(i);
  const attention = attentionItems(i);
  const entries = i.strategy?.entriesEnabled ?? null;
  const sa = strategyAccount(i);
  const pending = pendingIntents(i).filter((x) => !isIntentExpired(x.createdAt, i.data.detail?.safety?.intentMaxAgeMs, i.nowMs));
  if (attention.length) return { title: 'Existe algo que precisa da tua atenção', subtitle: attention[0], tone: 'bad', attention };
  if (pending.length && isArmed(st)) return { title: 'À espera da tua aprovação', subtitle: 'O bot encontrou uma compra e só a envia depois de a aprovares.', tone: 'warn', attention };
  if (isArmed(st)) {
    if (entries === true) {
      return sa?.position
        ? { title: 'Bot ativo', subtitle: `A acompanhar a tua posição em ${sa.position.symbol}.`, tone: 'ok', attention }
        : { title: 'Bot ativo', subtitle: 'A procurar oportunidades.', tone: 'ok', attention };
    }
    return { title: 'Bot ativo', subtitle: entries === false ? 'Entradas pausadas: o bot não procura novas compras.' : 'A confirmar o estado das entradas…', tone: 'ok', attention };
  }
  if (st === 'PAUSED') return { title: 'Bot em pausa', subtitle: 'Não faz novas compras; continua a gerir as vendas de posições abertas.', tone: 'neutral', attention };
  if (s.read === 'OK' && s.reconcile === 'OK' && s.readiness === 'OK') return { title: 'Pronto para ativar', subtitle: 'As verificações passaram. Podes ativar o teu bot no passo 3.', tone: 'ok', attention };
  return { title: 'A preparar', subtitle: 'Segue os três passos abaixo para ativar o teu bot.', tone: 'neutral', attention };
}

export const BOT_STATE_TEXT: Readonly<Record<string, string>> = Object.freeze({
  DISABLED: 'Desligado',
  ARMED: 'Ativo',
  ACTIVE: 'Ativo',
  PAUSED: 'Em pausa (só gere vendas)',
  BLOCKED: 'Bloqueado — precisa de atenção',
});

export function connectionText(r: PilotReadinessFull | null, readinessError: string | null): string {
  if (!r) return readinessError ? 'Não foi possível confirmar' : 'A confirmar…';
  const state = r.spotBalance?.state;
  if (state === 'CONNECTED' || state === 'ZERO_BALANCE') return 'Conta ligada';
  if (state === 'NOT_CONNECTED') return 'Não ligada';
  if (state === 'DATA_STALE' || state === 'DATA_UNAVAILABLE') return 'Ligação com problemas';
  return 'Não foi possível confirmar';
}

export type SummaryRow = { label: string; value: string };

export function accountSummary(i: ViewInput, lastUpdated: string | null): SummaryRow[] {
  const st = controlState(i);
  const r = steps(i).readinessReport;
  const balance = r?.availableSpotBalanceUsdt ?? r?.spotBalance?.usdtFree ?? i.data.readResult?.account?.usdtFree ?? null;
  const entries = i.strategy?.entriesEnabled;
  return [
    { label: 'Ligação à Binance', value: connectionText(r, i.data.readinessError) },
    { label: 'Saldo disponível (USDT)', value: usdt(balance) },
    { label: 'Limite por conta', value: i.safety?.realSpotPilotMaxNotional == null ? 'Não configurado' : usdt(i.safety.realSpotPilotMaxNotional) },
    { label: 'Estado do bot', value: st ? BOT_STATE_TEXT[st] ?? 'Desconhecido' : '—' },
    { label: 'Entradas', value: entries == null ? '—' : entries ? (isArmed(st) ? 'A procurar oportunidades' : 'Ligadas (esta conta ainda não está ativa)') : 'Entradas pausadas' },
    { label: 'Última atualização', value: lastUpdated ? new Date(lastUpdated).toLocaleString('pt-PT') : '—' },
  ];
}

// ─── Assistente de três passos ─────────────────────────────────────────────

export type WizardStatus = 'done' | 'todo' | 'failed' | 'expired' | 'locked';

export const WIZARD_STATUS_TEXT: Readonly<Record<WizardStatus, string>> = Object.freeze({
  done: 'Feito',
  todo: 'Por fazer',
  failed: 'Falhou',
  expired: 'Expirou — repete',
  locked: 'Ainda não disponível',
});

export type WizardStep = {
  key: 'VERIFY' | 'CONFIRM' | 'ACTIVATE';
  number: 1 | 2 | 3;
  title: string;
  explanation: string;
  status: WizardStatus;
  button: string;
  enabled: boolean;
  /** Porque é que o botão está desativado, ou o que falhou (frases claras). */
  notes: string[];
};

const fromCheck = (s: StepState): WizardStatus => (s === 'OK' ? 'done' : s === 'FAILED' ? 'failed' : s === 'STALE' ? 'expired' : 'todo');

export function inAllowlist(i: ViewInput) {
  return (i.safety?.realSpotPilotAccountIds ?? []).includes(i.data.id);
}

export function wizardSteps(i: ViewInput): WizardStep[] {
  const s = steps(i);
  const st = controlState(i);
  const allowed = inAllowlist(i);
  const armed = isArmed(st);
  const limit = i.safety?.realSpotPilotMaxNotional;

  const verifyNotes: string[] = [];
  if (!allowed) verifyNotes.push('Esta conta não está autorizada para o piloto.');
  if (s.read === 'FAILED') verifyNotes.push(...plainReasons(s.checks?.readCheck?.reasons ?? []));
  if (s.read === 'STALE') verifyNotes.push('A verificação tem mais de 30 minutos. Repete-a antes de ativar.');
  const verify: WizardStep = {
    key: 'VERIFY',
    number: 1,
    title: 'Verificar a conta',
    explanation: 'Confirmamos que a tua chave da Binance só permite Spot, sem levantamentos, e que conseguimos ler o teu saldo. Nada é alterado na Binance.',
    status: fromCheck(s.read),
    button: 'Verificar a minha conta',
    enabled: !i.busy && allowed,
    notes: verifyNotes,
  };

  const confirmNotes: string[] = [];
  const confirmLocked = s.read !== 'OK' && s.reconcile !== 'OK';
  if (confirmLocked) confirmNotes.push('Primeiro verifica a tua conta (passo 1).');
  if (s.reconcile === 'FAILED') confirmNotes.push(...plainReasons(s.checks?.reconcile?.reasons ?? []));
  if (s.reconcile === 'STALE') confirmNotes.push('A confirmação tem mais de 30 minutos. Repete-a antes de ativar.');
  const confirm: WizardStep = {
    key: 'CONFIRM',
    number: 2,
    title: 'Confirmar a conta',
    explanation: 'Comparamos o que o bot registou com a tua conta na Binance, para garantir que não há diferenças.',
    status: confirmLocked && s.reconcile === 'PENDING' ? 'locked' : fromCheck(s.reconcile),
    button: 'Confirmar a minha conta',
    enabled: !i.busy && allowed && !confirmLocked,
    notes: confirmNotes,
  };

  const activateNotes: string[] = [];
  let activateStatus: WizardStatus;
  if (armed) {
    activateStatus = 'done';
  } else {
    if (!allowed) activateNotes.push('Esta conta não está autorizada para o piloto.');
    if (s.read !== 'OK') activateNotes.push(s.read === 'STALE' ? 'A verificação da conta expirou: repete o passo 1.' : 'Primeiro verifica a tua conta (passo 1).');
    if (s.reconcile !== 'OK') activateNotes.push(s.reconcile === 'STALE' ? 'A confirmação da conta expirou: repete o passo 2.' : 'Depois confirma a tua conta (passo 2).');
    if (s.read === 'OK' && s.reconcile === 'OK') {
      if (s.readiness === 'PENDING') activateNotes.push(i.data.readinessError ?? 'A confirmar se está tudo pronto…');
      if (s.readiness === 'STALE') activateNotes.push('A verificação de segurança ficou desatualizada. Usa «Verificar outra vez».');
      if (s.readiness === 'FAILED' && s.readinessReport) activateNotes.push(...plainReasons(readinessArmBlockers(s.readinessReport)));
    }
    activateStatus = activateNotes.length ? (s.readiness === 'FAILED' && s.read === 'OK' && s.reconcile === 'OK' ? 'failed' : 'locked') : 'todo';
  }
  const activate: WizardStep = {
    key: 'ACTIVATE',
    number: 3,
    title: 'Ativar o piloto',
    explanation: armed
      ? 'O teu bot está ativo nesta conta.'
      : `Autoriza o bot a propor compras nesta conta, até ${limit == null ? '—' : usdt(limit)}. Pede o código da tua app de autenticação.`,
    status: activateStatus,
    button: 'Ativar o meu bot',
    enabled: !armed && !i.busy && activateNotes.length === 0,
    notes: activateNotes,
  };
  return [verify, confirm, activate];
}

/** A verificação de segurança do passo 3 pode ser repetida (só leitura) quando falta ou ficou desatualizada. */
export function canRecheckReadiness(i: ViewInput): boolean {
  const s = steps(i);
  return !i.busy && !isArmed(controlState(i)) && s.read === 'OK' && s.reconcile === 'OK' && s.readiness !== 'OK';
}

/** Ação separada depois de ativar: ligar a procura de oportunidades (interruptor único no servidor). */
export function searchAction(i: ViewInput): { visible: boolean; on: boolean; enabled: boolean; notes: string[] } {
  const st = controlState(i);
  const armed = isArmed(st);
  const on = i.strategy?.entriesEnabled === true;
  const notes: string[] = [];
  if (i.strategy == null) notes.push('A ler o estado da procura…');
  if (i.strategy && !i.strategy.strategyAccountIds.includes(i.data.id)) notes.push('Esta conta não está configurada para procurar oportunidades.');
  if (i.strategy?.blockers.length) notes.push(...plainReasons(i.strategy.blockers));
  return { visible: armed, on, enabled: armed && !on && !i.busy && notes.length === 0, notes };
}

// ─── Oportunidades e compras pendentes ─────────────────────────────────────

export const NO_OPPORTUNITY_TEXT = 'Ainda não encontrámos uma oportunidade que cumpra todas as regras de segurança. O bot continuará a aguardar.';
export const OPPORTUNITY_FOUND_TEXT = 'Oportunidade encontrada. Revê os detalhes antes de aprovar a compra.';

export type OpportunityKind = 'PROPOSED' | 'SENT' | 'UNCERTAIN' | 'POSITION' | 'NONE' | 'PREVIEW_VALID' | 'NOT_SEARCHING' | 'WAITING' | 'DATA_UNAVAILABLE';

export type OpportunityView = {
  kind: OpportunityKind;
  message: string;
  symbol: string | null;
  valueUsdt: number | null;
  reason: string | null;
  proposalState: string | null;
  approvalState: string | null;
  /** Moedas analisadas pela ordem do ranking (dados reais do servidor). */
  candidates: CandidateLine[];
  candidatesSource: 'BOT' | 'PREVIEW' | null;
};

function decisionFor(i: ViewInput, key: string): PilotDecision | null {
  const all = [...(i.data.history?.decisions ?? []), ...(i.data.detail?.decisions ?? [])];
  return all.find((d) => d.idempotencyKey === key) ?? null;
}

function approvalFor(i: ViewInput, intent: PilotIntent): string {
  const a = (i.data.history?.approvals ?? []).find((x) => x.idempotencyKey === intent.idempotencyKey);
  if (a) {
    const exp = a.expiresAt ? Date.parse(a.expiresAt) : NaN;
    if (Number.isFinite(exp) && i.nowMs >= exp) return 'A aprovação expirou sem envio.';
    return `Aprovada às ${new Date(a.approvedAt).toLocaleTimeString('pt-PT')} — o bot envia a ordem na próxima verificação.`;
  }
  if (isIntentExpired(intent.createdAt, i.data.detail?.safety?.intentMaxAgeMs, i.nowMs)) return 'A proposta expirou. Rejeita-a; o bot fará uma nova se ainda fizer sentido.';
  return 'Ainda não aprovada.';
}

const RUNNER_WAIT_TEXT: Readonly<Record<string, string>> = Object.freeze({
  ENTRY_COOLDOWN: 'O bot fez uma tentativa há pouco e espera alguns minutos antes de voltar a procurar.',
  DAILY_LIMIT: 'O limite diário de compras foi atingido. O bot volta a procurar amanhã.',
  INSUFFICIENT_BALANCE: 'O saldo disponível não chega para uma compra segura.',
});

export function opportunityView(i: ViewInput): OpportunityView {
  const st = controlState(i);
  const sa = strategyAccount(i);
  const r = steps(i).readinessReport;
  const intents = i.data.detail?.intents ?? [];
  const base = { symbol: null, valueUsdt: null, reason: null, proposalState: null, approvalState: null, candidates: [] as CandidateLine[], candidatesSource: null } as const;
  const botChecks = sa?.entryChecks ?? [];
  const fromIntent = (intent: PilotIntent, kind: OpportunityKind, message: string): OpportunityView => ({
    ...base,
    kind,
    message,
    symbol: intent.symbol,
    valueUsdt: Number.isFinite(intent.notional) ? intent.notional : null,
    reason: proposalReasonText(decisionFor(i, intent.idempotencyKey)?.reason),
    proposalState: intentPlain(intent.state),
    approvalState: intent.state === 'PENDING' ? approvalFor(i, intent) : null,
    candidates: candidateLines(botChecks, intent.symbol),
    candidatesSource: botChecks.length ? 'BOT' : null,
  });

  const uncertain = intents.find((x) => UNCERTAIN_STATES.has(x.state));
  if (uncertain) return fromIntent(uncertain, 'UNCERTAIN', 'Há uma ordem com resultado incerto. Não repitas a compra: é preciso verificá-la primeiro.');
  const pending = intents.find((x) => x.state === 'PENDING' && x.side === 'BUY');
  if (pending) return fromIntent(pending, 'PROPOSED', OPPORTUNITY_FOUND_TEXT);
  const sent = intents.find((x) => SENT_STATES.has(x.state));
  if (sent) return fromIntent(sent, 'SENT', 'A compra foi enviada à Binance. Ainda não há confirmação de execução.');
  if (sa?.position) {
    return {
      ...base,
      kind: 'POSITION',
      message: `Compra concluída. O bot está a acompanhar a posição em ${sa.position.symbol}.`,
      symbol: sa.position.symbol,
      proposalState: 'Executada',
    };
  }
  const searching = isArmed(st) && i.strategy?.entriesEnabled === true;
  if (searching && sa) {
    if (sa.state === 'NO_SIGNAL') {
      return { ...base, kind: 'NONE', message: NO_OPPORTUNITY_TEXT, candidates: candidateLines(botChecks, null), candidatesSource: botChecks.length ? 'BOT' : null };
    }
    if (RUNNER_WAIT_TEXT[sa.state]) return { ...base, kind: 'WAITING', message: RUNNER_WAIT_TEXT[sa.state] };
  }
  if (r?.entryPlan) {
    const plan = r.entryPlan;
    if (plan.state === 'ENTRY_DATA_UNAVAILABLE') return { ...base, kind: 'DATA_UNAVAILABLE', message: 'Faltam dados da Binance para avaliar oportunidades neste momento.' };
    const lines = candidateLines(plan.checks, plan.state === 'VALID_ENTRY' ? plan.symbol : null);
    if (plan.state === 'VALID_ENTRY' && plan.symbol) {
      const chosen = lines.find((l) => l.chosen);
      return {
        ...base,
        kind: 'PREVIEW_VALID',
        message: searching
          ? `Neste momento ${plan.symbol} cumpre todas as regras. O bot propõe a compra na próxima verificação.`
          : `Neste momento ${plan.symbol} cumpre todas as regras. O bot só propõe compras depois de ativado e com a procura ligada.`,
        symbol: plan.symbol,
        valueUsdt: chosen?.valueUsdt ?? null,
        candidates: lines,
        candidatesSource: 'PREVIEW',
      };
    }
    if (plan.state === 'NO_VALID_ENTRY' || plan.state === 'NO_CANDIDATES') {
      return { ...base, kind: 'NONE', message: NO_OPPORTUNITY_TEXT, candidates: lines, candidatesSource: lines.length ? 'PREVIEW' : null };
    }
  }
  return { ...base, kind: 'NOT_SEARCHING', message: isArmed(st) ? 'A procura de oportunidades está pausada.' : 'O bot ainda não está a procurar oportunidades.' };
}

export type PendingPurchase = {
  idempotencyKey: string;
  symbol: string;
  side: string;
  quantity: number;
  valueUsdt: number | null;
  reason: string;
  state: string;
  approval: string;
  expired: boolean;
  approved: boolean;
  canApprove: boolean;
  canReject: boolean;
};

export function pendingPurchases(i: ViewInput): PendingPurchase[] {
  const armed = isArmed(controlState(i));
  return pendingIntents(i).map((x) => {
    const expired = isIntentExpired(x.createdAt, i.data.detail?.safety?.intentMaxAgeMs, i.nowMs);
    const approved = (i.data.history?.approvals ?? []).some((a) => a.idempotencyKey === x.idempotencyKey);
    return {
      idempotencyKey: x.idempotencyKey,
      symbol: x.symbol,
      side: x.side,
      quantity: x.quantity,
      valueUsdt: Number.isFinite(x.notional) ? x.notional : null,
      reason: proposalReasonText(decisionFor(i, x.idempotencyKey)?.reason),
      state: intentPlain(x.state),
      approval: approvalFor(i, x),
      expired,
      approved,
      canApprove: armed && !expired && !approved && !i.busy,
      canReject: !i.busy,
    };
  });
}

/** Regras de risco e saída do servidor, em linguagem clara. */
export function riskRules(strategy: StrategyStatus | null, safety: PilotSafety | null): string[] {
  const p = strategy?.policy;
  const out: string[] = [];
  if (safety?.realSpotPilotMaxNotional != null) out.push(`No máximo ${usdt(safety.realSpotPilotMaxNotional)} investidos por conta.`);
  if (p) {
    out.push(`Uma posição de cada vez por conta.`);
    out.push(`Venda automática se o preço descer ${p.stopLossPct}% (stop loss).`);
    out.push(`Venda automática com ${p.takeProfitPct}% de lucro (take profit).`);
    out.push(`A partir de +${p.trailingActivatePct}%, vende se o preço recuar ${p.trailingGivebackPct}% desde o máximo.`);
  }
  out.push('Cada compra precisa da tua aprovação com o código da app de autenticação.');
  out.push('As vendas são feitas pela aplicação: não há ordem de proteção colocada na Binance. Falhas do serviço, da rede ou da exchange podem atrasar a venda e o preço pode sofrer slippage.');
  return out;
}

// ─── Controlos de segurança ────────────────────────────────────────────────

export function safetyControls(i: ViewInput) {
  const st = controlState(i);
  return {
    pauseEntries: !i.busy && i.strategy?.entriesEnabled === true,
    disarm: !i.busy && isArmed(st),
    kill: !i.busy && st != null && st !== 'DISABLED',
  };
}
