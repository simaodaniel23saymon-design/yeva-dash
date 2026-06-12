import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';

interface BotData { id: string; pair: string; mode: string; status: string; accountType?: 'REAL' | 'DEMO'; leverage: number; capitalPerSide: number; exchange: string; exchangeId: string; rounds: number; pnl: number; }
interface ExchangeAccount { id: string; exchange: string; isActive: boolean; }

export default function BotsPage() {
  const [bots, setBots] = useState<BotData[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [allPairs, setAllPairs] = useState<string[]>([]);
  const [pairsLoading, setPairsLoading] = useState(false);
  const [pairSearch, setPairSearch] = useState('BTCUSDT');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    accountType: 'REAL', exchangeId: '', pair: 'BTCUSDT', market: 'FUTURES', mode: 'ALPHA_TREND_GRID',
    leverage: 3, capitalPerSide: 60, tpDailyPct: 1.5, maxLossPct: 3.0,
  });

  useEffect(() => {
    Promise.all([api.get<BotData[]>('/bots'), api.get<ExchangeAccount[]>('/exchanges')])
      .then(([b, e]) => {
        setBots(b.data);
        setExchanges(e.data);
        if (e.data.length > 0) {
          const firstId = e.data[0].id;
          if (e.data[0].exchange === 'DEMO') {
            setForm(f => ({ ...f, accountType: 'DEMO', exchangeId: firstId }));
            setAllPairs(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT']);
          } else {
            setForm(f => ({ ...f, exchangeId: firstId }));
            loadPairs(firstId, 'FUTURES');
          }
        }
      }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadPairs = async (exchangeId: string, market: string) => {
    if (!exchangeId) return;
    setPairsLoading(true);
    try {
      const type = market === 'FUTURES' ? 'future' : 'spot';
      const res = await api.get<string[]>(`/exchanges/${exchangeId}/markets?type=${type}&quote=USDT`);
      setAllPairs(res.data);
    } catch { setAllPairs([]); }
    finally { setPairsLoading(false); }
  };

  const filteredPairs = pairSearch.length >= 1
    ? allPairs.filter(p => p.toLowerCase().includes(pairSearch.toLowerCase())).slice(0, 50)
    : allPairs.slice(0, 50);

  const selectPair = (pair: string) => { setPairSearch(pair); setForm(f => ({ ...f, pair })); setShowDropdown(false); };

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError('');
    try {
      const res = await api.post<BotData>('/bots', form);
      setBots(prev => [{ ...res.data, accountType: form.accountType as 'REAL' | 'DEMO', exchange: form.accountType === 'DEMO' ? 'DEMO' : exchanges.find(ex => ex.id === form.exchangeId)?.exchange ?? '', rounds: 0, pnl: 0 }, ...prev]);
      setShowCreate(false);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao criar bot');
    } finally { setCreating(false); }
  };

  const toggleBot = async (id: string, status: string) => {
    const next = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await api.patch(`/bots/${id}/status`, { status: next });
    setBots(prev => prev.map(b => b.id === id ? { ...b, status: next } : b));
  };

  const stopBot = async (id: string) => {
    if (!confirm('Parar este bot permanentemente?')) return;
    await api.delete(`/bots/${id}`);
    setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'STOPPED' } : b));
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text1 font-bold text-lg">Gestão de Bots</h2>
          <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">Alpha Trend Grid Engine</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all">
          + NOVO BOT
        </button>
      </div>

      {/* Aviso sem exchanges */}
      {exchanges.length === 0 && (
        <div className="bg-gold-dim border border-gold-30 p-3.5 font-mono text-[10px] text-gold">
          ⚠ Precisas de conectar uma exchange primeiro. <a href="/exchanges" className="underline">Conectar agora →</a>
        </div>
      )}

      {/* Info estratégia */}
      <div className="bg-bg1 border border-border1 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-cyan">ALPHA TREND GRID</span>
          <span className="font-mono text-[8px] px-1.5 py-0.5 border border-cyan-30 bg-cyan-dim text-cyan">ESTRATÉGIA</span>
        </div>
        <p className="font-mono text-[10px] text-text2 leading-relaxed">
          Analisa EMA50 vs EMA200 + ADX + Volume. <span className="text-cyan">EMA50 &gt; EMA200</span> → opera <span className="text-cyan font-bold">LONG</span>.
          <span className="text-red"> EMA50 &lt; EMA200</span> → opera <span className="text-red font-bold">SHORT</span>.
          Grid coloca ordens escalonadas aproveitando ciclos dentro da tendência principal.
          <span className="text-gold"> ⚠ Nunca opera contra a tendência.</span>
        </p>
      </div>

      {/* Lista de Bots */}
      {bots.length === 0 ? (
        <div className="bg-bg1 border border-border1 p-12 text-center">
          <div className="text-4xl mb-3 opacity-20 text-text2">⊡</div>
          <p className="font-mono text-[11px] text-text2">Sem bots criados ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map(bot => (
            <div key={bot.id} className={`bg-bg1 border p-4 transition-all ${
              bot.status === 'ACTIVE' ? 'border-cyan/20' : bot.status === 'STOPPED' ? 'border-border1 opacity-60' : 'border-border1'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${bot.status === 'ACTIVE' ? 'bg-cyan animate-pulse' : bot.status === 'PAUSED' ? 'bg-gold' : 'bg-text3'}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-text1 font-bold text-sm">{bot.pair}</span>
                      <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text2">{bot.accountType ?? (bot.exchange === 'DEMO' ? 'DEMO' : 'REAL')}</span>
                      <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text2">{bot.exchange}</span>
                      <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border ${
                        bot.status === 'ACTIVE' ? 'border-cyan-30 bg-cyan-dim text-cyan'
                        : bot.status === 'PAUSED' ? 'border-gold-30 bg-gold-dim text-gold'
                        : 'border-border2 text-text3'
                      }`}>{bot.status}</span>
                    </div>
                    <div className="flex gap-5 font-mono text-[10px] text-text2">
                      <span>Capital: <span className="text-text1">${bot.capitalPerSide}×2</span></span>
                      <span>Alav: <span className="text-text1">{bot.leverage}×</span></span>
                      <span>Rounds: <span className="text-text1">{bot.rounds}</span></span>
                      <span>PNL: <span style={{ color: bot.pnl >= 0 ? '#00d4a0' : '#e05252' }} className="font-bold">{bot.pnl >= 0 ? '+' : ''}${bot.pnl.toFixed(2)}</span></span>
                    </div>
                  </div>
                </div>
                {bot.status !== 'STOPPED' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleBot(bot.id, bot.status)}
                      className={`font-mono text-[9px] uppercase px-3 py-1.5 border transition-all ${
                        bot.status === 'ACTIVE' ? 'border-gold-30 bg-gold-dim text-gold hover:bg-gold/20'
                        : 'border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20'
                      }`}>
                      {bot.status === 'ACTIVE' ? '⏸ Pausar' : '▶ Activar'}
                    </button>
                    <button onClick={() => stopBot(bot.id)}
                      className="font-mono text-[9px] uppercase px-3 py-1.5 border border-red-30 bg-red-dim text-red hover:bg-red/15 transition-all">
                      ⏹ Parar
                    </button>
                  </div>
                )}
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
              {/* Exchange */}
              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Conta</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['DEMO', 'REAL'] as const).map(type => (
                    <button key={type} type="button" onClick={() => {
                      setForm(f => ({ ...f, accountType: type }));
                      if (type === 'DEMO') {
                        setAllPairs(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT']);
                      }
                    }}
                      className={`py-2 border font-mono text-[9px] uppercase tracking-wider ${form.accountType === type ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text2'}`}>
                      {type === 'DEMO' ? 'Demo $10.000' : 'Real'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Exchange</label>
                {form.accountType === 'DEMO' ? (
                  <p className="text-cyan font-mono text-xs">Exchange demo interna. Não precisa de API key.</p>
                ) : exchanges.length === 0 ? (
                  <p className="text-gold font-mono text-xs">Sem exchanges conectadas. <a href="/exchanges" className="underline">Conectar primeiro.</a></p>
                ) : (
                  <select value={form.exchangeId} onChange={e => {
                    const exchangeId = e.target.value;
                    setForm(f => ({ ...f, exchangeId }));
                    setPairSearch(''); setAllPairs([]);
                    loadPairs(exchangeId, form.market);
                  }} className={selectClass}>
                    {exchanges.filter(ex => ex.exchange !== 'DEMO').map(ex => <option key={ex.id} value={ex.id}>{ex.exchange}</option>)}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Par dinâmico */}
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Par de Trading</label>
                  <div ref={searchRef} className="relative">
                    <input type="text" value={pairSearch}
                      onChange={e => { setPairSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Ex: BTCUSDT" className={`${inputClass} uppercase`} />
                  {pairsLoading && form.accountType !== 'DEMO' && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-cyan border-t-transparent rounded-full animate-spin" />}
                    {showDropdown && filteredPairs.length > 0 && (
                      <div className="absolute z-50 w-full bg-bg2 border border-border1 mt-1 max-h-48 overflow-y-auto shadow-xl">
                        {filteredPairs.map(p => (
                          <button key={p} type="button" onClick={() => selectPair(p)}
                            className={`w-full text-left px-3 py-2 font-mono text-xs hover:bg-bg3 transition-colors ${form.pair === p ? 'text-cyan bg-cyan-dim' : 'text-text1'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                    {showDropdown && pairSearch.length > 0 && filteredPairs.length === 0 && !pairsLoading && (
                      <div className="absolute z-50 w-full bg-bg2 border border-border1 mt-1 p-3 font-mono text-xs text-text2">
                        Nenhum par encontrado para "{pairSearch}"
                      </div>
                    )}
                  </div>
                </div>
                {/* Mercado */}
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Mercado</label>
                  <select value={form.market} onChange={e => {
                    const market = e.target.value;
                    setForm(f => ({ ...f, market }));
                    loadPairs(form.exchangeId, market);
                    setPairSearch(''); setAllPairs([]);
                  }} className={selectClass}>
                    <option value="FUTURES">Futuros</option>
                    <option value="SPOT">Spot</option>
                  </select>
                </div>
              </div>

              {/* Estratégia */}
              <div className="p-3 border border-cyan-20 bg-cyan-dim cursor-pointer">
                <p className="text-cyan font-mono text-[10px] font-bold uppercase">Alpha Trend Grid</p>
                <p className="text-text2 font-mono text-[9px] mt-0.5">Segue a tendência principal com grid adaptativo</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Alavancagem', key: 'leverage', min: 1, max: 20, step: 1 },
                  { label: 'Capital/Lado ($)', key: 'capitalPerSide', min: 10, max: 10000, step: 10 },
                  { label: 'Max Perda (%)', key: 'maxLossPct', min: 1, max: 10, step: 0.5 },
                ].map(({ label, key, min, max, step }) => (
                  <div key={key}>
                    <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">{label}</label>
                    <input type="number" min={min} max={max} step={step}
                      value={form[key as keyof typeof form] as number}
                      onChange={e => setForm(f => ({ ...f, [key]: +e.target.value }))}
                      className={inputClass} />
                  </div>
                ))}
              </div>

              {error && <p className="text-red font-mono text-[10px] bg-red-dim border border-red-30 p-3">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase tracking-wider hover:border-text2 hover:text-text1 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || (form.accountType === 'REAL' && !form.exchangeId)}
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
