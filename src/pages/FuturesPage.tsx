import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { PageLoader } from '../components/YevaTradeLoader';
import { useBinanceData } from '../hooks/useBinanceData';
import { useDashboardExtended } from '../hooks/useDashboardExtended';
import { useExchangeCatalog } from '../hooks/useExchangeCatalog';
import { api } from '../lib/api';
import { buildEquityPoints, pickRecentTrades } from '../utils/dashboardFocus';
import { HUB_STATUS_LABEL, findVenue, hubStatusTone, marketStateLabel } from '../utils/exchangeCatalog';
import { futuresBots, futuresCoinCards, futuresPositionRows, type FuturesMarketRow } from '../utils/futuresView';
import { fetchBotsList, fetchExchangePositions, type ExchangePosition, type LiveBot } from '../utils/liveData';
import { fmtPrice, fmtSignedPct, fmtSignedUsd, fmtUsd, NOT_AVAILABLE, signTone } from '../utils/spotView';
import { DATA_STATE_TEXT, EMPTY_TEXT, accountValue, balanceText, fmtWhen, futuresAccountState, hasAccountValues } from '../utils/dataStates';
import { MOVER_STATE_LABEL } from '../utils/marketDiscovery';
import { BOT_STATUS_LABEL, botStatusTone } from '../utils/botConfigView';
import type { BotCatalogEntry, FuturesMover, FuturesMoversResponse, FuturesSearchResponse } from '../types/spot';

const orNA = (s: string) => (s === '—' ? NOT_AVAILABLE : s);

const selectClass =
  'w-full bg-bg2 border border-border2 text-text1 px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan-30';

type FuturesTab = 'TOP_WINNERS' | 'TOP_LOSERS' | 'MY_COINS' | 'SEARCH';
const TABS: Array<{ id: FuturesTab; label: string }> = [
  { id: 'TOP_WINNERS', label: 'Top Winners' },
  { id: 'TOP_LOSERS', label: 'Top Losers' },
  { id: 'MY_COINS', label: 'Minhas moedas' },
  { id: 'SEARCH', label: 'Pesquisar' },
];

function TopFact({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-2 min-w-0" data-testid={testId}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text3">{label}</p>
      {children}
    </div>
  );
}

