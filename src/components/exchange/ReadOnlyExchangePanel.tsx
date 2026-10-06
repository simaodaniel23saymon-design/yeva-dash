import { useState } from 'react';
import {
  balanceLabel,
  exchangeTitle,
  marketTitle,
  statusLabel,
  type ConnectResult,
  type ExchangeAccountView,
  type ReadOnlyExchange,
} from '../../hooks/useExchangeAccounts';

const inputClass = 'w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2';
const READ_ONLY_NOTICE = 'Conexão somente leitura — não habilita operações de trading.';

const toneClass = {
  ok: 'border-cyan-20 text-cyan',
  warn: 'border-gold-30 text-gold',
  bad: 'border-red-30 text-red',
  muted: 'border-border2 text-text2',
} as const;

/** Linha de estado de uma conta: "Bitget Spot · Read-only · Balance: $0.00" / "Bybit Spot · Blocked · motivo". */
export function AccountStatusRow({ account }: { account: ExchangeAccountView }) {
  const s = statusLabel(account.connectionStatus);
  const bal = balanceLabel(account.balance);
  return (
    <div className={`bg-bg1 border p-3 font-mono text-[10px] ${toneClass[s.tone]}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-text1 font-bold">{exchangeTitle(account.exchange)} {marketTitle(account.market)}</span>
        <span className="uppercase tracking-wider">{s.text}</span>
        {account.legacy && <span className="text-text3">· Bots Binance</span>}
        {bal && <span className="text-text2">· Balance: <span className="text-text1">{bal}</span></span>}
      </div>
      {s.tone !== 'ok' && account.message && <p className="text-text2 mt-1">{account.message}</p>}
      {account.warnings.map((w) => (
        <p key={w} className="text-gold mt-1">{w}</p>
      ))}
    </div>
  );
}

type Props = {
  exchange: ReadOnlyExchange;
  accounts: ExchangeAccountView[];
  serverIp: string;
  connect: (p: { exchange: ReadOnlyExchange; market: 'SPOT'; apiKey: string; apiSecret: string; passphrase?: string }) => Promise<ConnectResult>;
  updateKeys: (accountId: string, p: { market: 'SPOT'; apiKey: string; apiSecret: string; passphrase?: string }) => Promise<ConnectResult>;
  disconnect: (accountId: string) => Promise<ConnectResult>;
  refreshSnapshot: (a: ExchangeAccountView) => Promise<ConnectResult>;
};

/** Ligação só de leitura. Os segredos nunca são mostrados de novo depois de enviados. */
export default function ReadOnlyExchangePanel({ exchange, accounts, serverIp, connect, updateKeys, disconnect, refreshSnapshot }: Props) {
  const needsPassphrase = exchange === 'BITGET';
  const current = accounts.find((a) => !a.legacy && a.exchange === exchange && a.market === 'SPOT' && a.connectionStatus !== 'NOT_CONNECTED') ?? null;
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<ConnectResult | null>(null);

  const clearSecrets = () => {
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
  };

  const run = async (fn: () => Promise<ConnectResult>) => {
    setBusy(true);
    setResult(null);
    try {
      const r = await fn();
      setResult(r);
      if (r.ok) setEditing(false);
    } finally {
      clearSecrets();
      setBusy(false);
    }
  };

  const submit = () => {
    const creds = { market: 'SPOT' as const, apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), ...(needsPassphrase ? { passphrase: passphrase.trim() } : {}) };
    return run(() => (current && editing ? updateKeys(current.id, creds) : connect({ exchange, ...creds })));
  };

  const onDisconnect = () => {
    if (!current) return;
    if (!window.confirm(`Desligar ${exchangeTitle(exchange)} Spot?\n• As chaves guardadas são invalidadas\n• O histórico é mantido\n• Nada é alterado na exchange`)) return;
    run(() => disconnect(current.id));
  };

  const showForm = !current || editing;
  const canSubmit = apiKey.trim() && apiSecret.trim() && (!needsPassphrase || passphrase.trim());

  return (
    <div className="space-y-3">
      <div className="bg-bg2 border border-border1 p-3 font-mono text-[10px] text-text2">
        <p className="text-cyan">{READ_ONLY_NOTICE}</p>
        <p className="mt-1">Saldo, ordens abertas e trades. Nenhuma ordem, transferência ou levantamento é feito pela YevaTrade.</p>
      </div>

      {current && (
        <>
          <AccountStatusRow account={current} />
          {!editing && (
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => run(() => refreshSnapshot(current))}
                className="flex-1 py-2.5 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase disabled:opacity-50">
                {busy ? 'A validar...' : 'Atualizar leitura'}
              </button>
              <button type="button" disabled={busy} onClick={() => { setEditing(true); setResult(null); }}
                className="flex-1 py-2.5 border border-gold-30 bg-gold-dim text-gold font-mono text-[9px] uppercase disabled:opacity-50">
                Atualizar chaves
              </button>
              <button type="button" disabled={busy} onClick={onDisconnect}
                className="flex-1 py-2.5 border border-red-30 bg-red-dim text-red font-mono text-[9px] uppercase disabled:opacity-50">
                Desligar
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-2">Mercado</p>
            <div className="flex gap-2">
              <span className="flex-1 py-2.5 text-center font-mono text-[9px] uppercase tracking-wider border bg-cyan-dim border-cyan-30 text-cyan">Spot</span>
              <span className="flex-1 py-2.5 text-center font-mono text-[9px] uppercase tracking-wider border border-border2 text-text3" title="Futures não suportado nesta fase">
                Futures · não suportado
              </span>
            </div>
          </div>
          <div>
            <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">API Key</label>
            <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" className={inputClass} />
          </div>
          <div>
            <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">API Secret</label>
            <input type="password" autoComplete="new-password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="API Secret" className={inputClass} />
          </div>
          {needsPassphrase && (
            <div>
              <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Passphrase</label>
              <input type="password" autoComplete="new-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Passphrase da API" className={inputClass} />
            </div>
          )}

          <div className="bg-bg2 border border-border1 p-4 font-mono text-[10px] space-y-1.5">
            <p className="text-text2 font-bold uppercase text-[9px] tracking-wider mb-2">Permissões da API key</p>
            <p className="text-cyan">✓ Leitura</p>
            <p className="text-red">✗ Levantamentos (desativados)</p>
            <p className="text-red">✗ Transferências (desativadas)</p>
            <p className="text-text3">Trading não é necessário. Se a chave tiver trading, a execução continua desativada pela YevaTrade.</p>
            <p className="text-text3">Recomendado: restringir a chave ao IP {serverIp}.</p>
            {exchange === 'BYBIT' && <p className="text-text3">Bybit: só contas Unified (contas Classic não são suportadas).</p>}
          </div>

          <button type="button" onClick={submit} disabled={busy || !canSubmit}
            className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-cyan/20 disabled:opacity-50">
            {busy ? 'A validar ligação...' : current && editing ? 'Validar e guardar novas chaves' : `Validar e ligar ${exchangeTitle(exchange)} Spot`}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(false); clearSecrets(); setResult(null); }}
              className="w-full py-2 border border-border2 text-text2 font-mono text-[9px] uppercase">
              Cancelar
            </button>
          )}
        </div>
      )}

      {result && (
        <div className={`p-3 border font-mono text-[10px] ${result.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>
          <p>{result.status ? `${statusLabel(result.status).text}: ` : ''}{result.message}</p>
          {result.warnings.map((w) => (
            <p key={w} className="text-gold mt-1">{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
