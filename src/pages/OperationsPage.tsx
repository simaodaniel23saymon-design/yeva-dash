import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageLoader, YevaTradeLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { QuickGuide } from '../components/QuickGuide';
import { LiveOrders } from '../components/LiveOrders';
import { LiveChart } from '../components/LiveChart';
import { OpenPositionCards } from '../components/OpenPositionCards';
import { ProPositionDetails } from '../components/pro/ProPositionDetails';
import { useChartSymbol } from '../hooks/useChartSymbol';
import { useDashboardExtended } from '../hooks/useDashboardExtended';
import { isBreakevenSl, type PositionOverlay } from '../utils/chartOverlays';
import {
  fetchBotsList,
  fetchExchangePositions,
  isBotRunning,
  botPair,
  parseNum,
  type ExchangePosition,
  type LiveBot,
} from '../utils/liveData';
import { AutomatedOpsSection } from '../components/AutomatedOpsSection';

interface Trade {
  id: string | number;
  time: string | number;
  symbol: string;
  side: string;
  qty: string | number;
  price: string | number;
}

const thClass = 'px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-wider text-text3';
const tdClass = 'px-4 py-3 font-mono text-[10px] text-text1';
const selectClass = 'w-full max-w-md bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/40 transition-colors';

export default function OperationsPage() {
  const [bots, setBots] = useState<LiveBot[]>([]);
  const [positions, setPositions] = useState<ExchangePosition[]>([]);
  const [selected, setSelected] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { data: extended } = useDashboardExtended(true, '24h', 15000);

  const loadData = useCallback(async () => {
    const [botsList, posList] = await Promise.all([
      fetchBotsList(),
      fetchExchangePositions(),
    ]);
    setBots(botsList);
    setPositions(posList);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (!selected) {
      setTrades([]);
      return;
    }

    let alive = true;
    setTradesLoading(true);

    const loadTrades = async () => {
      try {
        const { api } = await import('../lib/api');
        const res = await api.get<{ trades?: Trade[] }>(`/bots/${selected}/trades`);
        if (alive) setTrades(res.data.trades ?? []);
      } catch {
        if (alive) setTrades([]);
      } finally {
        if (alive) setTradesLoading(false);
      }
    };

    loadTrades();
    const interval = setInterval(loadTrades, 15000);
    return () => { alive = false; clearInterval(interval); };
  }, [selected]);

  const runningBots = bots.filter(b => isBotRunning(b.status));
  const selectedBot = bots.find(b => b.id === selected);
  const isRunning = selectedBot ? isBotRunning(selectedBot.status) : false;

  const { symbol: chartSymbol, pairs, autoSymbol, selectSymbol, followAuto } = useChartSymbol(
    bots,
    positions,
  );

  const overlays: PositionOverlay[] = useMemo(() => {
    const bySym = new Map<string, PositionOverlay>();
    for (const bot of extended.bots) {
      const c = bot.dcaCycle;
      if (!c || !(c.avgEntry > 0)) continue;
      const sym = bot.symbol.toUpperCase();
      bySym.set(sym, {
        symbol: sym,
        side: c.side === 'SHORT' ? 'SHORT' : 'LONG',
        qty: c.totalQty,
        entry: c.avgEntry,
        tp: c.tpPrice,
        sl: c.slPrice,
        slIsBe: isBreakevenSl(
          c.side === 'SHORT' ? 'SHORT' : 'LONG',
          c.avgEntry,
          c.slPrice,
        ),
        safetyFilled: c.safetyFilled,
        maxSafetyOrders: c.maxSafetyOrders,
      });
    }
    for (const pos of positions) {
      const amt = Math.abs(parseNum(pos.positionAmt));
      if (!(amt > 0)) continue;
      const sym = pos.symbol.toUpperCase();
      const existing = bySym.get(sym);
      bySym.set(sym, {
        symbol: sym,
        side: String(pos.positionSide || 'LONG').toUpperCase(),
        qty: amt,
        entry: existing?.entry || parseNum(pos.entryPrice),
        tp: existing?.tp ?? null,
        sl: existing?.sl ?? null,
        slIsBe: existing?.slIsBe,
        uPnl: parseNum(pos.unrealizedProfit),
        safetyFilled: existing?.safetyFilled,
        maxSafetyOrders: existing?.maxSafetyOrders,
      });
    }
    return [...bySym.values()];
  }, [extended.bots, positions]);

  if (loading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-4">
      <QuickGuide title="Operações em tempo real" steps={[
        'Gráfico com ENTRY (amarelo), TP (verde) e SL (vermelho) sobre klines Binance',
        'Na Binance: Futures → Open Orders → Algo Orders para ver TP/SL condicionais',
        'Cards abaixo do gráfico mostram qty, uPnL, idade e safeties preenchidas',
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-text1 font-bold text-lg">Operações</h2>
          {lastUpdate && (
            <p className="font-mono text-[9px] text-text3">
              Actualizado: {lastUpdate.toLocaleTimeString('pt-PT')}
            </p>
          )}
        </div>
      </div>

      <AutomatedOpsSection onSelectSymbol={selectSymbol} />

      <div className="bg-bg1 border border-border1 p-4 animate-fade-in-up">
        <LiveChart
          symbol={chartSymbol}
          pairs={pairs}
          onSymbolChange={selectSymbol}
          autoSymbol={autoSymbol}
          onFollowAuto={followAuto}
          height={560}
          title="Gráfico"
          overlays={overlays}
        />
      </div>

      <OpenPositionCards
        positions={overlays}
        selectedSymbol={chartSymbol}
        onSelect={selectSymbol}
      />

      {runningBots.length === 0 ? (
        <div className="bg-bg1 border border-border1 p-8 text-center">
          <p className="font-mono text-[11px] text-text2 mb-4">Nenhum bot activo</p>
          <Link to="/bots"
            className="inline-block font-mono text-[9px] uppercase px-6 py-3 border border-cyan-30 bg-cyan-dim text-cyan">
            Criar bot
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {runningBots.map(bot => {
            const pair = botPair(bot);
            const hasPosition = positions.find(p => p.symbol === pair);
            const pnl = hasPosition ? parseNum(hasPosition.unrealizedProfit) : 0;

            return (
              <div
                key={bot.id}
                role="button"
                tabIndex={0}
                onClick={() => selectSymbol(pair)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') selectSymbol(pair); }}
                className="bg-bg1 border border-border1 p-4 cursor-pointer hover:border-cyan-30 transition-colors"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-text1">{pair} — {bot.market ?? 'FUTURES'}</h3>
                  <span className="font-mono text-[8px] uppercase px-2 py-0.5 border border-cyan-30 bg-cyan-dim text-cyan">
                    A operar
                  </span>
                </div>

                {!hasPosition ? (
                  <div className="bg-bg2 border border-cyan-20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl animate-pulse">🔍</span>
                      <span className="font-bold text-text1">A analisar mercado</span>
                    </div>
                    <p className="font-mono text-[10px] text-text2 mb-3">
                      O bot monitoriza {pair} e procura oportunidades de entrada...
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[9px] text-text3">
                      <span>Estratégia: {bot.mode ?? 'Hedge Pro'}</span>
                      <span>Alavancagem: {bot.leverage ?? '—'}x</span>
                      <span>Capital: ${bot.capitalPerSide ?? '—'}</span>
                      <span>TP: {bot.tpDailyPct ?? '—'}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-cyan-dim border border-cyan-20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">●</span>
                      <span className="font-bold text-text1">Posição aberta</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-text2">
                      <span>Lado: <span className="text-text1">{hasPosition.positionSide}</span></span>
                      <span>Entrada: <span className="text-text1">${parseNum(hasPosition.entryPrice).toFixed(2)}</span></span>
                      <span>Actual: <span className="text-text1">${parseNum(hasPosition.markPrice).toFixed(2)}</span></span>
                      <span>P&L: <span className={pnl >= 0 ? 'text-cyan font-bold' : 'text-red font-bold'}>${pnl.toFixed(2)}</span></span>
                    </div>
                    {hasPosition && (
                      <ProPositionDetails
                        position={{
                          symbol: hasPosition.symbol,
                          positionSide: hasPosition.positionSide,
                          positionAmt: hasPosition.positionAmt,
                          entryPrice: hasPosition.entryPrice,
                          markPrice: hasPosition.markPrice,
                          unrealizedProfit: hasPosition.unrealizedProfit,
                        }}
                        pnl={pnl}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-bg1 border border-border1 p-4 space-y-3">
        <label className="font-mono text-[9px] uppercase tracking-wider text-text2 block">
          Detalhe por bot
        </label>
        <select
          value={selected}
          onChange={e => {
            const id = e.target.value;
            setSelected(id);
            const bot = bots.find(b => b.id === id);
            if (bot) selectSymbol(botPair(bot));
          }}
          className={selectClass}
        >
          <option value="">Selecciona um bot...</option>
          {bots.map(b => (
            <option key={b.id} value={b.id}>
              {botPair(b)} · {b.market ?? 'FUTURES'} · {b.status}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          <div className="bg-bg1 border border-border1 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-[6px] h-[6px] rounded-full ${isRunning ? 'bg-cyan animate-pulse' : 'bg-text3'}`} />
              <h3 className="text-sm font-bold text-text1">
                {botPair(selectedBot!)} — {selectedBot?.market ?? 'FUTURES'}
              </h3>
            </div>
            <LiveOrders botId={selected} active={isRunning} />
          </div>

          <div className="bg-bg1 border border-border1 scroll-area-x">
            <div className="px-4 py-3 border-b border-border1">
              <h3 className="text-sm font-bold text-text1">Histórico de trades</h3>
            </div>
            {tradesLoading ? (
              <div className="p-8 flex justify-center">
                <YevaTradeLoader size="sm" />
              </div>
            ) : trades.length === 0 ? (
              <div className="p-10 text-center font-mono text-xs text-text2">Sem trades registados.</div>
            ) : (
              <table className="w-full min-w-[600px]">
                <thead className="border-b border-border1">
                  <tr>
                    {['Data', 'Par', 'Lado', 'Qtd', 'Preço'].map(h => (
                      <th key={h} className={thClass}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border1">
                  {trades.map(t => (
                    <tr key={String(t.id)} className="hover:bg-bg2">
                      <td className={`${tdClass} text-text2`}>{new Date(t.time).toLocaleString('pt-PT')}</td>
                      <td className={`${tdClass} font-bold`}>{t.symbol}</td>
                      <td className={`${tdClass} ${t.side === 'BUY' ? 'text-cyan' : 'text-red'}`}>{t.side}</td>
                      <td className={tdClass}>{t.qty}</td>
                      <td className={tdClass}>{t.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
