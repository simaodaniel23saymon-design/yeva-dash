import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLoader } from '../components/YevaTradeLoader';
import { useBinanceData } from '../hooks/useBinanceData';
import { useDashboardExtended } from '../hooks/useDashboardExtended';
import { useExchangeCatalog } from '../hooks/useExchangeCatalog';
import { useMomentumRanking } from '../hooks/useMomentumRanking';
import { api } from '../lib/api';
import { formatActualizadoLabel } from '../utils/dashboardFocus';
import { NO_OPPORTUNITY_TEXT, OPPORTUNITY_LABEL, dashboardOpportunities, marketCards, type OpportunityStatus } from '../utils/dashboardSummary';
import { HUB_STATUS_LABEL, findVenue, hubStatusTone, venuesByType } from '../utils/exchangeCatalog';
import { whenConnected } from '../utils/futuresView';
import { executionLabel, fmtPrice, fmtSignedPct, fmtSignedUsd, fmtUsd, NOT_AVAILABLE, signTone } from '../utils/spotView';
import { useAuth } from '../context/AuthContext';
import { canAccessSpotPaper } from '../utils/access';
import type { SpotCoinsResponse } from '../types/spot';

const orNA = (s: string) => (s === '—' ? NOT_AVAILABLE : s);

function Card({ title, action, children, testId }: { title: string; action?: { to: string; label: string }; children: React.ReactNode; testId?: string }) {
  return (
    <section className="dashboard-kpi rounded-[22px] p-5 sm:p-6 flex flex-col" data-testid={testId}>
      <h3 className="dash-label text-text1 mb-3">{title}</h3>
      <div className="flex-1">{children}</div>
      {action && (
        <Link to={action.to} className="dash-btn self-start mt-4 font-mono uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan text-[11px]">
          {action.label}
        </Link>
      )}
    </section>
  );
}

function Fact({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-text3 text-[12px]">{k}</dt>
      <dd className={`font-mono text-[15px] ${tone ?? 'text-text1'}`}>{v}</dd>
    </div>
  );
}

