import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Stats {
  users: { total: number; active: number }
  bots: { total: number; active: number }
  transactions: { total: number }
  revenue: { performanceFees: number; totalDeposited: number; totalFeesPaid: number }
  recentUsers: { id: string; email: string; plan: string; createdAt: string }[]
}

interface AdminUser {
  id: string; email: string; name?: string; plan: string
  isAdmin: boolean; twoFAEnabled: boolean; telegramLinked: boolean
  createdAt: string; referralCode: string
  wallet?: { balance: number; totalDeposited: number; totalFeesPaid: number }
  _count?: { bots: number }
}

interface AdminTx {
  id: string; type: string; amount: number; fee?: number; status: string
  createdAt: string; network?: string; note?: string; txHash?: string
  user: { email: string }
}

interface AdminBot {
  id: string; pair: string; market: string; status: string
  leverage: number; totalPnl: number
  user: { email: string }
  exchangeAccount: { exchange: string }
  _count: { rounds: number }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dt = (s: string) => new Date(s).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const PLAN_COLORS: Record<string, string> = {
  FREE: 'text-text2 border-border2',
  PRO: 'text-gold border-gold-30',
  DEMO: 'text-cyan border-cyan-20',
  BLOCKED: 'text-red border-red-30',
}

// ── Componentes pequenos ──────────────────────────────────────────────────────
const StatBox = ({ label, value, sub, color = 'text-cyan' }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="bg-bg1 border border-border1 p-4">
    <div className="font-mono text-[8px] tracking-[2px] uppercase text-text3 mb-2">{label}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    {sub && <div className="font-mono text-[9px] text-text3 mt-1">{sub}</div>}
  </div>
)

const Pill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick}
    className={`px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider border transition-all ${active ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'border-border2 text-text2 hover:border-border1 hover:text-text1'}`}>
    {label}
  </button>
)

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'overview' | 'users' | 'transactions' | 'bots' | 'notify'>('overview')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [txs, setTxs] = useState<AdminTx[]>([])
  const [bots, setBots] = useState<AdminBot[]>([])
  const [search, setSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [notifyMsg, setNotifyMsg] = useState({ subject: '', message: '', userId: '', channels: ['panel'] as string[] })
  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null)

  const showFlash = (text: string, ok = true) => {
    setFlash({ text, ok })
    setTimeout(() => setFlash(null), 3500)
  }

  // Verificar se é admin
  useEffect(() => {
    if (!user?.isAdmin) navigate('/dashboard', { replace: true })
  }, [user])

  const loadStats = useCallback(async () => {
    const res = await api.get<Stats>('/admin/stats')
    setStats(res.data)
  }, [])

  const loadUsers = useCallback(async (page = 1, q = search) => {
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (q) params.set('search', q)
    const res = await api.get<{ users: AdminUser[]; total: number }>(`/admin/users?${params}`)
    setUsers(res.data.users)
    setUserTotal(res.data.total)
  }, [search])

  const loadTxs = useCallback(async () => {
    const res = await api.get<{ transactions: AdminTx[] }>('/admin/transactions?limit=100')
    setTxs(res.data.transactions)
  }, [])

  const loadBots = useCallback(async () => {
    const res = await api.get<AdminBot[]>('/admin/bots')
    setBots(res.data)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadStats(), loadUsers(), loadTxs(), loadBots()])
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'users') loadUsers(userPage)
  }, [tab, userPage])

  const updatePlan = async (id: string, plan: string) => {
    await api.patch(`/admin/users/${id}`, { plan })
    await loadUsers(userPage)
    if (selectedUser?.id === id) setSelectedUser(prev => prev ? { ...prev, plan } : null)
    showFlash('Plano actualizado.')
  }

  const adjustBalance = async (id: string) => {
    const amount = parseFloat(balanceAmount)
    if (isNaN(amount)) return showFlash('Valor inválido', false)
    await api.post(`/admin/users/${id}/balance`, { amount })
    setBalanceAmount('')
    await loadUsers(userPage)
    showFlash(`Saldo ajustado: ${amount >= 0 ? '+' : ''}${money(amount)}`)
  }

  const stopBots = async (id: string) => {
    const res = await api.post<{ stopped: number }>(`/admin/users/${id}/stop-bots`)
    showFlash(`${res.data.stopped} bot(s) parado(s).`)
  }

  const sendNotify = async () => {
    const res = await api.post<{ sent: number }>('/admin/notify', notifyMsg)
    showFlash(`Notificação enviada para ${res.data.sent} utilizador(es).`)
    setNotifyMsg({ subject: '', message: '', userId: '', channels: ['panel'] })
  }

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'users', label: `Utilizadores (${userTotal})` },
    { id: 'transactions', label: 'Transacções' },
    { id: 'bots', label: 'Bots' },
    { id: 'notify', label: 'Notificações' },
  ] as const

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text1 font-bold text-lg flex items-center gap-2">
            <span className="font-mono text-[10px] px-2 py-0.5 bg-red-dim border border-red-30 text-red uppercase tracking-wider">ADMIN</span>
            Painel de Controlo
          </h2>
          <p className="font-mono text-[9px] text-text3 mt-0.5">Acesso restrito — {user?.email}</p>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div className={`p-3 border font-mono text-[10px] ${flash.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>
          {flash.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border1 pb-3">
        {tabs.map(t => <Pill key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id as any)} />)}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatBox label="Total Utilizadores" value={stats.users.total} sub={`${stats.users.active} activos`} />
            <StatBox label="Total Bots" value={stats.bots.total} sub={`${stats.bots.active} activos`} color="text-gold" />
            <StatBox label="Transacções" value={stats.transactions.total} color="text-text1" />
            <StatBox label="Taxas Performance" value={money(stats.revenue.totalFeesPaid)} sub="Total cobrado" color="text-cyan" />
            <StatBox label="Total Depositado" value={money(stats.revenue.totalDeposited)} color="text-cyan" />
          </div>

          <div className="bg-bg1 border border-border1">
            <div className="px-4 py-3 border-b border-border1">
              <h3 className="text-sm font-bold text-text1">Últimos Registos</h3>
            </div>
            <div className="divide-y divide-border1">
              {stats.recentUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="text-text1 text-xs font-medium">{u.email}</span>
                    <span className={`ml-2 font-mono text-[8px] px-1.5 py-0.5 border ${PLAN_COLORS[u.plan] || 'text-text2 border-border2'}`}>{u.plan}</span>
                  </div>
                  <span className="font-mono text-[9px] text-text3">{dt(u.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ UTILIZADORES ═══ */}
      {tab === 'users' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadUsers(1, search)}
              placeholder="Pesquisar por email ou código..."
              className="flex-1 bg-bg3 border border-border2 text-text1 font-mono text-xs px-3 py-2 outline-none focus:border-cyan/50" />
            <button onClick={() => loadUsers(1, search)}
              className="px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase">
              Pesquisar
            </button>
          </div>

          <div className="bg-bg1 border border-border1 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border1">
                  {['Email', 'Plano', 'Saldo', 'Bots', 'Criado', 'Acções'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-wider text-text3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-bg2 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-text1 font-medium">{u.email}</div>
                      {u.isAdmin && <span className="font-mono text-[8px] text-red">ADMIN</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono text-[8px] px-1.5 py-0.5 border ${PLAN_COLORS[u.plan] || 'text-text2 border-border2'}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-cyan">
                      {money(u.wallet?.balance ?? 0)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-text2">
                      {u._count?.bots ?? 0}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[9px] text-text3">
                      {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                        className="font-mono text-[8px] uppercase px-2 py-1 border border-border2 text-text2 hover:border-cyan hover:text-cyan transition-all">
                        {selectedUser?.id === u.id ? 'Fechar' : 'Gerir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Painel de gestão do utilizador seleccionado */}
          {selectedUser && (
            <div className="bg-bg1 border border-cyan-20 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[9px] uppercase tracking-wider text-cyan">Gerir: {selectedUser.email}</h3>
                <button onClick={() => setSelectedUser(null)} className="text-text3 hover:text-text1 text-sm">✕</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[9px]">
                <div className="bg-bg2 border border-border1 p-2"><span className="text-text3">Saldo</span><div className="text-cyan mt-1">{money(selectedUser.wallet?.balance ?? 0)}</div></div>
                <div className="bg-bg2 border border-border1 p-2"><span className="text-text3">Depositado</span><div className="text-text1 mt-1">{money(selectedUser.wallet?.totalDeposited ?? 0)}</div></div>
                <div className="bg-bg2 border border-border1 p-2"><span className="text-text3">Taxas pagas</span><div className="text-text1 mt-1">{money(selectedUser.wallet?.totalFeesPaid ?? 0)}</div></div>
                <div className="bg-bg2 border border-border1 p-2"><span className="text-text3">Bots</span><div className="text-text1 mt-1">{selectedUser._count?.bots ?? 0}</div></div>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Mudar plano */}
                <div className="space-y-1">
                  <p className="font-mono text-[8px] text-text3 uppercase">Mudar Plano</p>
                  <div className="flex gap-1">
                    {['FREE', 'PRO', 'DEMO', 'BLOCKED'].map(plan => (
                      <button key={plan} onClick={() => updatePlan(selectedUser.id, plan)}
                        className={`px-2 py-1 font-mono text-[8px] border transition-all ${plan === selectedUser.plan ? PLAN_COLORS[plan] : 'border-border2 text-text3 hover:border-border1'}`}>
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ajustar saldo */}
                <div className="space-y-1">
                  <p className="font-mono text-[8px] text-text3 uppercase">Ajustar Saldo</p>
                  <div className="flex gap-1">
                    <input value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)}
                      placeholder="+50 ou -20"
                      className="w-24 bg-bg3 border border-border2 text-text1 font-mono text-xs px-2 py-1 outline-none focus:border-cyan/50" />
                    <button onClick={() => adjustBalance(selectedUser.id)}
                      className="px-3 py-1 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[8px]">
                      Aplicar
                    </button>
                  </div>
                </div>

                {/* Parar bots */}
                <div className="space-y-1">
                  <p className="font-mono text-[8px] text-text3 uppercase">Bots</p>
                  <button onClick={() => stopBots(selectedUser.id)}
                    className="px-3 py-1 border border-red-30 bg-red-dim text-red font-mono text-[8px]">
                    Parar Todos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Paginação */}
          <div className="flex items-center gap-2 font-mono text-[9px]">
            <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}
              className="px-3 py-1.5 border border-border2 text-text2 disabled:opacity-30 hover:border-border1 hover:text-text1 transition-all">
              ← Ant
            </button>
            <span className="text-text3">Pág {userPage} · {userTotal} total</span>
            <button disabled={userPage * 25 >= userTotal} onClick={() => setUserPage(p => p + 1)}
              className="px-3 py-1.5 border border-border2 text-text2 disabled:opacity-30 hover:border-border1 hover:text-text1 transition-all">
              Prox →
            </button>
          </div>
        </div>
      )}

      {/* ═══ TRANSACÇÕES ═══ */}
      {tab === 'transactions' && (
        <div className="bg-bg1 border border-border1 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border1">
                {['Utilizador', 'Tipo', 'Valor', 'Taxa', 'Estado', 'Rede', 'Data'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-wider text-text3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border1">
              {txs.map(tx => (
                <tr key={tx.id} className="hover:bg-bg2">
                  <td className="px-4 py-2.5 font-mono text-[10px] text-text2 max-w-[180px] truncate">{tx.user.email}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px]">
                    <span className={`px-1.5 py-0.5 border ${tx.type === 'DEPOSIT' ? 'text-cyan border-cyan-20' : tx.type === 'WITHDRAWAL' ? 'text-red border-red-30' : 'text-gold border-gold-30'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 font-mono text-[10px] ${tx.type === 'DEPOSIT' ? 'text-cyan' : 'text-red'}`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{money(tx.amount)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-text3">{money(tx.fee ?? 0)}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px]">
                    <span className={tx.status === 'CONFIRMED' ? 'text-cyan' : tx.status === 'FAILED' ? 'text-red' : 'text-gold'}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-text3">{tx.network ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-text3">{dt(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ BOTS ═══ */}
      {tab === 'bots' && (
        <div className="bg-bg1 border border-border1 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border1">
                {['Utilizador', 'Par', 'Exchange', 'Estado', 'P&L', 'Rounds', 'Mercado'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-wider text-text3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border1">
              {bots.map(bot => (
                <tr key={bot.id} className="hover:bg-bg2">
                  <td className="px-4 py-2.5 font-mono text-[10px] text-text2 max-w-[180px] truncate">{bot.user.email}</td>
                  <td className="px-4 py-2.5 font-bold text-sm text-text1">{bot.pair}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-text3">{bot.exchangeAccount.exchange}</td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1 font-mono text-[9px] ${bot.status === 'ACTIVE' ? 'text-cyan' : bot.status === 'PAUSED' ? 'text-gold' : 'text-text3'}`}>
                      <span className={`w-[5px] h-[5px] rounded-full ${bot.status === 'ACTIVE' ? 'bg-cyan animate-pulse' : 'bg-current'}`} />
                      {bot.status}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 font-mono text-[10px] ${(bot.totalPnl ?? 0) >= 0 ? 'text-cyan' : 'text-red'}`}>
                    {money(bot.totalPnl ?? 0)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-text2">{bot._count.rounds}</td>
                  <td className="px-4 py-2.5 font-mono text-[9px] text-text3">{bot.market}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ NOTIFICAÇÕES ═══ */}
      {tab === 'notify' && (
        <div className="bg-bg1 border border-border1 p-5 space-y-4 max-w-xl">
          <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2">Enviar Notificação</h3>

          <div className="space-y-3">
            <div>
              <label className="font-mono text-[8px] text-text3 uppercase block mb-1">Assunto / Título</label>
              <input value={notifyMsg.subject} onChange={e => setNotifyMsg(p => ({ ...p, subject: e.target.value }))}
                className="w-full bg-bg3 border border-border2 text-text1 font-mono text-xs px-3 py-2 outline-none focus:border-cyan/50"
                placeholder="Ex: Manutenção programada" />
            </div>

            <div>
              <label className="font-mono text-[8px] text-text3 uppercase block mb-1">Mensagem</label>
              <textarea value={notifyMsg.message} onChange={e => setNotifyMsg(p => ({ ...p, message: e.target.value }))}
                rows={4}
                className="w-full bg-bg3 border border-border2 text-text1 font-mono text-xs px-3 py-2 outline-none focus:border-cyan/50 resize-none"
                placeholder="Texto da notificação..." />
            </div>

            <div>
              <label className="font-mono text-[8px] text-text3 uppercase block mb-1">
                ID do Utilizador <span className="text-text3">(vazio = todos)</span>
              </label>
              <input value={notifyMsg.userId} onChange={e => setNotifyMsg(p => ({ ...p, userId: e.target.value }))}
                className="w-full bg-bg3 border border-border2 text-text1 font-mono text-xs px-3 py-2 outline-none focus:border-cyan/50"
                placeholder="uuid do utilizador ou vazio para todos" />
            </div>

            <div>
              <label className="font-mono text-[8px] text-text3 uppercase block mb-2">Canais</label>
              <div className="flex gap-2">
                {(['panel', 'email', 'telegram'] as const).map(ch => {
                  const active = notifyMsg.channels.includes(ch)
                  return (
                    <button key={ch} onClick={() => setNotifyMsg(p => ({
                      ...p,
                      channels: active ? p.channels.filter(c => c !== ch) : [...p.channels, ch]
                    }))}
                      className={`px-3 py-1.5 font-mono text-[9px] uppercase border transition-all ${active ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'border-border2 text-text3 hover:border-border1'}`}>
                      {ch}
                    </button>
                  )
                })}
              </div>
            </div>

            <button onClick={sendNotify} disabled={!notifyMsg.subject || !notifyMsg.message}
              className="w-full py-2.5 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-cyan/20 transition-all disabled:opacity-40">
              Enviar Notificação
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
