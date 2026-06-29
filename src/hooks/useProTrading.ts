import { useCallback, useEffect, useState } from 'react';
import {
  fetchBotProStats,
  fetchMarketAnalysis,
} from '../utils/proTrading';
import type { BotProStats, MarketAnalysis } from '../types/trading';

export function useProTrading(pairs?: string[], pollMs = 30000) {
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis[]>([]);
  const [botStats, setBotStats] = useState<BotProStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [analysis, stats] = await Promise.all([
      fetchMarketAnalysis(pairs),
      fetchBotProStats(),
    ]);
    setMarketAnalysis(analysis);
    setBotStats(stats);
    setLoading(false);
  }, [pairs?.join(',')]);

  useEffect(() => {
    load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  return { marketAnalysis, botStats, loading, reload: load };
}
