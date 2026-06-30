import { Link } from 'react-router-dom';
import { YevaTradeLoader } from '../components/YevaTradeLoader';
import { QuickGuide } from '../components/QuickGuide';
import { GridVisual } from '../components/pro/GridVisual';
import { ProStrategyCardsLive } from '../components/pro/ProStrategyCards';
import { useActiveBotConfig } from '../hooks/useActiveBotConfig';
import { useProTrading } from '../hooks/useProTrading';
import { formatLiquidity } from '../utils/proTrading';

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
  const { botStats, loading: proLoading } = useProTrading();
  const { bot, longCount, shortCount, loading: botLoading } = useActiveBotConfig();

  const orders = bot?.ordersPerSide ?? 0;
  const spacing = bot?.spacing;

  const stats = {
    gridLongUsed: botStats?.gridLongUsed || longCount,
    gridLongMax: botStats?.gridLongMax || orders,
    gridShortUsed: botStats?.gridShortUsed || shortCount,
    gridShortMax: botStats?.gridShortMax || orders,
    trailingActivations: botStats?.trailingActivations ?? 0,
    trailingProtected: botStats?.trailingProtected ?? 0,
    mtfSignalsConfirmed: botStats?.mtfSignalsConfirmed ?? 0,
    mtfAccuracyPct: botStats?.mtfAccuracyPct ?? 0,
    liquidityPairsIgnored: botStats?.liquidityPairsIgnored ?? 0,
    liquidityAvgVolume: botStats?.liquidityAvgVolume ?? 0,
  };

  const loading = proLoading || botLoading;
  const hasGrid = stats.gridLongMax > 0 || stats.gridShortMax > 0 || longCount > 0 || shortCount > 0;
  const hasProMetrics =
    stats.trailingActivations > 0
    || stats.mtfSignalsConfirmed > 0
    || stats.liquidityPairsIgnored > 0;

  return (
    <div className="space-y-4">
      <QuickGuide title="Estatísticas PRO" steps={[
        'Grid: entradas long e short utilizadas (dados reais)',
        'Trailing stop e multi-timeframe quando a API reportar',
        'Posições contadas a partir da Binance',
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

      <ProStrategyCardsLive />

      {loading ? (
        <div className="flex justify-center py-12">
          <YevaTradeLoader size="md" />
        </div>
      ) : !hasGrid && !hasProMetrics ? (
        <div className="bg-bg1 border border-border1 p-8 text-center font-mono text-[11px] text-text2">
          Sem estatísticas PRO disponíveis — activa um bot ou aguarda dados da API.
        </div>
      ) : (
        <>
          {hasGrid && spacing != null && (
            <GridVisual
              longUsed={stats.gridLongUsed}
              longMax={stats.gridLongMax || 1}
              shortUsed={stats.gridShortUsed}
              shortMax={stats.gridShortMax || 1}
              spacing={spacing}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hasGrid && (
              <StatBlock
                label="Grid Utilizado"
                value={`${stats.gridLongUsed}/${stats.gridLongMax || '—'} Long | ${stats.gridShortUsed}/${stats.gridShortMax || '—'} Short`}
                accent="border-cyan-20"
              />
            )}
            {stats.trailingActivations > 0 && (
              <StatBlock
                label="Trailing Stop"
                value={`${stats.trailingActivations} activações`}
                sub={`$${stats.trailingProtected.toFixed(2)} protegidos`}
                accent="border-pro-blue/30"
              />
            )}
            {stats.mtfSignalsConfirmed > 0 && (
              <StatBlock
                label="Multi-Timeframe"
                value={`${stats.mtfSignalsConfirmed} sinais confirmados`}
                sub={`${stats.mtfAccuracyPct.toFixed(1)}% acerto`}
                accent="border-gold-30"
              />
            )}
            {stats.liquidityPairsIgnored > 0 && (
              <StatBlock
                label="Filtro Liquidez"
                value={`${stats.liquidityPairsIgnored} pares ignorados`}
                sub={stats.liquidityAvgVolume > 0 ? `Média: ${formatLiquidity(stats.liquidityAvgVolume)}` : undefined}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
