import type { MarketAnalysis } from '../../types/trading';

interface Props {
  analysis: Pick<MarketAnalysis, 'timeframes' | 'confirmed'>;
  compact?: boolean;
}

function TfRow({ label, dir }: { label: string; dir: 'UP' | 'DOWN' }) {
  const up = dir === 'UP';
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-[10px]">
      <span className="text-text3 w-6">{label}</span>
      <span className={up ? 'text-pro-green' : 'text-pro-red'}>
        {up ? '📈 UP' : '📉 DOWN'}
      </span>
    </div>
  );
}

export function MultiTimeframeChart({ analysis, compact = false }: Props) {
  return (
    <div className={`${compact ? 'space-y-1' : 'bg-bg2 border border-border1 p-3 space-y-2'}`}>
      {!compact && (
        <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1">Multi-Timeframe</p>
      )}
      <TfRow label="1h" dir={analysis.timeframes.h1} />
      <TfRow label="4h" dir={analysis.timeframes.h4} />
      <TfRow label="1d" dir={analysis.timeframes.d1} />
      <div className={`flex items-center gap-2 pt-1 border-t border-border1 font-mono ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        <span className="text-text3">Confirmação:</span>
        <span className={analysis.confirmed ? 'text-pro-green' : 'text-pro-red'}>
          {analysis.confirmed ? '✅ SIM' : '❌ NÃO'}
        </span>
      </div>
    </div>
  );
}
