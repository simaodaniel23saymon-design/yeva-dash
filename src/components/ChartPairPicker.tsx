import { useMemo, useState } from 'react';
import { useBinanceSymbols } from '../hooks/useBinanceSymbols';
import { formatPairLabel, type ChartMarket } from '../utils/chartData';

interface Props {
  pairs: string[];
  selected: string;
  onChange: (symbol: string) => void;
  market: ChartMarket;
  onMarketChange: (market: ChartMarket) => void;
  autoSymbol?: string;
  onFollowAuto?: () => void;
}

const POPULAR = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];

export function ChartPairPicker({
  pairs,
  selected,
  onChange,
  market,
  onMarketChange,
  autoSymbol,
  onFollowAuto,
}: Props) {
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);
  const { symbols, loading } = useBinanceSymbols(market);

  const showAuto = autoSymbol && selected !== autoSymbol && onFollowAuto;

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    const source = q ? symbols : symbols.filter(s => POPULAR.includes(s) || pairs.includes(s));
    if (!q) return source.slice(0, 40);
    return source.filter(s => s.includes(q)).slice(0, 60);
  }, [search, symbols, pairs]);

  const quickPairs = useMemo(() => {
    const merged = [...pairs];
    POPULAR.forEach(p => { if (!merged.includes(p)) merged.push(p); });
    return merged.slice(0, 8);
  }, [pairs]);

  const tabClass = (active: boolean) =>
    `flex-1 py-2 font-mono text-[12px] uppercase tracking-wider border transition-all ${
      active ? 'bg-cyan-dim border-cyan-30 text-cyan' : 'border-border2 text-text2 hover:border-border1'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-mono text-[12px] uppercase tracking-wider text-text3">
          Par do gráfico
        </p>
        {showAuto && (
          <button
            type="button"
            onClick={onFollowAuto}
            className="font-mono text-[12px] uppercase text-cyan hover:underline shrink-0"
          >
            Seguir {formatPairLabel(autoSymbol)}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(['FUTURES', 'SPOT'] as const).map(m => (
          <button key={m} type="button" onClick={() => onMarketChange(m)} className={tabClass(market === m)}>
            {m === 'FUTURES' ? 'Futures' : 'Spot'}
          </button>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value.toUpperCase()); setShowList(true); }}
          onFocus={() => setShowList(true)}
          placeholder="Pesquisar moeda (ex: BTC, ETH, HYPE)..."
          className="w-full bg-bg3 border border-border2 text-text1 font-mono text-[13px] px-4 py-2.5 outline-none focus:border-cyan/35 placeholder:text-text2"
        />
        {showList && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-bg2 border border-border1 max-h-56 scroll-area shadow-lg">
            {loading ? (
              <p className="p-3 font-mono text-[12px] text-text3">A carregar pares Binance...</p>
            ) : filtered.length === 0 ? (
              <p className="p-3 font-mono text-[12px] text-text3">Nenhum par encontrado.</p>
            ) : (
              filtered.map(sym => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    onChange(sym);
                    setSearch('');
                    setShowList(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 font-mono text-[13px] hover:bg-bg3 transition-colors ${
                    sym === selected ? 'text-cyan bg-cyan-dim' : 'text-text1'
                  }`}
                >
                  {formatPairLabel(sym)}/USDT
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showList && (
        <button
          type="button"
          className="fixed inset-0 z-10"
          aria-label="Fechar lista"
          onClick={() => setShowList(false)}
        />
      )}

      <div className="flex gap-2 scroll-area-x pb-1 snap-x snap-mandatory touch-pan-x">
        {quickPairs.map(pair => {
          const active = pair === selected;
          return (
            <button
              key={pair}
              type="button"
              onClick={() => onChange(pair)}
              className={`snap-start shrink-0 font-mono text-[13px] uppercase px-4 py-2.5 border transition-colors min-w-[76px] ${
                active
                  ? 'border-cyan bg-cyan-dim text-cyan font-bold'
                  : 'border-border2 bg-bg2 text-text2 hover:border-cyan-30 hover:text-text1'
              }`}
            >
              {formatPairLabel(pair)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
