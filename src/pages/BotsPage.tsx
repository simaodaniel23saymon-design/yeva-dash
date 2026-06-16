import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { BotToggleButton } from '../components/BotToggleButton';

interface Pair { symbol: string; baseAsset: string; }
interface Bot {
  id: string;
  symbol: string;
  status: string;
  entryPercent?: number;
  takeProfitPercent?: number;
  stopLossPercent?: number;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  // Pares (mercado futuro Binance)
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [pairSearch, setPairSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Formulário
  const [symbol, setSymbol] = useState('');
  const [entryPercent, setEntryPercent] = useState(10);
  const [takeProfit, setTakeProfit] = useState(60);
  const [stopLoss, setStopLoss] = useState(30);

  const loadBots = async () => {
    try {
      const res = await api.get<{ bots: Bot[] }>('/bots/status');
      setBots(res.data.bots ?? []);
    } catch {
      // status indisponível — mantém lista vazia
    }
  };

  useEffect(() => {
    Promise.all([
      api.get<{ pairs: Pair[] }>('/binance/futures-pairs')
        .then(r => setPairs(r.data.pairs ?? []))
        .catch(() => setPairs([])),
      loadBots(),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredPairs = (pairSearch
    ? pairs.filter(p =>
        p.symbol.toLowerCase().includes(pairSearch.toLowerCase()) ||
        (p.baseAsset ?? '').toLowerCase().includes(pairSearch.toLowerCase()))
    : pairs
  ).slice(0, 50);

  const selectPair = (s: string) => { setSymbol(s); setPairSearch(s); setShowDropdown(false); };

  const showFlash = (text: string) => { setFlash(text); setTimeout(() => setFlash(''), 4000); };

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) { setError('Escolhe um par primeiro.'); return; }
    if (entryPercent < 1 || entryPercent > 100) { setError('A entrada deve estar entre 1% e 100%.'); return; }
    setCreating(true); setError('');
    try {
      await api.post('/bots/create', {
        symbol,
        entryPercent,
        takeProfitPercent: takeProfit,
        stopLossPercent: stopLoss,
      });
      setShowCreate(false);
      setSymbol(''); setPairSearch('');
      setEntryPercent(10); setTakeProfit(60); setStopLoss(30);
      await loadBots();
      showFlash('Bot criado! Clica em "Iniciar Operações" para começar.');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao criar bot');
    } finally { setCreating(false); }
  };

  const inputClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2";

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <QuickGuide title="Como usar os bots" steps={[
        'Escolhe um par do mercado futuro (ex.: BTC, ETH, SOL)',
        'Define a percentagem de entrada (1-100% do saldo)',
        'Ajusta o Take Profit (padrão 60%) e o Stop Loss (padrão 30%)',
        'Cria o bot e clica em "Iniciar Operações"',
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text1 font-bold text-lg">Gestão de Bots</h2>
          <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">Mercado Futuro · Binance</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all">
          + NOVO BOT
        </button>
      </div>

      {/* Controlo global iniciar/parar */}
      <BotToggleButton />

      {flash && (
        <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] text-cyan">{flash}</div>
      )}

      {/* Lista de bots */}
      {bots.length === 0 ? (
        <div className="bg-bg1 border border-border1 p-12 text-center">
          <div className="text-4xl mb-3 opacity-20 text-text2">⊡</div>
          <p className="font-mono text-[11px] text-text2">Sem bots criados ainda.</p>
          <p className="font-mono text-[10px] text-text3 mt-1">Cria um bot para começar a operar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map(bot => (
            <div key={bot.id} className={`bg-bg1 border p-4 transition-all ${bot.status === 'running' ? 'border-cyan/20' : 'border-border1'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${bot.status === 'running' ? 'bg-cyan animate-pulse' : 'bg-text3'}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-text1 font-bold text-sm">{bot.symbol}</span>
                      <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border ${
                        bot.status === 'running' ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text3'
                      }`}>
                        {bot.status === 'running' ? '● A operar' : '○ Parado'}
                      </span>
                    </div>
                    <div className="flex gap-4 font-mono text-[10px] text-text2">
                      {bot.entryPercent != null && <span>Entrada: <span className="text-text1">{bot.entryPercent}%</span></span>}
                      <span>TP: <span className="text-cyan">{bot.takeProfitPercent ?? '—'}%</span></span>
                      <span>SL: <span className="text-red">{bot.stopLossPercent ?? '—'}%</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Bot */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-bg1 border border-border1 w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border1">
              <h3 className="text-text1 font-bold">Criar Novo Bot</h3>
              <button onClick={() => setShowCreate(false)} className="text-text2 hover:text-text1 transition-colors">✕</button>
            </div>

            <form onSubmit={createBot} className="p-5 space-y-4">
              {/* Par pesquisável */}
              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Par (Mercado Futuro)</label>
                <div ref={searchRef} className="relative">
                  <input type="text" value={pairSearch}
                    onChange={e => { setPairSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Pesquisar (ex: BTC, ETH, SOL)..." className={`${inputClass} uppercase`} />
                  {showDropdown && filteredPairs.length > 0 && (
                    <div className="absolute z-50 w-full bg-bg2 border border-border1 mt-1 max-h-56 overflow-y-auto shadow-xl">
                      {filteredPairs.map(p => (
                        <button key={p.symbol} type="button" onClick={() => selectPair(p.symbol)}
                          className={`w-full text-left px-3 py-2 font-mono text-xs hover:bg-bg3 transition-colors ${symbol === p.symbol ? 'text-cyan bg-cyan-dim' : 'text-text1'}`}>
                          <strong>{p.baseAsset || p.symbol.replace('USDT', '')}/USDT</strong>
                          <span className="text-text3 ml-2">({p.symbol})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && pairSearch.length > 0 && filteredPairs.length === 0 && (
                    <div className="absolute z-50 w-full bg-bg2 border border-border1 mt-1 p-3 font-mono text-xs text-text2">
                      Nenhum par encontrado para "{pairSearch}"
                    </div>
                  )}
                </div>
                {symbol && <p className="mt-1.5 font-mono text-[9px] text-cyan">✓ Par seleccionado: <span className="font-bold">{symbol}</span></p>}
              </div>

              {/* Entrada / TP / SL */}
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

              <p className="font-mono text-[9px] text-text3">
                Entrada: percentagem do saldo a usar por operação. TP padrão 60%, SL padrão 30%.
              </p>

              {error && <p className="text-red font-mono text-[10px] bg-red-dim border border-red-30 p-3">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase tracking-wider hover:border-text2 hover:text-text1 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !symbol}
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
