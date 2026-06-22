import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fetchExchangePositions, parseNum } from '../utils/liveData';

interface Round {
  pnl: number;
  closedAt?: string;
  openedAt: string;
}

export interface DailyPnl {
  profit: number;
  loss: number;
  net: number;
  loading: boolean;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getDate() === now.getDate()
    && d.getMonth() === now.getMonth()
    && d.getFullYear() === now.getFullYear();
}

export function useDailyPnl(pollMs = 30000): DailyPnl & { refresh: () => Promise<void> } {
  const [profit, setProfit] = useState(0);
  const [loss, setLoss] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [historyRes, positions] = await Promise.all([
        api.get<{ rounds?: Round[] }>('/history').catch(() => ({ data: { rounds: [] } })),
        fetchExchangePositions(),
      ]);

      let dayProfit = 0;
      let dayLoss = 0;

      for (const round of historyRes.data.rounds ?? []) {
        const ref = round.closedAt ?? round.openedAt;
        if (!isToday(ref)) continue;
        if (round.pnl >= 0) dayProfit += round.pnl;
        else dayLoss += Math.abs(round.pnl);
      }

      for (const pos of positions) {
        const pnl = parseNum(pos.unrealizedProfit);
        if (pnl >= 0) dayProfit += pnl;
        else dayLoss += Math.abs(pnl);
      }

      setProfit(dayProfit);
      setLoss(dayLoss);
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

  return {
    profit,
    loss,
    net: profit - loss,
    loading,
    refresh,
  };
}
