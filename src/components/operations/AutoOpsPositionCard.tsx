/**
 * Cartão de posição auto — transparência total.
 */

import { fmtAge } from '../../hooks/useAutoOps';
import type { AutoOpsOpen } from '../../types/autoOps';

function px(n: number | null | undefined, digits = 4): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(4);
  return n.toFixed(digits);
}

export function AutoOpsPositionCard({
  open,
  emptyLabel = 'Sem posição auto',
}: {
  open: AutoOpsOpen | null;
  emptyLabel?: string;
}) {
  if (!open) {
    return (
      <div className="border border-border2 p-3 font-mono text-[10px] text-text3">
        {emptyLabel}
      </div>
    );
  }

  const u = open.unrealizedPnl;
  return (
    <div className="border border-cyan-30 bg-cyan-dim/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-wider text-cyan">
          Posição auto
        </h4>
        <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text2">
          {open.mode || 'PAPER'}
          {open.manual ? ' · manual' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px] text-text2">
        <span>
          Par: <span className="text-text1 font-semibold">{open.symbol}</span>
        </span>
        <span>
          Lado: <span className="text-text1">{open.side}</span>
        </span>
        <span>
          Qtd: <span className="text-text1">{px(open.quantity, 6)}</span>
        </span>
        <span>
          Entrada: <span className="text-text1">${px(open.entryPrice)}</span>
        </span>
        <span>
          Alocado:{' '}
          <span className="text-text1">
            ${px(open.allocatedUsdt ?? open.entryPrice * open.quantity, 2)}
          </span>
        </span>
        <span>
          Margem:{' '}
          <span className="text-text1">${px(open.marginUsdt, 2)}</span>
        </span>
        <span>
          TP: <span className="text-text1">${px(open.tpPrice)}</span>
        </span>
        <span>
          SL: <span className="text-text1">${px(open.slPrice)}</span>
        </span>
        <span>
          Idade: <span className="text-text1">{fmtAge(open.ageMs)}</span>
        </span>
        <span className="col-span-2 sm:col-span-3">
          uPnL:{' '}
          <span
            className={
              u == null ? 'text-text3' : u >= 0 ? 'text-cyan font-bold' : 'text-red font-bold'
            }
          >
            {u == null ? '—' : `$${u.toFixed(2)}`}
          </span>
        </span>
      </div>
    </div>
  );
}
