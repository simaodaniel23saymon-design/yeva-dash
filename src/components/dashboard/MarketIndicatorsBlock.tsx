/**
 * Indicadores de mercado (página Mercado).
 */

import { useEffect, useState } from 'react';
import type { MarketIndicator, MlPrediction } from '../../hooks/useDashboardExtended';

function fmtFunding(f: number): string {
  return `${(f * 100).toFixed(4)}%`;
}

export function MarketIndicatorsBlock({
  indicators,
  mlPrediction,
  symbols,
}: {
  indicators: Record<string, MarketIndicator>;
  mlPrediction?: Record<string, MlPrediction>;
  symbols: string[];
}) {
  const [sym, setSym] = useState(symbols[0] || '');
  useEffect(() => {
    if (symbols.length && !symbols.includes(sym)) setSym(symbols[0]);
  }, [symbols, sym]);

  const ind = indicators[sym];
  const ml = mlPrediction?.[sym];

  if (!symbols.length) {
    return (
      <div className="bg-bg1 border border-border1 p-6">
        <h3 className="text-text1 font-bold text-base mb-2">Indicadores</h3>
        <p className="text-text2 text-lg">Sem pares para analisar.</p>
      </div>
    );
  }

  return (
    <div className="bg-bg1 border border-border1 p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-text1 font-bold text-base">Indicadores de Mercado</h3>
        <select
          value={sym}
          onChange={(e) => setSym(e.target.value)}
          className="font-mono text-[12px] uppercase bg-bg2 border border-border2 text-text1 px-3 py-2"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {ind && (
        <p className="text-text2 text-lg">
          {ind.gridReason}
          {ind.gridGate === 'OFF' ? ' · tendência' : ' · grid elegível'}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="border border-border1 bg-bg2 p-4">
          <p className="text-base text-text2 mb-1">ADX (14)</p>
          <p className="font-bold text-text1 text-[28px]">{ind?.adx?.toFixed(1) ?? '—'}</p>
        </div>
        <div className="border border-border1 bg-bg2 p-4">
          <p className="text-base text-text2 mb-1">Funding</p>
          <p
            className={`font-bold text-[28px] ${(ind?.funding ?? 0) <= 0 ? 'text-cyan' : 'text-red'}`}
          >
            {ind ? fmtFunding(ind.funding) : '—'}
          </p>
        </div>
        <div className="border border-border1 bg-bg2 p-4">
          <p className="text-base text-text2 mb-1">Open Interest</p>
          <p
            className={`font-bold text-[28px] ${(ind?.oiChange ?? 0) >= 0 ? 'text-cyan' : 'text-red'}`}
          >
            {ind
              ? `${ind.oiChange >= 0 ? '↑' : '↓'} ${Math.abs(ind.oiChange).toFixed(2)}%`
              : '—'}
          </p>
        </div>
        <div className="border border-border1 bg-bg2 p-4">
          <p className="text-base text-text2 mb-1">ATR %</p>
          <p className="font-bold text-text1 text-[28px]">
            {ind ? `${ind.atrPct.toFixed(2)}%` : '—'}
          </p>
        </div>
      </div>
      {ml && (
        <div className="border border-border2 p-4">
          <p className="text-base text-text2 mb-1">ML-1 · {ml.regime}</p>
          <p className="text-lg text-text1">{ml.recommendedAction}</p>
        </div>
      )}
    </div>
  );
}
