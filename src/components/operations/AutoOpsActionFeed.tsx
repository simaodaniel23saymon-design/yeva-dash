/**
 * Feed de acções do módulo + PnL dia/total.
 */

import type { AutoOpsFeedEvent } from '../../types/autoOps';

function actionLabel(a: AutoOpsFeedEvent['action']): string {
  if (a === 'entrada') return 'Entrada';
  if (a === 'saida') return 'Saída';
  if (a === 'cancel') return 'Cancelamento';
  if (a === 'parcial') return 'Parcial';
  return a;
}

export function AutoOpsActionFeed({
  events,
  modulePnl,
  modulePnlDay,
}: {
  events: AutoOpsFeedEvent[];
  modulePnl: number;
  modulePnlDay?: number;
}) {
  const day = modulePnlDay ?? 0;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 font-mono text-[10px]">
        <span className="text-text3 uppercase tracking-wider">PnL módulo</span>
        <span className={day >= 0 ? 'text-cyan' : 'text-red'}>
          Dia ${day.toFixed(2)}
        </span>
        <span className={modulePnl >= 0 ? 'text-cyan' : 'text-red'}>
          Total ${modulePnl.toFixed(2)}
        </span>
      </div>
      <div className="border border-border2 max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <p className="p-3 font-mono text-[10px] text-text3">Sem acções ainda</p>
        ) : (
          <ul className="divide-y divide-border1">
            {events.map((e) => (
              <li
                key={e.id}
                className="px-3 py-2 font-mono text-[10px] flex flex-wrap gap-x-3 gap-y-1 text-text2"
              >
                <span className="text-text3">
                  {new Date(e.at).toLocaleString('pt-PT')}
                </span>
                <span className="text-text1 uppercase">{actionLabel(e.action)}</span>
                <span>
                  {e.side} {e.symbol.replace(/USDT$/, '')}
                </span>
                <span>
                  qty {e.qty > 0 ? e.qty.toPrecision(4) : '—'} @ $
                  {e.price >= 100 ? e.price.toFixed(2) : e.price.toFixed(4)}
                </span>
                {e.pnl != null && (
                  <span className={e.pnl >= 0 ? 'text-cyan' : 'text-red'}>
                    PnL ${e.pnl.toFixed(2)}
                  </span>
                )}
                {e.reason && (
                  <span className="text-text3">{e.reason}</span>
                )}
                <span className="text-text3">{e.mode}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
