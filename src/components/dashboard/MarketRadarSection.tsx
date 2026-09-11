import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

export type RadarRow = {
  symbol: string;
  price: number;
  change24hPct: number;
  quoteVolume24h: number;
  volumeRatio7d: number;
  atrPct: number;
  adx1h: number;
  fundingPct: number;
  regime: 'UP' | 'DOWN' | 'RANGE' | string;
  bias: 'LONG' | 'SHORT' | 'NONE' | string;
};

function regimeClass(r: string): string {
  if (r === 'UP') return 'border-cyan-30 text-cyan';
  if (r === 'DOWN') return 'border-red-30 text-red';
  return 'border-border2 text-text3';
}

function biasClass(b: string): string {
  if (b === 'LONG') return 'border-cyan-30 text-cyan';
  if (b === 'SHORT') return 'border-red-30 text-red';
  return 'border-border2 text-text3';
}

function fmtVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function MarketRadarSection({
  onSelectSymbol,
}: {
  onSelectSymbol?: (symbol: string) => void;
}) {
  const [rows, setRows] = useState<RadarRow[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<{
        scannedAt: string | null;
        stale: boolean;
        movers: RadarRow[];
      }>('/market/radar');
      setRows(data.movers || []);
      setScannedAt(data.scannedAt);
      setStale(!!data.stale);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Radar indisponível');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div className="bg-bg1 border border-border1 p-4 space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-bold text-text1">Market Radar</h3>
        <span className="font-mono text-[9px] text-text3 tracking-wider uppercase">
          {loading
            ? 'a carregar…'
            : scannedAt
              ? `${stale ? 'stale · ' : ''}${new Date(scannedAt).toLocaleString('pt-PT')}`
              : 'sem scan'}
        </span>
      </div>
      {error && (
        <p className="font-mono text-[10px] text-red border border-red-30 bg-red-dim px-2 py-1.5">
          {error}
        </p>
      )}
      {!loading && !rows.length && !error && (
        <p className="font-mono text-[10px] text-text2">
          Aguardando primeiro scan (até 30 min)…
        </p>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[10px]">
            <thead>
              <tr className="text-text3 border-b border-border2">
                <th className="py-1.5 pr-2 font-medium">Par</th>
                <th className="py-1.5 pr-2 font-medium">24h</th>
                <th className="py-1.5 pr-2 font-medium">Volume</th>
                <th className="py-1.5 pr-2 font-medium">ATR%</th>
                <th className="py-1.5 pr-2 font-medium">Regime</th>
                <th className="py-1.5 pr-2 font-medium">Funding</th>
                <th className="py-1.5 font-medium">Bias</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r) => (
                <tr
                  key={r.symbol}
                  className={`border-b border-border1/60 ${
                    onSelectSymbol
                      ? 'cursor-pointer hover:bg-bg2/80'
                      : ''
                  }`}
                  onClick={() => onSelectSymbol?.(r.symbol)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectSymbol?.(r.symbol);
                  }}
                  tabIndex={onSelectSymbol ? 0 : undefined}
                  role={onSelectSymbol ? 'button' : undefined}
                >
                  <td className="py-2 pr-2 text-text1 font-semibold">{r.symbol}</td>
                  <td
                    className={`py-2 pr-2 ${
                      r.change24hPct >= 0 ? 'text-cyan' : 'text-red'
                    }`}
                  >
                    {r.change24hPct >= 0 ? '+' : ''}
                    {r.change24hPct.toFixed(2)}%
                  </td>
                  <td className="py-2 pr-2 text-text2">
                    {fmtVol(r.quoteVolume24h)}
                    <span className="text-text3 ml-1">
                      ({r.volumeRatio7d.toFixed(1)}x)
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-text2">{r.atrPct.toFixed(2)}%</td>
                  <td className="py-2 pr-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 border uppercase tracking-wider ${regimeClass(
                        r.regime
                      )}`}
                    >
                      {r.regime}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-text2">
                    {r.fundingPct.toFixed(4)}%
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 border uppercase tracking-wider ${biasClass(
                        r.bias
                      )}`}
                    >
                      {r.bias}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
