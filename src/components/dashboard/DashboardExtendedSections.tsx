import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api';
import {
  type DashBotRow,
  type DashLog,
  type DashTrade,
  type MarketIndicator,
  type PerfRange,
  useDashboardExtended,
  useDashboardLogs,
} from '../../hooks/useDashboardExtended';

type TradeFilter = 'all' | 'trend' | 'grid' | 'profit' | 'loss';
type LogFilter = 'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'TRADE' | 'GRID' | 'RECONCILE';

function fmtFunding(f: number): string {
  return `${(f * 100).toFixed(4)}%`;
}

function SectionShell({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="bg-bg1 border border-border1 p-4 space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-bold text-text1">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function MarketIndicatorsSection({
  indicators,
  symbols,
}: {
  indicators: Record<string, MarketIndicator>;
  symbols: string[];
}) {
  const [sym, setSym] = useState(symbols[0] || '');
  useEffect(() => {
    if (symbols.length && !symbols.includes(sym)) setSym(symbols[0]);
  }, [symbols, sym]);

  const ind = indicators[sym];
  if (!symbols.length) {
    return (
      <SectionShell title="Indicadores de Mercado">
        <p className="font-mono text-[10px] text-text2">Sem bots / pares para analisar.</p>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      title="Indicadores de Mercado"
      right={
        <select
          value={sym}
          onChange={(e) => setSym(e.target.value)}
          className="font-mono text-[9px] uppercase bg-bg2 border border-border2 text-text1 px-2 py-1"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      }
    >
      {ind && (
        <p className="font-mono text-[9px] text-text2 mb-1">
          {ind.gridReason}
          {ind.gridGate === 'OFF' ? ' · Fase 3 (tendência)' : ' · Grid elegível'}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-border1 bg-bg2 p-3">
          <p className="font-mono text-[9px] uppercase text-text2">ADX (14)</p>
          <p className="font-bold text-text1 text-lg mt-1">{ind?.adx?.toFixed(1) ?? '—'}</p>
          <p className={`font-mono text-[10px] mt-1 ${ind?.adxLabel === 'Tendência' ? 'text-gold' : 'text-cyan'}`}>
            {ind?.adxLabel ?? '—'}
          </p>
        </div>
        <div className="border border-border1 bg-bg2 p-3">
          <p className="font-mono text-[9px] uppercase text-text2">Funding Rate</p>
          <p
            className={`font-bold text-lg mt-1 ${(ind?.funding ?? 0) <= 0 ? 'text-cyan' : 'text-red'}`}
          >
            {ind ? fmtFunding(ind.funding) : '—'}
          </p>
          <p className="font-mono text-[10px] text-text3 mt-1">
            {(ind?.funding ?? 0) <= 0 ? 'Negativo / neutro' : 'Positivo'}
          </p>
        </div>
        <div className="border border-border1 bg-bg2 p-3">
          <p className="font-mono text-[9px] uppercase text-text2">Open Interest</p>
          <p
            className={`font-bold text-lg mt-1 ${(ind?.oiChange ?? 0) >= 0 ? 'text-cyan' : 'text-red'}`}
          >
            {ind ? `${ind.oiChange >= 0 ? '↑' : '↓'} ${Math.abs(ind.oiChange).toFixed(2)}%` : '—'}
          </p>
          <p className="font-mono text-[10px] text-text3 mt-1">Variação recente</p>
        </div>
        <div className="border border-border1 bg-bg2 p-3">
          <p className="font-mono text-[9px] uppercase text-text2">Volatilidade (ATR)</p>
          <p className="font-bold text-text1 text-lg mt-1">
            {ind ? `${ind.atrPct.toFixed(2)}%` : '—'}
          </p>
          <p
            className={`font-mono text-[10px] mt-1 ${ind?.atrLabel === 'Alta' ? 'text-gold' : 'text-text2'}`}
          >
            {ind?.atrLabel ?? '—'}
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

function BotsStatusSection({
  bots,
  onChanged,
}: {
  bots: DashBotRow[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const startStop = async (bot: DashBotRow) => {
    const running =
      bot.botStatus === 'running' || bot.botStatus === 'ACTIVE' || bot.botStatus === 'active';
    setBusy(bot.id);
    try {
      await api.post(running ? `/bots/${bot.id}/stop` : `/bots/${bot.id}/start`);
      onChanged();
    } catch {
      /* toast silencioso */
    } finally {
      setBusy(null);
    }
  };

  const toggleGrid = async (bot: DashBotRow) => {
    setBusy(`g-${bot.id}`);
    try {
      await api.post(`/dashboard/bots/${bot.id}/toggle-grid`, {
        enabled: !bot.gridEnabled,
      });
      onChanged();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const statusDot = (status: string) => {
    if (status === 'active' || status === 'grid_active') return 'text-cyan';
    if (status === 'grid_off_adx') return 'text-red';
    if (status === 'no_balance') return 'text-text3';
    return 'text-text2';
  };

  return (
    <SectionShell title="Status dos Bots">
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[10px]">
          <thead>
            <tr className="text-text2 uppercase border-b border-border1">
              <th className="py-2 pr-3 font-medium">Par</th>
              <th className="py-2 pr-3 font-medium">Estratégia</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">PnL Hoje</th>
              <th className="py-2 pr-3 font-medium">Última Op.</th>
              <th className="py-2 font-medium">Acções</th>
            </tr>
          </thead>
          <tbody>
            {bots.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-text2">
                  Nenhum bot configurado.
                </td>
              </tr>
            )}
            {bots.map((bot) => {
              const running =
                bot.botStatus === 'running' ||
                bot.botStatus === 'ACTIVE' ||
                bot.botStatus === 'active';
              return (
                <tr key={bot.id} className="border-b border-border1/60">
                  <td className="py-2.5 pr-3 text-text1 font-bold">{bot.symbol}</td>
                  <td className="py-2.5 pr-3 text-text2">{bot.strategy}</td>
                  <td className={`py-2.5 pr-3 ${statusDot(bot.status)}`}>
                    ● {bot.statusLabel}
                  </td>
                  <td
                    className={`py-2.5 pr-3 ${bot.pnlToday >= 0 ? 'text-cyan' : 'text-red'}`}
                  >
                    {bot.pnlToday >= 0 ? '+' : ''}
                    ${bot.pnlToday.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-3 text-text2">{bot.lastTrade}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        disabled={busy === bot.id}
                        onClick={() => void startStop(bot)}
                        className="px-2 py-1 border border-border2 text-text2 hover:border-cyan hover:text-cyan disabled:opacity-40"
                        title={running ? 'Parar' : 'Iniciar'}
                      >
                        {running ? '⏸' : '▶'}
                      </button>
                      <button
                        type="button"
                        disabled={busy === `g-${bot.id}`}
                        onClick={() => void toggleGrid(bot)}
                        className={`px-2 py-1 border ${
                          bot.gridEnabled
                            ? 'border-cyan-30 text-cyan'
                            : 'border-border2 text-text2'
                        } hover:border-cyan disabled:opacity-40`}
                        title="Toggle Grid"
                      >
                        ↻ Grid
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function RecentTradesSection({ trades }: { trades: DashTrade[] }) {
  const [filter, setFilter] = useState<TradeFilter>('all');
  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filter === 'trend') return t.type === 'Tendência';
      if (filter === 'grid') return t.type === 'Grid';
      if (filter === 'profit') return t.pnl > 0;
      if (filter === 'loss') return t.pnl < 0;
      return true;
    });
  }, [trades, filter]);

  const tabs: { id: TradeFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'trend', label: 'Tendência' },
    { id: 'grid', label: 'Grid' },
    { id: 'profit', label: 'Lucro' },
    { id: 'loss', label: 'Prejuízo' },
  ];

  return (
    <SectionShell
      title="Últimos Trades"
      right={
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`font-mono text-[9px] uppercase px-2 py-1 border ${
                filter === t.id
                  ? 'border-cyan text-cyan'
                  : 'border-border2 text-text2 hover:border-cyan-30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[10px]">
          <thead>
            <tr className="text-text2 uppercase border-b border-border1">
              <th className="py-2 pr-2">Par</th>
              <th className="py-2 pr-2">Tipo</th>
              <th className="py-2 pr-2">Lado</th>
              <th className="py-2 pr-2">Entrada</th>
              <th className="py-2 pr-2">Saída</th>
              <th className="py-2 pr-2">PnL</th>
              <th className="py-2 pr-2">Motivo</th>
              <th className="py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-text2">
                  Sem trades fechados neste filtro.
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border1/60">
                <td className="py-2 pr-2 text-text1 font-bold">{t.symbol}</td>
                <td className="py-2 pr-2 text-text2">{t.type}</td>
                <td className="py-2 pr-2 text-text2">{t.side}</td>
                <td className="py-2 pr-2 text-text2">
                  {t.entry != null ? t.entry : '—'}
                </td>
                <td className="py-2 pr-2 text-text2">{t.exit != null ? t.exit : '—'}</td>
                <td className={`py-2 pr-2 ${t.pnl >= 0 ? 'text-cyan' : 'text-red'}`}>
                  {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                </td>
                <td className="py-2 pr-2 text-text2">{t.reason}</td>
                <td className="py-2 text-text3">
                  {new Date(t.date).toLocaleString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function PerformanceSection({
  range,
  onRange,
  performance,
  metrics,
}: {
  range: PerfRange;
  onRange: (r: PerfRange) => void;
  performance: {
    labels: string[];
    trend: number[];
    grid: number[];
    total: number[];
  };
  metrics: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    totalTrades: number;
  };
}) {
  const chartData = performance.labels.map((label, i) => ({
    label,
    trend: performance.trend[i] ?? 0,
    grid: performance.grid[i] ?? 0,
    total: performance.total[i] ?? 0,
  }));

  return (
    <SectionShell
      title="Gráfico de Performance"
      right={
        <div className="flex gap-1">
          {(['24h', '7d', '30d'] as PerfRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRange(r)}
              className={`font-mono text-[9px] uppercase px-2 py-1 border ${
                range === r
                  ? 'border-cyan text-cyan'
                  : 'border-border2 text-text2 hover:border-cyan-30'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {[
          { label: 'Win Rate', value: `${metrics.winRate}%` },
          { label: 'Profit Factor', value: metrics.profitFactor.toFixed(2) },
          { label: 'Max Drawdown', value: `${metrics.maxDrawdown}%` },
          { label: 'Trades', value: String(metrics.totalTrades) },
        ].map((m) => (
          <div key={m.label} className="border border-border1 bg-bg2 p-3">
            <p className="font-mono text-[9px] uppercase text-text2">{m.label}</p>
            <p className="font-bold text-text1 text-base mt-1">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <p className="font-mono text-[10px] text-text2 py-8 text-center">Sem dados no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1e2b1f" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#6b8a6e', fontSize: 10 }} />
              <YAxis tick={{ fill: '#6b8a6e', fontSize: 10 }} width={48} />
              <Tooltip
                contentStyle={{
                  background: '#0b100d',
                  border: '1px solid #1e2b1f',
                  fontSize: 11,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="trend"
                name="Tendência"
                stroke="#00d4a0"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="grid"
                name="Grid"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Total"
                stroke="#c8d4c9"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </SectionShell>
  );
}

function LogsTerminal({ enabled }: { enabled: boolean }) {
  const { logs } = useDashboardLogs(enabled, 2000);
  const [filter, setFilter] = useState<LogFilter>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return logs;
    return logs.filter((l) => l.level === filter || l.module === filter);
  }, [logs, filter]);

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filtered, autoScroll]);

  const clear = async () => {
    try {
      await api.delete('/dashboard/logs');
    } catch {
      /* ignore */
    }
  };

  const color = (l: DashLog) => {
    if (l.level === 'ERROR') return 'text-red';
    if (l.level === 'WARN') return 'text-gold';
    if (l.level === 'TRADE' || l.level === 'GRID') return 'text-cyan';
    if (l.level === 'RECONCILE') return 'text-pro-blue';
    return 'text-text2';
  };

  const filters: LogFilter[] = ['ALL', 'INFO', 'WARN', 'ERROR', 'TRADE', 'GRID', 'RECONCILE'];

  return (
    <SectionShell
      title="Terminal de Logs"
      right={
        <div className="flex gap-1.5 flex-wrap items-center">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`font-mono text-[9px] uppercase px-2 py-1 border ${
                filter === f
                  ? 'border-cyan text-cyan'
                  : 'border-border2 text-text2 hover:border-cyan-30'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            className={`font-mono text-[9px] uppercase px-2 py-1 border ${
              autoScroll ? 'border-cyan text-cyan' : 'border-border2 text-text2'
            }`}
          >
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => void clear()}
            className="font-mono text-[9px] uppercase px-2 py-1 border border-border2 text-text2 hover:border-red hover:text-red"
          >
            Limpar
          </button>
        </div>
      }
    >
      <div className="bg-bg0 border border-border1 h-64 overflow-y-auto p-3 font-mono text-[10px] space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-text3">A aguardar logs do motor…</p>
        )}
        {filtered.map((l, i) => (
          <div key={`${l.timestamp}-${i}`} className={color(l)}>
            <span className="text-text3">[{new Date(l.timestamp).toLocaleTimeString('pt-PT')}]</span>{' '}
            <span className="text-text2">[{l.level}]</span>{' '}
            <span className="text-text2">[{l.module}]</span> {l.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </SectionShell>
  );
}

export function DashboardExtendedSections({ enabled }: { enabled: boolean }) {
  const [range, setRange] = useState<PerfRange>('24h');
  const { data, loading, error, refetch } = useDashboardExtended(enabled, range, 10000);

  const symbols = useMemo(
    () => Object.keys(data.marketIndicators).sort(),
    [data.marketIndicators]
  );

  if (!enabled) return null;

  if (loading && !data.generatedAt) {
    return (
      <div className="bg-bg1 border border-border1 p-4 font-mono text-[10px] text-text2">
        A carregar secções extended…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
          {error}
        </div>
      )}
      <MarketIndicatorsSection indicators={data.marketIndicators} symbols={symbols} />
      <BotsStatusSection bots={data.bots} onChanged={() => void refetch()} />
      <RecentTradesSection trades={data.recentTrades} />
      <PerformanceSection
        range={range}
        onRange={setRange}
        performance={data.performance}
        metrics={data.metrics}
      />
      <LogsTerminal enabled={enabled} />
    </div>
  );
}
