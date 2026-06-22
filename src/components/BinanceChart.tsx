import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
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

interface OhlcHover {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
] as const;

const THEME = {
  bg: '#161a1e',
  panel: '#1e2329',
  grid: '#2b3139',
  text: '#848e9c',
  textBright: '#eaecef',
  yellow: '#f0b90b',
  up: '#0ecb81',
  down: '#f6465d',
  crosshair: '#474d57',
};

function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.0001) return value.toFixed(4);
  return value.toFixed(8);
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

function toChartTime(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function buildSeriesData(klines: KlinePoint[]) {
  return {
    candles: klines.map(k => ({
      time: toChartTime(k.time),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    })),
    volume: klines.map(k => ({
      time: toChartTime(k.time),
      value: k.volume,
      color: k.close >= k.open ? 'rgba(14, 203, 129, 0.45)' : 'rgba(246, 70, 93, 0.45)',
    })),
  };
}

export function BinanceChart({ symbol, market = 'FUTURES', height = 520 }: Props) {
  const [interval, setInterval] = useState('1h');
  const [klines, setKlines] = useState<KlinePoint[]>([]);
  const [ticker, setTicker] = useState<TickerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<OhlcHover | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const fitOnNextRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const [candles, tick] = await Promise.all([
        fetchBinanceKlines(symbol, interval, 200, market),
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
    setHover(null);
    fitOnNextRef.current = true;
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: THEME.bg },
        textColor: THEME.text,
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: THEME.grid },
        horzLines: { color: THEME.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: THEME.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: THEME.panel,
        },
        horzLine: {
          color: THEME.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: THEME.panel,
        },
      },
      rightPriceScale: {
        borderColor: THEME.grid,
        textColor: THEME.text,
      },
      timeScale: {
        borderColor: THEME.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 7,
        minBarSpacing: 3,
      },
      handleScroll: { vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: { time: true, price: true } },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: THEME.up,
      downColor: THEME.down,
      borderUpColor: THEME.up,
      borderDownColor: THEME.down,
      wickUpColor: THEME.up,
      wickDownColor: THEME.down,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    candles.priceScale().applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.22 },
    });

    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData.size) {
        setHover(null);
        return;
      }
      const candle = param.seriesData.get(candles);
      const vol = param.seriesData.get(volume);
      if (!candle || !('open' in candle)) {
        setHover(null);
        return;
      }
      setHover({
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: vol && 'value' in vol ? vol.value : 0,
      });
    });

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;

    const resize = () => {
      if (!chartContainerRef.current) return;
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('resize', resize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.timeScale().applyOptions({
      secondsVisible: interval === '1m' || interval === '5m',
    });
  }, [interval]);

  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || klines.length === 0) return;
    const { candles, volume } = buildSeriesData(klines);
    candleRef.current.setData(candles);
    volumeRef.current.setData(volume);
    if (fitOnNextRef.current) {
      chartRef.current?.timeScale().fitContent();
      fitOnNextRef.current = false;
    }
  }, [klines]);

  const last = klines[klines.length - 1];
  const display = hover ?? (last
    ? { open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume }
    : null);
  const trendUp = (ticker?.change24h ?? 0) >= 0;
  const chartHeight = Math.max(height - 148, 320);

  return (
    <div
      className="w-full overflow-hidden rounded-sm border border-[#2b3139] animate-fade-in"
      style={{ background: THEME.bg, minHeight: `${height}px` }}
    >
      <div
        className="px-4 py-3 flex flex-wrap items-start justify-between gap-3 border-b"
        style={{ borderColor: THEME.grid, background: THEME.panel }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[13px] font-bold" style={{ color: THEME.yellow }}>
              {formatPairLabel(symbol)}/USDT
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ color: THEME.text, background: THEME.bg }}>
              {market === 'SPOT' ? 'Spot' : 'Futures'}
            </span>
          </div>
          {display && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[12px]" style={{ color: THEME.text }}>
              <span>O <span style={{ color: THEME.textBright }}>{formatPrice(display.open)}</span></span>
              <span>H <span style={{ color: THEME.up }}>{formatPrice(display.high)}</span></span>
              <span>L <span style={{ color: THEME.down }}>{formatPrice(display.low)}</span></span>
              <span>C <span style={{ color: display.close >= display.open ? THEME.up : THEME.down }}>{formatPrice(display.close)}</span></span>
              <span>Vol <span style={{ color: THEME.textBright }}>{formatVolume(display.volume)}</span></span>
            </div>
          )}
        </div>
        {ticker && (
          <div className="text-right">
            <p className="font-mono text-2xl font-bold leading-none" style={{ color: THEME.textBright }}>
              {formatPrice(ticker.price)}
            </p>
            <p className="font-mono text-[13px] mt-1" style={{ color: trendUp ? THEME.up : THEME.down }}>
              {trendUp ? '+' : ''}{ticker.change24h.toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      <div
        className="px-3 py-2 flex gap-1 scroll-area-x border-b"
        style={{ borderColor: THEME.grid, background: THEME.panel }}
      >
        {INTERVALS.map(item => {
          const active = interval === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setInterval(item.value)}
              className="font-mono text-[13px] px-3 py-1.5 rounded transition-colors shrink-0"
              style={{
                color: active ? THEME.bg : THEME.text,
                background: active ? THEME.yellow : 'transparent',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div ref={chartContainerRef} style={{ height: `${chartHeight}px`, background: THEME.bg }} className="relative">
        {loading && klines.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: THEME.bg }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: THEME.yellow, borderTopColor: 'transparent' }} />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-4 z-10" style={{ background: THEME.bg }}>
            <p className="font-mono text-[13px] text-center" style={{ color: THEME.text }}>{error}</p>
          </div>
        )}
      </div>

      {ticker && (
        <div
          className="px-4 py-2.5 grid grid-cols-2 gap-2 font-mono text-[12px] border-t"
          style={{ borderColor: THEME.grid, color: THEME.text, background: THEME.panel }}
        >
          <span>24h Máx: <span style={{ color: THEME.textBright }}>{formatPrice(ticker.high24h)}</span></span>
          <span className="text-right">24h Mín: <span style={{ color: THEME.textBright }}>{formatPrice(ticker.low24h)}</span></span>
        </div>
      )}
    </div>
  );
}
