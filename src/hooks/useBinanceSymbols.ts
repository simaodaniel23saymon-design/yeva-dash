import { useCallback, useEffect, useState } from 'react';
import { fetchBinanceSymbolList, type ChartMarket } from '../utils/chartData';

export function useBinanceSymbols(market: ChartMarket) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchBinanceSymbolList(market);
      setSymbols(list);
    } catch {
      setError('Lista de pares indisponível.');
      setSymbols([]);
    } finally {
      setLoading(false);
    }
  }, [market]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { symbols, loading, error, reload };
}
