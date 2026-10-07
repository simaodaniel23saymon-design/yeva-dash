import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLoader } from '../components/YevaTradeLoader';
import { useBinanceData } from '../hooks/useBinanceData';
import { useDashboardExtended } from '../hooks/useDashboardExtended';
import { useExchangeCatalog } from '../hooks/useExchangeCatalog';
import { useMomentumRanking } from '../hooks/useMomentumRanking';
import { api } from '../lib/api';
import { formatActualizadoLabel } from '../utils/dashboardFocus';
import { MARKET_MONITORED_TEXT, dashboardOpportunities, eligibleCountText } from '../utils/dashboardSummary';
import { HUB_STATUS_LABEL, findVenue, hubStatusTone, venuesByType } from '../utils/exchangeCatalog';
import { executionLabel, fmtPrice, fmtSignedPct, fmtSignedUsd, signTone } from '../utils/spotView';
import { DATA_STATE_TEXT, EMPTY_TEXT, SPOT_TRADING_TEXT, accountValue, balanceText, fmtWhen, futuresAccountState, hasAccountValues, spotAccountState, spotTradingState } from '../utils/dataStates';
import { DASHBOARD_LIST_LIMIT, MOVER_STATE_LABEL, SPOT_OPPORTUNITY_LABEL, spotMarketUpdating, spotTopWinnerCoins } from '../utils/marketDiscovery';
import { useAuth } from '../context/AuthContext';
import { canAccessSpotPaper } from '../utils/access';
import type { FuturesMoversResponse, SpotCoinsResponse } from '../types/spot';

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

type MarketRow = { symbol: string; base: string; price: number | null; change24hPct: number | null; state: string };

