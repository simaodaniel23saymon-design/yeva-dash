import { useState } from 'react';
import { PageLoader } from '../components/YevaTradeLoader';
import { useExchangeAccounts, type ReadOnlyExchange } from '../hooks/useExchangeAccounts';
import { useExchange } from '../hooks/useExchange';
import ReadOnlyExchangePanel, { AccountStatusRow } from '../components/exchange/ReadOnlyExchangePanel';

const EXCHANGES: ReadOnlyExchange[] = ['BINANCE', 'BITGET', 'BYBIT'];
const EXCHANGE_LABELS: Record<ReadOnlyExchange, string> = {
  BINANCE: 'Binance',
  BITGET: 'Bitget',
  BYBIT: 'Bybit',
};

const tabClass = (active: boolean) =>
  `flex-1 py-2.5 font-mono text-[9px] uppercase tracking-wider border transition-all ${
    active ? 'bg-cyan-dim border-cyan-30 text-cyan' : 'border-border2 text-text2 hover:border-border1'
  }`;

export default function ExchangesPage() {
  const { serverIp, loading: legacyStatusLoading } = useExchange(0, { fetchBalance: false });
  const roAccounts = useExchangeAccounts();
  const [exchange, setExchange] = useState<ReadOnlyExchange>('BINANCE');
  const accounts = roAccounts.accounts.filter((account) => !account.legacy);

  if (legacyStatusLoading || roAccounts.loading) return <PageLoader />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-text1 font-bold text-lg">Conexões de exchange</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">
          Conexão somente leitura — não habilita operações de trading.
        </p>
      </div>

      {roAccounts.error && (
        <div role="alert" className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
          {roAccounts.error}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="bg-bg1 border border-border1 p-4 space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text2 font-bold">Contas ligadas</p>
          {accounts.map((account) => <AccountStatusRow key={account.id} account={account} />)}
        </div>
      )}

      <div className="flex gap-2">
        {EXCHANGES.map((item) => (
          <button key={item} type="button" onClick={() => setExchange(item)} className={tabClass(exchange === item)}>
            {EXCHANGE_LABELS[item]}
          </button>
        ))}
      </div>

      <ReadOnlyExchangePanel
        exchange={exchange}
        accounts={accounts}
        serverIp={serverIp}
        connect={roAccounts.connect}
        updateKeys={roAccounts.updateKeys}
        disconnect={roAccounts.disconnect}
        refreshSnapshot={roAccounts.refreshSnapshot}
      />
    </div>
  );
}
