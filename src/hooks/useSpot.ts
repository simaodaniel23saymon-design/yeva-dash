/**
 * Página Spot — exchanges, catálogo de bots, moedas (Top Winners / Minhas / Pesquisa) e configuração.
 * ATIVAR só grava preferência + configuração (PUT /spot/preferences); DESATIVAR não fecha posições.
 * Nenhum pedido daqui envia ordens.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type {
  BotCatalogEntry,
  BotConfigError,
  BotConfigState,
  BotConfigResponse,
  BotPreviewResponse,
  SpotCoin,
  SpotCoinsResponse,
  SpotSearchResponse,
  SpotVenue,
} from '../types/spot';
import { withPreference } from '../utils/spotView';

const PREF_ERRORS: Record<string, string> = {
  PREFERENCES_UNAVAILABLE: 'As preferências ainda não estão disponíveis no servidor.',
  EXCHANGE_NOT_SUPPORTED: 'Esta exchange não suporta bots Spot.',
  BOT_NOT_SUPPORTED: 'Este bot não está disponível nesta exchange.',
  BOT_NOT_CONFIGURABLE: 'Este bot não pode ser configurado aqui.',
  CONFIG_REQUIRED: 'Configura o bot antes de ativar.',
  CONFIG_INVALID: 'A configuração tem valores inválidos.',
  ACTIVATION_BLOCKED: 'Configuração incompleta: guardada como rascunho não pode ser ativada.',
  SYMBOL_CATALOG_UNAVAILABLE: 'Não foi possível atualizar a lista de moedas da exchange.',
};

function apiError(err: unknown, fallback: string): string {
  const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return (code && PREF_ERRORS[code]) || fallback;
}

function apiConfigErrors(err: unknown): BotConfigError[] {
  const errors = (err as { response?: { data?: { errors?: BotConfigError[] } } })?.response?.data?.errors;
  return Array.isArray(errors) ? errors : [];
}

export type SpotTab = 'TOP_WINNERS' | 'MY_COINS' | 'SEARCH';

export function useSpot(pollMs = 60_000) {
  const [venues, setVenues] = useState<SpotVenue[]>([]);
  const [catalog, setCatalog] = useState<BotCatalogEntry[]>([]);
  const [exchange, setExchange] = useState('BINANCE');
  const [bot, setBot] = useState('MOMENTUM_ROTATION');
  const [coins, setCoins] = useState<SpotCoinsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [searchResults, setSearchResults] = useState<SpotCoin[] | null>(null);
  const [searching, setSearching] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const [v, b] = await Promise.all([
        api.get<{ venues: SpotVenue[] }>('/spot/venues'),
        api.get<{ catalog?: BotCatalogEntry[] }>('/spot/bots', { params: { exchange } }),
      ]);
      setVenues(v.data.venues ?? []);
      setCatalog(b.data.catalog ?? []);
    } catch {
      setError('Não foi possível atualizar os dados.');
    }
  }, [exchange]);

  const loadCoins = useCallback(async () => {
    try {
      const res = await api.get<SpotCoinsResponse>('/spot/coins', { params: { exchange, bot } });
      setCoins(res.data);
      setError('');
    } catch (err) {
      setCoins(null);
      setError(apiError(err, 'Não foi possível atualizar os dados.'));
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

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const res = await api.get<SpotSearchResponse>('/spot/search', { params: { exchange, bot, q } });
        setSearchResults(res.data.results ?? []);
      } catch (err) {
        setSearchResults(null);
        setError(apiError(err, 'Não foi possível atualizar os dados.'));
      } finally {
        setSearching(false);
      }
    },
    [exchange, bot]
  );

  const loadConfig = useCallback(
    async (symbol: string) => (await api.get<BotConfigResponse>('/spot/bot-config', { params: { exchange, bot, symbol } })).data,
    [exchange, bot]
  );

  /** Valida no backend e devolve o resumo de risco. Não grava. */
  const previewConfig = useCallback(async (config: Record<string, unknown>) => (await api.post<BotPreviewResponse>('/spot/bot-config/preview', { config })).data, []);

  const patchCoin = useCallback((symbol: string, on: boolean) => {
    const apply = (list: SpotCoin[]) => list.map((c) => (c.symbol === symbol ? withPreference(c, on) : c));
    setCoins((prev) => (prev ? { ...prev, coins: apply(prev.coins) } : prev));
    setSearchResults((prev) => (prev ? apply(prev) : prev));
  }, []);

  /** ATIVAR: grava a configuração e liga a moeda para este bot. Sem ordens. */
  const activate = useCallback(
    async (symbol: string, config: Record<string, unknown>): Promise<{ ok: true } | { ok: false; message: string; errors: BotConfigError[] }> => {
      setPending((p) => ({ ...p, [symbol]: true }));
      try {
        await api.put('/spot/preferences', { exchange, bot, symbol, enabled: true, config });
        patchCoin(symbol, true);
        setError('');
        void loadCoins();
        return { ok: true };
      } catch (err) {
        return { ok: false, message: apiError(err, 'Não foi possível guardar a configuração.'), errors: apiConfigErrors(err) };
      } finally {
        setPending((p) => ({ ...p, [symbol]: false }));
      }
    },
    [exchange, bot, patchCoin, loadCoins]
  );

  /** Guardar rascunho: grava a configuração (pode estar incompleta) e deixa a moeda OFF. Sem ordens. */
  const saveDraft = useCallback(
    async (symbol: string, config: Record<string, unknown>): Promise<{ ok: true; configState: BotConfigState | null } | { ok: false; message: string; errors: BotConfigError[] }> => {
      setPending((p) => ({ ...p, [symbol]: true }));
      try {
        const res = await api.put<{ configState: BotConfigState | null }>('/spot/preferences', { exchange, bot, symbol, enabled: false, config });
        patchCoin(symbol, false);
        setError('');
        void loadCoins();
        return { ok: true, configState: res.data.configState ?? null };
      } catch (err) {
        return { ok: false, message: apiError(err, 'Não foi possível guardar o rascunho.'), errors: apiConfigErrors(err) };
      } finally {
        setPending((p) => ({ ...p, [symbol]: false }));
      }
    },
    [exchange, bot, patchCoin, loadCoins]
  );

  /** DESATIVAR: só desliga a preferência. Mantém a configuração e não fecha a posição. */
  const deactivate = useCallback(
    async (symbol: string) => {
      setPending((p) => ({ ...p, [symbol]: true }));
      patchCoin(symbol, false);
      try {
        await api.put('/spot/preferences', { exchange, bot, symbol, enabled: false });
        setError('');
      } catch (err) {
        patchCoin(symbol, true);
        setError(apiError(err, 'Não foi possível guardar a preferência.'));
      } finally {
        setPending((p) => ({ ...p, [symbol]: false }));
      }
    },
    [exchange, bot, patchCoin]
  );

  return {
    venues,
    catalog,
    exchange,
    setExchange,
    bot,
    setBot,
    coins,
    loading,
    error,
    pending,
    search,
    searching,
    searchResults,
    loadConfig,
    previewConfig,
    activate,
    saveDraft,
    deactivate,
    reload: loadCoins,
  };
}
