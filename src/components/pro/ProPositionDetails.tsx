import type { Position } from '../../types/trading';
import { parseNum } from '../../utils/liveData';

interface Props {
  position: Position;
  pnl: number;
}

/** Detalhes reais da posição Binance — sem estimativas locais */
export function ProPositionDetails({ position, pnl }: Props) {
  const side = String(position.positionSide ?? '').toUpperCase();
  const entry = parseNum(position.entryPrice);
  const mark = parseNum(position.markPrice);
  const qty = position.positionAmt ?? '—';

  return (
    <div className="mt-3 pt-3 border-t border-border1 space-y-2 font-mono text-[10px] text-text2">
      <div className="grid grid-cols-2 gap-2">
        <span>Lado: <span className="text-text1">{side || '—'}</span></span>
        <span>Qtd: <span className="text-text1">{qty}</span></span>
        {entry > 0 && (
          <span>Entrada: <span className="text-text1">${entry.toFixed(4)}</span></span>
        )}
        {mark > 0 && (
          <span>Marca: <span className="text-text1">${mark.toFixed(4)}</span></span>
        )}
        <span>P&L: <span className={pnl >= 0 ? 'text-cyan' : 'text-red'}>${pnl.toFixed(2)}</span></span>
      </div>
    </div>
  );
}
