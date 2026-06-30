import { useCallback, useEffect, useState } from 'react';
import { PageLoader } from '../components/YevaTradeLoader';
import { QuickGuide } from '../components/QuickGuide';
import { fetchUserHistory, type HistoryRound, type HistoryTransaction } from '../utils/historyData';
import { formatMoney } from '../utils/format';

export default function HistoryPage() {
  const [rounds, setRounds] = useState<HistoryRound[]>([]);
  const [transactions, setTransactions] = useState<HistoryTransaction[]>([]);
  const [tab, setTab] = useState<'rounds' | 'transactions'>('rounds');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserHistory();
      setRounds(data.rounds);
      setTransactions(data.transactions);
    } catch {
      setError('Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <QuickGuide title="Histórico" steps={[
        'Rounds: ciclos fechados dos teus bots',
        'Transacções: depósitos, saques e movimentos da carteira',
        'Dados carregados da API de histórico e pagamentos',
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-text1 font-bold text-lg">Histórico</h2>
          <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
            {rounds.length} round(s) · {transactions.length} transacção(ões)
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load}
            className="font-mono text-[9px] uppercase px-3 py-1.5 border border-border2 text-text2 hover:border-cyan hover:text-cyan">
            Actualizar
          </button>
          <div className="flex gap-1">
            {(['rounds', 'transactions'] as const).map(value => (
              <button key={value} type="button" onClick={() => setTab(value)}
                className={`font-mono text-[9px] uppercase px-3 py-1.5 border ${tab === value ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border1 text-text2'}`}>
                {value === 'rounds' ? 'Rounds' : 'Transacções'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 border font-mono text-[10px] bg-red-dim border-red-30 text-red">{error}</div>
      )}

      <div className="bg-bg1 border border-border1 scroll-area-x">
        {tab === 'rounds' ? (
          !rounds.length ? (
            <div className="p-10 text-center font-mono text-xs text-text2">
              Sem rounds registados. Quando os bots fecharem ciclos, aparecem aqui.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-border1">
                <tr>
                  {['Par', 'Exchange', 'Ciclos', 'P&L', 'Fecho', 'Aberto', 'Fechado'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1">
                {rounds.map(round => (
                  <tr key={round.id}>
                    <td className="px-4 py-3 font-mono font-bold text-text1">{round.bot.pair}</td>
                    <td className="px-4 py-3 font-mono text-text2">{round.bot.exchangeAccount.exchange}</td>
                    <td className="px-4 py-3 font-mono text-text2">{round.cycles}</td>
                    <td className={`px-4 py-3 font-mono font-bold ${round.pnl >= 0 ? 'text-cyan' : 'text-red'}`}>
                      {formatMoney(round.pnl)}
                    </td>
                    <td className="px-4 py-3 font-mono text-text2">{round.closeReason ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-text2">{new Date(round.openedAt).toLocaleString('pt-PT')}</td>
                    <td className="px-4 py-3 font-mono text-text2">
                      {round.closedAt ? new Date(round.closedAt).toLocaleString('pt-PT') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          !transactions.length ? (
            <div className="p-10 text-center font-mono text-xs text-text2">
              Sem transacções registadas. Depósitos e saques aparecem aqui.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-border1">
                <tr>
                  {['Tipo', 'Valor', 'Taxa', 'Líquido', 'Rede', 'Estado', 'Data'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1">
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 font-mono font-bold text-text1">{tx.type}</td>
                    <td className="px-4 py-3 font-mono text-text2">{formatMoney(tx.amount)}</td>
                    <td className="px-4 py-3 font-mono text-text2">{formatMoney(tx.fee)}</td>
                    <td className="px-4 py-3 font-mono text-cyan">{formatMoney(tx.netAmount)}</td>
                    <td className="px-4 py-3 font-mono text-text2">{tx.network ?? '—'}</td>
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
