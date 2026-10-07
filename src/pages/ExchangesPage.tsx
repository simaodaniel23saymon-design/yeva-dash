import { useEffect, useState, useCallback } from 'react';
import { PageLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';
import {
  useExchange,
  type ExchangeName,
  type MarketType,
  type AccountMode,
} from '../hooks/useExchange';
import { useExchangeAccounts, type ReadOnlyExchange } from '../hooks/useExchangeAccounts';
import ReadOnlyExchangePanel, { AccountStatusRow } from '../components/exchange/ReadOnlyExchangePanel';
import { shouldAutoTestConnection } from '../utils/exchangeStatus';
import ExchangeHub from '../components/exchanges/ExchangeHub';
import { useExchangeCatalog } from '../hooks/useExchangeCatalog';
import type { SpotVenue } from '../types/spot';

const inputClass = 'w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2';

const tabClass = (active: boolean) =>
  `flex-1 py-2.5 font-mono text-[9px] uppercase tracking-wider border transition-all ${
    active ? 'bg-cyan-dim border-cyan-30 text-cyan' : 'border-border2 text-text2 hover:border-border1'
  }`;

export default function ExchangesPage() {
  const {
    status, isConnected, isDemoAccount, exchangeBalance, serverIp, loading,
    refreshStatus, testConnection, setExchangeBalance,
  } = useExchange(0, { fetchBalance: false });
  const roAccounts = useExchangeAccounts();

  const exchange: ExchangeName = 'Binance';
  const [readOnlyExchange, setReadOnlyExchange] = useState<ReadOnlyExchange>('BINANCE');
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const catalog = useExchangeCatalog();
  const readOnlyAccounts = roAccounts.accounts.filter((account) => !account.legacy);
  const isAmbiguous = Boolean(status.ambiguous);
  const hubVenues: SpotVenue[] = catalog.venues.map((venue) => (
    venue.type === 'CEX' && venue.exchange.toUpperCase() !== 'BINANCE'
      ? { ...venue, action: 'LEARN' as const }
      : venue
  ));

  const showFlash = (text: string, ok = true) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash(null), 4000);
  };

  useEffect(() => {
    if (isConnected && status.exchange?.exchange) {
      if (status.exchange.market === 'SPOT' || status.exchange.market === 'FUTURES') {
        setMarket(status.exchange.market);
      }
      if (status.exchange.accountType) {
        setAccountType(status.exchange.accountType === 'demo' || status.exchange.accountType === 'DEMO' ? 'demo' : 'real');
      }
      if (status.exchange.apiKeyMasked) setMaskedKey(status.exchange.apiKeyMasked);
    }
  }, [isConnected, status]);

  useEffect(() => {
    if (exchangeBalance != null && isConnected && !editMode) {
      setTestedBalance(exchangeBalance);
      setBalanceUpdatedAt(new Date());
    }
  }, [exchangeBalance, isConnected, editMode]);

  const fetchBalance = useCallback(async () => {
    if (!isConnected || isDemoAccount || status.ambiguous) return;
    setCheckingConnection(true);
    const result = await testConnection({
      exchange, market, testnet: accountType === 'demo', accountId: status.exchange?.id,
    });
    setCheckingConnection(false);
    if (result.success && result.balance != null) {
      setTestedBalance(result.balance);
      setBalanceUpdatedAt(new Date());
      setConnectionError(null);
    } else {
      setConnectionError(result.error ?? 'Falha na conexão');
    }
  }, [isConnected, isDemoAccount, status.ambiguous, status.exchange?.id, exchange, market, accountType, testConnection]);

  // Um teste por abertura/mudança de mercado — sem polling; nova tentativa só por clique.
  useEffect(() => {
    if (!shouldAutoTestConnection({
      connected: isConnected,
      account: status.exchange
        ? { exchange: status.exchange.exchange, accountType: status.exchange.accountType ?? undefined }
        : null,
      editMode,
    })) return;
    fetchBalance();
  }, [isConnected, status.exchange, editMode, fetchBalance]);

  const copyIp = () => {
    navigator.clipboard.writeText(serverIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    if (isAmbiguous) return;
    if (!apiKey || !apiSecret) {
      setError('Preenche a API Key e o Secret.');
      return;
    }
    setTesting(true);
    setError('');
    setTestedBalance(null);
    const result = await testConnection({
      apiKey, apiSecret, exchange, market, testnet: accountType === 'demo',
      accountId: isConnected ? status.exchange?.id : undefined,
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
    if (isAmbiguous) return;
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
      void catalog.reload();
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
    if (isAmbiguous) return;
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
        accountId: status.exchange?.id,
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
      void catalog.reload();
      showFlash('Exchange desconectada.');
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message, false);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <PageLoader />
    );
  }

  const displayBalance = testedBalance ?? exchangeBalance;
  const showForm = !isAmbiguous && (!isConnected || editMode);

  if (loading || roAccounts.loading) return <PageLoader />;

  const binanceConnect = (
    <div className="space-y-4 border-t border-border1 pt-4" data-testid="binance-connect">
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

      {market === 'SPOT' && (
        <div className="bg-bg2 border border-border1 p-3 font-mono text-[10px] text-text2 space-y-1">
          <p>Spot nesta ligação é usado pelo Spot Auto Bot (DCA) — envia ordens reais quando o ligas.</p>
          <p>
            O Spot Momentum (<Link to="/spot" className="text-cyan hover:underline">Spot</Link>) tem a execução real desativada:
            não envia ordens com esta chave.
          </p>
        </div>
      )}

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
          {isDemoAccount && (
            <p className="font-mono text-[10px] text-text2 mt-1">
              Conta demo: sem ligação real à exchange.
            </p>
          )}
          {!isDemoAccount && connectionError && (
            <div className="mt-2 border border-red-30 bg-red-dim p-2 font-mono text-[10px] text-red">
              <p className="font-bold uppercase">Ligação indisponível</p>
              <p className="mt-1 break-words">{connectionError}</p>
            </div>
          )}
          {!isDemoAccount && (
            <button type="button" onClick={fetchBalance} disabled={checkingConnection}
              className="w-full mt-3 py-2.5 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase disabled:opacity-50">
              {checkingConnection ? 'A testar...' : 'Testar ligação'}
            </button>
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

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h2 className="text-text1 font-bold text-lg">Exchanges</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">
          CEX e DEX · Aparecer na lista não significa suporte operacional · Chaves encriptadas AES-256-GCM ·{' '}
          <Link to="/api-guide" className="text-cyan hover:underline">Guia API</Link>
        </p>
      </div>

      {flash && (
        <div className={`p-3 border font-mono text-[10px] ${flash.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>
          {flash.text}
        </div>
      )}

      {isAmbiguous && (
        <div role="alert" className="bg-gold-dim border border-gold-30 p-3 font-mono text-[10px] text-gold">
          Não foi possível identificar de forma inequívoca a conta Binance conectada. Revise a conexão antes de tentar uma nova ligação.
        </div>
      )}

      <ExchangeHub
        venues={hubVenues}
        securityLayer={catalog.securityLayer}
        loading={catalog.loading}
        error={catalog.error}
        binanceConnect={binanceConnect}
      />

      <section className="space-y-4 border-t border-border1 pt-5" aria-labelledby="readonly-exchanges-heading">
        <div>
          <h3 id="readonly-exchanges-heading" className="text-text1 font-bold text-lg">Contas read-only</h3>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">
            Conexão somente leitura — não habilita operações de trading.
          </p>
        </div>

        {roAccounts.error && (
          <div role="alert" className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
            {roAccounts.error}
          </div>
        )}

        {readOnlyAccounts.length > 0 && (
          <div className="bg-bg1 border border-border1 p-4 space-y-2">
            <p className="font-mono text-[9px] uppercase tracking-wider text-text2 font-bold">Contas ligadas</p>
            {readOnlyAccounts.map((account) => <AccountStatusRow key={account.id} account={account} />)}
          </div>
        )}

        <div className="flex gap-2">
          {(['BINANCE', 'BITGET', 'BYBIT'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setReadOnlyExchange(item)}
              className={tabClass(readOnlyExchange === item)}
            >
              {item === 'BINANCE' ? 'Binance' : item === 'BITGET' ? 'Bitget' : 'Bybit'}
            </button>
          ))}
        </div>

        <ReadOnlyExchangePanel
          exchange={readOnlyExchange}
          accounts={readOnlyAccounts}
          serverIp={serverIp}
          connect={roAccounts.connect}
          updateKeys={roAccounts.updateKeys}
          disconnect={roAccounts.disconnect}
          refreshSnapshot={roAccounts.refreshSnapshot}
        />
      </section>
    </div>
  );
}
