import { useMediaQuery } from '../hooks/useMediaQuery';
import { ChartPairPicker } from './ChartPairPicker';
import { MobilePriceChart } from './MobilePriceChart';
import { TradingViewWidget } from './TradingViewWidget';
import { formatPairLabel } from '../utils/chartData';

interface Props {
  symbol: string;
  pairs: string[];
  onSymbolChange: (symbol: string) => void;
  autoSymbol?: string;
  onFollowAuto?: () => void;
  height?: number;
  title?: string;
}

export function LiveChart({
  symbol,
  pairs,
  onSymbolChange,
  autoSymbol,
  onFollowAuto,
  height = 400,
  title,
}: Props) {
  const isMobile = useMediaQuery('(max-width: 1023px)');

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-bold text-text1">
          {title} · {formatPairLabel(symbol)}
        </h3>
      )}

      <ChartPairPicker
        pairs={pairs}
        selected={symbol}
        onChange={onSymbolChange}
        autoSymbol={autoSymbol}
        onFollowAuto={onFollowAuto}
      />

      {isMobile ? (
        <MobilePriceChart symbol={symbol} height={Math.max(height, 340)} />
      ) : (
        <TradingViewWidget symbol={symbol} interval="60" height={height} locked />
      )}
    </div>
  );
}
