import { useCallback, useEffect, useState } from 'react';
import {
  fetchBotProStats,
  fetchMarketAnalysis,
  fetchProNotifications,
} from '../utils/proTrading';
import type { BotProStats, MarketAnalysis, ProNotification } from '../types/trading';
import { DEMO_PRO_NOTIFICATIONS } from '../components/pro/ProNotifications';

export function useProTrading(pairs?: string[], pollMs = 30000) {
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis[]>([]);
  const [botStats, setBotStats] = useState<BotProStats | null>(null);
  const [notifications, setNotifications] = useState<ProNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [analysis, stats, notifs] = await Promise.all([
      fetchMarketAnalysis(pairs),
      fetchBotProStats(),
      fetchProNotifications(),
    ]);
    setMarketAnalysis(analysis);
    setBotStats(stats);
    setNotifications(notifs.length ? notifs : DEMO_PRO_NOTIFICATIONS);
    setLoading(false);
  }, [pairs?.join(',')]);

  useEffect(() => {
    load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  return { marketAnalysis, botStats, notifications, loading, reload: load };
}
