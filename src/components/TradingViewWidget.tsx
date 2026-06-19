import { useEffect, useId, useRef } from 'react';

interface Props {
  symbol: string;
  interval?: string;
  height?: number;
  exchange?: 'BINANCE' | 'BYBIT';
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

export function TradingViewWidget({
  symbol,
  interval = '60',
  height = 480,
  exchange = 'BINANCE',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');
  const containerId = `tradingview_${uid}`;

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
          symbol: `${exchange}:${normalizeSymbol(symbol)}`,
          interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'pt',
          toolbar_bg: '#0b100d',
          backgroundColor: '#0b100d',
          gridColor: '#1e2b1f',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerId,
          studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
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
  }, [symbol, interval, exchange, containerId]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden border border-border1 bg-bg1 animate-fade-in"
      style={{ height: `${height}px`, minHeight: `${height}px` }}
    />
  );
}
