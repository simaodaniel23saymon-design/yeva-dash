/**
 * Feed de acções do módulo + PnL dia/total.
 */

import type { AutoOpsFeedEvent } from '../../types/autoOps';

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
                className="px-3 py-2 font-mono text-[10px] text-text2"
              >
                {e.line ||
                  `[${new Date(e.at).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}] ${e.side} ${e.symbol} @ ${e.price}`}
                {e.pnl != null && (
                  <span
                    className={`ml-2 ${e.pnl >= 0 ? 'text-cyan' : 'text-red'}`}
                  >
                    PnL ${e.pnl.toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