function OppBadge({ market, status }: { market: string; status: OpportunityStatus | null }) {
  const tone = status === 'OPPORTUNITY' ? 'text-cyan border-cyan-30' : status === 'WATCHING' ? 'text-text1 border-border2' : 'text-text3 border-border1';
  return (
    <span className={`font-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${tone}`}>
      {market} · {status ? OPPORTUNITY_LABEL[status] : 'Dados indisponíveis'}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = canAccessSpotPaper(user);
  const { data: binance, loading: binanceLoading, refreshing, error, refetch } = useBinanceData(10000);
  const ranking = useMomentumRanking(60_000);
  const catalog = useExchangeCatalog();
  const [spot, setSpot] = useState<SpotCoinsResponse | null>(null);
  const [spotLoaded, setSpotLoaded] = useState(false);
  const connected = binance.exchangeConnected;
  const { data: extended, loading: extendedLoading } = useDashboardExtended(connected, 'TOTAL', 60_000);

  const loadSpot = useCallback(async () => {
    const s = await api
      .get<SpotCoinsResponse>('/spot/coins', { params: { exchange: 'BINANCE', bot: 'MOMENTUM_ROTATION' } })
      .then((r) => r.data)
      .catch(() => null);
    setSpot(s);
    setSpotLoaded(true);
  }, []);

  useEffect(() => {
    void loadSpot();
    const id = window.setInterval(() => void loadSpot(), 30_000);
    return () => window.clearInterval(id);
  }, [loadSpot]);

  const coins = useMemo(() => spot?.coins ?? [], [spot]);
  const cards = useMemo(() => marketCards(coins, ranking.marketItems), [coins, ranking.marketItems]);
  const opportunities = useMemo(() => dashboardOpportunities(coins, ranking.marketItems), [coins, ranking.marketItems]);

  if (binanceLoading && !spotLoaded && ranking.loading) return <PageLoader />;

  const spotAccount = spot?.account ?? null;
  const spotConnected = spotAccount?.status === 'CONNECTED';
  const spotPositions = spotConnected ? coins.filter((c) => c.position).length : null;
  const futPositions = whenConnected(connected, binance.posicoesAbertas);
  const futTotal = connected && !extendedLoading ? extended.periodCards?.net ?? null : null;
  const binanceVenue = findVenue(catalog.venues, 'BINANCE');
  const cex = venuesByType(catalog.venues, 'CEX');
  const lastUpdate = new Date(binance.atualizadoEm);

  return (
    <div className="dashboard-focus space-y-8 mb-12">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan animate-pulse shadow-[0_0_14px_rgba(0,212,160,0.8)]" />
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-cyan" data-testid="dashboard-last-update">
              {formatActualizadoLabel(lastUpdate)}
            </p>
          </div>
          <h2 className="text-text1 font-bold text-[28px] leading-tight">Dashboard</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link to="/admin" className="dash-btn font-mono uppercase tracking-wider px-4 py-3 border border-border2 text-text2 text-[11px]" data-testid="dashboard-admin-link">
              Strategy Lab · admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              refetch();
              void loadSpot();
              void ranking.reload();
              void catalog.reload();
            }}
            disabled={refreshing}
            className="dash-btn font-mono uppercase tracking-wider px-5 py-3 border border-cyan-30 bg-cyan-dim text-cyan disabled:opacity-50"
          >
            {refreshing ? 'A actualizar…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <div className="bg-bg1 border border-border2 p-4 text-text2">Dados da conta indisponíveis de momento.</div>}

      <Card title="Resumo da conta · REAL" testId="dashboard-account-summary">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4">
          <Fact k="Saldo Spot" v={spotConnected ? orNA(fmtUsd(spotAccount?.balanceUsdt ?? null)) : NOT_AVAILABLE} />
          <Fact k="Saldo Futures" v={orNA(fmtUsd(whenConnected(connected, binance.saldoTotal)))} />
          <Fact k="PnL hoje · Futures" v={orNA(fmtSignedUsd(whenConnected(connected, binance.resultadoHoje)))} tone={signTone(whenConnected(connected, binance.resultadoHoje))} />
          <Fact k="PnL total · Futures" v={orNA(fmtSignedUsd(futTotal))} tone={signTone(futTotal)} />
          <Fact k="PnL aberto · Spot" v={spotConnected ? orNA(fmtSignedUsd(spotAccount?.unrealizedPnl ?? null)) : NOT_AVAILABLE} tone={signTone(spotAccount?.unrealizedPnl ?? null)} />
          <Fact k="PnL realizado · Spot" v={spotConnected ? orNA(fmtSignedUsd(spotAccount?.realizedPnl ?? null)) : NOT_AVAILABLE} tone={signTone(spotAccount?.realizedPnl ?? null)} />
          <Fact k="Posições abertas · Spot" v={spotPositions == null ? NOT_AVAILABLE : String(spotPositions)} />
          <Fact k="Posições abertas · Futures" v={futPositions == null ? NOT_AVAILABLE : String(futPositions)} />
        </dl>
        <p className="text-text3 text-[12px] mt-3">Só PnL REAL das tuas contas. Valores desconhecidos aparecem como "Não disponível".</p>
      </Card>

      <section data-testid="dashboard-market">
        <h3 className="dash-label text-text1 mb-3">Mercado</h3>
        {cards.length === 0 ? (
          <p className="text-text2">{spotLoaded ? 'Dados indisponíveis' : 'A carregar…'}</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {cards.map((c) => (
              <li key={c.symbol} className="dashboard-kpi rounded-[18px] p-4 space-y-2" data-testid={`dashboard-market-${c.symbol}`}>
                <p className="text-text1 font-semibold">{c.base}</p>
                <p className="font-mono text-[13px] text-text1">{c.price == null ? NOT_AVAILABLE : fmtPrice(c.price)}</p>
                <p className={`font-mono text-[12px] ${signTone(c.change24hPct)}`}>{c.change24hPct == null ? '24h —' : `${fmtSignedPct(c.change24hPct)} 24h`}</p>
                <div className="flex flex-col gap-1">
                  <OppBadge market="Spot" status={c.spot} />
                  <OppBadge market="Futures" status={c.futures} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card title="Oportunidades" testId="dashboard-opportunities">
        {opportunities.length === 0 ? (
          <p className="text-text2 text-lg" data-testid="dashboard-no-opportunity">{NO_OPPORTUNITY_TEXT}</p>
        ) : (
          <ul className="divide-y divide-border1">
            {opportunities.map((o) => (
              <li key={o.key} className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-text1 font-semibold min-w-[56px]">{o.base}</span>
                <span className={`font-mono text-[13px] ${signTone(o.change24hPct)}`}>{o.change24hPct == null ? '—' : fmtSignedPct(o.change24hPct)}</span>
                <span className="text-text2 text-[13px]">Momentum</span>
                <Link to={o.to} className="ml-auto font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">
                  {o.market === 'SPOT' ? 'Ver Spot' : 'Ver Futures'}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-text3 text-[12px] mt-3">Análise de mercado. Uma oportunidade não é uma ordem.</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Spot" action={{ to: '/spot', label: 'Abrir Spot' }} testId="dashboard-spot">
          <dl className="grid grid-cols-2 gap-3">
            <Fact k="Conta" v={spotAccount ? (spotConnected ? 'Conectada' : 'Não conectada') : NOT_AVAILABLE} />
            <Fact k="Exchange" v="Binance" />
            <Fact k="Saldo Spot" v={spotConnected ? orNA(fmtUsd(spotAccount?.balanceUsdt ?? null)) : NOT_AVAILABLE} />
            <Fact k="Posições" v={spotPositions == null ? NOT_AVAILABLE : String(spotPositions)} />
            <Fact k="Execução" v={spot ? executionLabel(spot.execution, spot.liveEnabled) : NOT_AVAILABLE} />
          </dl>
        </Card>

        <Card title="Futures" action={{ to: '/futures', label: 'Abrir Futures' }} testId="dashboard-futures">
          <dl className="grid grid-cols-2 gap-3">
            <Fact k="Conta" v={binanceVenue?.futures ? HUB_STATUS_LABEL[binanceVenue.futures.status] : NOT_AVAILABLE} />
            <Fact k="Exchange" v="Binance" />
            <Fact k="Posições" v={futPositions == null ? NOT_AVAILABLE : String(futPositions)} />
            <Fact k="PnL aberto · Futures" v={orNA(fmtSignedUsd(whenConnected(connected, binance.pnlAberto)))} tone={signTone(whenConnected(connected, binance.pnlAberto))} />
          </dl>
        </Card>

        <Card title="Exchanges" action={{ to: '/exchanges', label: 'Gerir exchanges' }} testId="dashboard-exchanges">
          {catalog.error && cex.length === 0 ? (
            <p className="text-text2">Dados indisponíveis</p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {cex.map((v) => (
                <li key={v.exchange} className="flex items-center justify-between gap-2">
                  <span className="text-text1">{v.name}</span>
                  <span className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 ${hubStatusTone(v.status)}`}>{HUB_STATUS_LABEL[v.status]}</span>
                </li>
              ))}
            </ul>
          )}
          {cex.length > 0 && !cex.some((v) => v.status === 'CONNECTED') && (
            <p className="text-text2 text-[13px] mt-3">Nenhuma exchange conectada</p>
          )}
        </Card>
      </div>
    </div>
  );
}
