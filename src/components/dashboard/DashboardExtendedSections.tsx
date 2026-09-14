import { useMemo, useState, type ReactNode } from 'react';
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
  type DashTrade,
  type PerfRange,
  PERF_RANGE_OPTIONS,
  downloadHistoryCsv,
  useDashboardExtended,
} from '../../hooks/useDashboardExtended';

type TradeFilter = 'all' | 'trend' | 'grid' | 'profit' | 'loss';

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

function DcaPairsSection({
  pairs,
  onChanged,
}: {
  pairs: Array<{
    symbol: string;
    status: string;
    statusLabel: string;
    minNotional: number | null;
    hasBot: boolean;
  }>;
  onChanged: () => void;
}) {
  const [symbol, setSymbol] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    setBusy(true);
    try {
      await api.post('/dashboard/dca-pairs/add', { symbol: s });
      setSymbol('');
      onChanged();
    } catch {
      /* */
    } finally {
      setBusy(false);
    }
  };

  const remove = async (sym: string) => {
    setBusy(true);
    try {
      await api.post('/dashboard/dca-pairs/remove', { symbol: sym });
      onChanged();
    } catch {
      /* */
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell title="Pares DCA">
      <div className="flex flex-wrap gap-2 mb-3">
        {(pairs || []).map((p) => (
          <div
            key={p.symbol}
            className="border border-border1 px-2 py-1.5 flex items-center gap-2"
          >
            <span className="text-text1 font-bold">{p.symbol}</span>
            <span
              className={
                p.status === 'active'
                  ? 'text-cyan'
                  : p.status === 'skip_min' || p.status === 'no_sl'
                    ? 'text-red'
                    : 'text-text2'
              }
            >
              {p.statusLabel}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove(p.symbol)}
              className="text-text3 hover:text-red text-[9px] uppercase"
            >
              remover
            </button>
          </div>
        ))}
        {(!pairs || pairs.length === 0) && (
          <span className="text-text3">Nenhum par configurado</span>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="SOLUSDT"
          className="bg-bg0 border border-border1 px-2 py-1 text-text1 w-36"
        />
        <button
          type="button"
          disabled={busy || !symbol.trim()}
          onClick={() => void add()}
          className="border border-cyan text-cyan px-3 py-1 text-[10px] uppercase disabled:opacity-40"
        >
          Adicionar par
        </button>
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
    if (status === 'dca_no_sl') return 'text-red font-bold';
    if (status === 'active' || status === 'grid_active' || status === 'dca_active') return 'text-cyan';
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
                  <td className="py-2.5 pr-3 text-text2">
                    <div>{bot.strategy}</div>
                    {bot.gridNote && (
                      <div className="mt-1 text-[9px] text-gold">{bot.gridNote}</div>
                    )}
                    {bot.gridLevels && bot.gridLevels.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-[9px] border border-border1/60">
                          <thead>
                            <tr className="text-text3 uppercase">
                              <th className="px-1 py-0.5 text-left">#</th>
                              <th className="px-1 py-0.5 text-left">Lado</th>
                              <th className="px-1 py-0.5 text-left">Preço</th>
                              <th className="px-1 py-0.5 text-left">Qty</th>
                              <th className="px-1 py-0.5 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bot.gridLevels.map((lv) => (
                              <tr key={lv.id} className="border-t border-border1/40">
                                <td className="px-1 py-0.5">{lv.levelIndex}</td>
                                <td className="px-1 py-0.5">{lv.side}</td>
                                <td className="px-1 py-0.5">${lv.price}</td>
                                <td className="px-1 py-0.5">{lv.quantity}</td>
                                <td
                                  className={`px-1 py-0.5 ${
                                    lv.status === 'FILLED'
                                      ? 'text-cyan'
                                      : lv.status === 'PENDING'
                                        ? 'text-gold'
                                        : 'text-text3'
                                  }`}
                                >
                                  {lv.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {bot.dcaCycle && (
                      <div className="mt-1 text-[9px] text-text2/80 leading-relaxed">
                        <span
                          className={`inline-block mb-1 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${
                            bot.dcaCycle.side === 'SHORT'
                              ? 'border-red-30 text-red'
                              : 'border-cyan-30 text-cyan'
                          }`}
                        >
                          {bot.dcaCycle.side === 'SHORT' ? 'SHORT' : 'LONG'}
                        </span>
                        {bot.dcaCycle.missingSl && (
                          <span className="inline-block mb-1 ml-1 font-mono text-[9px] uppercase tracking-wider text-white bg-red-600 px-1.5 py-0.5">
                            CICLO SEM SL
                          </span>
                        )}
                        média ${bot.dcaCycle.avgEntry.toPrecision(6)} · safety{' '}
                        {bot.dcaCycle.safetyFilled}/{bot.dcaCycle.maxSafetyOrders}
                        {bot.dcaCycle.nextSafetyPrice != null && (
                          <>
                            <br />
                            próxima @ ${bot.dcaCycle.nextSafetyPrice.toPrecision(6)}
                          </>
                        )}
                        {bot.dcaCycle.tpPrice != null && (
                          <>
                            <br />
                            TP ${bot.dcaCycle.tpPrice.toPrecision(6)}
                            {bot.dcaCycle.slPrice != null
                              ? ` · SL $${bot.dcaCycle.slPrice.toPrecision(6)}`
                              : ''}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td
                    className={`py-2.5 pr-3 ${
                      bot.dcaCycle?.missingSl || bot.status === 'dca_no_sl'
                        ? 'text-red font-bold'
                        : statusDot(bot.status)
                    }`}
                  >
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
  periodCards,
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
    netPnl?: number;
    fees?: number;
  };
  periodCards?: {
    grossProfit: number;
    grossLoss: number;
    net: number;
    bestTrade: { symbol: string | null; pnl: number } | null;
    worstTrade: { symbol: string | null; pnl: number } | null;
    greenDays: number;
    fees: number;
  };
}) {
  const [exporting, setExporting] = useState(false);
  const chartData = performance.labels.map((label, i) => ({
    label,
    trend: performance.trend[i] ?? 0,
    grid: performance.grid[i] ?? 0,
    total: performance.total[i] ?? 0,
  }));

  const cards = periodCards || {
    grossProfit: 0,
    grossLoss: 0,
    net: 0,
    bestTrade: null,
    worstTrade: null,
    greenDays: 0,
    fees: metrics.fees ?? 0,
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadHistoryCsv(range);
    } catch {
      /* ignore */
    } finally {
      setExporting(false);
    }
  };

  const fmtMoney = (n: number, signed = false) => {
    if (signed) return `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;
    return `$${Math.abs(n).toFixed(2)}`;
  };

  return (
    <SectionShell
      title="Gráfico de Performance"
      right={
        <div className="flex gap-1 flex-wrap items-center">
          {PERF_RANGE_OPTIONS.map((r) => (
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
          <button
            type="button"
            disabled={exporting}
            onClick={() => void exportCsv()}
            className="font-mono text-[9px] uppercase px-2 py-1 border border-border2 text-text2 hover:border-cyan hover:text-cyan disabled:opacity-40"
          >
            {exporting ? 'CSV…' : 'Export CSV'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
        {[
          {
            label: 'Lucro',
            value: `+$${cards.grossProfit.toFixed(2)}`,
            tone: 'text-cyan',
          },
          {
            label: 'Perda',
            value: `−$${cards.grossLoss.toFixed(2)}`,
            tone: 'text-red',
          },
          {
            label: 'Net',
            value: `${cards.net >= 0 ? '+' : '−'}$${Math.abs(cards.net).toFixed(2)}`,
            tone: cards.net >= 0 ? 'text-cyan' : 'text-red',
          },
          {
            label: 'Melhor trade',
            value: cards.bestTrade
              ? `${cards.bestTrade.symbol || '—'} ${cards.bestTrade.pnl >= 0 ? '+' : ''}$${cards.bestTrade.pnl.toFixed(2)}`
              : '—',
            tone: 'text-text1',
          },
          {
            label: 'Pior trade',
            value: cards.worstTrade
              ? `${cards.worstTrade.symbol || '—'} ${cards.worstTrade.pnl >= 0 ? '+' : ''}$${cards.worstTrade.pnl.toFixed(2)}`
              : '—',
            tone: 'text-text1',
          },
          {
            label: 'Dias em verde',
            value: String(cards.greenDays),
            tone: 'text-cyan',
          },
        ].map((m) => (
          <div key={m.label} className="border border-border1 bg-bg2 p-3">
            <p className="font-mono text-[9px] uppercase text-text2">{m.label}</p>
            <p className={`font-bold text-base mt-1 ${m.tone}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
        {[
          { label: 'PnL', value: fmtMoney(metrics.netPnl ?? cards.net, true) },
          { label: 'Trades', value: String(metrics.totalTrades) },
          { label: 'Win Rate', value: `${metrics.winRate}%` },
          { label: 'Profit Factor', value: metrics.profitFactor.toFixed(2) },
          { label: 'Max Drawdown', value: `${metrics.maxDrawdown}%` },
          { label: 'Fees', value: `$${(metrics.fees ?? cards.fees).toFixed(2)}` },
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

export function DashboardExtendedSections({
  enabled,
  showLogs = false,
  onSelectSymbol: _onSelectSymbol,
}: {
  enabled: boolean;
  showLogs?: boolean;
  onSelectSymbol?: (symbol: string) => void;
}) {
  const [range, setRange] = useState<PerfRange>('24h');
  const { data, loading, error, refetch } = useDashboardExtended(enabled, range, 10000);

  // Radar / indicadores → página Mercado. Logs → DashboardLogsTerminal (admin).
  void _onSelectSymbol;
  void showLogs;

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
      <DcaPairsSection
        pairs={data.dcaPairs || []}
        onChanged={() => void refetch()}
      />
      <BotsStatusSection bots={data.bots} onChanged={() => void refetch()} />
      <RecentTradesSection trades={data.recentTrades} />
      <PerformanceSection
        range={range}
        onRange={setRange}
        performance={data.performance}
        metrics={data.metrics}
        periodCards={data.periodCards}
      />
    </div>
  );
}
