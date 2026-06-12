import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ExchangeAccount { id: string; exchange: string; isActive: boolean; }

export default function ExchangesPage() {
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const [form, setForm] = useState({ exchange: 'BINANCE', apiKey: '', secretKey: '' });

  useEffect(() => {
    api.get<ExchangeAccount[]>('/exchanges').then(r => setAccounts(r.data)).finally(() => setLoading(false));
  }, []);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/exchanges/connect', form);
      const res = await api.get<ExchangeAccount[]>('/exchanges');
      setAccounts(res.data);
      setShowForm(false);
      setForm({ exchange: 'BINANCE', apiKey: '', secretKey: '' });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao conectar exchange');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2";
  const selectClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors";

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text1 font-bold text-lg">Exchanges Conectadas</h2>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">Chaves encriptadas com AES-256-GCM</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all">
          + CONECTAR
        </button>
      </div>

      {/* Aviso segurança */}
      <div className="bg-cyan-dim border border-cyan-20 p-3.5 flex items-start gap-3">
        <span className="text-cyan flex-shrink-0">⚙</span>
        <p className="font-mono text-[10px] text-text2 leading-relaxed">
          <span className="text-cyan font-bold">Segurança AES-256-GCM — </span>
          API Keys são encriptadas antes de serem guardadas. Usa <strong className="text-text1">apenas permissões de Leitura + Trading</strong> (nunca Withdrawal).
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-bg1 border border-border1 p-12 text-center">
          <p className="font-mono text-[11px] text-text2">Sem exchanges conectadas.</p>
          <p className="font-mono text-[10px] text-text3 mt-1">Conecta a tua conta Binance ou Bybit para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-bg1 border border-border1 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-[6px] h-[6px] rounded-full ${acc.isActive ? 'bg-cyan animate-pulse shadow-[0_0_6px_#00d4a0]' : 'bg-text3'}`} />
                <div>
                  <p className="text-text1 font-bold">{acc.exchange.charAt(0) + acc.exchange.slice(1).toLowerCase()}</p>
                  <p className="font-mono text-[9px] text-text2">API Key: ••••••••••••••••</p>
                </div>
              </div>
              <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border ${acc.isActive ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text3'}`}>
                {acc.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-bg1 border border-border1 w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border1">
              <h3 className="text-text1 font-bold">Conectar Exchange</h3>
              <button onClick={() => setShowForm(false)} className="text-text2 hover:text-text1 transition-colors">✕</button>
            </div>

            <form onSubmit={connect} className="p-5 space-y-4">
              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Exchange</label>
                <select value={form.exchange} onChange={e => setForm(f => ({ ...f, exchange: e.target.value }))} className={selectClass}>
                  <option value="BINANCE">Binance</option>
                  <option value="BYBIT">Bybit</option>
                </select>
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">API Key</label>
                <input type="text" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  required placeholder="Cole a tua API Key aqui" className={inputClass} />
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Secret Key</label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} value={form.secretKey}
                    onChange={e => setForm(f => ({ ...f, secretKey: e.target.value }))} required
                    placeholder="Cole a tua Secret Key aqui" className={`${inputClass} pr-14`} />
                  <button type="button" onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase text-text2 hover:text-text1 transition-colors">
                    {showSecret ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              <div className="bg-gold-dim border border-gold-30 p-3 font-mono text-[10px] text-gold">
                ⚠ Activa apenas permissões de <strong>Leitura + Trading</strong>. Nunca actives "Withdrawal".
              </div>

              {error && <p className="text-red font-mono text-[10px] bg-red-dim border border-red-30 p-3">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase tracking-wider hover:text-text1 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase tracking-wider hover:bg-cyan/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {saving ? <><span className="w-3 h-3 border border-cyan border-t-transparent rounded-full animate-spin" /> A conectar...</> : 'Conectar com Segurança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
