import type { MarketAnalysis } from '../../types/trading';
import { formatLiquidity } from '../../utils/proTrading';
import { MultiTimeframeChart } from './MultiTimeframeChart';

interface Props {
  analysis: MarketAnalysis;
}

export function MarketStatusCard({ analysis }: Props) {
  const trending = analysis.status === 'trending';
  const liqOk = analysis.liquidity24h >= 500_000;

  return (
    <div className="bg-bg1 border border-border1 p-4 space-y-3 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-text1 text-base">{analysis.pair}</h3>
          <p className={`font-mono text-[11px] mt-1 ${trending ? 'text-pro-green' : 'text-pro-yellow'}`}>
            {trending ? '📈 Tendência' : '⏸️ Lateralizado'}
          </p>
        </div>
        <span className={`font-mono text-[10px] px-2 py-1 border ${liqOk ? 'border-pro-green/40 text-pro-green bg-pro-green/10' : 'border-pro-red/40 text-pro-red bg-pro-red/10'}`}>
          💧 {formatLiquidity(analysis.liquidity24h)}
        </span>
      </div>

      <MultiTimeframeChart analysis={analysis} />

      <div className="grid grid-cols-3 gap-2 font-mono text-[9px]">
        <div className="bg-bg2 border border-border1 p-2">
          <p className="text-text3 uppercase mb-0.5">ADX</p>
          <p className="text-text1 font-bold">{analysis.adx.toFixed(1)}</p>
        </div>
        <div className="bg-bg2 border border-border1 p-2">
          <p className="text-text3 uppercase mb-0.5">Slope</p>
          <p className="text-text1 font-bold">{analysis.slope.toFixed(3)}</p>
        </div>
        <div className="bg-bg2 border border-border1 p-2">
          <p className="text-text3 uppercase mb-0.5">Força</p>
          <p className="text-text1 font-bold">{analysis.trendStrength}%</p>
        </div>
      </div>
    </div>
  );
}
