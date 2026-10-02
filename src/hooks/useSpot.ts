/**
 * Página Spot — exchanges, bots, moedas e preferência ON/OFF.
 * O toggle só grava a preferência (PUT /spot/preferences); não envia ordens.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { SpotBot, SpotCoinsResponse, SpotVenue } from '../types/spot';
import { withPreference } from '../utils/spotView';

const PREF_ERRORS: Record<string, string> = {
  PREFERENCES_UNAVAILABLE: 'As preferências ainda não estão disponíveis no servidor.',
  EXCHANGE_NOT_SUPPORTED: 'Esta exchange não suporta bots Spot.',
  BOT_NOT_SUPPORTED: 'Este bot não está disponível nesta exchange.',
};

function apiError(err: unknown, fallback: string): string {
  const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return (code && PREF_ERRORS[code]) || fallback;
}

export function useSpot(pollMs = 60_000) {
  const [venues, setVenues] = useState<SpotVenue[]>([]);
  const [bots, setBots] = useState<SpotBot[]>([]);
  const [exchange, setExchange] = useState('BINANCE');
  const [bot, setBot] = useState('MOMENTUM_ROTATION');
  const [coins, setCoins] = useState<SpotCoinsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const loadMeta = useCallback(async () => {
    try {
      const [v, b] = await Promise.all([
        api.get<{ venues: SpotVenue[] }>('/spot/venues'),
        api.get<{ bots: SpotBot[] }>('/spot/bots'),
      ]);
      setVenues(v.data.venues ?? []);
      setBots(b.data.bots ?? []);
    } catch {
      setError('Não foi possível ler as exchanges.');
    }
  }, []);

  const loadCoins = useCallback(async () => {
    try {
      const res = await api.get<SpotCoinsResponse>('/spot/coins', { params: { exchange, bot } });
      setCoins(res.data);
      setError('');
    } catch (err) {
      setCoins(null);
      setError(apiError(err, 'Não foi possível ler as moedas.'));
    } finally {
      setLoading(false);
    }
  }, [exchange, bot]);

  useEffect(() => {
    const id = window.setTimeout(() => void loadMeta(), 0);
    return () => window.clearTimeout(id);
  }, [loadMeta]);

  useEffect(() => {
    const startId = window.setTimeout(() => void loadCoins(), 0);
    const id = window.setInterval(() => void loadCoins(), pollMs);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(id);
    };
  }, [loadCoins, pollMs]);

  const toggle = useCallback(
    async (symbol: string, enabled: boolean) => {
      const patch = (on: boolean) =>
        setCoins((prev) =>
          prev ? { ...prev, coins: prev.coins.map((c) => (c.symbol === symbol ? withPreference(c, on) : c)) } : prev
        );
      setPending((p) => ({ ...p, [symbol]: true }));
      patch(enabled);
      try {
        await api.put('/spot/preferences', { exchange, bot, symbol, enabled });
        setError('');
      } catch (err) {
        patch(!enabled);
        setError(apiError(err, 'Não foi possível guardar a preferência.'));
      } finally {
        setPending((p) => ({ ...p, [symbol]: false }));
      }
    },
    [exchange, bot]
  );

  return { venues, bots, exchange, setExchange, bot, setBot, coins, loading, error, pending, toggle, reload: loadCoins };
}