function MarketList({ title, rows, empty, testId }: { title: string; rows: MarketRow[]; empty: React.ReactNode; testId: string }) {
  return (
    <div className="dashboard-kpi rounded-[18px] p-4" data-testid={testId}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-2">{title}</p>
      {rows.length === 0 ? (
        <div className="text-text2 text-[13px]">{empty}</div>
      ) : (
        <ul className="divide-y divide-border1">
          {rows.map((r) => (
            <li key={r.symbol} className="py-2 grid grid-cols-[minmax(48px,1fr)_auto_auto] items-center gap-x-3 text-[13px]">
              <span className="text-text1 font-semibold">{r.base}</span>
              <span className="font-mono text-text1">{r.price == null ? '—' : fmtPrice(r.price)}</span>
              <span className={`font-mono ${signTone(r.change24hPct)}`}>{r.change24hPct == null ? '—' : fmtSignedPct(r.change24hPct)}</span>
              <span className="col-span-3 text-text3 text-[11px]">{r.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const [movers, setMovers] = useState<FuturesMoversResponse | null>(null);
  const [moversLoaded, setMoversLoaded] = useState(false);
  const connected = binance.exchangeConnected;
  const { data: extended, loading: extendedLoading } = useDashboardExtended(connected, 'TOTAL', 60_000);

  const loadMarket = useCallback(async () => {
    const [s, m] = await Promise.all([
      api
        .get<SpotCoinsResponse>('/spot/coins', { params: { exchange: 'BINANCE', bot: 'MOMENTUM_ROTATION' } })
        .then((r) => r.data)
        .catch(() => null),
      api
        .get<FuturesMoversResponse>('/market/movers')
        .then((r) => r.data)
        .catch(() => null),
    ]);
    setSpot(s);
    setSpotLoaded(true);
    setMovers(m);
    setMoversLoaded(true);
  }, []);

  useEffect(() => {
    void loadMarket();
    const id = window.setInterval(() => void loadMarket(), 30_000);
    return () => window.clearInterval(id);
  }, [loadMarket]);

  const coins = useMemo(() => spot?.coins ?? [], [spot]);
  const opportunities = useMemo(() => dashboardOpportunities(coins, ranking.marketItems), [coins, ranking.marketItems]);

  if (binanceLoading && !spotLoaded && ranking.loading) return <PageLoader />;

  const spotAccount = spot?.account ?? null;
  const spotState = spotAccountState(spotAccount, !spotLoaded);
  const futState = futuresAccountState({
    loading: binanceLoading,
    requestFailed: Boolean(error),
    dataState: binance.dataState,
    connected,
    balance: connected ? binance.saldoTotal : null,
    updatedAt: binance.atualizadoEm,
  });
  const spotPositions = coins.filter((c) => c.position).length;
  const futTotal = hasAccountValues(futState) && !extendedLoading ? extended.periodCards?.net ?? null : null;
  const binanceVenue = findVenue(catalog.venues, 'BINANCE');
  const cex = venuesByType(catalog.venues, 'CEX');
  const lastUpdate = new Date(binance.atualizadoEm);
  const spotUpdating = spotMarketUpdating(spot);

  const spotWinners: MarketRow[] = spotTopWinnerCoins(spot, DASHBOARD_LIST_LIMIT).map((c) => ({
    symbol: c.symbol,
    base: c.base,
    price: c.price,
    change24hPct: c.change24hPct,
    state: SPOT_OPPORTUNITY_LABEL[c.strategyState] ?? '',
  }));
  const moverRows = (list: FuturesMoversResponse['winners'] | undefined): MarketRow[] =>
    (list ?? []).slice(0, DASHBOARD_LIST_LIMIT).map((m) => ({ symbol: m.symbol, base: m.base, price: m.price, change24hPct: m.change24hPct, state: MOVER_STATE_LABEL[m.opportunityState] }));
  const futuresEmpty = !moversLoaded ? EMPTY_TEXT.UPDATING : movers == null ? EMPTY_TEXT.DATA_ERROR : movers.stale ? `${EMPTY_TEXT.MARKET_UPDATING} · ${fmtWhen(movers.scannedAt)}` : EMPTY_TEXT.NO_OPPORTUNITY;

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
              void loadMarket();
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

      <Card title="Resumo da conta · REAL" testId="dashboard-account-summary">
        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
          <Fact k="Saldo Spot" v={balanceText(spotState, spotAccount?.balanceUsdt ?? null)} />
          <Fact k="Saldo Futures" v={balanceText(futState, connected ? binance.saldoTotal : null)} />
          <Fact k="PnL Spot · aberto" v={accountValue(spotState, spotAccount?.unrealizedPnl, (v) => fmtSignedUsd(v))} tone={signTone(spotAccount?.unrealizedPnl ?? null)} />
          <Fact k="PnL Futures · total" v={accountValue(futState, futTotal, (v) => fmtSignedUsd(v))} tone={signTone(futTotal)} />
          <Fact k="Posições Spot" v={accountValue(spotState, spotPositions, (v) => String(v))} />
          <Fact k="Posições Futures" v={accountValue(futState, binance.posicoesAbertas, (v) => String(v))} />
        </dl>
        {(spotState === 'NOT_CONNECTED' || futState === 'NOT_CONNECTED') && (
          <p className="text-text2 text-[13px] mt-3">
            {EMPTY_TEXT.CONNECT} <Link to="/exchanges" className="text-cyan hover:underline">Exchanges</Link>
          </p>
        )}
        {(spotState === 'DATA_STALE' || futState === 'DATA_STALE') && <p className="text-text3 text-[12px] mt-2">{DATA_STATE_TEXT.DATA_STALE}</p>}
        <p className="text-text3 text-[12px] mt-3">Só PnL REAL das tuas contas, separado por mercado.</p>
      </Card>

      <section data-testid="dashboard-market">
        <h3 className="dash-label text-text1 mb-3">Mercado</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MarketList
            title="Spot · Top Winners"
            rows={spotUpdating ? [] : spotWinners}
            testId="dashboard-spot-winners"
            empty={
              !spotLoaded ? EMPTY_TEXT.UPDATING : !spot ? EMPTY_TEXT.DATA_ERROR : spotUpdating ? (
                <>
                  <p>{EMPTY_TEXT.MARKET_UPDATING}</p>
                  <p className="text-text3 text-[11px]">Última atualização: {fmtWhen(spot.discovery?.updatedAt ?? spot.rankingScannedAt)}</p>
                </>
              ) : EMPTY_TEXT.NO_OPPORTUNITY
            }
          />
          <MarketList title="Futures · Top Winners" rows={moverRows(movers?.winners)} testId="dashboard-futures-winners" empty={futuresEmpty} />
          <MarketList title="Futures · Top Losers" rows={moverRows(movers?.losers)} testId="dashboard-futures-losers" empty={futuresEmpty} />
        </div>
      </section>

      <Card title="Oportunidades" testId="dashboard-opportunities">
        {opportunities.length === 0 ? (
          <div data-testid="dashboard-no-opportunity" className="space-y-1">
            <p className="text-text1 text-lg">{MARKET_MONITORED_TEXT}</p>
            <p className="text-text2">{eligibleCountText(0)}</p>
            <Link to="/spot" className="dash-btn inline-block mt-2 font-mono uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan text-[11px]">
              Explorar mercado
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border1">
            {opportunities.map((o) => (
              <li key={o.key} className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-text1 font-semibold min-w-[56px]">{o.base}</span>
                <span className={`font-mono text-[13px] ${signTone(o.change24hPct)}`}>{o.change24hPct == null ? '—' : fmtSignedPct(o.change24hPct)}</span>
                <span className="text-text2 text-[13px]">Momentum · {o.market === 'SPOT' ? 'Spot' : 'Futures'}</span>
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
            <Fact k="Conta" v={spotState === 'DATA_LOADING' ? DATA_STATE_TEXT.DATA_LOADING : spotAccount?.status === 'CONNECTED' ? 'Conectada' : 'Não conectada'} />
            <Fact k="Exchange" v="Binance" />
            <Fact k="Saldo Spot" v={balanceText(spotState, spotAccount?.balanceUsdt ?? null)} />
            <Fact k="Posições Spot" v={accountValue(spotState, spotPositions, (v) => String(v))} />
            <Fact k="Execução" v={spot?.execution === 'PILOT' ? executionLabel(spot.execution, spot.liveEnabled) : SPOT_TRADING_TEXT[spotTradingState(spotAccount)]} />
          </dl>
        </Card>

        <Card title="Futures" action={{ to: '/futures', label: 'Abrir Futures' }} testId="dashboard-futures">
          <dl className="grid grid-cols-2 gap-3">
            <Fact k="Conta" v={binanceVenue?.futures ? HUB_STATUS_LABEL[binanceVenue.futures.status] : EMPTY_TEXT.DATA_ERROR} />
            <Fact k="Exchange" v="Binance" />
            <Fact k="Posições Futures" v={accountValue(futState, binance.posicoesAbertas, (v) => String(v))} />
            <Fact k="PnL Futures · aberto" v={accountValue(futState, binance.pnlAberto, (v) => fmtSignedUsd(v))} tone={signTone(hasAccountValues(futState) ? binance.pnlAberto : null)} />
          </dl>
        </Card>

        <Card title="Exchanges" action={{ to: '/exchanges', label: 'Gerir exchanges' }} testId="dashboard-exchanges">
          {catalog.error && cex.length === 0 ? (
            <p className="text-text2">{EMPTY_TEXT.DATA_ERROR}</p>
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
            <p className="text-text2 text-[13px] mt-3">{EMPTY_TEXT.CONNECT}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
