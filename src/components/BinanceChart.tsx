import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { YevaTradeLoader } from './YevaTradeLoader';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type SeriesMarker,
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
import {
  MA_DEFS,
  calcEma,
  calcSma,
  formatAge,
  formatLevelTitle,
  formatPriceLabel,
  isBreakevenSl,
  type MaKey,
  type PositionOverlay,
} from '../utils/chartOverlays';

interface Props {
  symbol: string;
  market?: ChartMarket;
  height?: number;
  /** Overlays ENTRY/TP/SL da posição seleccionada / par */
  overlays?: PositionOverlay[];
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
  return formatPriceLabel(value);
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
    candles: klines.map((k) => ({
      time: toChartTime(k.time),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    })),
    volume: klines.map((k) => ({
      time: toChartTime(k.time),
      value: k.volume,
      color: k.close >= k.open ? 'rgba(14, 203, 129, 0.45)' : 'rgba(246, 70, 93, 0.45)',
    })),
  };
}

function klineWsUrl(symbol: string, interval: string, market: ChartMarket): string {
  const s = symbol.toLowerCase();
  if (market === 'SPOT') {
    return `wss://stream.binance.com:9443/ws/${s}@kline_${interval}`;
  }
  return `wss://fstream.binance.com/ws/${s}@kline_${interval}`;
}

