import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';
import {
  useExchange,
  type ExchangeName,
  type MarketType,
  type AccountMode,
} from '../hooks/useExchange';

const inputClass = 'w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2';

const tabClass = (active: boolean) =>
  `flex-1 py-2.5 font-mono text-[9px] uppercase tracking-wider border transition-all ${
    active ? 'bg-cyan-dim border-cyan-30 text-cyan' : 'border-border2 text-text2 hover:border-border1'
  }`;

export default function ExchangesPage() {
  const {
    status, isConnected, exchangeBalance, serverIp, loading,
    refreshStatus, testConnection, setExchangeBalance,
  } = useExchange();

  const [exchange, setExchange] = useState<ExchangeName>('Binance');
  const [market, setMarket] = useState<MarketType>('FUTURES');
  const [accountType, setAccountType] = useState<AccountMode>('real');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [testedBalance, setTestedBalance] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState<Date | null>(null);

  const showFlash = (text: string, ok = true) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash(null), 4000);
  };

  useEffect(() => {
    if (status.exchange?.exchange) {
      setExchange(status.exchange.exchange.toUpperCase().includes('BYBIT') ? 'Bybit' : 'Binance');
      if (status.exchange.market === 'SPOT' || status.exchange.market === 'FUTURES') {
        setMarket(status.exchange.market);
      }
      if (status.exchange.accountType) {
        setAccountType(status.exchange.accountType === 'demo' || status.exchange.accountType === 'DEMO' ? 'demo' : 'real');
      }
      if (status.exchange.apiKeyMasked) setMaskedKey(status.exchange.apiKeyMasked);
    }
  }, [status]);

  useEffect(() => {
    if (exchangeBalance != null && isConnected && !editMode) {
      setTestedBalance(exchangeBalance);
      setBalanceUpdatedAt(new Date());
    }
  }, [exchangeBalance, isConnected, editMode]);

  const fetchBalance = useCallback(async () => {
    if (!isConnected) return;
    const result = await testConnection({
      exchange, market, testnet: accountType === 'demo',
    });
    if (result.success && result.balance != null) {
      setTestedBalance(result.balance);
      setBalanceUpdatedAt(new Date());
    }
  }, [isConnected, exchange, market, accountType, testConnection]);

  useEffect(() => {
    if (!isConnected || editMode) return;
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isConnected, editMode, fetchBalance]);

  const copyIp = () => {
    navigator.clipboard.writeText(serverIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    if (!apiKey || !apiSecret) {
      setError('Preenche a API Key e o Secret.');
      return;
    }
    setTesting(true);
    setError('');
    setTestedBalance(null);
    const result = await testConnection({
      apiKey, apiSecret, exchange, market, testnet: accountType === 'demo',
    });
    if (result.success && result.balance != null) {
      setTestedBalance(result.balance);
      setBalanceUpdatedAt(new Date());
      setMaskedKey(`${apiKey.slice(0, 10)}...`);
      showFlash(`Conexão OK — Saldo ${market}: $${result.balance.toFixed(2)} USDT`);
    } else {
      setError(result.error ?? 'Falha na conexão');
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (testedBalance == null) {
      showFlash('Testa a conexão antes de guardar.', false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      try {
        await api.post('/exchange/connect', {
          apiKey, apiSecret, exchange, market, accountType,
        });
      } catch {
        await api.post('/exchanges/connect', {
          exchange: exchange.toUpperCase(),
          apiKey,
          secretKey: apiSecret,
          market,
          accountType,
        });
      }
      await refreshStatus();
      setEditMode(false);
      setApiKey('');
      setApiSecret('');
      showFlash('Conexão guardada com sucesso.');
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateKeys = async () => {
    if (!apiKey || !apiSecret) {
      setError('Preenche as novas chaves.');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      await api.put('/exchange/update-keys', {
        apiKey, apiSecret, exchange,
      });
      const result = await testConnection({
        apiKey, apiSecret, exchange, market, testnet: accountType === 'demo',
      });
      if (result.success && result.balance != null) {
        setTestedBalance(result.balance);
        setMaskedKey(`${apiKey.slice(0, 10)}...`);
      }
      setEditMode(false);
      setApiKey('');
      setApiSecret('');
      showFlash('Chaves actualizadas com sucesso.');
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally {
      setUpdating(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm(
      'Ao desconectar:\n• Todos os bots serão parados\n• As chaves API serão removidas\n\nTens a certeza?'
    )) return;
    setDisconnecting(true);
    try {
      await api.delete('/exchange/disconnect');
      setTestedBalance(null);
      setExchangeBalance(null);
      setMaskedKey('');
      setEditMode(false);
      await refreshStatus();
      showFlash('Exchange desconectada.');
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message, false);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayBalance = testedBalance ?? exchangeBalance;
  const showForm = !isConnected || editMode;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-text1 font-bold text-lg">Conexão com Exchange</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">
          Testa antes de guardar · Chaves encriptadas AES-256-GCM
        </p>
      </div>

      {flash && (
        <div className={`p-3 border font-mono text-[10px] ${flash.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>
          {flash.text}
        </div>
      )}

      {/* Tabs Exchange */}
      <div className="flex gap-2">
        {(['Binance', 'Bybit'] as const).map(ex => (
          <button key={ex} type="button" onClick={() => setExchange(ex)} className={tabClass(exchange === ex)}>
            {ex}
          </button>
        ))}
      </div>

      {/* IP Servidor */}
      <div className="bg-bg1 border border-gold-30 p-4 space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-wider text-gold font-bold">Libera este IP na corretora</p>
        <div className="flex gap-2">
          <code className="flex-1 bg-bg3 border border-border2 px-3 py-2 font-mono text-sm text-gold">{serverIp}</code>
          <button onClick={copyIp}
            className={`px-3 py-2 border font-mono text-[9px] uppercase ${copied ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text2 hover:border-cyan hover:text-cyan'}`}>
            {copied ? '✓' : 'Copiar'}
          </button>
        </div>
        <p className="font-mono text-[9px] text-text3">Restringe as chaves API a este IP por segurança.</p>
      </div>

      {/* Conta + Mercado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-2">Tipo de conta</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAccountType('real')} className={tabClass(accountType === 'real')}>Real</button>
            <button type="button" onClick={() => setAccountType('demo')} className={tabClass(accountType === 'demo')}>Demo</button>
          </div>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-2">Mercado</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMarket('FUTURES')} className={tabClass(market === 'FUTURES')}>Futures</button>
            <button type="button" onClick={() => setMarket('SPOT')} className={tabClass(market === 'SPOT')}>Spot</button>
          </div>
        </div>
      </div>

      {accountType === 'demo' && (
        <div className="bg-gold-dim border border-gold-30 p-3 font-mono text-[10px] text-gold">
          Modo Demo: usa Testnet — nenhuma ordem real será enviada.
        </div>
      )}

      {isConnected && !editMode && (
        <div className="bg-bg1 border border-cyan-20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-[6px] h-[6px] rounded-full bg-cyan animate-pulse" />
            <span className="text-text1 font-bold">Conectado</span>
          </div>
          {maskedKey && (
            <p className="font-mono text-[10px] text-text2 mb-1">
              Chave API: <span className="text-cyan">{maskedKey}</span>
            </p>
          )}
          {displayBalance != null && (
            <>
              <p className="font-mono text-sm text-cyan font-bold">
                Saldo {market}: ${displayBalance.toFixed(2)} USDT
              </p>
              {balanceUpdatedAt && (
                <p className="font-mono text-[9px] text-text3 mt-1">
                  Actualizado: {balanceUpdatedAt.toLocaleTimeString('pt-PT')}
                </p>
              )}
            </>
          )}
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => { setEditMode(true); setTestedBalance(null); }}
              className="flex-1 py-2.5 border border-gold-30 bg-gold-dim text-gold font-mono text-[9px] uppercase">
              Editar chaves
            </button>
            <button type="button" onClick={disconnect} disabled={disconnecting}
              className="flex-1 py-2.5 border border-red-30 bg-red-dim text-red font-mono text-[9px] uppercase disabled:opacity-50">
              {disconnecting ? 'A desconectar...' : 'Desconectar'}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">API Key</label>
              <div className="relative">
                <input type={showApiKey ? 'text' : 'password'} value={apiKey}
                  autoComplete="off"
                  onChange={e => setApiKey(e.target.value)} placeholder="Cola a tua API Key" className={`${inputClass} pr-14`} />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase text-text2">
                  {showApiKey ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
            <div>
              <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">API Secret</label>
              <div className="relative">
                <input type={showApiSecret ? 'text' : 'password'} value={apiSecret}
                  autoComplete="new-password"
                  onChange={e => setApiSecret(e.target.value)} placeholder="Cola o teu API Secret" className={`${inputClass} pr-14`} />
                <button type="button" onClick={() => setShowApiSecret(!showApiSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase text-text2">
                  {showApiSecret ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-bg2 border border-border1 p-4 font-mono text-[10px] space-y-1.5">
            <p className="text-text2 font-bold uppercase text-[9px] tracking-wider mb-2">Permissões necessárias</p>
            <p className="text-cyan">✓ Enable Reading</p>
            <p className="text-cyan">✓ Enable Futures / Spot Trading</p>
            <p className="text-red">✗ Enable Withdrawals (deixa desactivado)</p>
          </div>

          <button type="button" onClick={handleTest} disabled={testing || !apiKey || !apiSecret}
            className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-cyan/20 disabled:opacity-50">
            {testing ? 'A testar...' : 'Testar conexão'}
          </button>

          {error && (
            <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">{error}</div>
          )}

          {testedBalance != null && (
            <div className="bg-cyan-dim border border-cyan-20 p-4 font-mono text-[10px]">
              <p className="text-cyan font-bold mb-1">Conexão estabelecida!</p>
              <p className="text-text2">
                Saldo {market}: <span className="text-cyan font-bold text-base">${testedBalance.toFixed(2)} USDT</span>
              </p>
              <p className="text-text3 mt-1">{exchange} · {accountType === 'real' ? 'Conta Real' : 'Demo (Testnet)'}</p>
              {balanceUpdatedAt && (
                <p className="text-text3 mt-1">Actualizado: {balanceUpdatedAt.toLocaleTimeString('pt-PT')}</p>
              )}
            </div>
          )}

          {isConnected && editMode ? (
            <button type="button" onClick={handleUpdateKeys} disabled={updating || testedBalance == null}
              className="w-full py-3 border border-gold-30 bg-gold-dim text-gold font-mono text-[10px] uppercase disabled:opacity-50">
              {updating ? 'A actualizar...' : 'Guardar novas chaves'}
            </button>
          ) : !isConnected ? (
            <button type="button" onClick={handleSave} disabled={saving || testedBalance == null}
              className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase disabled:opacity-50">
              {saving ? 'A guardar...' : 'Guardar conexão'}
            </button>
          ) : null}

          {editMode && (
            <button type="button" onClick={() => { setEditMode(false); setApiKey(''); setApiSecret(''); setError(''); }}
              className="w-full py-2 border border-border2 text-text2 font-mono text-[9px] uppercase">
              Cancelar edição
            </button>
          )}
        </>
      )}
    </div>
  );
}
