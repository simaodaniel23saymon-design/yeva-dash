import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { BotToggleButton } from '../components/BotToggleButton';
import { LiveOrders } from '../components/LiveOrders';
import { useWallet } from '../hooks/useWallet';
import { useExchange, type MarketType } from '../hooks/useExchange';
import { getFriendlyError } from '../utils/errorHandler';

interface Bot {
  id: string;
  symbol?: string;
  pair?: string;
  status: string;
  market?: string;
  leverage?: number;
  capitalPerSide?: number;
  entryPercent?: number;
  takeProfitPercent?: number;
  stopLossPercent?: number;
}

export default function BotsPage() {
  const { wallet, formatUSDT } = useWallet(30000);
  const { isConnected, exchangeBalance, loading: exchangeLoading } = useExchange(30000);

  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const [market, setMarket] = useState<MarketType>('FUTURES');
  const [pair, setPair] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [capitalPerSide, setCapitalPerSide] = useState(14);
  const [useLegacyMode, setUseLegacyMode] = useState(false);
  const [entryPercent, setEntryPercent] = useState(10);
  const [takeProfit, setTakeProfit] = useState(60);
  const [stopLoss, setStopLoss] = useState(30);

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
    loadBots().finally(() => setLoading(false));
  }, []);

  const showFlash = (text: string) => { setFlash(text); setTimeout(() => setFlash(''), 4000); };

  const balance = exchangeBalance ?? 0;
  const marginUsed = market === 'FUTURES' ? capitalPerSide / leverage : capitalPerSide;
  const availableBalance = balance - marginUsed;

  const createAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair.trim()) { setError('Escreve o par (ex: BTCUSDT, HYPEUSDT).'); return; }
    setCreating(true);
    setError('');

    const body = useLegacyMode
      ? {
          pair: pair.toUpperCase(),
          market,
          mode: 'GRID',
          entryPercent,
          takeProfitPercent: takeProfit,
          stopLossPercent: stopLoss,
        }
      : {
          pair: pair.toUpperCase(),
          market,
          leverage,
          capitalPerSide,
          mode: 'Hedge Pro',
          tpDailyPct: 2,
          maxLossPct: 5,
        };

    try {
      await api.post('/bots/create', body);
      setStarting(true);
      try {
        await api.post('/bots/start');
      } catch {
        /* start pode falhar se já estiver activo */
      }
      setShowCreate(false);
      setPair('');
      await loadBots();
      showFlash(`Bot ${pair.toUpperCase()} criado e iniciado.`);
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally {
      setCreating(false);
      setStarting(false);
    }
  };

  const stopBot = async (id: string) => {
    try {
      await api.post('/bots/stop', { botId: id });
      await loadBots();
      showFlash('Bot parado.');
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message);
    }
  };

  const inputClass = 'w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2';
  const tabClass = (active: boolean) =>
    `flex-1 py-2 font-mono text-[9px] uppercase tracking-wider border transition-all ${
      active ? 'bg-cyan-dim border-cyan-30 text-cyan' : 'border-border2 text-text2 hover:border-border1'
    }`;

  if (loading || exchangeLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <QuickGuide title="Como usar os bots" steps={[
        'Conecta a exchange em API (Binance ou Bybit)',
        'Escolhe Spot ou Futures e escreve o par (ex: HYPEUSDT)',
        'Define alavancagem e capital por ordem',
        'Cria e inicia o bot — monitoriza em tempo real abaixo',
      ]} />

      {!isConnected ? (
        <div className="bg-gold-dim border border-gold-30 p-6 text-center">
          <p className="font-mono text-[11px] text-gold mb-4">Conecta uma exchange primeiro para operar.</p>
          <Link to="/exchanges"
            className="inline-block font-mono text-[9px] tracking-widest uppercase px-6 py-3 border border-cyan-30 bg-cyan-dim text-cyan">
            Conectar Exchange
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-text1 font-bold text-lg">Configurar Robô</h2>
              <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
                Gás: <span className="text-gold">${formatUSDT(wallet?.balance)}</span>
                {' · '}
                Exchange: <span className="text-cyan">${balance.toFixed(2)} USDT</span>
              </p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all">
              + Novo Bot
            </button>
          </div>

          <BotToggleButton />
        </>
      )}

      {flash && (
        <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] text-cyan">{flash}</div>
      )}

      {isConnected && bots.length === 0 ? (
        <div className="bg-bg1 border border-border1 p-12 text-center">
          <p className="font-mono text-[11px] text-text2">Sem bots criados ainda.</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 font-mono text-[9px] uppercase px-4 py-2 border border-cyan-30 text-cyan">
            Configurar primeiro bot
          </button>
        </div>
      ) : isConnected && bots.length > 0 ? (
        <div className="space-y-3">
          {bots.map(bot => {
            const sym = bot.symbol ?? bot.pair ?? '—';
            const running = bot.status === 'running' || bot.status === 'ACTIVE';
            return (
              <div key={bot.id} className={`bg-bg1 border p-4 ${running ? 'border-cyan/20' : 'border-border1'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`w-[6px] h-[6px] rounded-full ${running ? 'bg-cyan animate-pulse' : 'bg-text3'}`} />
                      <span className="text-text1 font-bold">{sym}</span>
                      {bot.market && (
                        <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text3">{bot.market}</span>
                      )}
                      <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border ${
                        running ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text3'
                      }`}>
                        {running ? 'A operar' : 'Parado'}
                      </span>
                    </div>
                    <div className="flex gap-4 font-mono text-[10px] text-text2">
                      {bot.leverage != null && <span>Alavancagem: {bot.leverage}x</span>}
                      {bot.capitalPerSide != null && <span>Capital: ${bot.capitalPerSide}</span>}
                      {bot.entryPercent != null && <span>Entrada: {bot.entryPercent}%</span>}
                    </div>
                    <LiveOrders botId={bot.id} active={running} />
                  </div>
                  {running && (
                    <button onClick={() => stopBot(bot.id)}
                      className="font-mono text-[8px] uppercase px-2 py-1 border border-red-30 text-red shrink-0">
                      Parar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {showCreate && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-bg1 border border-border1 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border1 sticky top-0 bg-bg1">
              <h3 className="text-text1 font-bold">Novo Bot</h3>
              <button onClick={() => setShowCreate(false)} className="text-text2 hover:text-text1">✕</button>
            </div>

            <form onSubmit={createAndStart} className="p-5 space-y-4">
              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Mercado</label>
                <div className="flex gap-2">
                  {(['FUTURES', 'SPOT'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setMarket(m)} className={tabClass(market === m)}>
                      {m === 'FUTURES' ? 'Futures' : 'Spot'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Par de moedas</label>
                <input type="text" value={pair}
                  onChange={e => setPair(e.target.value.toUpperCase())}
                  placeholder="Ex: BTCUSDT, HYPEUSDT, BNBUSDT"
                  className={inputClass} required />
                <p className="font-mono text-[9px] text-text3 mt-1">Escreve qualquer par disponível na exchange.</p>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="legacy" checked={useLegacyMode}
                  onChange={e => setUseLegacyMode(e.target.checked)} className="accent-cyan" />
                <label htmlFor="legacy" className="font-mono text-[9px] text-text2">Modo Grid (% entrada / TP / SL)</label>
              </div>

              {!useLegacyMode ? (
                <>
                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">
                      Alavancagem: {leverage}x
                    </label>
                    <input type="range" min={1} max={20} value={leverage}
                      onChange={e => setLeverage(Number(e.target.value))} className="w-full accent-cyan" />
                    <div className="flex justify-between font-mono text-[9px] text-text3 mt-1">
                      <span>1x</span><span>20x</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Capital por ordem (USDT)</label>
                    <input type="number" min={1} step={0.01} value={capitalPerSide}
                      onChange={e => setCapitalPerSide(Number(e.target.value))} className={inputClass} />
                    <p className="font-mono text-[9px] text-text3 mt-1">Margem ≈ notional ÷ alavancagem</p>
                  </div>

                  <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] space-y-1">
                    <p className="text-text2">Saldo exchange: <span className="text-cyan">${balance.toFixed(2)}</span></p>
                    <p className="text-text2">Margem usada: <span className="text-gold">${marginUsed.toFixed(2)}</span></p>
                    <p className="text-text2">Disponível: <span className="text-cyan">${availableBalance.toFixed(2)}</span></p>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-mono text-[9px] uppercase text-text2 mb-1 block">Entrada %</label>
                    <input type="number" min={1} max={100} value={entryPercent}
                      onChange={e => setEntryPercent(+e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] uppercase text-text2 mb-1 block">TP %</label>
                    <input type="number" min={1} value={takeProfit}
                      onChange={e => setTakeProfit(+e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] uppercase text-text2 mb-1 block">SL %</label>
                    <input type="number" min={1} max={100} value={stopLoss}
                      onChange={e => setStopLoss(+e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}

              {error && <p className="text-red font-mono text-[10px] bg-red-dim border border-red-30 p-3">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase">Cancelar</button>
                <button type="submit" disabled={creating || starting || !pair}
                  className="flex-1 py-2.5 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase disabled:opacity-50">
                  {creating || starting ? 'A iniciar...' : 'Iniciar Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
