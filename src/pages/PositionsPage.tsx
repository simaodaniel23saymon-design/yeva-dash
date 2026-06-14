import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Position {
  id: string;
  pair: string;
  market: string;
  accountType: 'REAL' | 'DEMO';
  botStatus: string;
  side: string;
  price: number;
  size: number;
  status: string;
  pnl: number;
  createdAt: string;
}

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Position[]>('/positions').then(res => setPositions(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-32 flex justify-center"><div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-text1 font-bold text-lg">Operações</h2>
        <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">Ordens abertas e pendentes</p>
      </div>
      <div className="bg-bg1 border border-border1 overflow-x-auto">
        {!positions.length ? (
          <div className="p-10 text-center font-mono text-xs text-text2">Sem operações abertas.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="border-b border-border1">
              <tr>
                {['Par', 'Conta', 'Lado', 'Preço', 'Tamanho', 'Estado', 'P&L', 'Data'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border1">
              {positions.map(pos => (
                <tr key={pos.id} className="hover:bg-bg2">
                  <td className="px-4 py-3 font-mono font-bold text-text1">{pos.pair}</td>
                  <td className="px-4 py-3 font-mono text-text2">{pos.accountType}</td>
                  <td className="px-4 py-3 font-mono text-cyan">{pos.side}</td>
                  <td className="px-4 py-3 font-mono text-text2">{money(pos.price)}</td>
                  <td className="px-4 py-3 font-mono text-text2">{pos.size}</td>
                  <td className="px-4 py-3 font-mono text-text2">{pos.status}</td>
                  <td className={`px-4 py-3 font-mono font-bold ${pos.pnl >= 0 ? 'text-cyan' : 'text-red'}`}>{money(pos.pnl)}</td>
                  <td className="px-4 py-3 font-mono text-text2">{new Date(pos.createdAt).toLocaleString('pt-PT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
