/**
 * Aprovação de ordens do Real Spot Pilot — contrato de POST /api/spot-pilot/accounts/:id/approve.
 *
 * Pedido: { idempotencyKey, totpCode } com totpCode = string de 6 dígitos (TOTP do admin que aprova).
 * Resposta OK: { ok, approval, expiresAt, orderExecution: false }. Erros: { error: CODE }.
 * Uma tentativa = um pedido: sem repetição automática (nem pelo refresh de sessão em 401).
 * O código TOTP nunca é guardado, registado nem devolvido nas mensagens.
 */

export const PILOT_TOTP_LENGTH = 6;
const TOTP_RE = /^\d{6}$/;

/** Mantém só dígitos e corta a 6 (entrada controlada do campo). */
export function sanitizeTotpInput(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '').slice(0, PILOT_TOTP_LENGTH);
}

export type TotpCheck = { ok: true } | { ok: false; message: string };

/** Validação local antes de enviar: um código mal formado conta como falha no servidor (bloqueio após 5). */
export function checkTotpCode(code: string): TotpCheck {
  const c = String(code ?? '').trim();
  if (!c) return { ok: false, message: 'Indica o código de 6 dígitos da tua app de autenticação.' };
  if (!TOTP_RE.test(c)) return { ok: false, message: 'O código TOTP tem exatamente 6 dígitos.' };
  return { ok: true };
}

/** Códigos devolvidos pela rota de aprovação (pilot.routes.ts e pilot-approval-totp.ts). */
export const PILOT_APPROVE_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  TOTP_REQUIRED: 'O servidor não recebeu o código TOTP. Indica o código de 6 dígitos.',
  TOTP_NOT_CONFIGURED: 'A tua conta não tem 2FA ativo. Ativa-o em Definições → Autenticação 2FA antes de aprovar.',
  TOTP_INVALID: 'Código TOTP inválido. Confirma a hora do dispositivo e usa o código atual.',
  TOTP_REPLAYED: 'Este código TOTP já foi usado. Espera pelo próximo código da app.',
  TOTP_LOCKED: 'Demasiadas tentativas falhadas. A aprovação está bloqueada durante até 15 minutos.',
  TOTP_UNAVAILABLE: 'Não foi possível verificar o TOTP neste momento. Nada foi aprovado; tenta mais tarde.',
  ACCOUNT_NOT_FOUND: 'Conta não encontrada.',
  INTENT_NOT_FOR_ACCOUNT: 'Este intent não pertence a esta conta.',
  PILOT_NOT_ARMED: 'O piloto desta conta não está ARMED nem ACTIVE. Nada foi aprovado.',
  INTENT_NOT_FOUND: 'Intent não encontrado.',
  INTENT_NOT_PENDING: 'O intent já não está pendente.',
  INTENT_EXPIRED: 'O intent expirou. Rejeita-o; é preciso um novo pedido de ordem.',
  ALREADY_APPROVED: 'Este intent já tinha sido aprovado. Não foi criada uma segunda aprovação.',
  PILOT_STORE_UNAVAILABLE: 'Armazenamento do piloto indisponível. Atualiza o detalhe antes de tentar de novo.',
  PILOT_ERROR: 'Erro no servidor do piloto. Atualiza o detalhe antes de tentar de novo.',
});

/** Motivos de decisão do executor/Risk Guard relacionados com aprovação. */
export const PILOT_APPROVAL_REASON_LABELS: Readonly<Record<string, string>> = Object.freeze({
  APPROVAL_EXPIRED: 'aprovação expirada',
  APPROVAL_AGE_UNKNOWN: 'idade da aprovação desconhecida',
  FIRST_ORDER_APPROVAL_REQUIRED: 'primeira ordem exige aprovação',
  ORDER_APPROVAL_REQUIRED: 'ordem exige aprovação',
  APPROVAL_ALREADY_USED: 'aprovação já consumida',
  APPROVAL_MISSING: 'aprovação em falta',
  APPROVAL_LOOKUP_FAILED: 'leitura da aprovação falhou',
  APPROVAL_CONSUMED: 'aprovação consumida',
  SELF_APPROVED: 'autoaprovação',
  APPROVED_BY_OTHER_ADMIN: 'aprovada por outro admin',
});

export function pilotReasonLabel(code: string): string {
  const label = PILOT_APPROVAL_REASON_LABELS[code];
  return label ? `${code} (${label})` : code;
}

export const NO_RESPONSE_MESSAGE =
  'Sem resposta do servidor. A aprovação pode ou não ter sido registada: atualiza o detalhe antes de tentar de novo. O servidor nunca cria uma segunda aprovação para o mesmo intent.';

export type ApprovalExpiry = { expiresAt: string; expired: boolean };

/** Expiração de uma aprovação (approvedAt + approvalTtlMs do servidor). */
export function approvalExpiry(approvedAt: string | null | undefined, ttlMs: number | null | undefined, nowMs: number): ApprovalExpiry | null {
  const at = Date.parse(String(approvedAt ?? ''));
  if (!Number.isFinite(at) || typeof ttlMs !== 'number' || !(ttlMs > 0)) return null;
  const exp = at + ttlMs;
  return { expiresAt: new Date(exp).toISOString(), expired: nowMs >= exp };
}

/** Intent mais velho do que intentMaxAgeMs: o servidor responde INTENT_EXPIRED. */
export function isIntentExpired(createdAt: string, intentMaxAgeMs: number | null | undefined, nowMs: number): boolean {
  const at = Date.parse(createdAt);
  if (!Number.isFinite(at) || typeof intentMaxAgeMs !== 'number' || !(intentMaxAgeMs > 0)) return false;
  return nowMs - at > intentMaxAgeMs;
}

