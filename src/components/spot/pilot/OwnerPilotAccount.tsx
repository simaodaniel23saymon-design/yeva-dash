import {
  accountTitle,
  AUTH_EVENT_TEXT,
  balanceText,
  EMPTY_POSITIONS_TEXT,
  historyLine,
  ownerActions,
  ownerRules,
  ownerStatusView,
  pctText,
  pnlTone,
  priceText,
  signedUsdtText,
  timeText,
  usdtText,
  type OwnerAccountSummary,
  type OwnerPlatform,
  type OwnerPolicy,
  type PilotOverview,
  type PositionCard,
  type Tone,
} from '../../../utils/spotPilotOwner'

const TONE_TEXT: Record<Tone, string> = { ok: 'text-green', warn: 'text-gold', bad: 'text-red', neutral: 'text-text2' }
const TONE_BORDER: Record<Tone, string> = { ok: 'border-green/40', warn: 'border-gold-30', bad: 'border-red-30', neutral: 'border-border2' }

export type OwnerAccountMessage = { ok: boolean; text: string; notes: string[] } | null

type Props = {
  index: number
  summary: OwnerAccountSummary
  overview: PilotOverview | null
  overviewError: string | null
  platform: OwnerPlatform | null
  policy: OwnerPolicy | null
  busy: boolean
  message: OwnerAccountMessage
  onActivate: () => void
  onPause: () => void
  onResume: () => void
  onDeactivate: () => void
}

function Stat({ label, value, tone = 'neutral', hint }: { label: string; value: string; tone?: Tone; hint?: string }) {
  return (
    <div className="border border-border1 bg-bg2 p-2.5">
      <div className="text-[11px] text-text3">{label}</div>
      <div className={`font-mono text-[14px] font-semibold ${tone === 'neutral' ? 'text-text1' : TONE_TEXT[tone]}`}>{value}</div>
      {hint && <div className="text-[10px] text-text3">{hint}</div>}
    </div>
  )
}

function PositionCardView({ p }: { p: PositionCard }) {
  const tone = pnlTone(p.unrealizedPnlQuote)
  return (
    <article className="border border-border1 bg-bg2 p-3" data-testid="pilot-position-card">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-mono text-[14px] font-semibold text-text1">{p.symbol}</h4>
        <span className={`font-mono text-[13px] ${TONE_TEXT[tone]}`}>{pctText(p.changePct)}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-text3">Investido</dt>
        <dd className="text-right font-mono text-text1">{usdtText(p.investedQuote)}</dd>
        <dt className="text-text3">Valor atual</dt>
        <dd className="text-right font-mono text-text1">{p.priceStatus === 'LIVE' ? usdtText(p.currentValueQuote) : 'Preço indisponível'}</dd>
        <dt className="text-text3">PnL não realizado</dt>
        <dd className={`text-right font-mono ${TONE_TEXT[tone]}`}>{signedUsdtText(p.unrealizedPnlQuote)}</dd>
        <dt className="text-text3">Preço de entrada</dt>
        <dd className="text-right font-mono text-text1">{priceText(p.averageEntryPrice)}</dd>
        <dt className="text-text3">Preço atual</dt>
        <dd className="text-right font-mono text-text1">{priceText(p.currentPrice)}</dd>
        <dt className="text-text3">Stop loss / Take profit</dt>
        <dd className="text-right font-mono text-text1">
          {priceText(p.stopLossPrice)} / {priceText(p.takeProfitPrice)}
        </dd>
        <dt className="text-text3">Aberta em</dt>
        <dd className="text-right text-text2">{timeText(p.openedAt)}</dd>
      </dl>
      {!p.managedByStrategy && <p className="mt-2 text-[11px] text-gold">Posição manual: o piloto não a vende automaticamente.</p>}
      {p.feesNotIncluded && <p className="mt-1 text-[11px] text-text3">Comissões pagas noutro ativo (ex.: BNB) não incluídas no PnL.</p>}
    </article>
  )
}

