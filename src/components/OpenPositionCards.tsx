import {
  formatAge,
  formatLevelTitle,
  formatPriceLabel,
  isBreakevenSl,
  type PositionOverlay,
} from '../utils/chartOverlays';

interface Props {
  positions: PositionOverlay[];
  selectedSymbol?: string;
  onSelect?: (symbol: string) => void;
}

export function OpenPositionCards({ positions, selectedSymbol, onSelect }: Props) {
  if (!positions.length) return null;

  return (
    <div className="bg-bg1 border border-border1 p-4 space-y-3">
      <h3 className="text-sm font-bold text-text1">Posições abertas ({positions.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {positions.map((pos, idx) => {
          const be = pos.slIsBe ?? isBreakevenSl(pos.side, pos.entry, pos.sl);
          const active =
            selectedSymbol &&
            pos.symbol.toUpperCase() === selectedSymbol.toUpperCase();
          const pnl = pos.uPnl ?? 0;
          return (
            <button
              key={`${pos.symbol}-${pos.side}-${idx}`}
              type="button"
              onClick={() => onSelect?.(pos.symbol)}
              className={`text-left bg-bg2 border p-4 transition-colors ${
                active ? 'border-cyan-30' : 'border-border1 hover:border-cyan-30'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-text1 font-mono text-sm">
                  {pos.symbol}{' '}
                  <span className="text-text3 text-[10px]">{pos.side}</span>
                </span>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 border ${
                    pnl >= 0 ? 'border-cyan-30 text-cyan' : 'border-red-30 text-red'
                  }`}
                >
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-text2">
                <span>
                  Qty: <span className="text-text1">{formatPriceLabel(pos.qty)}</span>
                </span>
                <span>
                  Idade: <span className="text-text1">{formatAge(pos.ageMs)}</span>
                </span>
                <span className="text-gold col-span-2">
                  {formatLevelTitle('ENTRY', pos.entry)}
                </span>
                {pos.tp != null && pos.tp > 0 && (
                  <span className="text-cyan col-span-2">{formatLevelTitle('TP', pos.tp)}</span>
                )}
                {pos.sl != null && pos.sl > 0 && (
                  <span className="text-red col-span-2">
                    {formatLevelTitle('SL', pos.sl, { be })}
                  </span>
                )}
                {pos.maxSafetyOrders != null && (
                  <span className="col-span-2">
                    Safeties:{' '}
                    <span className="text-text1">
                      {pos.safetyFilled ?? 0}/{pos.maxSafetyOrders}
                    </span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
