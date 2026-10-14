import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OtpCodeInput from '../ui/OtpCodeInput'
import { api } from '../../lib/api'
import { TOTP_LENGTH } from '../../utils/totpCode'
import { ownerActionError, ownerReasonText, usdtText } from '../../utils/spotPilotOwner'

/**
 * Spot Pilot — controlos da PLATAFORMA (só administradores). Só flags globais e contagens agregadas: o servidor não
 * devolve ids, saldos nem posições de outros utilizadores. Cada conta continua a exigir a autorização do seu dono.
 */
type PlatformStatus = {
  platform: {
    spotLiveEnabled: boolean
    spotKillSwitch: boolean
    cexLiveWriteEnabledInBuild: boolean
    realSpotPilotEnabled: boolean
    maxNotionalPerOrder: number | null
    maxNotionalCap: number | null
    maxBuyOrdersPer24h: number | null
    blockers: string[]
  }
  engine: { loopRunning: boolean; intervalMs: number; entriesEnabled: boolean; entriesStateLoaded: boolean; enrolledAccounts: number; accountsByState: Record<string, number> }
}

const yesNo = (b: boolean | null | undefined) => (b == null ? '—' : b ? 'Sim' : 'Não')

export default function SpotPilotAdminPanel() {
  const [status, setStatus] = useState<PlatformStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string; notes: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [totp, setTotp] = useState('')

  const load = useCallback(async () => {
    try {
      setStatus((await api.get<PlatformStatus>('/spot-pilot/platform/status')).data)
      setError(null)
    } catch (e) {
      setError(ownerActionError(e).message)
    }
  }, [])

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0)
    const t = window.setInterval(() => void load(), 30_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(t)
    }
  }, [load])

  async function setEntries(enabled: boolean, code?: string) {
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      await api.post('/spot-pilot/platform/entries', enabled ? { enabled, totpCode: code } : { enabled }, { skipAuthRetry: true })
      setMessage({ ok: true, text: enabled ? 'Novas entradas retomadas na plataforma.' : 'Novas entradas pausadas em toda a plataforma. As saídas continuam.', notes: [] })
      setResumeOpen(false)
    } catch (e) {
      const err = ownerActionError(e)
      setMessage({ ok: false, text: err.message, notes: err.notes })
    } finally {
      setTotp('')
      setBusy(false)
      await load()
    }
  }

  const p = status?.platform
  const e = status?.engine

  return (
    <section className="space-y-3 border border-border1 bg-bg1 p-4" data-testid="spot-pilot-platform-panel">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold text-text1">Spot Pilot · plataforma</h2>
        <Link to="/spot-pilot" className="ml-auto border border-border2 px-2 py-1 text-[11px] text-text2">
          As minhas contas
        </Link>
      </header>
      {error && <p className="text-[12px] text-red">{error}</p>}
      {p && e && (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-3">
            <dt className="text-text3">Piloto ligado</dt>
            <dd className="text-text1">{yesNo(p.realSpotPilotEnabled)}</dd>
            <dt className="text-text3">Ordens reais Spot</dt>
            <dd className="text-text1">{yesNo(p.spotLiveEnabled)}</dd>
            <dt className="text-text3">Kill switch</dt>
            <dd className={p.spotKillSwitch ? 'text-red' : 'text-text1'}>{p.spotKillSwitch ? 'Ligado' : 'Desligado'}</dd>
            <dt className="text-text3">Limite por compra</dt>
            <dd className="text-text1">{usdtText(p.maxNotionalPerOrder)}</dd>
            <dt className="text-text3">Compras / 24h por conta</dt>
            <dd className="text-text1">{p.maxBuyOrdersPer24h ?? '—'}</dd>
            <dt className="text-text3">Motor a correr</dt>
            <dd className="text-text1">{yesNo(e.loopRunning)}</dd>
            <dt className="text-text3">Novas entradas</dt>
            <dd className={e.entriesEnabled ? 'text-green' : 'text-gold'}>{e.entriesEnabled ? 'Ligadas' : 'Pausadas'}</dd>
            <dt className="text-text3">Contas ativadas</dt>
            <dd className="text-text1">{e.enrolledAccounts}</dd>
            <dt className="text-text3">Por estado</dt>
            <dd className="font-mono text-[11px] text-text2">
              {Object.entries(e.accountsByState)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ') || '—'}
            </dd>
          </dl>
          {p.blockers.length > 0 && (
            <ul className="text-[12px] text-gold">
              {ownerReasonText(p.blockers).map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {e.entriesEnabled ? (
              <button type="button" disabled={busy} onClick={() => void setEntries(false)} className="border border-gold-30 px-3 py-1.5 text-[12px] text-gold disabled:opacity-40">
                Pausar novas entradas (plataforma)
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => setResumeOpen(true)} className="border border-cyan-30 bg-cyan-dim px-3 py-1.5 text-[12px] text-cyan disabled:opacity-40">
                Retomar novas entradas (plataforma)
              </button>
            )}
          </div>
          {resumeOpen && !e.entriesEnabled && (
            <div className="space-y-2 border border-border2 bg-bg2 p-3">
              <p className="text-[12px] text-text2">Retomar exige o teu código de 6 dígitos. Cada conta só compra se o dono a tiver ativado.</p>
              <OtpCodeInput id="pilot-platform-totp" value={totp} onChange={setTotp} onComplete={(code) => void setEntries(true, code)} busy={busy} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setResumeOpen(false)} className="border border-border2 px-3 py-1.5 text-[12px] text-text2">
                  Cancelar
                </button>
                <button type="button" disabled={busy || totp.length !== TOTP_LENGTH} onClick={() => void setEntries(true, totp)} className="border border-cyan-30 px-3 py-1.5 text-[12px] text-cyan disabled:opacity-40">
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {message && (
        <div className={`border p-2.5 text-[12px] ${message.ok ? 'border-green/40 text-green' : 'border-red-30 text-red'}`}>
          <p>{message.text}</p>
          {message.notes.map((n) => (
            <p key={n}>• {n}</p>
          ))}
        </div>
      )}
    </section>
  )
}
