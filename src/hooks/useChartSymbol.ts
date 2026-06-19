import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collectTradingPairs,
  resolveAutoChartSymbol,
} from '../utils/chartData';
import type { ExchangePosition, LiveBot } from '../utils/liveData';

export function useChartSymbol(bots: LiveBot[], positions: ExchangePosition[]) {
  const pairs = useMemo(() => collectTradingPairs(bots, positions), [bots, positions]);
  const autoSymbol = useMemo(
    () => resolveAutoChartSymbol(bots, positions),
    [bots, positions],
  );

  const [symbol, setSymbol] = useState(autoSymbol);
  const userLocked = useRef(false);
  const prevAuto = useRef(autoSymbol);

  useEffect(() => {
    if (userLocked.current) {
      if (!pairs.includes(symbol)) {
        userLocked.current = false;
        setSymbol(autoSymbol);
      }
      return;
    }

    if (prevAuto.current !== autoSymbol) {
      prevAuto.current = autoSymbol;
      setSymbol(autoSymbol);
    }
  }, [autoSymbol, pairs, symbol]);

  const selectSymbol = useCallback((next: string, fromUser = true) => {
    setSymbol(next.toUpperCase());
    userLocked.current = fromUser;
  }, []);

  const followAuto = useCallback(() => {
    userLocked.current = false;
    setSymbol(autoSymbol);
  }, [autoSymbol]);

  return { symbol, pairs, autoSymbol, selectSymbol, followAuto };
}
