import { formatPairLabel } from '../utils/chartData';

interface Props {
  pairs: string[];
  selected: string;
  onChange: (symbol: string) => void;
  autoSymbol?: string;
  onFollowAuto?: () => void;
}

export function ChartPairPicker({
  pairs,
  selected,
  onChange,
  autoSymbol,
  onFollowAuto,
}: Props) {
  const showAuto = autoSymbol && selected !== autoSymbol && onFollowAuto;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-wider text-text3">
          Par activo
        </p>
        {showAuto && (
          <button
            type="button"
            onClick={onFollowAuto}
            className="font-mono text-[9px] uppercase text-cyan hover:underline shrink-0"
          >
            Seguir {formatPairLabel(autoSymbol)}
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory touch-pan-x">
        {pairs.map(pair => {
          const active = pair === selected;
          return (
            <button
              key={pair}
              type="button"
              onClick={() => onChange(pair)}
              className={`snap-start shrink-0 font-mono text-[11px] uppercase px-4 py-2.5 border transition-colors min-w-[72px] ${
                active
                  ? 'border-cyan bg-cyan-dim text-cyan font-bold'
                  : 'border-border2 bg-bg2 text-text2 hover:border-cyan-30 hover:text-text1'
              }`}
            >
              {formatPairLabel(pair)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
