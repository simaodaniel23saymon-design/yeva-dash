import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { normalizeAccountLiveStatus } from '../utils/accountSnapshot';

export interface DailyPnl {
  profit: number;
  loss: number;
  net: number;
  loading: boolean;
}

export function useDailyPnl(pollMs = 30000): DailyPnl & { refresh: () => Promise<void> } {
  const [profit, setProfit] = useState(0);
  const [loss, setLoss] = useState(0);
  const [net, setNet] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<Record<string, unknown>>('/account/live-status', {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
      });
      const live = normalizeAccountLiveStatus(res.data);
      setProfit(live.dailyProfit);
      setLoss(live.dailyLoss);
      setNet(live.todayResult);
    } catch {
      /* mantém valores anteriores */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollMs <= 0) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { profit, loss, net, loading, refresh };
}
