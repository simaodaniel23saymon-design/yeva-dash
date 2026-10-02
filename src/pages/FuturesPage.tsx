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
import { futuresBots, futuresCoinCards, futuresPositionRows, whenConnected, type FuturesMarketRow } from '../utils/futuresView';
import { fetchBotsList, fetchExchangePositions, type ExchangePosition, type LiveBot } from '../utils/liveData';
import { BALANCE_UNAVAILABLE, fmtPrice, fmtSignedPct, fmtSignedUsd, fmtUsd, NOT_AVAILABLE, signTone } from '../utils/spotView';

const orNA = (s: string) => (s === '—' ? NOT_AVAILABLE : s);

const selectClass =
  'w-full bg-bg2 border border-border2 text-text1 px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan-30';

function TopFact({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-2 min-w-0" data-testid={testId}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text3">{label}</p>
      {children}
    </div>
  );
}

export default function FuturesPage() {
  const { data: binance, loading: binanceLoading } = useBinanceData(15000);
  const catalog = useExchangeCatalog();
  const [positions, setPositions] = useState<ExchangePosition[]>([]);
  const [bots, setBots] = useState<LiveBot[]>([]);
  const [market, setMarket] = useState<FuturesMarketRow[]>([]);
  const [botId, setBotId] = useState<string>('');
  const connected = binance.exchangeConnected;
  const { data: extended } = useDashboardExtended(connected, '30d', 30000);

  const load = useCallback(async () => {
    const [p, b, r] = await Promise.all([
      connected ? fetchExchangePositions() : Promise.resolve([]),
      fetchBotsList(),
      api
        .get<{ movers?: FuturesMarketRow[]; byVolume?: FuturesMarketRow[] }>('/market/radar')
        .then((x) => [...(x.data.byVolume ?? []), ...(x.data.movers ?? [])])
        .catch(() => [] as FuturesMarketRow[]),
    ]);
    setPositions(p);
    setBots(b);
    setMarket(r);
  }, [connected]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
  }, [load]);

  const rows = useMemo(() => futuresPositionRows(positions), [positions]);
  const myBots = useMemo(() => futuresBots(bots), [bots]);
  const cards = useMemo(() => futuresCoinCards(myBots, rows, market, botId || null), [myBots, rows, market, botId]);
  const trades = useMemo(() => pickRecentTrades(extended.recentTrades || [], 10), [extended.recentTrades]);
  const equity = useMemo(
    () => buildEquityPoints({ labels: extended.performance?.labels || [], total: extended.performance?.total || [] }),
    [extended.performance]
  );

  if (binanceLoading && catalog.loading) return <PageLoader />;

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
    ['Saldo Futures', orNA(fmtUsd(whenConnected(connected, binance.saldoTotal))), null],
    ['Margem disponível', orNA(fmtUsd(whenConnected(connected, binance.saldoDisponivel))), null],
    ['PnL aberto', orNA(fmtSignedUsd(whenConnected(connected, binance.pnlAberto))), whenConnected(connected, binance.pnlAberto)],
    ['PnL hoje', orNA(fmtSignedUsd(whenConnected(connected, binance.resultadoHoje))), whenConnected(connected, binance.resultadoHoje)],
    ['Realizado · 30d', orNA(fmtSignedUsd(whenConnected(connected, extended.metrics?.netPnl ?? extended.periodCards?.net ?? null))), null],
  ];

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
            <p className="text-text2 text-sm">Dados indisponíveis</p>
          )}
          <p className="text-text3 text-[11px]">{marketStateLabel(futuresState)}</p>
          {futuresState?.status !== 'CONNECTED' && <Link to="/exchanges" className="text-cyan text-[12px] hover:underline">Conectar exchange</Link>}
        </TopFact>

        <TopFact label="Margem" testId="futures-margin-top">
          <p className="text-text1 font-mono text-sm">
            {connected ? orNA(fmtUsd(binance.saldoDisponivel)) : BALANCE_UNAVAILABLE}
          </p>
          <p className="text-text3 text-[11px]">disponível</p>
        </TopFact>

        <TopFact label="Alavancagem" testId="futures-leverage">
          <p className="text-text1 font-mono text-sm">{leverageText}</p>
        </TopFact>
      </div>

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
      </section>

      <section className="space-y-3" data-testid="futures-positions">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-text1 font-semibold">Moedas Futures</h3>
          <Link to="/bots" className="font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">Gerir em Bots</Link>
        </div>
        {cards.length === 0 ? (
          <p className="p-5 text-text2 bg-bg1 border border-border1 rounded-[18px]">{connected ? 'Sem posição aberta' : 'Nenhuma exchange conectada'}</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {cards.map((c) => (
              <li key={c.symbol} className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-3" data-testid={`futures-coin-${c.symbol}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-text1 font-semibold">{c.base}</p>
                    <p className="text-text1 font-mono text-sm">{c.price == null ? 'Preço indisponível' : fmtPrice(c.price)}</p>
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
                    Sem posição aberta{c.leverage != null ? ` · alavancagem ${c.leverage}x` : ''}
                    {c.botRunning != null ? ` · bot ${c.botRunning ? 'ativo' : 'parado'}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {connected && (
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
