import { Link } from 'react-router-dom';
import { YevaTradeLoader } from '../components/YevaTradeLoader';
import { QuickGuide } from '../components/QuickGuide';
import { GridVisual } from '../components/pro/GridVisual';
import { ProStrategyCardsDefaults } from '../components/pro/ProStrategyCards';
import { useProTrading } from '../hooks/useProTrading';
import { formatLiquidity } from '../utils/proTrading';
import { DEFAULT_PRO_CONFIG } from '../types/trading';

function StatBlock({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`bg-bg1 border p-4 ${accent ?? 'border-border1'}`}>
      <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-2">{label}</p>
      <p className="font-bold text-text1 text-lg">{value}</p>
      {sub && <p className="font-mono text-[9px] text-text3 mt-1">{sub}</p>}
    </div>
  );
}

export default function BotStatsPage() {
  const { botStats, loading } = useProTrading();

  const stats = botStats ?? {
    gridLongUsed: 0,
    gridLongMax: DEFAULT_PRO_CONFIG.maxLongPositions,
    gridShortUsed: 0,
    gridShortMax: DEFAULT_PRO_CONFIG.maxShortPositions,
    trailingActivations: 0,
    trailingProtected: 0,
    mtfSignalsConfirmed: 0,
    mtfAccuracyPct: 0,
    liquidityPairsIgnored: 0,
    liquidityAvgVolume: DEFAULT_PRO_CONFIG.minLiquidity,
  };

  return (
    <div className="space-y-4">
      <QuickGuide title="Estatísticas PRO" steps={[
        'Grid: entradas long e short utilizadas',
        'Trailing stop: activações e lucro protegido',
        'Multi-timeframe e filtro de liquidez',
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-text1 font-bold text-lg">Estatísticas do Bot</h2>
          <p className="font-mono text-[10px] text-text2 uppercase tracking-wider mt-0.5">
            Métricas da estratégia PRO
          </p>
        </div>
        <Link to="/market-analysis"
          className="font-mono text-[9px] uppercase px-4 py-2 border border-border2 text-text2 hover:border-cyan hover:text-cyan">
          Análise de Mercado
        </Link>
      </div>

      <ProStrategyCardsDefaults />

      {loading ? (
        <div className="flex justify-center py-12">
          <YevaTradeLoader size="md" />
        </div>
      ) : (
        <>
          <GridVisual
            longUsed={stats.gridLongUsed}
            longMax={stats.gridLongMax}
            shortUsed={stats.gridShortUsed}
            shortMax={stats.gridShortMax}
            spacing={DEFAULT_PRO_CONFIG.gridSpacing}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatBlock
              label="Grid Utilizado"
              value={`${stats.gridLongUsed}/${stats.gridLongMax} Long | ${stats.gridShortUsed}/${stats.gridShortMax} Short`}
              accent="border-cyan-20"
            />
            <StatBlock
              label="Trailing Stop"
              value={`${stats.trailingActivations} activações`}
              sub={`$${stats.trailingProtected.toFixed(2)} protegidos`}
              accent="border-pro-blue/30"
            />
            <StatBlock
              label="Multi-Timeframe"
              value={`${stats.mtfSignalsConfirmed} sinais confirmados`}
              sub={`${stats.mtfAccuracyPct.toFixed(1)}% acerto`}
              accent="border-gold-30"
            />
            <StatBlock
              label="Filtro Liquidez"
              value={`${stats.liquidityPairsIgnored} pares ignorados`}
              sub={`Média: ${formatLiquidity(stats.liquidityAvgVolume)}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
