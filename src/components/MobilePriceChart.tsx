import { useCallback, useEffect, useMemo, useState } from 'react';
import { YevaTradeLoader } from './YevaTradeLoader';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchBinanceKlines,
  fetchBinanceTicker,
  formatPairLabel,
  type KlinePoint,
  type TickerSnapshot,
} from '../utils/chartData';

interface Props {
  symbol: string;
  height?: number;
  interval?: string;
}

function formatAxisTime(ts: number): string {
  return new Date(ts).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

export function MobilePriceChart({ symbol, height = 320, interval = '1h' }: Props) {
  const [klines, setKlines] = useState<KlinePoint[]>([]);
  const [ticker, setTicker] = useState<TickerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [candles, tick] = await Promise.all([
        fetchBinanceKlines(symbol, interval, 72),
        fetchBinanceTicker(symbol),
      ]);
      setKlines(candles);
      setTicker(tick);
      setError('');
    } catch {
      setError('Gráfico indisponível. Verifica a ligação.');
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const chartData = useMemo(
    () => klines.map(k => ({ ...k, label: formatAxisTime(k.time) })),
    [klines],
  );

  const trendUp = (ticker?.change24h ?? 0) >= 0;
  const yDomain = useMemo(() => {
    if (!klines.length) return ['auto', 'auto'] as const;
    const lows = klines.map(k => k.low);
    const highs = klines.map(k => k.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const pad = (max - min) * 0.06 || max * 0.01;
    return [min - pad, max + pad] as const;
  }, [klines]);

  return (
    <div
      className="w-full border border-border1 bg-bg1 overflow-hidden animate-fade-in"
      style={{ minHeight: `${height}px` }}
    >
      <div className="px-4 py-3 border-b border-border1 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase text-text3">Binance Futures · 1H</p>
          <h4 className="text-lg font-bold text-text1">{formatPairLabel(symbol)}/USDT</h4>
        </div>
        {ticker && (
          <div className="text-right">
            <p className="font-mono text-base font-bold text-text1">${formatPrice(ticker.price)}</p>
            <p className={`font-mono text-[10px] ${trendUp ? 'text-cyan' : 'text-red'}`}>
              {trendUp ? '+' : ''}{ticker.change24h.toFixed(2)}% 24h
            </p>
          </div>
        )}
      </div>

      <div style={{ height: `${height - 88}px` }} className="px-1 py-2">
        {loading && klines.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <YevaTradeLoader size="sm" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center px-4">
            <p className="font-mono text-[10px] text-text2 text-center">{error}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4a0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00d4a0" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: '#3a5040', fontSize: 9, fontFamily: 'Space Mono' }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yDomain[0], yDomain[1]]}
                tick={{ fill: '#3a5040', fontSize: 9, fontFamily: 'Space Mono' }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={v => formatPrice(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  background: '#0b100d',
                  border: '1px solid #1e2b1f',
                  borderRadius: 0,
                  fontFamily: 'Space Mono',
                  fontSize: 10,
                }}
                labelStyle={{ color: '#6b8a6e' }}
                formatter={(value) => [`$${formatPrice(Number(value))}`, 'Preço']}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#00d4a0"
                strokeWidth={2}
                fill={`url(#fill-${symbol})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {ticker && (
        <div className="px-4 py-2 border-t border-border1 grid grid-cols-2 gap-2 font-mono text-[9px] text-text3">
          <span>Máx 24h: <span className="text-text2">${formatPrice(ticker.high24h)}</span></span>
          <span className="text-right">Mín 24h: <span className="text-text2">${formatPrice(ticker.low24h)}</span></span>
        </div>
      )}
    </div>
  );
}