export type ApproveOutcome =
  | { kind: 'APPROVED'; message: string; expiresAt: string | null }
  | { kind: 'INVALID_INPUT'; message: string }
  | { kind: 'REFUSED'; status: number; code: string | null; message: string; expiry: ApprovalExpiry | null }
  | { kind: 'NO_RESPONSE'; message: string };

export type ApprovePost = (
  url: string,
  body: { idempotencyKey: string; totpCode: string },
  config: { skipAuthRetry: true }
) => Promise<{ data?: { expiresAt?: unknown } }>;

type HttpErrorLike = { response?: { status?: number; data?: { error?: unknown; approval?: { approvedAt?: unknown } } } };

const CODE_RE = /^[A-Z][A-Z0-9_]{2,63}$/;
const UNCERTAIN_HTTP_STATUS = new Set([502, 503, 504]);

function refusal(err: HttpErrorLike, approvalTtlMs: number | null | undefined, nowMs: number): ApproveOutcome {
  const status = Number(err.response?.status ?? 0);
  const data = err.response?.data;
  const raw = typeof data?.error === 'string' ? data.error : '';
  const code = CODE_RE.test(raw) ? raw : null;

  if (code === 'ALREADY_APPROVED') {
    const expiry = approvalExpiry(typeof data?.approval?.approvedAt === 'string' ? data.approval.approvedAt : null, approvalTtlMs, nowMs);
    const message = expiry?.expired
      ? `${PILOT_APPROVE_ERROR_MESSAGES.ALREADY_APPROVED} Essa aprovação já expirou (APPROVAL_EXPIRED): o executor recusa-a; rejeita o intent e cria um novo pedido.`
      : PILOT_APPROVE_ERROR_MESSAGES.ALREADY_APPROVED;
    return { kind: 'REFUSED', status, code, message, expiry };
  }
  if (code && PILOT_APPROVE_ERROR_MESSAGES[code]) {
    return { kind: 'REFUSED', status, code, message: PILOT_APPROVE_ERROR_MESSAGES[code], expiry: null };
  }
  // Proxy/gateway sem código do backend: o pedido pode ter sido processado antes da falha.
  if (UNCERTAIN_HTTP_STATUS.has(status)) return { kind: 'NO_RESPONSE', message: NO_RESPONSE_MESSAGE };
  if (status === 401) return { kind: 'REFUSED', status, code: null, message: 'Sessão expirada ou sem autenticação. Volta a iniciar sessão; nada foi aprovado.', expiry: null };
  if (status === 403) return { kind: 'REFUSED', status, code: null, message: 'Apenas administradores podem aprovar ordens do piloto.', expiry: null };
  return {
    kind: 'REFUSED',
    status,
    code,
    message: `Aprovação recusada (HTTP ${status || '?'}${code ? ` · ${code}` : ''}). Atualiza o detalhe antes de tentar de novo.`,
    expiry: null,
  };
}

/**
 * Envia UMA aprovação. Nunca lança e nunca repete. Validação local antes de qualquer pedido.
 * Sem resposta (rede/timeout) ou 502/503/504 sem código ⇒ NO_RESPONSE: o resultado é incerto e não se reenvia.
 */
export async function submitPilotApproval(
  post: ApprovePost,
  input: { accountId: string; idempotencyKey: string; totpCode: string; approvalTtlMs?: number | null; nowMs?: number }
): Promise<ApproveOutcome> {
  const check = checkTotpCode(input.totpCode);
  if (!check.ok) return { kind: 'INVALID_INPUT', message: check.message };
  if (!input.accountId || !input.idempotencyKey) return { kind: 'INVALID_INPUT', message: 'Intent ou conta em falta.' };

  const url = `/spot-pilot/accounts/${encodeURIComponent(input.accountId)}/approve`;
  try {
    const res = await post(url, { idempotencyKey: input.idempotencyKey, totpCode: input.totpCode.trim() }, { skipAuthRetry: true });
    const expiresAt = typeof res?.data?.expiresAt === 'string' ? res.data.expiresAt : null;
    return {
      kind: 'APPROVED',
      expiresAt,
      message: expiresAt
        ? `Ordem aprovada (não enviada daqui). A aprovação expira às ${new Date(expiresAt).toLocaleTimeString('pt-PT')}.`
        : 'Ordem aprovada (não enviada daqui).',
    };
  } catch (err) {
    const e = err as HttpErrorLike;
    if (!e || typeof e !== 'object' || !e.response) return { kind: 'NO_RESPONSE', message: NO_RESPONSE_MESSAGE };
    return refusal(e, input.approvalTtlMs, input.nowMs ?? Date.now());
  }
}

export const DETAIL_REFRESH_FAILED_NOTE = 'Não foi possível atualizar o detalhe da conta.';

/**
 * Uma tentativa de aprovação seguida de UMA atualização do detalhe.
 * A mensagem final é sempre a do resultado da aprovação (em especial o aviso de resultado incerto):
 * uma falha na atualização só acrescenta uma nota e nunca dispara novo pedido de aprovação.
 */
export async function approveThenRefresh(
  submit: () => Promise<ApproveOutcome>,
  refresh: () => Promise<void>
): Promise<{ outcome: ApproveOutcome; message: string; refreshFailed: boolean }> {
  const outcome = await submit();
  let refreshFailed = false;
  try {
    await refresh();
  } catch {
    refreshFailed = true;
  }
  return { outcome, refreshFailed, message: refreshFailed ? `${outcome.message} ${DETAIL_REFRESH_FAILED_NOTE}` : outcome.message };
}
