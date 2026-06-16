import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { LiveOrders } from '../components/LiveOrders';

interface Bot {
  id: string;
  symbol?: string;
  pair?: string;
  market?: string;
  status: string;
}

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
  const [bots, setBots] = useState<Bot[]>([]);
  const [selected, setSelected] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ bots: Bot[] }>('/bots/status');
        setBots(res.data.bots ?? []);
      } catch {
        try {
          const res = await api.get<Bot[]>('/bots');
          setBots(res.data.map(b => ({
            ...b,
            symbol: b.symbol ?? b.pair,
          })));
        } catch {
          setBots([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selected) {
      setTrades([]);
      return;
    }

    let alive = true;
    setTradesLoading(true);

    const loadTrades = async () => {
      try {
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

  const selectedBot = bots.find(b => b.id === selected);
  const isRunning = selectedBot?.status === 'running' || selectedBot?.status === 'ACTIVE';

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
        'Selecciona um bot para ver ordens, posições e trades',
        'Os dados vêm directamente da Binance via API',
        'Actualização automática a cada 10-15 segundos',
      ]} />

      <div>
        <h2 className="text-text1 font-bold text-lg">Operações</h2>
        <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
          Ordens, posições e histórico de trades
        </p>
      </div>

      <div className="bg-bg1 border border-border1 p-4 space-y-3">
        <label className="font-mono text-[9px] uppercase tracking-wider text-text2 block">
          Bot activo
        </label>
        <select value={selected} onChange={e => setSelected(e.target.value)} className={selectClass}>
          <option value="">Selecciona um bot...</option>
          {bots.map(b => {
            const sym = b.symbol ?? b.pair ?? '—';
            return (
              <option key={b.id} value={b.id}>
                {sym} · {b.market ?? 'FUTURES'} · {b.status}
              </option>
            );
          })}
        </select>
      </div>

      {selected && (
        <>
          <div className="bg-bg1 border border-border1 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-[6px] h-[6px] rounded-full ${isRunning ? 'bg-cyan animate-pulse' : 'bg-text3'}`} />
              <h3 className="text-sm font-bold text-text1">
                {selectedBot?.symbol ?? selectedBot?.pair} — {selectedBot?.market ?? 'FUTURES'}
              </h3>
              <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border ${
                isRunning ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text3'
              }`}>
                {isRunning ? 'A operar' : 'Parado'}
              </span>
            </div>
            <LiveOrders botId={selected} active={isRunning} />
          </div>

          <div className="bg-bg1 border border-border1 overflow-x-auto">
            <div className="px-4 py-3 border-b border-border1">
              <h3 className="text-sm font-bold text-text1">Histórico de Trades</h3>
              <p className="font-mono text-[8px] text-text2 uppercase tracking-wider mt-0.5">
                Execuções na exchange
              </p>
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
                      <td className={`${tdClass} text-text2`}>
                        {new Date(t.time).toLocaleString('pt-PT')}
                      </td>
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

      {!selected && bots.length === 0 && (
        <div className="bg-bg1 border border-border1 p-10 text-center font-mono text-xs text-text2">
          Cria um bot primeiro para ver operações em tempo real.
        </div>
      )}
    </div>
  );
}
