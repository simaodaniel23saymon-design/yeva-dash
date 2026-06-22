import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchBinanceKlines,
  fetchBinanceTicker,
  formatPairLabel,
  type ChartMarket,
  type KlinePoint,
  type TickerSnapshot,
} from '../utils/chartData';

interface Props {
  symbol: string;
  market?: ChartMarket;
  height?: number;
}

const INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
] as const;

const UP = '#0ecb81';
const DOWN = '#f6465d';

function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(6);
}

function formatAxisTime(ts: number): string {
  return new Date(ts).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CandleSvg({
  candles,
  width,
  height,
}: {
  candles: KlinePoint[];
  width: number;
  height: number;
}) {
  const padding = { top: 12, right: 56, bottom: 28, left: 8 };
  const chartW = Math.max(width - padding.left - padding.right, 1);
  const chartH = Math.max(height - padding.top - padding.bottom, 1);

  const { min, max, bodies } = useMemo(() => {
    if (!candles.length) return { min: 0, max: 1, bodies: [] as Array<{ x: number; yHigh: number; yLow: number; yOpen: number; yClose: number; up: boolean; bodyW: number }> };

    const lows = candles.map(c => c.low);
    const highs = candles.map(c => c.high);
    const lo = Math.min(...lows);
    const hi = Math.max(...highs);
    const pad = (hi - lo) * 0.06 || hi * 0.01;
    const minVal = lo - pad;
    const maxVal = hi + pad;
    const range = maxVal - minVal || 1;
    const slot = chartW / candles.length;
    const bodyW = Math.max(slot * 0.6, 2);

    const scaleY = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH;

    const bodies = candles.map((c, i) => {
      const cx = padding.left + i * slot + slot / 2;
      return {
        x: cx,
        yHigh: scaleY(c.high),
        yLow: scaleY(c.low),
        yOpen: scaleY(c.open),
        yClose: scaleY(c.close),
        up: c.close >= c.open,
        bodyW,
      };
    });

    return { min: minVal, max: maxVal, bodies };
  }, [candles, chartW, chartH]);

  const yTicks = useMemo(() => {
    const steps = 5;
    const range = max - min || 1;
    return Array.from({ length: steps + 1 }, (_, i) => min + (range * i) / steps);
  }, [min, max]);

  return (
    <svg width={width} height={height} className="block">
      {yTicks.map((tick, i) => {
        const y = padding.top + chartH - ((tick - min) / (max - min || 1)) * chartH;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1e2b1f" strokeWidth={1} />
            <text x={width - padding.right + 6} y={y + 4} fill="#6b8a6e" fontSize={11} fontFamily="Space Mono">
              {formatPrice(tick)}
            </text>
          </g>
        );
      })}

      {bodies.map((b, i) => {
        const color = b.up ? UP : DOWN;
        const top = Math.min(b.yOpen, b.yClose);
        const bodyH = Math.max(Math.abs(b.yClose - b.yOpen), 1);
        return (
          <g key={i}>
            <line x1={b.x} y1={b.yHigh} x2={b.x} y2={b.yLow} stroke={color} strokeWidth={1} />
            <rect
              x={b.x - b.bodyW / 2}
              y={top}
              width={b.bodyW}
              height={bodyH}
              fill={color}
            />
          </g>
        );
      })}

      {candles.length > 0 && (
        <>
          <text x={padding.left} y={height - 8} fill="#6b8a6e" fontSize={11} fontFamily="Space Mono">
            {formatAxisTime(candles[0].time)}
          </text>
          <text x={width - padding.right - 48} y={height - 8} fill="#6b8a6e" fontSize={11} fontFamily="Space Mono">
            {formatAxisTime(candles[candles.length - 1].time)}
          </text>
        </>
      )}
    </svg>
  );
}

export function BinanceChart({ symbol, market = 'FUTURES', height = 420 }: Props) {
  const [interval, setInterval] = useState('1h');
  const [klines, setKlines] = useState<KlinePoint[]>([]);
  const [ticker, setTicker] = useState<TickerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(600);

  const load = useCallback(async () => {
    try {
      const [candles, tick] = await Promise.all([
        fetchBinanceKlines(symbol, interval, 80, market),
        fetchBinanceTicker(symbol, market),
      ]);
      setKlines(candles);
      setTicker(tick);
      setError('');
    } catch {
      setError('Gráfico indisponível. Verifica a ligação.');
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, market]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setChartWidth(w);
    });
    ro.observe(el);
    setChartWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const display = klines[klines.length - 1];
  const trendUp = (ticker?.change24h ?? 0) >= 0;
  const chartHeight = height - 132;

  return (
    <div className="w-full border border-border1 bg-bg1 overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-border1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase text-text3">
            Binance {market === 'SPOT' ? 'Spot' : 'Futures'}
          </p>
          <h4 className="text-xl font-bold text-text1">{formatPairLabel(symbol)}/USDT</h4>
          {display && (
            <p className="font-mono text-[12px] text-text3 mt-1">
              O {formatPrice(display.open)} · H {formatPrice(display.high)} · L {formatPrice(display.low)} · C{' '}
              <span className={display.close >= display.open ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                {formatPrice(display.close)}
              </span>
            </p>
          )}
        </div>
        {ticker && (
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-text1">${formatPrice(ticker.price)}</p>
            <p className={`font-mono text-[12px] ${trendUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {trendUp ? '+' : ''}{ticker.change24h.toFixed(2)}% 24h
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-b border-border1 flex gap-1 overflow-x-auto">
        {INTERVALS.map(item => (
          <button
            key={item.value}
            type="button"
            onClick={() => setInterval(item.value)}
            className={`font-mono text-[12px] px-3 py-1.5 border transition-colors shrink-0 ${
              interval === item.value
                ? 'border-[#0ecb81] bg-[#0ecb81]/10 text-[#0ecb81]'
                : 'border-border2 text-text2 hover:border-border1 hover:text-text1'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} style={{ height: `${chartHeight}px` }} className="relative">
        {loading && klines.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center px-4">
            <p className="font-mono text-[12px] text-text2 text-center">{error}</p>
          </div>
        ) : (
          <CandleSvg candles={klines} width={chartWidth} height={chartHeight} />
        )}
      </div>

      {ticker && (
        <div className="px-4 py-2.5 border-t border-border1 grid grid-cols-2 gap-2 font-mono text-[12px] text-text3">
          <span>Máx 24h: <span className="text-text2">${formatPrice(ticker.high24h)}</span></span>
          <span className="text-right">Mín 24h: <span className="text-text2">${formatPrice(ticker.low24h)}</span></span>
        </div>
      )}
    </div>
  );
}
