import { useEffect, useState } from 'react';
import { YevaTradeLoader } from './YevaTradeLoader';
import { api } from '../lib/api';

interface OpenOrder {
  orderId: string | number;
  symbol: string;
  side: string;
  type: string;
  origQty: string | number;
  price: string | number;
}

interface OpenPosition {
  symbol: string;
  positionAmt: string | number;
  entryPrice: string | number;
  markPrice: string | number;
  unRealizedProfit: string | number;
}

interface LiveOrdersProps {
  botId: string;
  active?: boolean;
}

const thClass = 'px-3 py-2 text-left font-mono text-[8px] uppercase tracking-wider text-text3';
const tdClass = 'px-3 py-2.5 font-mono text-[10px] text-text1';

export function LiveOrders({ botId, active = true }: LiveOrdersProps) {
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }

    let alive = true;

    const fetchData = async () => {
      try {
        const [o, p] = await Promise.all([
          api.get<{ orders?: OpenOrder[] }>(`/bots/${botId}/orders`),
          api.get<{ positions?: OpenPosition[] }>(`/bots/${botId}/positions`),
        ]);
        if (!alive) return;
        setOrders(o.data.orders ?? []);
        setPositions(p.data.positions ?? []);
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => { alive = false; clearInterval(interval); };
  }, [botId, active]);

  if (!active) {
    return (
      <p className="font-mono text-[9px] text-text3 mt-3 pt-3 border-t border-border1">
        Ordens e posições aparecem quando o bot está a operar.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-border1 flex items-center gap-2 font-mono text-[9px] text-text3">
        <YevaTradeLoader size="xs" />
        A carregar ordens e posições...
      </div>
    );
  }

  if (failed) {
    return (
      <p className="font-mono text-[9px] text-text3 mt-3 pt-3 border-t border-border1">
        Dados em tempo real indisponíveis (verifica a API da exchange).
      </p>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border1 space-y-4">
      <div>
        <h4 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-2">
          Ordens abertas ({orders.length})
        </h4>
        {orders.length === 0 ? (
          <p className="font-mono text-[9px] text-text3">Sem ordens abertas.</p>
        ) : (
          <div className="scroll-area-x border border-border1">
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-border1 bg-bg2">
                <tr>
                  {['Par', 'Lado', 'Tipo', 'Qtd', 'Preço'].map(h => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1">
                {orders.map(o => (
                  <tr key={String(o.orderId)} className="hover:bg-bg2">
                    <td className={tdClass}>{o.symbol}</td>
                    <td className={`${tdClass} ${o.side === 'BUY' ? 'text-cyan' : 'text-red'}`}>{o.side}</td>
                    <td className={`${tdClass} text-text2`}>{o.type}</td>
                    <td className={tdClass}>{o.origQty}</td>
                    <td className={tdClass}>{o.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-2">
          Posições ({positions.length})
        </h4>
        {positions.length === 0 ? (
          <p className="font-mono text-[9px] text-text3">Sem posições abertas.</p>
        ) : (
          <div className="scroll-area-x border border-border1">
            <table className="w-full min-w-[520px]">
              <thead className="border-b border-border1 bg-bg2">
                <tr>
                  {['Par', 'Qtd', 'Entrada', 'Actual', 'P&L'].map(h => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1">
                {positions.map(p => {
                  const pnl = parseFloat(String(p.unRealizedProfit ?? 0));
                  return (
                    <tr key={p.symbol} className="hover:bg-bg2">
                      <td className={tdClass}>{p.symbol}</td>
                      <td className={tdClass}>{p.positionAmt}</td>
                      <td className={tdClass}>{p.entryPrice}</td>
                      <td className={tdClass}>{p.markPrice}</td>
                      <td className={`${tdClass} font-bold ${pnl >= 0 ? 'text-cyan' : 'text-red'}`}>
                        {p.unRealizedProfit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
