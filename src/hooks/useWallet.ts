import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatUSDT, toUSDT } from '../utils/format';

export interface WalletData {
  balance: number;
  lockedBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalFeesPaid?: number;
}

export function useWallet(pollMs = 0) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Fonte principal — endpoint de carteira (sempre disponível)
      const res = await api.get<WalletData>('/wallet');
      setWallet(res.data);
      setError(null);
    } catch {
      // Fallback — painel vivo (se o backend expuser wallet aqui)
      try {
        const res = await api.get<{ wallet?: WalletData }>('/bots/status');
        if (res.data.wallet) {
          setWallet(res.data.wallet);
          setError(null);
        } else {
          setError('Não foi possível carregar o saldo');
        }
      } catch {
        setError('Não foi possível carregar o saldo');
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh().finally(() => { if (active) setLoading(false); });

    if (pollMs > 0) {
      const id = setInterval(refresh, pollMs);
      return () => { active = false; clearInterval(id); };
    }
    return () => { active = false; };
  }, [refresh, pollMs]);

  return {
    wallet,
    loading,
    error,
    refresh,
    formatUSDT: (v?: number | null) => formatUSDT(v ?? wallet?.balance),
    toUSDT,
  };
}
