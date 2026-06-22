import { useMemo, useState } from 'react';
import { useBinanceSymbols } from '../hooks/useBinanceSymbols';
import { formatPairLabel, type ChartMarket } from '../utils/chartData';

const POPULAR = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'];

interface Props {
  selected: string;
  onChange: (symbol: string) => void;
  market: ChartMarket;
  onMarketChange: (market: ChartMarket) => void;
  label?: string;
  compact?: boolean;
}

export function BinancePairSelector({
  selected,
  onChange,
  market,
  onMarketChange,
  label = 'Par de moedas',
  compact = false,
}: Props) {
  const [search, setSearch] = useState('');
  const { symbols, loading, error } = useBinanceSymbols(market);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return symbols;
    return symbols.filter(s => s.includes(q));
  }, [search, symbols]);

  const tabClass = (active: boolean) =>
    `flex-1 py-2 font-mono ${compact ? 'text-[11px]' : 'text-[12px]'} uppercase tracking-wider border transition-all ${
      active ? 'bg-cyan-dim border-cyan-30 text-cyan' : 'border-border2 text-text2 hover:border-border1'
    }`;

  const inputClass = `w-full bg-bg3 border border-border2 text-text1 font-mono ${compact ? 'text-[12px] px-3 py-2' : 'text-[13px] px-4 py-2.5'} outline-none focus:border-cyan/35 placeholder:text-text2`;

  return (
    <div className="space-y-3">
      <p className={`font-mono uppercase tracking-wider text-text2 ${compact ? 'text-[10px] mb-1.5' : 'text-[12px] mb-2'}`}>
        {label}
      </p>

      <div className="flex gap-2">
        {(['FUTURES', 'SPOT'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => {
              onMarketChange(m);
              setSearch('');
            }}
            className={tabClass(market === m)}
          >
            {m === 'FUTURES' ? 'Futures' : 'Spot'}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value.toUpperCase())}
        placeholder="Pesquisar moeda (BTC, ETH, HYPE...)"
        className={inputClass}
      />

      <div className="flex gap-2 flex-wrap">
        {POPULAR.filter(p => symbols.includes(p) || symbols.length === 0).slice(0, 6).map(sym => (
          <button
            key={sym}
            type="button"
            onClick={() => onChange(sym)}
            className={`font-mono ${compact ? 'text-[11px] px-3 py-1.5' : 'text-[12px] px-3 py-2'} border transition-colors ${
              selected === sym
                ? 'border-cyan bg-cyan-dim text-cyan font-bold'
                : 'border-border2 bg-bg2 text-text2 hover:border-cyan-30'
            }`}
          >
            {formatPairLabel(sym)}
          </button>
        ))}
      </div>

      {selected && (
        <p className={`font-mono text-cyan ${compact ? 'text-[10px]' : 'text-[12px]'}`}>
          Seleccionado: {formatPairLabel(selected)}/USDT
        </p>
      )}

      <div className="border border-border1 bg-bg2 overflow-hidden">
        <div className={`px-3 py-2 border-b border-border1 flex justify-between ${compact ? 'text-[9px]' : 'text-[11px]'} font-mono text-text3 uppercase`}>
          <span>Lista Binance {market === 'SPOT' ? 'Spot' : 'Futures'}</span>
          <span>{filtered.length} pares</span>
        </div>
        <div className={`overflow-y-auto ${compact ? 'max-h-44' : 'max-h-52'}`}>
          {loading ? (
            <p className={`p-4 font-mono text-text3 ${compact ? 'text-[10px]' : 'text-[12px]'}`}>
              A carregar pares Binance...
            </p>
          ) : error ? (
            <p className={`p-4 font-mono text-red ${compact ? 'text-[10px]' : 'text-[12px]'}`}>{error}</p>
          ) : filtered.length === 0 ? (
            <p className={`p-4 font-mono text-text3 ${compact ? 'text-[10px]' : 'text-[12px]'}`}>
              Nenhum par encontrado.
            </p>
          ) : (
            filtered.map(sym => (
              <button
                key={sym}
                type="button"
                onClick={() => onChange(sym)}
                className={`w-full text-left px-4 py-2 font-mono border-b border-border1/50 transition-colors ${
                  compact ? 'text-[11px]' : 'text-[13px]'
                } ${
                  sym === selected
                    ? 'bg-cyan-dim text-cyan'
                    : 'text-text1 hover:bg-bg3'
                }`}
              >
                {formatPairLabel(sym)}/USDT
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