export default function OwnerPilotAccount({ index, summary, overview, overviewError, platform, policy, busy, message, onActivate, onPause, onResume, onDeactivate }: Props) {
  const control = overview?.control ?? summary.control
  const display = overview?.display ?? summary.display
  const eligibility = overview?.account.eligibilityReasons ?? summary.eligibilityReasons
  const plat = overview?.platform ?? platform
  const status = ownerStatusView(display, plat)
  const actions = ownerActions({ control, display, eligibilityReasons: eligibility }, plat, busy)
  const searching = display.state === 'ACTIVE' && plat?.entriesEnabled !== false
  const positions = overview?.positions ?? []

  return (
    <section className={`space-y-3 border bg-bg1 p-4 ${TONE_BORDER[status.tone]}`} data-testid="owner-pilot-account">
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase text-text3">{accountTitle(summary, index)}</div>
          <h2 className={`text-[16px] font-semibold ${TONE_TEXT[status.tone]}`} data-testid="owner-pilot-status">
            {status.label}
          </h2>
          <p className="text-[12px] text-text2">{status.message}</p>
          {status.notes.map((n) => (
            <p key={n} className="text-[12px] text-text3">
              • {n}
            </p>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Saldo disponível" value={balanceText(overview?.balance)} />
        <Stat label="Exposição" value={usdtText(overview?.exposure.investedQuote)} hint={overview ? `${overview.exposure.openPositions} posição(ões) aberta(s)` : undefined} />
        <Stat label="PnL total" value={signedUsdtText(overview?.pnl.totalQuote)} tone={pnlTone(overview?.pnl.totalQuote)} hint={overview?.pnl.partial ? 'parcial: falta o preço de uma moeda' : undefined} />
        <Stat
          label="Limite por compra"
          value={usdtText(overview?.limits.maxNotionalPerOrder ?? control.autoExecution?.maxNotionalQuote ?? platform?.maxNotionalPerOrder ?? null)}
          hint={overview?.limits.maxBuyOrdersPer24h != null ? `${overview.limits.buyOrdersLast24h}/${overview.limits.maxBuyOrdersPer24h} compras nas últimas 24h` : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.activate.visible && (
          <button type="button" disabled={!actions.activate.enabled} onClick={onActivate} className="border border-gold bg-gold-dim px-4 py-2 text-[13px] font-semibold text-gold disabled:opacity-40">
            Ativar piloto automático
          </button>
        )}
        {actions.pause && (
          <button type="button" onClick={onPause} className="border border-border2 px-4 py-2 text-[13px] text-text1">
            Pausar novas compras
          </button>
        )}
        {actions.resume && (
          <button type="button" onClick={onResume} className="border border-cyan-30 bg-cyan-dim px-4 py-2 text-[13px] text-cyan">
            Retomar
          </button>
        )}
        {actions.deactivate && (
          <button type="button" onClick={onDeactivate} className="border border-red-30 px-4 py-2 text-[13px] text-red">
            Desativar
          </button>
        )}
      </div>
      {actions.activate.visible && actions.activate.notes.length > 0 && (
        <ul className="space-y-0.5 text-[12px] text-text3">
          {actions.activate.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}

      {message && (
        <div className={`border p-2.5 text-[12px] ${message.ok ? 'border-green/40 text-green' : 'border-red-30 bg-red-dim text-red'}`} role="status">
          <p>{message.text}</p>
          {message.notes.map((n) => (
            <p key={n} className="text-text2">
              • {n}
            </p>
          ))}
        </div>
      )}
      {overviewError && <p className="text-[12px] text-red">{overviewError}</p>}
      {overview && overview.uncertainOrders > 0 && (
        <p className="border border-gold-30 bg-gold-dim p-2.5 text-[12px] text-gold">Há uma ordem com resultado em verificação com a Binance. O piloto não a repete; aguarda a confirmação.</p>
      )}

      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-text1">Posições abertas</h3>
        {positions.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {positions.map((p) => (
              <PositionCardView key={p.symbol} p={p} />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-text2" data-testid="pilot-empty-positions">
            {searching ? EMPTY_POSITIONS_TEXT : overview ? 'Sem posições abertas.' : 'A carregar…'}
          </p>
        )}
      </div>

      {overview && overview.history.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-text1">Últimas ordens</h3>
          <ul className="divide-y divide-border1 border border-border1">
            {overview.history.slice(0, 10).map((h, i) => {
              const line = historyLine(h)
              return (
                <li key={`${h.at}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 px-2.5 py-1.5 text-[12px]">
                  <span className="text-text1">{line.title}</span>
                  <span className={TONE_TEXT[line.tone]}>{line.state}</span>
                  <span className="font-mono text-text2">{line.value}</span>
                  <span className="text-text3">{timeText(h.at)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <details className="border border-border1 bg-bg2 p-2.5 text-[12px] text-text2">
        <summary className="cursor-pointer text-text1">Regras e detalhes técnicos</summary>
        <ul className="mt-2 space-y-0.5">
          {ownerRules(overview?.limits ?? null, policy).map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
        <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
          <dt className="text-text3">Conta</dt>
          <dd className="break-all">{summary.id}</dd>
          <dt className="text-text3">Controlo</dt>
          <dd>{control.state}</dd>
          <dt className="text-text3">Autorizado em</dt>
          <dd>{timeText(control.autoExecution?.authorizedAt)}</dd>
          <dt className="text-text3">Motor</dt>
          <dd>{overview?.engine?.state ?? summary.engine?.state ?? '—'}</dd>
          <dt className="text-text3">Motivos</dt>
          <dd className="break-all">{[...display.reasons, ...(overview?.engine?.reasons ?? summary.engine?.reasons ?? [])].join(', ') || '—'}</dd>
          <dt className="text-text3">Última passagem</dt>
          <dd>{timeText(overview?.engine?.lastTickAt ?? summary.engine?.lastTickAt)}</dd>
          <dt className="text-text3">PnL realizado</dt>
          <dd>{signedUsdtText(overview?.pnl.realizedQuote)}</dd>
          <dt className="text-text3">PnL não realizado</dt>
          <dd>{signedUsdtText(overview?.pnl.unrealizedQuote)}</dd>
          <dt className="text-text3">Ordens pendentes</dt>
          <dd>{overview?.pendingOrders ?? '—'}</dd>
          <dt className="text-text3">Atualizado</dt>
          <dd>{timeText(overview?.fetchedAt)}</dd>
        </dl>
        {overview && overview.authorizationEvents.length > 0 && (
          <ul className="mt-3 space-y-0.5">
            {overview.authorizationEvents.map((e, i) => (
              <li key={`${e.at}-${i}`}>
                {timeText(e.at)} · {AUTH_EVENT_TEXT[e.action] ?? e.action}
                {e.maxNotional != null ? ` (${usdtText(e.maxNotional)})` : ''}
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  )
}
