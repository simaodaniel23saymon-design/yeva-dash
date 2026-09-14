import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLoader } from '../components/YevaTradeLoader';
import { formatMoney } from '../utils/format';
import { fmtSignedUsd } from '../utils/binanceData';
import { useBinanceData } from '../hooks/useBinanceData';
import {
  fetchExchangePositions,
  parseNum,
  type ExchangePosition,
} from '../utils/liveData';
import { useDashboardExtended } from '../hooks/useDashboardExtended';
import {
  buildEquityPoints,
  formatActualizadoLabel,
  pickRecentTrades,
} from '../utils/dashboardFocus';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { DashboardLogsTerminal } from '../components/dashboard/DashboardLogsTerminal';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: binance, loading: binanceLoading, refreshing, error, refetch } =
    useBinanceData(10000);
  const [positions, setPositions] = useState<ExchangePosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const { data: extended } = useDashboardExtended(
    binance.exchangeConnected,
    '30d',
    15000
  );

  const loadPositions = useCallback(async () => {
    if (!binance.exchangeConnected) {
      setPositions([]);
      setPositionsLoading(false);
      return;
    }
    try {
      setPositions(await fetchExchangePositions());
    } catch {
      /* */
    } finally {
      setPositionsLoading(false);
    }
  }, [binance.exchangeConnected]);

  useEffect(() => {
    void loadPositions();
    if (!binance.exchangeConnected) return;
    const id = window.setInterval(() => void loadPositions(), 10000);
    return () => window.clearInterval(id);
  }, [loadPositions, binance.exchangeConnected]);

  const openPositions = useMemo(() => {
    return (positions || [])
      .map((p) => {
        const qty = Math.abs(parseNum(p.positionAmt));
        if (!(qty > 0)) return null;
        return {
          symbol: p.symbol,
          side: String(p.positionSide || 'LONG').toUpperCase(),
          qty,
          entry: parseNum(p.entryPrice),
          upnl: parseNum(p.unrealizedProfit),
        };
      })
      .filter(Boolean) as Array<{
      symbol: string;
      side: string;
      qty: number;
      entry: number;
      upnl: number;
    }>;
  }, [positions]);

  const recentTrades = useMemo(
    () => pickRecentTrades(extended.recentTrades || [], 10),
    [extended.recentTrades]
  );

  const equityPoints = useMemo(
    () =>
      buildEquityPoints({
        labels: extended.performance?.labels || [],
        total: extended.performance?.total || [],
      }),
    [extended.performance]
  );

  const pnlToday = binance.resultadoHoje;
  const pnlTotal = extended.metrics?.netPnl ?? extended.periodCards?.net ?? 0;
  const updatedAt = new Date(binance.atualizadoEm);

  if (binanceLoading && positionsLoading) {
    return <PageLoader />;
  }

  return (
    <div className="dashboard-focus space-y-12 mb-12">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan animate-pulse shadow-[0_0_14px_rgba(0,212,160,0.8)]" />
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-cyan">
              {formatActualizadoLabel(updatedAt)}
            </p>
          </div>
          <h2 className="text-text1 font-bold text-[28px] leading-tight">Dashboard</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            refetch();
            void loadPositions();
          }}
          disabled={refreshing}
          className="dash-btn font-mono uppercase tracking-wider px-5 py-3 border border-cyan-30 bg-cyan-dim text-cyan disabled:opacity-50"
        >
          {refreshing ? 'A actualizar…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-dim border border-red-30 p-4 text-red text-lg">{error}</div>
      )}

      {!binance.exchangeConnected ? (
        <div className="bg-gold-dim border border-gold-30 p-8 text-center">
          <p className="text-gold text-lg mb-6">Nenhuma exchange conectada</p>
          <Link
            to="/exchanges"
            className="dash-btn inline-block font-mono uppercase px-6 py-3 border border-cyan-30 bg-cyan-dim text-cyan"
          >
            Conectar Exchange
          </Link>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="dashboard-kpi rounded-[22px] p-6 lg:col-span-1">
              <p className="dash-label text-text2 mb-2">Saldo</p>
              <p
                className={`dash-saldo font-bold leading-none ${
                  binance.saldoDisponivel >= 0 ? 'text-cyan' : 'text-red'
                }`}
              >
                {formatMoney(binance.saldoDisponivel)}
              </p>
              <p className="text-text3 text-lg mt-3">Disponível · Binance</p>
            </div>
            <div className="dashboard-kpi rounded-[22px] p-6">
              <p className="dash-label text-text2 mb-2">PnL hoje</p>
              <p
                className={`dash-pnl font-bold leading-none ${
                  pnlToday >= 0 ? 'text-cyan' : 'text-red'
                }`}
              >
                {fmtSignedUsd(pnlToday)}
              </p>
            </div>
            <div className="dashboard-kpi rounded-[22px] p-6">
              <p className="dash-label text-text2 mb-2">PnL total</p>
              <p
                className={`dash-pnl font-bold leading-none ${
                  pnlTotal >= 0 ? 'text-cyan' : 'text-red'
                }`}
              >
                {fmtSignedUsd(pnlTotal)}
              </p>
              <p className="text-text3 text-lg mt-3">Realizado · 30d</p>
            </div>
          </div>

          {/* Posições */}
          <section className="dash-section">
            <h3 className="dash-label text-text1 mb-4">Posições abertas</h3>
            <div className="bg-bg1 border border-border1 rounded-[22px] overflow-hidden">
              {openPositions.length === 0 ? (
                <p className="p-6 text-text2 text-lg">Sem posições abertas</p>
              ) : (
                <ul className="divide-y divide-border1">
                  {openPositions.map((p) => (
                    <li
                      key={`${p.symbol}-${p.side}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-[12px] uppercase px-2 py-1 border ${
                            p.side === 'SHORT'
                              ? 'border-red-30 text-red'
                              : 'border-cyan-30 text-cyan'
                          }`}
                        >
                          {p.side === 'SHORT' ? 'SHORT' : 'LONG'}
                        </span>
                        <span className="text-text1 font-bold text-lg">
                          {p.symbol.replace(/USDT$/, '')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-lg text-text2">
                        <span>qty {p.qty.toPrecision(4)}</span>
                        <span>
                          @ $
                          {p.entry >= 100 ? p.entry.toFixed(2) : p.entry.toFixed(4)}
                        </span>
                        <span className={p.upnl >= 0 ? 'text-cyan' : 'text-red'}>
                          {fmtSignedUsd(p.upnl)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Trades */}
          <section className="dash-section">
            <h3 className="dash-label text-text1 mb-4">Trades recentes</h3>
            <div className="bg-bg1 border border-border1 rounded-[22px] overflow-hidden">
              {recentTrades.length === 0 ? (
                <p className="p-6 text-text2 text-lg">Sem trades recentes</p>
              ) : (
                <ul className="divide-y divide-border1">
                  {recentTrades.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-[12px] uppercase px-2 py-1 border ${
                            String(t.side).toUpperCase().includes('SHORT')
                              ? 'border-red-30 text-red'
                              : 'border-cyan-30 text-cyan'
                          }`}
                        >
                          {t.side}
                        </span>
                        <span className="text-text1 font-bold">
                          {t.symbol.replace(/USDT$/, '')}
                        </span>
                        <span className="text-text3">{t.type}</span>
                      </div>
                      <div className="flex gap-4 text-text2">
                        <span className={t.pnl >= 0 ? 'text-cyan' : 'text-red'}>
                          {fmtSignedUsd(t.pnl)}
                        </span>
                        <span className="text-text3">
                          {new Date(t.date).toLocaleString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Equity 30d */}
          <section className="dash-section">
            <h3 className="dash-label text-text1 mb-4">Equity · 30 dias</h3>
            <div className="bg-bg1 border border-border1 rounded-[22px] p-6 h-72">
              {equityPoints.length === 0 ? (
                <p className="text-text2 text-lg py-12 text-center">
                  Sem dados de equity neste período
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityPoints}>
                    <CartesianGrid stroke="#1e2b1f" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#6b8a6e', fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: '#6b8a6e', fontSize: 12 }}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0b100d',
                        border: '1px solid #1e2b1f',
                        fontSize: 14,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      name="Equity"
                      stroke="#00d4a0"
                      dot={false}
                      strokeWidth={2.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Logs: só admin */}
          {user?.isAdmin ? <DashboardLogsTerminal enabled /> : null}
        </>
      )}
    </div>
  );
}
