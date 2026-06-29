import { useState } from 'react';
import { BinanceChart } from './BinanceChart';
import { TradingViewWidget } from './TradingViewWidget';
import { ChartPairPicker } from './ChartPairPicker';
import { formatPairLabel, type ChartMarket } from '../utils/chartData';

interface Props {
  symbol: string;
  pairs: string[];
  onSymbolChange: (symbol: string) => void;
  autoSymbol?: string;
  onFollowAuto?: () => void;
  height?: number;
  title?: string;
  /** Activa barra lateral TradingView com linhas, raios, Fibonacci, etc. */
  drawings?: boolean;
}

export function LiveChart({
  symbol,
  pairs,
  onSymbolChange,
  autoSymbol,
  onFollowAuto,
  height = 560,
  title,
  drawings = false,
}: Props) {
  const [market, setMarket] = useState<ChartMarket>('FUTURES');

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-base font-bold text-text1">
          {title} · {formatPairLabel(symbol)}
        </h3>
      )}

      <ChartPairPicker
        pairs={pairs}
        selected={symbol}
        onChange={onSymbolChange}
        market={market}
        onMarketChange={setMarket}
        autoSymbol={autoSymbol}
        onFollowAuto={onFollowAuto}
      />

      {drawings ? (
        <TradingViewWidget
          symbol={symbol}
          market={market}
          height={height}
          drawings
        />
      ) : (
        <BinanceChart symbol={symbol} market={market} height={height} />
      )}
    </div>
  );
}
