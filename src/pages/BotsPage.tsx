import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { BotToggleButton } from '../components/BotToggleButton';
import { LiveOrders } from '../components/LiveOrders';
import { useWallet } from '../hooks/useWallet';
import { getFriendlyError } from '../utils/errorHandler';

interface Pair { symbol: string; baseAsset: string; }
interface Bot {
  id: string;
  symbol?: string;
  pair?: string;
  status: string;
  market?: string;
  entryPercent?: number;
  takeProfitPercent?: number;
  stopLossPercent?: number;
}

const DEFAULT_PAIRS: Pair[] = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC' },
  { symbol: 'ETHUSDT', baseAsset: 'ETH' },
  { symbol: 'SOLUSDT', baseAsset: 'SOL' },
  { symbol: 'BNBUSDT', baseAsset: 'BNB' },
  { symbol: 'XRPUSDT', baseAsset: 'XRP' },
  { symbol: 'ADAUSDT', baseAsset: 'ADA' },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE' },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX' },
];

export default function BotsPage() {
  const { wallet, formatUSDT } = useWallet(30000);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const [market, setMarket] = useState<'SPOT' | 'FUTURES'>('FUTURES');
  const [pairs, setPairs] = useState<Pair[]>(DEFAULT_PAIRS);
  const [pair, setPair] = useState('');
  const [entryPercent, setEntryPercent] = useState(10);
  const [takeProfit, setTakeProfit] = useState(60);
  const [stopLoss, setStopLoss] = useState(30);

  const loadPairs = async (m: 'SPOT' | 'FUTURES') => {
    const endpoint = m === 'SPOT' ? '/binance/spot-pairs' : '/binance/futures-pairs';
    try {
      const res = await api.get<{ pairs: Pair[] }>(endpoint);
      setPairs(res.data.pairs?.length ? res.data.pairs : DEFAULT_PAIRS);
    } catch {
      setPairs(DEFAULT_PAIRS);
    }
  };

  const loadBots = async () => {
    try {
      const res = await api.get<{ bots: Bot[] }>('/bots/status');
      setBots(res.data.bots ?? []);
    } catch {
      try {
        const res = await api.get<Bot[]>('/bots');
        setBots(res.data.map(b => ({
          ...b,
          symbol: b.symbol ?? b.pair,
          status: b.status === 'ACTIVE' ? 'running' : 'stopped',
        })));
      } catch {
        setBots([]);
      }
    }
  };

  useEffect(() => {
    Promise.all([loadPairs(market), loadBots()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPair('');
    loadPairs(market);
  }, [market]);

  const showFlash = (text: string) => { setFlash(text); setTimeout(() => setFlash(''), 4000); };

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair) { setError('Selecciona um par.'); return; }
    if (entryPercent < 1 || entryPercent > 100) { setError('A entrada deve estar entre 1% e 100%.'); return; }
    setCreating(true); setError('');
    const body = {
      pair: pair.toUpperCase(),
      market,
      mode: 'GRID',
      entryPercent,
      takeProfitPercent: takeProfit,
      stopLossPercent: stopLoss,
    };
    try {
      await api.post('/bots/create', body);
      setShowCreate(false);
      setPair('');
      setEntryPercent(10); setTakeProfit(60); setStopLoss(30);
      await loadBots();
      showFlash('Bot criado! Clica em "Iniciar Operações" para começar.');
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally { setCreating(false); }
  };

  const inputClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2";
  const selectClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2 outline-none focus:border-cyan/35 transition-colors";

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <QuickGuide title="Como usar os bots" steps={[
        'Escolhe Spot ou Futures e selecciona o par',
        'Define a percentagem de entrada (1-100% do saldo)',
        'Ajusta o Take Profit (padrão 60%) e o Stop Loss (padrão 30%)',
        'Cria o bot e clica em "Iniciar Operações"',
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-text1 font-bold text-lg">Gestão de Bots</h2>
          <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
            Saldo: <span className="text-cyan">${formatUSDT(wallet?.balance)} USDT</span>
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all">
          + NOVO BOT
        </button>
      </div>

      <BotToggleButton />

      {flash && (
        <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] text-cyan">{flash}</div>
      )}

      {bots.length === 0 ? (
        <div className="bg-bg1 border border-border1 p-12 text-center">
          <div className="text-4xl mb-3 opacity-20 text-text2">⊡</div>
          <p className="font-mono text-[11px] text-text2">Sem bots criados ainda.</p>
          <p className="font-mono text-[10px] text-text3 mt-1">Cria um bot para começar a operar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map(bot => {
            const sym = bot.symbol ?? bot.pair ?? '—';
            const running = bot.status === 'running' || bot.status === 'ACTIVE';
            return (
              <div key={bot.id} className={`bg-bg1 border p-4 transition-all ${running ? 'border-cyan/20' : 'border-border1'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${running ? 'bg-cyan animate-pulse' : 'bg-text3'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-text1 font-bold text-sm">{sym}</span>
                      {bot.market && (
                        <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text3">{bot.market}</span>
                      )}
                      <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border ${
                        running ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text3'
                      }`}>
                        {running ? '● A operar' : '○ Parado'}
                      </span>
                    </div>
                    <div className="flex gap-4 font-mono text-[10px] text-text2">
                      {bot.entryPercent != null && <span>Entrada: <span className="text-text1">{bot.entryPercent}%</span></span>}
                      <span>TP: <span className="text-cyan">{bot.takeProfitPercent ?? '—'}%</span></span>
                      <span>SL: <span className="text-red">{bot.stopLossPercent ?? '—'}%</span></span>
                    </div>
                    <LiveOrders botId={bot.id} active={running} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-bg1 border border-border1 w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border1">
              <h3 className="text-text1 font-bold">Criar Novo Bot</h3>
              <button onClick={() => setShowCreate(false)} className="text-text2 hover:text-text1 transition-colors">✕</button>
            </div>

            <form onSubmit={createBot} className="p-5 space-y-4">
              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Mercado</label>
                <div className="flex gap-2">
                  {(['SPOT', 'FUTURES'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setMarket(m)}
                      className={`flex-1 py-2 font-mono text-[9px] uppercase tracking-wider border transition-all ${
                        market === m ? 'bg-cyan-dim border-cyan-30 text-cyan' : 'border-border2 text-text2 hover:border-border1'
                      }`}>
                      {m === 'SPOT' ? 'Spot' : 'Futures'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">
                  Par (Mercado {market})
                </label>
                <select value={pair} onChange={e => setPair(e.target.value)} className={selectClass} required>
                  <option value="">Selecciona um par...</option>
                  {pairs.slice(0, 100).map(p => (
                    <option key={p.symbol} value={p.symbol}>
                      {p.baseAsset || p.symbol.replace('USDT', '')}/USDT
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Entrada (%)</label>
                  <input type="number" min={1} max={100} step={1} value={entryPercent}
                    onChange={e => setEntryPercent(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Take Profit (%)</label>
                  <input type="number" min={1} max={1000} step={1} value={takeProfit}
                    onChange={e => setTakeProfit(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Stop Loss (%)</label>
                  <input type="number" min={1} max={100} step={1} value={stopLoss}
                    onChange={e => setStopLoss(+e.target.value)} className={inputClass} />
                </div>
              </div>

              {error && <p className="text-red font-mono text-[10px] bg-red-dim border border-red-30 p-3">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase tracking-wider hover:border-text2 hover:text-text1 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !pair}
                  className="flex-1 py-2.5 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase tracking-wider hover:bg-cyan/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {creating ? <><span className="w-3 h-3 border border-cyan border-t-transparent rounded-full animate-spin" /> A criar...</> : 'Criar Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
