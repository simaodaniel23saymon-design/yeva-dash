/**
 * Spot Pilot do utilizador — funções puras sobre GET /api/spot-pilot/me e /accounts/:id/overview.
 *
 * O servidor é a fonte de verdade: valida o dono da conta, a autorização, o TOTP e os limites. Aqui só se traduz
 * o estado devolvido para português claro e se decide que botões fazem sentido. Sem dados, a vista diz que não sabe.
 */

import { PLAIN_REASON } from './spotPilotSimple'

// ─── Contrato do servidor ──────────────────────────────────────────────────

export type OwnerDisplayState = 'ACTIVE' | 'STARTING' | 'PAUSED' | 'BLOCKED' | 'INACTIVE'
export type PilotControlState = 'DISABLED' | 'ARMED' | 'ACTIVE' | 'PAUSED' | 'BLOCKED'

export type OwnerControl = {
  state: PilotControlState
  updatedAt: string | null
  reason: string | null
  autoExecution: { authorizedAt: string; maxNotionalQuote: number } | null
  autoExecutionReasons: string[]
}

export type OwnerDisplay = { state: OwnerDisplayState; reasons: string[] }

export type OwnerPlatform = {
  available: boolean
  blockers: string[]
  entriesEnabled: boolean
  loopRunning: boolean
  maxNotionalPerOrder?: number | null
}

export type OwnerPolicy = {
  maxPositions: number
  takeProfitPct: number
  stopLossPct: number
  trailingActivatePct: number
  trailingGivebackPct: number
}

export type OwnerAccountSummary = {
  id: string
  exchange: 'BINANCE'
  market: string | null
  accountType: string | null
  isActive: boolean
  connectionStatus: string | null
  eligibilityReasons: string[]
  control: OwnerControl
  display: OwnerDisplay
  engine: { state: string; reasons: string[]; lastTickAt: string | null; reconciledSinceBoot: boolean } | null
}

export type PilotMeResponse = { platform: OwnerPlatform; accounts: OwnerAccountSummary[]; policy: OwnerPolicy }

export type PositionCard = {
  symbol: string
  status: 'OPEN'
  quantity: number
  averageEntryPrice: number | null
  currentPrice: number | null
  priceStatus: 'LIVE' | 'UNAVAILABLE'
  investedQuote: number
  currentValueQuote: number | null
  changePct: number | null
  unrealizedPnlQuote: number | null
  realizedPnlQuote: number
  feesNotIncluded: boolean
  stopLossPrice: number | null
  takeProfitPrice: number | null
  openedAt: string | null
  lastFillAt: string | null
  updatedAt: string
  managedByStrategy: boolean
}

export type HistoryItem = {
  at: string
  side: 'BUY' | 'SELL'
  symbol: string
  state: string | null
  executed: boolean
  estimatedQuote: number | null
  executedQuantity: number | null
  executedQuote: number | null
  averagePrice: number | null
  reason: string
}

export type PilotOverview = {
  account: { id: string; exchange: 'BINANCE'; market: string | null; accountType: string | null; isActive: boolean; connectionStatus: string | null; eligibilityReasons: string[] }
  control: OwnerControl
  display: OwnerDisplay
  engine: { state: string; reasons: string[]; lastTickAt: string | null; reconciledSinceBoot: boolean; consecutiveErrors: number } | null
  platform: OwnerPlatform
  limits: {
    maxNotionalPerOrder: number | null
    maxOpenExposure: number | null
    maxBuyOrdersPer24h: number | null
    buyOrdersLast24h: number
    maxPositions: number
    stopLossPct: number
    takeProfitPct: number
  }
  balance: { status: string; usdtAvailable: number | null; usdtLocked: number | null; fetchedAt: string }
  exposure: { investedQuote: number; openPositions: number }
  pnl: { realizedQuote: number; unrealizedQuote: number | null; totalQuote: number | null; partial: boolean }
  positions: PositionCard[]
  uncertainOrders: number
  pendingOrders: number
  history: HistoryItem[]
  authorizationEvents: Array<{ action: string; fromState: string | null; toState: string; maxNotional: number | null; at: string }>
  fetchedAt: string
}

// ─── Formatação ────────────────────────────────────────────────────────────

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

