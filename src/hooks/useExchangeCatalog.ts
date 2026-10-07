/**
 * Catálogo único de exchanges (GET /spot/venues). Usado pelo Exchange Hub, Dashboard e Futures.
 * Erro ⇒ lista vazia + mensagem; nunca um catálogo inventado no browser.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { SecurityLayerInfo, SpotVenue, SpotVenuesResponse } from '../types/spot';

export function useExchangeCatalog() {
  const [venues, setVenues] = useState<SpotVenue[]>([]);
  const [securityLayer, setSecurityLayer] = useState<SecurityLayerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api.get<SpotVenuesResponse>('/spot/venues');
      setVenues(r.data.venues ?? []);
      setSecurityLayer(r.data.securityLayer ?? null);
      setError('');
    } catch {
      setError('Não foi possível ler as exchanges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  return { venues, securityLayer, loading, error, reload: load };
}
