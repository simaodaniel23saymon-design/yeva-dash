/**
 * Ranking + métricas Momentum — só leitura.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import {
  isRankingScanStale,
  splitWinnersLosers,
  type MomentumRankingRow,
  type SymbolHistoryMetrics,
} from '../utils/momentumRankingView';

export type MomentumMetricsBySymbol = Record<string, SymbolHistoryMetrics>;

export function useMomentumRanking(pollMs = 60_000) {
  const [items, setItems] = useState<MomentumRankingRow[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [staleFlag, setStaleFlag] = useState(false);
  const [history, setHistory] = useState<MomentumMetricsBySymbol>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [rankRes, metricsRes] = await Promise.all([
        api.get<{
          ok?: boolean;
          error?: string;
          items?: MomentumRankingRow[];
          scannedAt?: string | null;
          stale?: boolean;
        }>('/auto-ops/momentum/ranking', {
          params: { side: 'ALL', limit: 20 },
          timeout: 60_000,
        }),
        api
          .get<{
            ok?: boolean;
            all?: {
              bySymbol?: Record<
                string,
                { mfe?: number | null; mae?: number | null }
              >;
            };
          }>('/auto-ops/momentum/metrics', { timeout: 20_000 })
          .catch(() => ({
            data: {
              ok: false as const,
              all: { bySymbol: {} as Record<string, { mfe?: number | null; mae?: number | null }> },
            },
          })),
      ]);

      const data = rankRes.data;
      if (data?.ok === false) {
        setItems([]);
        setScannedAt(data.scannedAt ?? null);
        setStaleFlag(true);
        setError(data.error || 'Ranking indisponível');
        return;
      }
      setItems(data.items || []);
      setScannedAt(data.scannedAt ?? null);
      setStaleFlag(Boolean(data.stale) || isRankingScanStale(data.scannedAt));

      const bySym = metricsRes.data?.all?.bySymbol || {};
      const hist: MomentumMetricsBySymbol = {};
      for (const [sym, row] of Object.entries(bySym)) {
        hist[sym] = {
          mfe: row?.mfe ?? null,
          mae: row?.mae ?? null,
        };
      }
      setHistory(hist);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax?.response?.data?.error || 'Erro ao carregar ranking Momentum');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const startId = window.setTimeout(() => {
      void load();
    }, 0);
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(id);
    };
  }, [load, pollMs]);

  const { winners, losers } = useMemo(() => splitWinnersLosers(items), [items]);
  const stale = staleFlag || isRankingScanStale(scannedAt);

  return {
    winners,
    losers,
    scannedAt,
    stale,
    history,
    loading,
    error,
    reload: load,
  };
}