export const usdtText = (n: number | null | undefined) => (finite(n) ? `${n.toFixed(2)} USDT` : '—')
export const signedUsdtText = (n: number | null | undefined) => (finite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(2)} USDT` : '—')
export const pctText = (n: number | null | undefined) => (finite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '—')
export const priceText = (n: number | null | undefined) => {
  if (!finite(n)) return '—'
  const digits = n >= 100 ? 2 : n >= 1 ? 4 : 6
  return n.toFixed(digits)
}
export const timeText = (iso: string | null | undefined) => {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isFinite(t) ? new Date(t).toLocaleString('pt-PT') : '—'
}
export const pnlTone = (n: number | null | undefined): 'ok' | 'bad' | 'neutral' => (!finite(n) || n === 0 ? 'neutral' : n > 0 ? 'ok' : 'bad')

export const accountTitle = (a: { id: string }, index: number) => `Conta Binance ${index + 1} · ${a.id.slice(0, 8)}…`

// ─── Linguagem clara ───────────────────────────────────────────────────────

export const EMPTY_POSITIONS_TEXT = 'À procura de oportunidades válidas.'

const OWNER_REASON: Readonly<Record<string, string>> = Object.freeze({
  ...PLAIN_REASON,
  EXCHANGE_NOT_BINANCE: 'O piloto só funciona com contas Binance.',
  ACCOUNT_MARKET_NOT_SPOT: 'Esta ligação não é de Spot. O piloto só opera em Spot.',
  ACCOUNT_TYPE_NOT_REAL: 'Esta ligação é de demonstração ou só de leitura.',
  ACCOUNT_INACTIVE: 'Esta ligação à Binance está desativada.',
  ACCOUNT_STATUS_UNSUPPORTED: 'Esta ligação à Binance não está pronta (estado inválido).',
  ACCOUNT_NOT_OWNED: 'Esta conta não é tua.',
  AUTO_EXECUTION_NOT_AUTHORIZED: 'Ainda não ativaste o piloto nesta conta.',
  AUTO_EXECUTION_NOT_ACTIVE: 'O piloto desta conta está no modo antigo (aprovação por ordem). Ativa novamente para passar à execução automática.',
  AUTO_EXECUTION_OWNER_MISMATCH: 'A autorização desta conta pertence a outro utilizador. Ativa novamente.',
  AUTO_EXECUTION_LIMIT_INVALID: 'A autorização guardada não tem um limite válido. Ativa novamente.',
  AUTO_EXECUTION_DATE_INVALID: 'A autorização guardada é inválida. Ativa novamente.',
  PILOT_CAPACITY_REACHED: 'O piloto atingiu o número máximo de contas neste momento. Tenta mais tarde.',
  PILOT_LIMIT_UNAVAILABLE: 'O limite por ordem não está configurado no servidor.',
  RISK_ACKNOWLEDGEMENT_REQUIRED: 'Tens de confirmar que leste os riscos.',
  READ_CHECK_NOT_RUN: 'Não foi possível verificar a tua conta Binance.',
  READ_CHECK_FAILED: 'A verificação da tua conta Binance falhou.',
  RECONCILE_NOT_RUN: 'Não foi possível confirmar o estado da conta com a Binance.',
  RECONCILE_FAILED: 'A confirmação com a Binance encontrou diferenças.',
  MISMATCH_STATE_UNKNOWN: 'Não foi possível confirmar se há diferenças com a Binance.',
  PILOT_PAUSED: 'Pausaste as novas compras.',
  ENGINE_NOT_RUNNING: 'O motor do piloto não está a correr no servidor.',
  ENGINE_ERRORS: 'O motor encontrou erros repetidos nesta conta e parou de comprar até ser resolvido.',
  WAITING_FIRST_PASS: 'O motor ainda não passou por esta conta.',
  STRATEGY_GATED: 'A plataforma está a bloquear novas ordens neste momento.',
  STRATEGY_AUTHORIZATION_REQUIRED: 'Falta a tua autorização nesta conta.',
  STRATEGY_RECONCILIATION_REQUIRED: 'É preciso confirmar o estado da conta com a Binance antes de continuar.',
  STRATEGY_EXIT_BLOCKED: 'Uma venda automática está bloqueada. As compras param até ser resolvido.',
  ALREADY_ACTIVE: 'O piloto já está ativo nesta conta.',
  ACTIVATION_IN_PROGRESS: 'Já há uma ativação em curso nesta conta.',
  PILOT_NOT_ACTIVE: 'O piloto não está ativo nesta conta.',
  PILOT_NOT_PAUSED: 'O piloto não está em pausa.',
  ACTIVATION_REQUIRED: 'É preciso ativar o piloto novamente.',
  TOTP_REQUIRED: 'Introduz o código de 6 dígitos da aplicação autenticadora.',
  TOTP_INVALID: 'Código inválido. Confirma o código atual na aplicação autenticadora.',
  TOTP_REPLAYED: 'Este código já foi usado. Aguarda o próximo código.',
  TOTP_LOCKED: 'Demasiadas tentativas com código errado. Aguarda 15 minutos.',
  TOTP_NOT_CONFIGURED: 'Ativa primeiro a verificação em dois passos nas Definições.',
  TOTP_UNAVAILABLE: 'Não foi possível validar o código agora. Tenta novamente.',
  ACCOUNT_NOT_FOUND_ROUTE: 'Conta não encontrada.',
  PILOT_STORE_UNAVAILABLE: 'O servidor não conseguiu ler o estado do piloto. Tenta novamente.',
})

const GENERIC_REASON = 'Há uma verificação de segurança por cumprir (vê os Detalhes técnicos).'

/** Frases claras e sem repetidos; aceita códigos com prefixo PLATFORM_ / STRATEGY_. */
export function ownerReasonText(codes: readonly string[]): string[] {
  const out = codes.map((c) => OWNER_REASON[c] ?? OWNER_REASON[c.replace(/^PLATFORM_/, '')] ?? GENERIC_REASON)
  return [...new Set(out)]
}

// ─── Estado mostrado ───────────────────────────────────────────────────────

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral'
export type StatusView = { label: string; message: string; tone: Tone; notes: string[] }

/** Estado do cartão a partir do estado calculado pelo servidor (nunca "ativo" com o motor parado ou bloqueado). */
export function ownerStatusView(display: OwnerDisplay | null | undefined, platform: Pick<OwnerPlatform, 'entriesEnabled'> | null | undefined): StatusView {
  if (!display) return { label: 'A carregar', message: 'A ler o estado do piloto…', tone: 'neutral', notes: [] }
  switch (display.state) {
    case 'ACTIVE':
      return platform && platform.entriesEnabled === false
        ? { label: 'Ativo · entradas pausadas pela plataforma', message: 'Sem novas compras de momento. As posições abertas continuam a ser geridas.', tone: 'warn', notes: [] }
        : { label: 'Ativo', message: 'O piloto compra e vende automaticamente dentro dos teus limites.', tone: 'ok', notes: [] }
    case 'STARTING':
      return { label: 'A iniciar', message: 'Piloto ativado. O motor vai passar por esta conta dentro de instantes.', tone: 'ok', notes: [] }
    case 'PAUSED':
      return { label: 'Em pausa', message: 'Sem novas compras. As posições abertas continuam a ser geridas (vendas automáticas).', tone: 'neutral', notes: [] }
    case 'BLOCKED':
      return { label: 'Bloqueado', message: 'O piloto está impedido de operar nesta conta.', tone: 'bad', notes: ownerReasonText(display.reasons) }
    default:
      return { label: 'Inativo', message: 'O piloto não está a operar nesta conta.', tone: 'neutral', notes: ownerReasonText(display.reasons.filter((r) => r !== 'AUTO_EXECUTION_NOT_AUTHORIZED')) }
  }
}

export type OwnerActions = {
  activate: { visible: boolean; enabled: boolean; notes: string[] }
  pause: boolean
  resume: boolean
  deactivate: boolean
}

/** Que botões fazem sentido. O servidor volta a validar tudo em cada pedido. */
export function ownerActions(
  a: { control: OwnerControl; display: OwnerDisplay; eligibilityReasons: string[] },
  platform: Pick<OwnerPlatform, 'available' | 'blockers'> | null,
  busy: boolean
): OwnerActions {
  const c = a.control.state
  const authorized = a.control.autoExecution != null
  const needsActivation = a.display.state === 'INACTIVE' || (c === 'PAUSED' && !authorized)
  const notes = [...ownerReasonText(a.eligibilityReasons)]
  if (platform && !platform.available) notes.push(...ownerReasonText(platform.blockers))
  if (c === 'BLOCKED') notes.push(OWNER_REASON.PILOT_BLOCKED)
  const uniqueNotes = [...new Set(notes)]
  return {
    activate: { visible: needsActivation, enabled: needsActivation && !busy && c !== 'BLOCKED' && uniqueNotes.length === 0, notes: needsActivation ? uniqueNotes : [] },
    pause: !busy && c === 'ACTIVE' && authorized,
    resume: !busy && c === 'PAUSED' && authorized,
    deactivate: !busy && (c !== 'DISABLED' || authorized),
  }
}

/** Erro de uma ação (ativar/pausar/…) em frases claras; nunca inclui o código TOTP. */
export function ownerActionError(e: unknown): { message: string; notes: string[]; code: string | null } {
  const res = (e as { response?: { status?: number; data?: { error?: unknown; reasons?: unknown } } })?.response
  if (!res) return { message: 'Não foi possível contactar o servidor. Tenta novamente.', notes: [], code: null }
  const code = typeof res.data?.error === 'string' ? res.data.error : null
  const reasons = Array.isArray(res.data?.reasons) ? res.data.reasons.filter((r): r is string => typeof r === 'string') : []
  if (res.status === 404) return { message: 'Conta não encontrada.', notes: [], code }
  if (code === 'ACTIVATION_PRECONDITIONS_FAILED') return { message: 'Não foi possível ativar: há verificações por cumprir.', notes: ownerReasonText(reasons), code }
  if (code && OWNER_REASON[code]) return { message: OWNER_REASON[code], notes: ownerReasonText(reasons), code }
  if (res.status === 429) return { message: 'Demasiados pedidos. Aguarda um pouco e tenta novamente.', notes: [], code }
  return { message: 'A ação não foi concluída. Tenta novamente.', notes: ownerReasonText(reasons), code }
}

// ─── Histórico ─────────────────────────────────────────────────────────────

/** Enviada ≠ executada: só "executada" com fills confirmados pelo servidor. */
export const ORDER_STATE_TEXT: Readonly<Record<string, string>> = Object.freeze({
  PENDING: 'Criada (ainda não enviada)',
  SUBMITTING: 'A enviar à Binance',
  SUBMITTED: 'Enviada — execução por confirmar',
  UNKNOWN: 'Resultado incerto — em verificação',
  REQUIRES_RECONCILIATION: 'Em confirmação com a Binance',
  PARTIALLY_FILLED: 'Executada em parte',
  FILLED: 'Executada',
  SETTLED: 'Executada',
  CANCELLED: 'Cancelada',
  REJECTED: 'Rejeitada pela Binance',
})

export function historyLine(h: HistoryItem): { title: string; state: string; value: string; tone: Tone } {
  const side = h.side === 'BUY' ? 'Compra' : 'Venda'
  const state = h.state ? ORDER_STATE_TEXT[h.state] ?? 'Estado desconhecido' : 'Estado desconhecido'
  const value = h.executed && finite(h.executedQuote) ? `${usdtText(h.executedQuote)} a ${priceText(h.averagePrice)}` : `≈ ${usdtText(h.estimatedQuote)} (estimado)`
  const tone: Tone = h.executed ? 'ok' : h.state === 'REJECTED' || h.state === 'CANCELLED' ? 'neutral' : h.state === 'UNKNOWN' || h.state === 'REQUIRES_RECONCILIATION' ? 'warn' : 'neutral'
  return { title: `${side} ${h.symbol}`, state, value, tone }
}

export const AUTH_EVENT_TEXT: Readonly<Record<string, string>> = Object.freeze({
  ACTIVATE: 'Piloto ativado',
  PAUSE: 'Novas compras pausadas',
  RESUME: 'Novas compras retomadas',
  DEACTIVATE: 'Piloto desativado',
})

// ─── Saldo ─────────────────────────────────────────────────────────────────

export function balanceText(b: PilotOverview['balance'] | null | undefined): string {
  if (!b) return '—'
  if (b.status === 'OK') return usdtText(b.usdtAvailable)
  if (b.status === 'CREDENTIALS_INVALID') return 'Chave da Binance inválida'
  return 'Indisponível neste momento'
}

/** Regras do piloto em linguagem clara (valores do servidor). */
export function ownerRules(limits: PilotOverview['limits'] | null, policy: OwnerPolicy | null): string[] {
  const out: string[] = []
  if (limits && finite(limits.maxNotionalPerOrder)) out.push(`No máximo ${usdtText(limits.maxNotionalPerOrder)} por compra.`)
  if (limits?.maxPositions || policy?.maxPositions) out.push(`Até ${limits?.maxPositions ?? policy?.maxPositions} posição aberta de cada vez nesta conta.`)
  const sl = limits?.stopLossPct ?? policy?.stopLossPct
  const tp = limits?.takeProfitPct ?? policy?.takeProfitPct
  if (finite(sl)) out.push(`Venda automática se o preço descer ${sl}% (stop loss).`)
  if (finite(tp)) out.push(`Venda automática com ${tp}% de lucro (take profit).`)
  out.push('Só Spot: sem Futures, sem alavancagem, sem levantamentos nem transferências.')
  out.push('As vendas são feitas pelo servidor (não há ordem de proteção na Binance). Falhas de rede ou da exchange podem atrasar uma venda e o preço final pode variar.')
  return out
}
