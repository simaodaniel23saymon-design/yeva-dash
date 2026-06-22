import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Round {
  id: string;
  pnl: number;
  cycles: number;
  closeReason?: string;
  openedAt: string;
  closedAt?: string;
  bot: { pair: string; market: string; exchangeAccount: { exchange: string } };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  network?: string;
  createdAt: string;
}

interface HistoryData {
  rounds: Round[];
  transactions: Transaction[];
}

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData>({ rounds: [], transactions: [] });
  const [tab, setTab] = useState<'rounds' | 'transactions'>('rounds');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<HistoryData>('/history').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-32 flex justify-center"><div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text1 font-bold text-lg">Histórico</h2>
          <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">Rounds e transacções</p>
        </div>
        <div className="flex gap-1">
          {(['rounds', 'transactions'] as const).map(value => (
            <button key={value} onClick={() => setTab(value)}
              className={`font-mono text-[9px] uppercase px-3 py-1.5 border ${tab === value ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border1 text-text2'}`}>
              {value === 'rounds' ? 'Rounds' : 'Transacções'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-bg1 border border-border1 scroll-area-x">
        {tab === 'rounds' ? (
          !data.rounds.length ? <div className="p-10 text-center font-mono text-xs text-text2">Sem rounds registados.</div> : (
            <table className="w-full text-xs">
              <thead className="border-b border-border1"><tr>{['Par', 'Exchange', 'Ciclos', 'P&L', 'Fecho', 'Aberto'].map(h => <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border1">
                {data.rounds.map(round => (
                  <tr key={round.id}>
                    <td className="px-4 py-3 font-mono font-bold text-text1">{round.bot.pair}</td>
                    <td className="px-4 py-3 font-mono text-text2">{round.bot.exchangeAccount.exchange}</td>
                    <td className="px-4 py-3 font-mono text-text2">{round.cycles}</td>
                    <td className={`px-4 py-3 font-mono font-bold ${round.pnl >= 0 ? 'text-cyan' : 'text-red'}`}>{money(round.pnl)}</td>
                    <td className="px-4 py-3 font-mono text-text2">{round.closeReason ?? 'Aberto'}</td>
                    <td className="px-4 py-3 font-mono text-text2">{new Date(round.openedAt).toLocaleString('pt-PT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          !data.transactions.length ? <div className="p-10 text-center font-mono text-xs text-text2">Sem transacções registadas.</div> : (
            <table className="w-full text-xs">
              <thead className="border-b border-border1"><tr>{['Tipo', 'Valor', 'Taxa', 'Líquido', 'Rede', 'Estado', 'Data'].map(h => <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border1">
                {data.transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 font-mono font-bold text-text1">{tx.type}</td>
                    <td className="px-4 py-3 font-mono text-text2">{money(tx.amount)}</td>
                    <td className="px-4 py-3 font-mono text-text2">{money(tx.fee)}</td>
                    <td className="px-4 py-3 font-mono text-cyan">{money(tx.netAmount)}</td>
                    <td className="px-4 py-3 font-mono text-text2">{tx.network ?? '-'}</td>
                    <td className="px-4 py-3 font-mono text-text2">{tx.status}</td>
                    <td className="px-4 py-3 font-mono text-text2">{new Date(tx.createdAt).toLocaleString('pt-PT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
