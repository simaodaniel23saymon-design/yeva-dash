import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { LiveTradingPanel } from '../components/LiveTradingPanel';
import { BotToggleButton } from '../components/BotToggleButton';
import { toUSDT, formatMoney } from '../utils/format';
import { useWallet } from '../hooks/useWallet';

interface BotData {
  id: string;
  pair: string;
  market: string;
  accountType: 'REAL' | 'DEMO';
  status: string;
  leverage: number;
  capitalPerSide: number;
  exchange: string;
  rounds: number;
  pnl: number;
}

interface TransactionData {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface NewsData {
  id: string;
  title: string;
  impact: string;
  scheduledAt: string;
  botAction: string;
}

interface DashboardData {
  stats: {
    realBalance: number;
    demoBalance: number;
    lockedBalance: number;
    pnlTotal: number;
    activeBots: number;
    totalBots: number;
    demoBots: number;
    totalDeposited: number;
    totalWithdrawn: number;
  };
  bots: BotData[];
  transactions: TransactionData[];
  news: NewsData[];
}

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const { wallet } = useWallet(30000);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () =>
    api.get<DashboardData>('/dashboard')
      .then(res => setData(res.data))
      .catch(() => {});

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    // Polling a cada 15 segundos — mantém o dashboard vivo
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleBot = async (id: string, status: string) => {
    const next = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await api.patch(`/bots/${id}/status`, { status: next });
    setData(prev => prev ? {
      ...prev,
      bots: prev.bots.map(bot => bot.id === id ? { ...bot, status: next } : bot),
      stats: {
        ...prev.stats,
        activeBots: prev.bots.map(bot => bot.id === id ? { ...bot, status: next } : bot).filter(bot => bot.status === 'ACTIVE').length,
      },
    } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats;
  const realBalance = wallet?.balance ?? stats?.realBalance;
  const lockedBalance = wallet?.lockedBalance ?? stats?.lockedBalance;
  const chartData = data?.transactions.slice().reverse().map(tx => ({
    day: new Date(tx.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
    amount: toUSDT(tx.type === 'WITHDRAWAL' ? -tx.amount : tx.amount),
  })) ?? [];

  return (
    <div className="space-y-4">
      <QuickGuide title="Bem-vindo ao YevaTrade" steps={[
        'Vê o teu saldo e os bots em tempo real',
        'Acompanha os bots activos e o estado das operações',
        'Monitoriza lucros e performance ao longo do tempo',
      ]} />

      {/* Painel em tempo real + controlo de bots */}
      <BotToggleButton />
      <LiveTradingPanel />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Saldo Real', value: formatMoney(realBalance), sub: `${formatMoney(lockedBalance)} bloqueado`, color: 'text-gold' },
          { label: 'Conta Demo', value: formatMoney(stats?.demoBalance), sub: 'Ambiente de teste', color: 'text-cyan' },
          { label: 'Bots Activos', value: `${stats?.activeBots ?? 0}/${stats?.totalBots ?? 0}`, sub: `${stats?.demoBots ?? 0} demo`, color: 'text-text1' },
          { label: 'P&L Total', value: formatMoney(stats?.pnlTotal), sub: 'Rounds registados', color: (toUSDT(stats?.pnlTotal) >= 0 ? 'text-cyan' : 'text-red') },
        ].map(item => (
          <div key={item.label} className="bg-bg1 border border-border1 p-4">
            <div className="font-mono text-[8px] tracking-[2px] uppercase text-text2 mb-2">{item.label}</div>
            <div className={`text-[22px] font-bold mb-1 ${item.color}`}>{item.value}</div>
            <div className="font-mono text-[9px] text-text2">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="border border-gold-30 bg-gold-dim px-4 py-3 text-sm leading-6 text-text1">
        <span className="font-semibold text-gold">Aviso de risco:</span> Trading envolve riscos e pode resultar em perda parcial ou total do capital. Usa a conta demo, define limites e nunca operes com fundos que nao podes perder.
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-bg1 border border-border1">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border1">
            <div>
              <h3 className="text-sm font-bold text-text1">Bots</h3>
              <p className="font-mono text-[8px] tracking-[1.5px] uppercase text-text2">Real e demo</p>
            </div>
            <Link to="/bots" className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border border-cyan-30 bg-cyan-dim text-cyan">
              Novo
            </Link>
          </div>
          {!data?.bots.length ? (
            <div className="p-8 text-center text-text2 font-mono text-xs">
              Sem bots criados. Usa a conta demo para testar antes de ligar uma exchange real.
            </div>
          ) : (
            <div className="divide-y divide-border1 max-h-80 overflow-y-auto">
              {data.bots.map(bot => (
                <div key={bot.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-[6px] h-[6px] rounded-full ${bot.status === 'ACTIVE' ? 'bg-cyan animate-pulse' : 'bg-text3'}`} />
                      <span className="font-bold text-sm text-text1">{bot.pair}</span>
                      <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text2">{bot.accountType}</span>
                      <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text2">{bot.exchange}</span>
                    </div>
                    <div className="flex gap-4 font-mono text-[10px] text-text2">
                      <span className={toUSDT(bot.pnl) >= 0 ? 'text-cyan' : 'text-red'}>{formatMoney(bot.pnl)}</span>
                      <span>{bot.rounds} rounds</span>
                      <span>{bot.leverage}x</span>
                    </div>
                  </div>
                  <button onClick={() => toggleBot(bot.id, bot.status)}
                    className="font-mono text-[9px] uppercase px-2.5 py-1.5 border border-border2 text-text2 hover:border-cyan hover:text-cyan">
                    {bot.status === 'ACTIVE' ? 'Pausar' : 'Activar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg1 border border-border1">
          <div className="px-4 py-3 border-b border-border1">
            <h3 className="text-sm font-bold text-text1">Calendario e Alertas</h3>
            <p className="font-mono text-[8px] tracking-[1.5px] uppercase text-text2">Eventos registados</p>
          </div>
          {!data?.news.length ? (
            <div className="p-8 text-center font-mono text-xs text-text2">Sem noticias cadastradas.</div>
          ) : (
            <div className="divide-y divide-border1">
              {data.news.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 border ${item.impact === 'HIGH' ? 'border-red-30 text-red' : 'border-gold-30 text-gold'}`}>{item.impact}</span>
                  <span className="text-text1 text-xs font-medium flex-1 truncate">{item.title}</span>
                  <span className="font-mono text-[9px] text-text2">{new Date(item.scheduledAt).toLocaleString('pt-PT')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg1 border border-border1">
        <div className="px-4 py-3 border-b border-border1">
          <h3 className="text-sm font-bold text-text1">Fluxo Financeiro</h3>
          <p className="font-mono text-[8px] text-text2">Transaccoes reais registadas</p>
        </div>
        <div className="p-4">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4a0" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#00d4a0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#6b8a6e', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#0b100d', border: '1px solid #1e2b1f', fontSize: 10, fontFamily: 'Space Mono' }} formatter={(v) => [money(Number(v ?? 0)), 'Valor']} />
                <Area type="monotone" dataKey="amount" stroke="#00d4a0" strokeWidth={1.5} fill="url(#txGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center font-mono text-xs text-text2">Sem transaccoes ainda.</div>
          )}
        </div>
      </div>
    </div>
  );
}
