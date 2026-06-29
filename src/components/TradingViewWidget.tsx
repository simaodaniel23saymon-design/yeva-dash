import { useEffect, useId, useRef } from 'react';
import type { ChartMarket } from '../utils/chartData';

interface Props {
  symbol: string;
  interval?: string;
  height?: number;
  exchange?: 'BINANCE' | 'BYBIT';
  market?: ChartMarket;
  /** Bloqueia pesquisa de símbolo — par controlado pela app */
  locked?: boolean;
  /** Barra de desenho (linhas, raios, zonas, Fibonacci) */
  drawings?: boolean;
}

const TV_SCRIPT = 'https://s3.tradingview.com/tv.js';
let tvScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (window.TradingView) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;

  tvScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TV_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('TradingView script failed')));
      if (window.TradingView) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = TV_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TradingView script failed'));
    document.head.appendChild(script);
  });

  return tvScriptPromise;
}

function normalizeSymbol(symbol: string): string {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.endsWith('USDT') ? s : `${s}USDT`;
}

function buildTvSymbol(symbol: string, exchange: 'BINANCE' | 'BYBIT', market: ChartMarket): string {
  const base = normalizeSymbol(symbol);
  if (market === 'FUTURES') return `${exchange}:${base}.P`;
  return `${exchange}:${base}`;
}

export function TradingViewWidget({
  symbol,
  interval = '60',
  height = 480,
  exchange = 'BINANCE',
  market = 'FUTURES',
  locked = false,
  drawings = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');
  const containerId = `tradingview_${uid}`;
  const toolbarLocked = locked && !drawings;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    loadTradingViewScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.TradingView) return;

        containerRef.current.innerHTML = '';
        const inner = document.createElement('div');
        inner.id = containerId;
        inner.style.height = '100%';
        inner.style.width = '100%';
        containerRef.current.appendChild(inner);

        new window.TradingView.widget({
          autosize: true,
          symbol: buildTvSymbol(symbol, exchange, market),
          interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'pt',
          toolbar_bg: '#0b100d',
          backgroundColor: '#0b100d',
          gridColor: '#1e2b1f',
          enable_publishing: false,
          hide_top_toolbar: toolbarLocked,
          hide_side_toolbar: toolbarLocked,
          hide_legend: false,
          save_image: !toolbarLocked,
          container_id: containerId,
          studies: toolbarLocked ? [] : ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
          show_popup_button: !toolbarLocked,
          popup_width: '1000',
          popup_height: '650',
          ...(drawings
            ? {
                enabled_features: [
                  'study_templates',
                  'side_toolbar_in_fullscreen_mode',
                  'header_in_fullscreen_mode',
                ],
              }
            : {}),
          ...(toolbarLocked
            ? {
                disabled_features: [
                  'header_symbol_search',
                  'symbol_search_hot_key',
                  'header_compare',
                  'compare_symbol',
                  'display_market_status',
                ],
              }
            : {}),
        });
      })
      .catch(() => {
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<p class="font-mono text-[10px] text-text2 p-4 text-center">Gráfico indisponível. Verifica a ligação.</p>';
        }
      });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbol, interval, exchange, market, containerId, toolbarLocked, drawings]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden border border-border1 bg-bg1 animate-fade-in"
      style={{ height: `${height}px`, minHeight: `${height}px` }}
    />
  );
}
