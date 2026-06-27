import type { Position } from '../../types/trading';
import { TrailingStopIndicator } from './TrailingStopIndicator';

interface Props {
  position: Position;
  pnl: number;
}

export function ProPositionDetails({ position, pnl }: Props) {
  const side = String(position.positionSide ?? '').toUpperCase();
  const isLong = side.includes('LONG') || side === 'BUY';
  const gridPos = position.gridPosition ?? 1;
  const gridMax = position.gridMax ?? 15;
  const trend = position.marketTrend ?? (isLong ? 'UP' : 'DOWN');

  return (
    <div className="mt-3 pt-3 border-t border-border1 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[9px] uppercase px-2 py-1 border border-border2 text-text2">
          Entrada #{gridPos}/{gridMax}
        </span>
        <span className={`font-mono text-[9px] uppercase px-2 py-1 border ${trend === 'UP' ? 'border-pro-green/40 text-pro-green' : 'border-pro-red/40 text-pro-red'}`}>
          Tendência {trend === 'UP' ? 'ALTA' : 'BAIXA'}
        </span>
      </div>
      <TrailingStopIndicator
        compact
        active={position.trailingStopActive}
        protectedProfit={position.trailingStopProfit}
      />
      {position.trailingStopActive && (position.trailingStopProfit ?? 0) > 0 && (
        <p className="font-mono text-[9px] text-pro-blue">
          Lucro protegido: ${Number(position.trailingStopProfit).toFixed(2)}
        </p>
      )}
      {pnl < 0 && (
        <p className="font-mono text-[9px] text-pro-yellow">
          Monitorização activa — mercado lateralizado pode fechar posição contra tendência
        </p>
      )}
    </div>
  );
}