export function BinanceChart({
  symbol,
  market = 'FUTURES',
  height = 520,
  overlays = [],
}: Props) {
  const [interval, setInterval] = useState('1h');
  const [klines, setKlines] = useState<KlinePoint[]>([]);
  const [ticker, setTicker] = useState<TickerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<OhlcHover | null>(null);
  const [maEnabled, setMaEnabled] = useState<Record<MaKey, boolean>>({
    MA20: true,
    MA50: false,
    MA200: false,
    EMA9: true,
    EMA21: false,
  });

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maSeriesRef = useRef<Partial<Record<MaKey, ISeriesApi<'Line'>>>>({});
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersApiRef = useRef<{ setMarkers: (m: SeriesMarker<UTCTimestamp>[]) => void } | null>(null);
  const fitOnNextRef = useRef(true);

  const symbolOverlays = useMemo(
    () =>
      overlays.filter(
        (o) => o.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '') === symbol.toUpperCase()
      ),
    [overlays, symbol]
  );

  const load = useCallback(async () => {
    try {
      const [candles, tick] = await Promise.all([
        fetchBinanceKlines(symbol, interval, 300, market),
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
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  // WebSocket kline — actualiza o último candle em tempo real
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    try {
      ws = new WebSocket(klineWsUrl(symbol, interval, market));
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          const k = msg?.k;
          if (!k) return;
          const point: KlinePoint = {
            time: Number(k.t),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          };
          setKlines((prev) => {
            if (!prev.length) return [point];
            const next = prev.slice();
            const last = next[next.length - 1];
            if (last && last.time === point.time) {
              next[next.length - 1] = point;
            } else if (!last || point.time > last.time) {
              next.push(point);
              if (next.length > 400) next.shift();
            }
            return next;
          });
          setTicker((t) =>
            t
              ? { ...t, price: point.close }
              : {
                  symbol,
                  price: point.close,
                  change24h: 0,
                  high24h: point.high,
                  low24h: point.low,
                }
          );
        } catch {
          /* */
        }
      };
    } catch {
      /* REST poll cobre */
    }
    return () => {
      closed = true;
      try {
        ws?.close();
      } catch {
        /* */
      }
      void closed;
    };
  }, [symbol, interval, market]);

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

    const maMap: Partial<Record<MaKey, ISeriesApi<'Line'>>> = {};
    for (const def of MA_DEFS) {
      maMap[def.key] = chart.addSeries(LineSeries, {
        color: def.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }
    maSeriesRef.current = maMap;

    markersApiRef.current = createSeriesMarkers(candles, []) as {
      setMarkers: (m: SeriesMarker<UTCTimestamp>[]) => void;
    };

    chart.subscribeCrosshairMove((param) => {
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
        volume: vol && 'value' in vol ? Number(vol.value) : 0,
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
      maSeriesRef.current = {};
      priceLinesRef.current = [];
      markersApiRef.current = null;
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

    const closes = klines.map((k) => k.close);
    for (const def of MA_DEFS) {
      const series = maSeriesRef.current[def.key];
      if (!series) continue;
      if (!maEnabled[def.key]) {
        series.setData([]);
        continue;
      }
      const vals = def.kind === 'sma' ? calcSma(closes, def.period) : calcEma(closes, def.period);
      series.setData(
        klines
          .map((k, i) =>
            vals[i] == null
              ? null
              : { time: toChartTime(k.time), value: vals[i] as number }
          )
          .filter(Boolean) as Array<{ time: UTCTimestamp; value: number }>
      );
    }

    // Price lines ENTRY/TP/SL
    for (const line of priceLinesRef.current) {
      try {
        candleRef.current.removePriceLine(line);
      } catch {
        /* */
      }
    }
    priceLinesRef.current = [];
    const markers: SeriesMarker<UTCTimestamp>[] = [];

    for (const ov of symbolOverlays) {
      if (ov.entry > 0) {
        priceLinesRef.current.push(
          candleRef.current.createPriceLine({
            price: ov.entry,
            color: THEME.yellow,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: formatLevelTitle('ENTRY', ov.entry),
          })
        );
      }
      if (ov.tp != null && ov.tp > 0) {
        priceLinesRef.current.push(
          candleRef.current.createPriceLine({
            price: ov.tp,
            color: THEME.up,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: formatLevelTitle('TP', ov.tp),
          })
        );
      }
      if (ov.sl != null && ov.sl > 0) {
        const be = ov.slIsBe ?? isBreakevenSl(ov.side, ov.entry, ov.sl);
        priceLinesRef.current.push(
          candleRef.current.createPriceLine({
            price: ov.sl,
            color: THEME.down,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: formatLevelTitle('SL', ov.sl, { be }),
          })
        );
      }
      let entryTime = ov.entryTimeMs;
      if (!entryTime && klines.length) {
        // aproximar: candle cujo close mais próximo do entry
        let best = klines[klines.length - 1];
        let bestDiff = Infinity;
        for (const k of klines) {
          const d = Math.abs(k.close - ov.entry);
          if (d < bestDiff) {
            bestDiff = d;
            best = k;
          }
        }
        entryTime = best.time;
      }
      if (entryTime) {
        markers.push({
          time: toChartTime(entryTime),
          position: String(ov.side).toUpperCase() === 'SHORT' ? 'aboveBar' : 'belowBar',
          color: THEME.yellow,
          shape: String(ov.side).toUpperCase() === 'SHORT' ? 'arrowDown' : 'arrowUp',
          text: 'ENTRY',
        });
      }
    }

    try {
      markersApiRef.current?.setMarkers(markers);
    } catch {
      /* */
    }

    if (fitOnNextRef.current) {
      chartRef.current?.timeScale().fitContent();
      fitOnNextRef.current = false;
    }
  }, [klines, maEnabled, symbolOverlays]);

  const last = klines[klines.length - 1];
  const display =
    hover ??
    (last
      ? { open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume }
      : null);
  const trendUp = (ticker?.change24h ?? 0) >= 0;
  const chartHeight = Math.max(height - 180, 300);

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
            <span
              className="font-mono text-[11px] px-2 py-0.5 rounded"
              style={{ color: THEME.text, background: THEME.bg }}
            >
              {market === 'SPOT' ? 'Spot' : 'Futures'}
            </span>
            {symbolOverlays.length > 0 && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded"
                style={{ color: THEME.bg, background: THEME.yellow }}
              >
                POSIÇÃO MARCADA
              </span>
            )}
          </div>
          {display && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[12px]" style={{ color: THEME.text }}>
              <span>
                O <span style={{ color: THEME.textBright }}>{formatPrice(display.open)}</span>
              </span>
              <span>
                H <span style={{ color: THEME.up }}>{formatPrice(display.high)}</span>
              </span>
              <span>
                L <span style={{ color: THEME.down }}>{formatPrice(display.low)}</span>
              </span>
              <span>
                C{' '}
                <span style={{ color: display.close >= display.open ? THEME.up : THEME.down }}>
                  {formatPrice(display.close)}
                </span>
              </span>
              <span>
                Vol <span style={{ color: THEME.textBright }}>{formatVolume(display.volume)}</span>
              </span>
            </div>
          )}
        </div>
        {ticker && (
          <div className="text-right">
            <p className="font-mono text-2xl font-bold leading-none" style={{ color: THEME.textBright }}>
              {formatPrice(ticker.price)}
            </p>
            <p className="font-mono text-[13px] mt-1" style={{ color: trendUp ? THEME.up : THEME.down }}>
              {trendUp ? '+' : ''}
              {ticker.change24h.toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      <div
        className="px-3 py-2 flex flex-wrap gap-1 items-center border-b"
        style={{ borderColor: THEME.grid, background: THEME.panel }}
      >
        {INTERVALS.map((item) => {
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
        <span className="font-mono text-[9px] uppercase mx-1" style={{ color: THEME.text }}>
          MA
        </span>
        {MA_DEFS.map((def) => {
          const on = maEnabled[def.key];
          return (
            <button
              key={def.key}
              type="button"
              onClick={() => setMaEnabled((s) => ({ ...s, [def.key]: !s[def.key] }))}
              className="font-mono text-[10px] px-2 py-1 rounded border shrink-0"
              style={{
                color: on ? THEME.bg : def.color,
                background: on ? def.color : 'transparent',
                borderColor: def.color,
              }}
            >
              {def.key}
            </button>
          );
        })}
      </div>

      <div ref={chartContainerRef} style={{ height: `${chartHeight}px`, background: THEME.bg }} className="relative">
        {loading && klines.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: THEME.bg }}>
            <YevaTradeLoader size="md" label="A carregar gráfico..." />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-4 z-10" style={{ background: THEME.bg }}>
            <p className="font-mono text-[13px] text-center" style={{ color: THEME.text }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {symbolOverlays.length > 0 && (
        <div
          className="px-4 py-2 flex flex-wrap gap-3 font-mono text-[10px] border-t"
          style={{ borderColor: THEME.grid, background: THEME.panel, color: THEME.text }}
        >
          {symbolOverlays.map((ov, i) => (
            <span key={`${ov.symbol}-${i}`}>
              <span style={{ color: THEME.yellow }}>{formatLevelTitle('ENTRY', ov.entry)}</span>
              {ov.tp != null && ov.tp > 0 && (
                <>
                  {' · '}
                  <span style={{ color: THEME.up }}>{formatLevelTitle('TP', ov.tp)}</span>
                </>
              )}
              {ov.sl != null && ov.sl > 0 && (
                <>
                  {' · '}
                  <span style={{ color: THEME.down }}>
                    {formatLevelTitle('SL', ov.sl, {
                      be: ov.slIsBe ?? isBreakevenSl(ov.side, ov.entry, ov.sl),
                    })}
                  </span>
                </>
              )}
              {ov.uPnl != null && (
                <>
                  {' · '}
                  <span style={{ color: ov.uPnl >= 0 ? THEME.up : THEME.down }}>
                    uPnL {ov.uPnl >= 0 ? '+' : ''}
                    {ov.uPnl.toFixed(2)}
                  </span>
                </>
              )}
              {ov.ageMs != null && <> · idade {formatAge(ov.ageMs)}</>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