function MoverCard({ m }: { m: FuturesMover }) {
  return (
    <li className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-2" data-testid={`futures-mover-${m.symbol}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-text1 font-semibold">{m.base}</p>
          <p className="text-text1 font-mono text-sm">{fmtPrice(m.price)}</p>
          <p className={`font-mono text-[11px] ${signTone(m.change24hPct)}`}>{fmtSignedPct(m.change24hPct)} 24h</p>
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 ${m.opportunityState === 'SIGNAL' ? 'text-cyan border-cyan-30' : 'text-text3 border-border1'}`}>
          {MOVER_STATE_LABEL[m.opportunityState]}
        </span>
      </div>
      <Link to="/bots" className="inline-block font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">Configurar em Bots</Link>
    </li>
  );
}

export default function FuturesPage() {
  const { data: binance, loading: binanceLoading, error: binanceError } = useBinanceData(15000);
  const catalog = useExchangeCatalog();
  const [positions, setPositions] = useState<ExchangePosition[]>([]);
  const [bots, setBots] = useState<LiveBot[]>([]);
  const [market, setMarket] = useState<FuturesMarketRow[]>([]);
  const [movers, setMovers] = useState<FuturesMoversResponse | null>(null);
  const [moversFailed, setMoversFailed] = useState(false);
  const [botCatalog, setBotCatalog] = useState<BotCatalogEntry[]>([]);
  const [botId, setBotId] = useState<string>('');
  const [tab, setTab] = useState<FuturesTab>('TOP_WINNERS');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FuturesMover[] | null>(null);
  const connected = binance.exchangeConnected;
  const { data: extended } = useDashboardExtended(connected, '30d', 30000);

  const load = useCallback(async () => {
    const [p, b, r, mv] = await Promise.all([
      connected ? fetchExchangePositions() : Promise.resolve([]),
      fetchBotsList(),
      api
        .get<{ movers?: FuturesMarketRow[]; byVolume?: FuturesMarketRow[] }>('/market/radar')
        .then((x) => [...(x.data.byVolume ?? []), ...(x.data.movers ?? [])])
        .catch(() => [] as FuturesMarketRow[]),
      api
        .get<FuturesMoversResponse>('/market/movers')
        .then((x) => x.data)
        .catch(() => null),
    ]);
    setPositions(p);
    setBots(b);
    setMarket(r);
    setMovers(mv);
    setMoversFailed(mv == null);
  }, [connected]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    api
      .get<{ catalog?: BotCatalogEntry[] }>('/spot/bots', { params: { market: 'FUTURES', exchange: 'BINANCE' } })
      .then((x) => setBotCatalog(x.data.catalog ?? []))
      .catch(() => setBotCatalog([]));
  }, []);

  const search = async () => {
    if (!query.trim()) return setSearchResults(null);
    const res = await api.get<FuturesSearchResponse>('/market/search', { params: { q: query } }).catch(() => null);
    setSearchResults(res?.data.results ?? []);
  };

  const rows = useMemo(() => futuresPositionRows(positions), [positions]);
  const myBots = useMemo(() => futuresBots(bots), [bots]);
  const cards = useMemo(() => futuresCoinCards(myBots, rows, market, botId || null), [myBots, rows, market, botId]);
  const trades = useMemo(() => pickRecentTrades(extended.recentTrades || [], 10), [extended.recentTrades]);
  const equity = useMemo(
    () => buildEquityPoints({ labels: extended.performance?.labels || [], total: extended.performance?.total || [] }),
    [extended.performance]
  );

  if (binanceLoading && catalog.loading) return <PageLoader />;

  const state = futuresAccountState({
    loading: binanceLoading,
    requestFailed: Boolean(binanceError),
    dataState: binance.dataState,
    connected,
    balance: connected ? binance.saldoTotal : null,
    updatedAt: binance.atualizadoEm,
  });
  const values = hasAccountValues(state);
  const futuresVenues = catalog.venues.filter((v) => v.futures);
  const binanceVenue = findVenue(catalog.venues, 'BINANCE');
  const futuresState = binanceVenue?.futures ?? null;
  const selectedBot = myBots.find((b) => b.id === botId) ?? null;
  const leverages = [...new Set(rows.map((r) => r.leverage).filter((l): l is number => l != null))];
  const leverageText = selectedBot?.leverage != null
    ? `${selectedBot.leverage}x`
    : leverages.length === 1
      ? `${leverages[0]}x`
      : leverages.length > 1
        ? 'Varia por posição'
        : NOT_AVAILABLE;

  const facts: Array<[string, string, number | null]> = [
    ['Saldo Futures', balanceText(state, connected ? binance.saldoTotal : null), null],
    ['Margem disponível · Futures', accountValue(state, binance.saldoDisponivel, (v) => fmtUsd(v)), null],
    ['PnL aberto · Futures', accountValue(state, binance.pnlAberto, (v) => fmtSignedUsd(v)), values ? binance.pnlAberto : null],
    ['PnL hoje · Futures', accountValue(state, binance.resultadoHoje, (v) => fmtSignedUsd(v)), values ? binance.resultadoHoje : null],
    ['Realizado · 30d · Futures', accountValue(state, extended.metrics?.netPnl ?? extended.periodCards?.net ?? null, (v) => fmtSignedUsd(v)), null],
  ];

  const moverList = tab === 'TOP_WINNERS' ? movers?.winners ?? [] : tab === 'TOP_LOSERS' ? movers?.losers ?? [] : searchResults ?? [];

  return (
    <div className="space-y-6 mb-12" data-testid="futures-page">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan mb-2">Futures · REAL</p>
        <h2 className="text-text1 font-bold text-[28px] leading-tight">Futures</h2>
        <p className="text-text2 mt-2 max-w-2xl">Exchange, bots, moedas, margem, alavancagem, posições e PnL da tua conta Futures. Os dados Spot estão na página Spot.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3" data-testid="futures-top-bar">
        <TopFact label="Exchange" testId="futures-exchange">
          <select aria-label="Exchange" value="BINANCE" onChange={() => undefined} className={selectClass}>
            {futuresVenues.length === 0 && <option value="BINANCE">Binance</option>}
            {futuresVenues.map((v) => (
              <option key={v.exchange} value={v.exchange} disabled={v.futures?.status === 'COMING_SOON' || v.futures?.status === 'NOT_SUPPORTED'}>
                {v.name}{v.futures?.status === 'COMING_SOON' ? ' · em breve' : ''}
              </option>
            ))}
          </select>
        </TopFact>

        <TopFact label="Bot">
          <select aria-label="Bot" value={botId} onChange={(e) => setBotId(e.target.value)} className={selectClass}>
            <option value="">Todos os bots Futures</option>
            {myBots.map((b) => (
              <option key={b.id} value={b.id}>{String(b.symbol ?? b.pair ?? b.id).replace(/USDT$/, '')}</option>
            ))}
          </select>
        </TopFact>

        <TopFact label="Conta" testId="futures-account">
          {futuresState ? (
            <span className={`inline-block font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 ${hubStatusTone(futuresState.status)}`}>
              {HUB_STATUS_LABEL[futuresState.status]}
            </span>
          ) : (
            <p className="text-text2 text-sm">{EMPTY_TEXT.DATA_ERROR}</p>
          )}
          <p className="text-text3 text-[11px]">{marketStateLabel(futuresState)}</p>
          {futuresState?.status !== 'CONNECTED' && <Link to="/exchanges" className="text-cyan text-[12px] hover:underline">Conectar exchange</Link>}
        </TopFact>

        <TopFact label="Margem" testId="futures-margin-top">
          <p className="text-text1 font-mono text-sm" data-state={state}>
            {values ? `${fmtUsd(binance.saldoDisponivel)} USDT` : state === 'CONNECTED' ? DATA_STATE_TEXT.DATA_UNAVAILABLE : DATA_STATE_TEXT[state]}
          </p>
          <p className="text-text3 text-[11px]">disponível{state === 'DATA_STALE' ? ` · ${DATA_STATE_TEXT.DATA_STALE}` : ''}</p>
        </TopFact>

        <TopFact label="Alavancagem" testId="futures-leverage">
          <p className="text-text1 font-mono text-sm">{leverageText}</p>
        </TopFact>
      </div>

      {botCatalog.length > 0 && (
        <ul className="flex flex-wrap gap-2" data-testid="futures-bot-catalog">
          {botCatalog.map((b) => (
            <li key={b.id} className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-1 ${botStatusTone(b.status)}`} title={b.note}>
              {b.name} · {BOT_STATUS_LABEL[b.status]}
            </li>
          ))}
        </ul>
      )}

      <section className="bg-bg1 border border-border1 rounded-[18px] p-4" data-testid="futures-margin">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-2">Conta Futures · PnL REAL</p>
        <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-3 gap-y-2 text-[12px]">
          {facts.map(([k, v, n]) => (
            <div key={k}>
              <dt className="text-text3">{k}</dt>
              <dd className={`font-mono ${n == null ? 'text-text1' : signTone(n)}`}>{v}</dd>
            </div>
          ))}
        </dl>
        {state === 'NOT_CONNECTED' && <p className="text-text2 text-[12px] mt-2">{EMPTY_TEXT.CONNECT}</p>}
      </section>

      <section className="space-y-3" data-testid="futures-positions">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Fontes de moedas Futures" data-testid="futures-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`font-mono text-[11px] uppercase tracking-wider border px-3 py-1.5 ${tab === t.id ? 'border-cyan-30 text-cyan bg-cyan-dim' : 'border-border2 text-text3 hover:text-text1'}`}
              data-testid={`futures-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
          <Link to="/bots" className="ml-auto font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">Gerir em Bots</Link>
        </div>

        {tab === 'SEARCH' && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Símbolo (ex.: BTC)" aria-label="Pesquisar moeda Futures" maxLength={24} className={selectClass} />
            <button type="submit" className="font-mono text-[11px] uppercase tracking-wider px-4 py-2 border border-cyan-30 text-cyan">Pesquisar</button>
          </form>
        )}

        {tab === 'MY_COINS' ? (
          cards.length === 0 ? (
            <p className="p-5 text-text2 bg-bg1 border border-border1 rounded-[18px]">{state === 'NOT_CONNECTED' ? EMPTY_TEXT.CONNECT : EMPTY_TEXT.NO_POSITION}</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {cards.map((c) => (
                <li key={c.symbol} className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-3" data-testid={`futures-coin-${c.symbol}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-text1 font-semibold">{c.base}</p>
                      <p className="text-text1 font-mono text-sm">{c.price == null ? '—' : fmtPrice(c.price)}</p>
                      <p className={`font-mono text-[11px] ${signTone(c.change24hPct)}`}>{c.change24hPct == null ? '24h —' : `${fmtSignedPct(c.change24hPct)} 24h`}</p>
                    </div>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 ${c.side === 'SHORT' ? 'text-red border-red-30' : c.side === 'LONG' ? 'text-cyan border-cyan-30' : 'text-text3 border-border1'}`}
                      data-testid={`futures-side-${c.symbol}`}
                    >
                      {c.side === 'LONG' ? 'Long' : c.side === 'SHORT' ? 'Short' : 'Sem posição'}
                    </span>
                  </div>
                  {c.position ? (
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 font-mono text-[11px]">
                      <div><dt className="text-[9px] uppercase tracking-wider text-text3">Posição</dt><dd className="text-text1">{c.position.quantity.toPrecision(4)}</dd></div>
                      <div><dt className="text-[9px] uppercase tracking-wider text-text3">Entrada</dt><dd className="text-text1">{orNA(fmtPrice(c.position.entryPrice))}</dd></div>
                      <div><dt className="text-[9px] uppercase tracking-wider text-text3">Mark</dt><dd className="text-text1">{orNA(fmtPrice(c.position.markPrice))}</dd></div>
                      <div><dt className="text-[9px] uppercase tracking-wider text-text3">PnL</dt><dd className={signTone(c.position.unrealizedPnl)}>{orNA(fmtSignedUsd(c.position.unrealizedPnl))}</dd></div>
                      <div><dt className="text-[9px] uppercase tracking-wider text-text3">Alavancagem</dt><dd className="text-text1">{c.leverage != null ? `${c.leverage}x` : NOT_AVAILABLE}</dd></div>
                      <div><dt className="text-[9px] uppercase tracking-wider text-text3">Margem</dt><dd className="text-text1">{orNA(fmtUsd(c.position.margin))}</dd></div>
                    </dl>
                  ) : (
                    <p className="text-text3 text-[12px]">
                      {EMPTY_TEXT.NO_POSITION}{c.leverage != null ? ` Alavancagem ${c.leverage}x.` : ''}
                      {c.botRunning != null ? ` Bot ${c.botRunning ? 'ativo' : 'parado'}.` : ''}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : tab !== 'SEARCH' && (moversFailed || movers?.stale) && moverList.length === 0 ? (
          <div className="p-5 text-text2 bg-bg1 border border-border1 rounded-[18px]" data-testid="futures-market-updating">
            <p>{moversFailed ? EMPTY_TEXT.DATA_ERROR : EMPTY_TEXT.MARKET_UPDATING}</p>
            {movers?.scannedAt && <p className="text-text3 text-[12px]">Última atualização: {fmtWhen(movers.scannedAt)}</p>}
          </div>
        ) : tab === 'SEARCH' && searchResults == null ? (
          <p className="p-5 text-text2 bg-bg1 border border-border1 rounded-[18px]">Pesquisa uma moeda do mercado Futures monitorizado.</p>
        ) : moverList.length === 0 ? (
          <p className="p-5 text-text2 bg-bg1 border border-border1 rounded-[18px]">{tab === 'SEARCH' ? 'Nenhuma moeda encontrada.' : EMPTY_TEXT.NO_OPPORTUNITY}</p>
        ) : (
          <>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {moverList.map((m) => <MoverCard key={m.symbol} m={m} />)}
            </ul>
            {movers?.scannedAt && tab !== 'SEARCH' && (
              <p className="text-text3 text-[11px]">Market Radar Futures · {fmtWhen(movers.scannedAt)}{movers.stale ? ' · dados desatualizados' : ''}</p>
            )}
          </>
        )}
      </section>

      {values && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="bg-bg1 border border-border1 rounded-[22px] overflow-hidden">
            <h3 className="px-5 py-4 border-b border-border1 text-text1 font-semibold">Trades recentes</h3>
            {trades.length === 0 ? (
              <p className="p-5 text-text2">Sem trades recentes</p>
            ) : (
              <ul className="divide-y divide-border1">
                {trades.map((t) => (
                  <li key={t.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-[13px]">
                    <span className="text-text1 font-semibold">{t.symbol.replace(/USDT$/, '')} <span className="text-text3 font-mono text-[11px]">{t.side}</span></span>
                    <span className={signTone(t.pnl)}>{fmtSignedUsd(t.pnl)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="bg-bg1 border border-border1 rounded-[22px] p-5 h-72">
            <h3 className="text-text1 font-semibold mb-2">Equity · 30 dias</h3>
            {equity.length === 0 ? (
              <p className="text-text2 py-12 text-center">Sem dados de equity neste período</p>
            ) : (
              <LineChart data={equity} responsive style={{ width: '100%', height: '85%' }}>
                <CartesianGrid stroke="#1e2b1f" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#6b8a6e', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b8a6e', fontSize: 11 }} width={56} />
                <Tooltip contentStyle={{ background: '#0b100d', border: '1px solid #1e2b1f', fontSize: 13 }} />
                <Line type="monotone" dataKey="equity" name="Equity" stroke="#00d4a0" dot={false} strokeWidth={2} />
              </LineChart>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
