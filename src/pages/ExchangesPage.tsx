import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';

interface ExchangeAccount { id: string; exchange: string; isActive: boolean; createdAt?: string; }

interface ExchangeStatus {
  connected: boolean;
  exchange?: {
    id?: string;
    exchange?: string;
    createdAt?: string;
    isActive?: boolean;
  } | null;
}

const SERVER_IP = '134.209.81.127';

export default function ExchangesPage() {
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [status, setStatus] = useState<ExchangeStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({ exchange: 'BINANCE', apiKey: '', secretKey: '' });

  const showFlash = (text: string, ok = true) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash(null), 4000);
  };

  const copyIp = () => {
    navigator.clipboard.writeText(SERVER_IP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadData = useCallback(async () => {
    const [accountsRes, statusRes] = await Promise.allSettled([
      api.get<ExchangeAccount[]>('/exchanges'),
      api.get<ExchangeStatus>('/exchange/status'),
    ]);

    if (accountsRes.status === 'fulfilled') {
      setAccounts(accountsRes.value.data.filter(a => a.exchange !== 'DEMO'));
    }

    if (statusRes.status === 'fulfilled') {
      setStatus(statusRes.value.data);
    } else {
      // Fallback: considera conectado se houver conta real activa
      const real = accountsRes.status === 'fulfilled'
        ? accountsRes.value.data.filter(a => a.exchange !== 'DEMO' && a.isActive)
        : [];
      setStatus({ connected: real.length > 0, exchange: real[0] ?? null });
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const disconnect = async () => {
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO!\n\n' +
      'Ao desconectar:\n' +
      '• Todos os bots serão parados\n' +
      '• As chaves API serão removidas\n' +
      '• Terás de conectar novamente para operar\n\n' +
      'Tens a certeza?'
    );
    if (!confirmed) return;

    setDisconnecting(true);
    setError('');
    try {
      await api.delete('/exchange/disconnect');
      setStatus({ connected: false, exchange: null });
      setAccounts([]);
      showFlash('Exchange desconectada com sucesso.');
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message, false);
    } finally {
      setDisconnecting(false);
    }
  };

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/exchanges/connect', form);
      await loadData();
      setShowForm(false);
      setForm({ exchange: 'BINANCE', apiKey: '', secretKey: '' });
      showFlash('Exchange conectada com sucesso.');
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally { setSaving(false); }
  };

  const inputClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2";
  const selectClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors";

  const connectedExchange = status.exchange?.exchange ?? accounts.find(a => a.isActive)?.exchange;
  const connectedSince = status.exchange?.createdAt ?? accounts.find(a => a.isActive)?.createdAt;
  const isConnected = status.connected || accounts.some(a => a.isActive);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-text1 font-bold text-lg">Conexão com Exchange</h2>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">Chaves encriptadas com AES-256-GCM</p>
        </div>
        {!isConnected && (
          <button onClick={() => setShowForm(true)}
            className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all">
            + CONECTAR
          </button>
        )}
      </div>

      {flash && (
        <div className={`p-3 border font-mono text-[10px] ${flash.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>
          {flash.text}
        </div>
      )}

      {isConnected ? (
        <div className="bg-bg1 border border-cyan-20 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-[6px] h-[6px] rounded-full bg-cyan animate-pulse shadow-[0_0_6px_#00d4a0]" />
                <h3 className="text-text1 font-bold">Conectado</h3>
              </div>
              <p className="font-mono text-[11px] text-text2">
                Exchange: <span className="text-cyan font-bold">
                  {connectedExchange
                    ? connectedExchange.charAt(0) + connectedExchange.slice(1).toLowerCase()
                    : 'Binance'}
                </span>
              </p>
              {connectedSince && (
                <p className="font-mono text-[9px] text-text3 mt-1">
                  Conectado desde: {new Date(connectedSince).toLocaleDateString('pt-PT')}
                </p>
              )}
            </div>
            <button onClick={disconnect} disabled={disconnecting}
              className="font-mono text-[9px] tracking-widest uppercase px-5 py-3 border border-red-30 bg-red-dim text-red hover:bg-red/15 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {disconnecting
                ? <><span className="w-3 h-3 border border-red border-t-transparent rounded-full animate-spin" /> A desconectar...</>
                : 'Desconectar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-bg1 border border-border1 p-6">
          <p className="font-mono text-[11px] text-text2 mb-2">Nenhuma exchange conectada.</p>
          <p className="font-mono text-[10px] text-text3">Conecta a tua conta Binance ou Bybit para começar a operar.</p>
        </div>
      )}

      <div className="bg-cyan-dim border border-cyan-20 p-3.5 flex items-start gap-3">
        <span className="text-cyan flex-shrink-0">⚙</span>
        <p className="font-mono text-[10px] text-text2 leading-relaxed">
          <span className="text-cyan font-bold">Segurança AES-256-GCM — </span>
          API Keys são encriptadas antes de serem guardadas. Usa <strong className="text-text1">apenas permissões de Leitura + Trading</strong> (nunca Withdrawal).
        </p>
      </div>

      <div className="bg-bg1 border border-gold-30 p-4 space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-wider text-gold font-bold">IP para Whitelist</p>
        <p className="font-mono text-[10px] text-text2 leading-relaxed">
          Ao criar as chaves API na Binance ou Bybit, activa a <strong className="text-text1">restrição por IP</strong> e adiciona o endereço abaixo.
        </p>
        <div className="flex items-center gap-2 mt-1">
          <code className="flex-1 bg-bg3 border border-border2 px-3 py-2 font-mono text-sm text-gold tracking-wider">{SERVER_IP}</code>
          <button onClick={copyIp}
            className={`px-3 py-2 border font-mono text-[9px] tracking-widest uppercase transition-all ${copied ? 'border-cyan bg-cyan-dim text-cyan' : 'border-border2 text-text2 hover:border-cyan hover:text-cyan'}`}>
            {copied ? '✓ COPIADO' : 'COPIAR'}
          </button>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-wider text-text3">Contas registadas</p>
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
                Activa apenas permissões de <strong>Leitura + Trading</strong>. Nunca actives &quot;Withdrawal&quot;.
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
