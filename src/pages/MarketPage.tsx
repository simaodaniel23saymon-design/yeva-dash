/**
 * Página Mercado — Market Radar (fora do dashboard principal).
 */

import { MarketRadarSection } from '../components/dashboard/MarketRadarSection';
import { MarketIndicatorsBlock } from '../components/dashboard/MarketIndicatorsBlock';
import { useDashboardExtended } from '../hooks/useDashboardExtended';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MarketPage() {
  const navigate = useNavigate();
  const { data, loading } = useDashboardExtended(true, '24h', 30_000);
  const symbols = useMemo(
    () => Object.keys(data.marketIndicators || {}).sort(),
    [data.marketIndicators]
  );

  return (
    <div className="space-y-12 mb-12">
      <div>
        <h2 className="text-text1 font-bold text-[28px] leading-tight">Mercado</h2>
        <p className="text-text2 text-lg mt-2">
          Radar e indicadores — fora do painel principal.
        </p>
      </div>

      <MarketRadarSection
        onSelectSymbol={(sym) => {
          navigate(`/operations/manual?symbol=${encodeURIComponent(sym)}`);
        }}
      />

      {loading && !data.generatedAt ? (
        <p className="font-mono text-[12px] text-text3">A carregar indicadores…</p>
      ) : (
        <MarketIndicatorsBlock
          indicators={data.marketIndicators}
          mlPrediction={data.mlPrediction}
          symbols={symbols}
        />
      )}
    </div>
  );
}
