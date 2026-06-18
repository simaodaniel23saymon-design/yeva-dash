import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QuickGuide } from '../components/QuickGuide';
import { LiveOrders } from '../components/LiveOrders';
import {
  fetchBotsList,
  fetchExchangePositions,
  isBotRunning,
  botPair,
  parseNum,
  type ExchangePosition,
  type LiveBot,
} from '../utils/liveData';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <QuickGuide title="Operações em tempo real" steps={[
        'Bots activos mostram se estão a analisar ou em posição',
        'Dados actualizados a cada 10 segundos',
        'Selecciona um bot para ver trades detalhados',
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
              <div key={bot.id} className="bg-bg1 border border-border1 p-4">
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
        <select value={selected} onChange={e => setSelected(e.target.value)} className={selectClass}>
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

          <div className="bg-bg1 border border-border1 overflow-x-auto">
            <div className="px-4 py-3 border-b border-border1">
              <h3 className="text-sm font-bold text-text1">Histórico de trades</h3>
            </div>
            {tradesLoading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
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
