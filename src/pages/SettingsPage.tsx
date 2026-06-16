import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { buildReferralLink } from '../utils/referral'

interface Settings {
  email: string
  name?: string
  referralCode: string
  plan: string
  twoFAEnabled: boolean
  telegramLinked: boolean
  createdAt: string
}

interface TelegramLink { code: string; link: string }

// ── Helpers visuais ─────────────────────────────────────────────────────────
const Badge = ({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) => (
  <span className={`font-mono text-[9px] px-2 py-0.5 border tracking-wider uppercase ${on ? 'text-cyan bg-cyan-dim border-cyan-20' : 'text-gold border-gold-30 bg-gold-dim'}`}>
    {on ? labelOn : labelOff}
  </span>
)

const Btn = ({
  onClick, loading, variant = 'primary', children, disabled,
}: { onClick?: () => void; loading?: boolean; variant?: 'primary' | 'danger' | 'ghost'; children: React.ReactNode; disabled?: boolean }) => {
  const cls = {
    primary: 'border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20',
    danger:  'border-red-30  bg-red-dim  text-red  hover:bg-red/20',
    ghost:   'border-border2 bg-transparent text-text2 hover:text-text1 hover:border-border1',
  }[variant]
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className={`px-4 py-2 border font-mono text-[9px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 ${cls}`}>
      {loading && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

// ── Modal 6 dígitos ─────────────────────────────────────────────────────────
function TotpInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => { refs.current[0]?.focus() }, [])
  const handle = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return
    const next = [...digits]; next[i] = v; setDigits(next)
    if (v && i < 5) refs.current[i + 1]?.focus()
    if (v && i === 5) { const code = [...next].join(''); if (code.length === 6) onComplete(code) }
  }
  return (
    <div className="flex gap-2 justify-center my-4">
      {digits.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handle(i, e.target.value)}
          onKeyDown={e => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()}
          className="w-10 h-12 text-center text-xl font-bold text-cyan bg-bg3 border border-border2 outline-none focus:border-cyan transition-colors" />
      ))}
    </div>
  )
}

// ── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-bg1 border border-border1 w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text1">{title}</span>
          <button onClick={onClose} className="text-text2 hover:text-text1 text-lg leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [telegram, setTelegram] = useState<TelegramLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedRef, setCopiedRef] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  const copyReferral = () => {
    if (!settings?.referralCode) return
    navigator.clipboard.writeText(buildReferralLink(settings.referralCode))
    setCopiedRef(true)
    setTimeout(() => setCopiedRef(false), 2000)
  }
  const [modal2FA, setModal2FA] = useState<'setup' | 'enable' | 'disable' | null>(null)
  const [qrData, setQrData] = useState<{ qrCode: string; secret: string } | null>(null)
  const [twofaLoading, setTwofaLoading] = useState(false)

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  const load = async () => {
    try {
      const res = await api.get<Settings>('/settings')
      setSettings(res.data)
    } catch { /* ignore */ }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  // ── 2FA: SETUP (obter QR Code) ────────────────────────────────────────────
  const handle2FASetup = async () => {
    setTwofaLoading(true)
    try {
      const res = await api.post<{ qrCode: string; secret: string }>('/auth/2fa/setup')
      setQrData(res.data)
      setModal2FA('enable')
    } catch (err: any) {
      flash(err.response?.data?.error ?? 'Erro ao gerar QR Code', 'err')
    } finally {
      setTwofaLoading(false)
    }
  }

  // ── 2FA: ENABLE (confirmar com código) ───────────────────────────────────
  const handle2FAEnable = async (code: string) => {
    setTwofaLoading(true)
    try {
      await api.post('/auth/2fa/enable', { code })
      flash('2FA activado com sucesso! ✓')
      setModal2FA(null)
      setQrData(null)
      await load()
    } catch (err: any) {
      flash(err.response?.data?.error ?? 'Código inválido', 'err')
    } finally {
      setTwofaLoading(false)
    }
  }

  // ── 2FA: DISABLE ─────────────────────────────────────────────────────────
  const handle2FADisable = async (code: string) => {
    setTwofaLoading(true)
    try {
      await api.post('/auth/2fa/disable', { code })
      flash('2FA desactivado.')
      setModal2FA(null)
      await load()
    } catch (err: any) {
      flash(err.response?.data?.error ?? 'Código inválido', 'err')
    } finally {
      setTwofaLoading(false)
    }
  }

  // ── Telegram ─────────────────────────────────────────────────────────────
  const generateTelegramLink = async () => {
    try {
      const res = await api.post<TelegramLink>('/telegram/link-code')
      setTelegram(res.data)
    } catch (err: any) {
      flash(err.response?.data?.error ?? 'Erro ao gerar link Telegram', 'err')
    }
  }

  const unlinkTelegram = async () => {
    try {
      await api.post('/telegram/unlink')
      setTelegram(null)
      flash('Telegram desligado.')
      await load()
    } catch (err: any) {
      flash(err.response?.data?.error ?? 'Erro ao desligar Telegram', 'err')
    }
  }

  if (loading) return (
    <div className="py-32 flex justify-center">
      <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Título */}
      <div>
        <h2 className="text-text1 font-bold text-lg">Configurações</h2>
        <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">Conta · Segurança · Notificações</p>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`p-3 border font-mono text-[10px] ${msg.type === 'ok' ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>
          {msg.text}
        </div>
      )}

      {/* ── CONTA ── */}
      <div className="bg-bg1 border border-border1 p-5">
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-4">Conta</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Email',          value: settings?.email },
            { label: 'Plano',          value: settings?.plan,          highlight: 'gold' },
            { label: 'Código afiliado',value: settings?.referralCode,  highlight: 'cyan' },
            { label: 'Criada em',      value: settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString('pt-PT') : '-' },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="bg-bg2 border border-border1 p-3">
              <span className="font-mono text-[8px] uppercase tracking-wider text-text3">{label}</span>
              <div className={`font-mono text-xs mt-1 ${highlight === 'gold' ? 'text-gold' : highlight === 'cyan' ? 'text-cyan' : 'text-text1'}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LINK DE INDICAÇÃO ── */}
      {settings?.referralCode && (
        <div className="bg-bg1 border border-border1 p-5">
          <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-3">Link de Indicação</h3>
          <p className="font-mono text-[9px] text-text3 mb-3">Convida amigos e ganha comissões na tua rede.</p>
          <div className="flex gap-2">
            <input type="text" readOnly value={buildReferralLink(settings.referralCode)}
              className="flex-1 bg-bg3 border border-border2 text-cyan font-mono text-xs px-3 py-2 outline-none" />
            <button onClick={copyReferral}
              className={`px-4 py-2 border font-mono text-[9px] uppercase transition-all ${copiedRef ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text2 hover:border-cyan hover:text-cyan'}`}>
              {copiedRef ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {/* ── SEGURANÇA + TELEGRAM ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 2FA */}
        <div className="bg-bg1 border border-border1 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2">Autenticação 2FA</h3>
            <Badge on={settings?.twoFAEnabled ?? false} labelOn="Activo ✓" labelOff="Inactivo ⚠" />
          </div>
          <p className="font-mono text-[9px] text-text3 mb-4 leading-relaxed">
            {settings?.twoFAEnabled
              ? 'A tua conta está protegida por autenticação de dois factores.'
              : 'Recomendamos activar o 2FA para proteger a tua conta.'}
          </p>
          <div className="flex gap-2">
            {!settings?.twoFAEnabled ? (
              <Btn onClick={handle2FASetup} loading={twofaLoading}>
                Activar 2FA
              </Btn>
            ) : (
              <Btn onClick={() => setModal2FA('disable')} variant="danger">
                Desactivar 2FA
              </Btn>
            )}
          </div>
          <p className="font-mono text-[8px] text-text3 mt-3 leading-relaxed">
            Usa: Google Authenticator · Authy · Microsoft Authenticator
          </p>
        </div>

        {/* Telegram */}
        <div className="bg-bg1 border border-border1 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2">Notificações Telegram</h3>
            <Badge on={settings?.telegramLinked ?? false} labelOn="Ligado ✓" labelOff="Não ligado" />
          </div>
          <p className="font-mono text-[9px] text-text3 mb-4 leading-relaxed">
            Recebe relatórios diários e alertas do bot directamente no Telegram.
          </p>
          <div className="flex gap-2">
            {!settings?.telegramLinked ? (
              <Btn onClick={generateTelegramLink}>Ligar Telegram</Btn>
            ) : (
              <Btn onClick={unlinkTelegram} variant="ghost">Desligar</Btn>
            )}
          </div>
          {telegram && (
            <div className="mt-4 bg-bg2 border border-border1 p-3 space-y-2">
              <p className="font-mono text-[8px] uppercase tracking-wider text-text3">Código de ligação</p>
              <p className="font-mono text-cyan text-sm font-bold tracking-widest">{telegram.code}</p>
              <a href={telegram.link} target="_blank" rel="noreferrer"
                className="inline-block font-mono text-[10px] text-gold underline hover:no-underline">
                → Abrir no Telegram
              </a>
              <p className="font-mono text-[8px] text-text3">Envia /start {telegram.code} ao bot para ligar.</p>
            </div>
          )}
        </div>
      </div>

      {/* ════ MODAL: QR CODE ════ */}
      {modal2FA === 'enable' && qrData && (
        <Modal title="Activar 2FA — Escaneia o QR Code" onClose={() => { setModal2FA(null); setQrData(null) }}>
          <div className="text-center space-y-4">
            <p className="font-mono text-[9px] text-text2">
              1. Abre o Google Authenticator ou Authy<br />
              2. Escaneia o QR Code abaixo<br />
              3. Introduz o código de 6 dígitos para confirmar
            </p>
            <img src={qrData.qrCode} alt="QR Code 2FA" className="w-44 h-44 mx-auto border border-border1" />
            <div className="bg-bg2 border border-border1 p-2">
              <p className="font-mono text-[8px] text-text3 mb-1">Chave manual (backup)</p>
              <p className="font-mono text-[10px] text-text1 break-all tracking-widest">{qrData.secret}</p>
            </div>
            <p className="font-mono text-[9px] text-text2">Introduz o código após escanear:</p>
            <TotpInput onComplete={handle2FAEnable} />
            {twofaLoading && (
              <div className="flex justify-center">
                <span className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ════ MODAL: SETUP (intermédia se setup foi chamado antes) ════ */}
      {modal2FA === 'setup' && (
        <Modal title="A preparar 2FA..." onClose={() => setModal2FA(null)}>
          <div className="flex justify-center py-8">
            <span className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        </Modal>
      )}

      {/* ════ MODAL: DESACTIVAR 2FA ════ */}
      {modal2FA === 'disable' && (
        <Modal title="Desactivar 2FA" onClose={() => setModal2FA(null)}>
          <div className="space-y-4">
            <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
              ⚠ Desactivar o 2FA reduz a segurança da tua conta.
            </div>
            <p className="font-mono text-[9px] text-text2 text-center">
              Introduz o código actual do teu autenticador para confirmar:
            </p>
            <TotpInput onComplete={handle2FADisable} />
            {twofaLoading && (
              <div className="flex justify-center">
                <span className="w-5 h-5 border-2 border-red border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
