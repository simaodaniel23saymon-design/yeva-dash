import { useDailyPnl } from '../hooks/useDailyPnl';
import { IconTrendUp, IconTrendDown, IconActivity } from './ui/Icons';

interface Props {
  compact?: boolean;
}

function fmt(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function DailyPnlPanel({ compact = false }: Props) {
  const { profit, loss, net, loading } = useDailyPnl(30000);

  if (loading) {
    return (
      <div className={`bg-bg1 border border-border1 ${compact ? 'p-3' : 'p-4'} animate-pulse`}>
        <div className="h-4 bg-bg3 rounded w-1/3 mb-2" />
        <div className="h-8 bg-bg3 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className={`bg-bg1 border border-border1 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-cyan ${compact ? '' : 'w-7 h-7 flex items-center justify-center bg-cyan-dim border border-cyan-20'}`}>
            <IconActivity size={compact ? 14 : 16} />
          </span>
          <h3 className={`font-mono uppercase tracking-wider text-text2 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
            Resultado de hoje
          </h3>
        </div>
        <span className="font-mono text-[10px] text-text3">
          {new Date().toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg2 border border-cyan-20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <IconTrendUp size={12} className="text-cyan" />
            <p className="font-mono text-[9px] uppercase text-text3">Lucro</p>
          </div>
          <p className={`font-bold ${compact ? 'text-base' : 'text-lg'} text-cyan`}>{fmt(profit)}</p>
        </div>
        <div className="bg-bg2 border border-red-30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <IconTrendDown size={12} className="text-red" />
            <p className="font-mono text-[9px] uppercase text-text3">Perda</p>
          </div>
          <p className={`font-bold ${compact ? 'text-base' : 'text-lg'} text-red`}>{fmt(loss)}</p>
        </div>
        <div className={`bg-bg2 border p-3 ${net >= 0 ? 'border-cyan-20' : 'border-red-30'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {net >= 0
              ? <IconTrendUp size={12} className="text-cyan" />
              : <IconTrendDown size={12} className="text-red" />}
            <p className="font-mono text-[9px] uppercase text-text3">Líquido</p>
          </div>
          <p className={`font-bold ${compact ? 'text-base' : 'text-lg'} ${net >= 0 ? 'text-cyan' : 'text-red'}`}>
            {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}
          </p>
        </div>
      </div>
    </div>
  );
}
