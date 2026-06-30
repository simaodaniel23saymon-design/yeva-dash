import { useCallback, useEffect, useState } from 'react';
import { fetchBotsList, fetchExchangePositions, type LiveBot } from '../utils/liveData';
import type { BotConfig } from '../types/trading';

function pickRunning(bots: LiveBot[]): LiveBot | null {
  const running = bots.filter(b => String(b.status).toLowerCase() === 'running');
  return running[0] ?? bots[0] ?? null;
}

/** Configuração real derivada dos bots do utilizador (sem defaults fictícios) */
export function botToProConfig(bot: LiveBot): BotConfig {
  const orders = Number(bot.ordersPerSide ?? 0);
  return {
    maxLongPositions: orders || undefined,
    maxShortPositions: orders || undefined,
    gridSpacing: bot.spacing,
    trailingStopEnabled: undefined,
    trailingStopActivation: undefined,
    timeframes: undefined,
    requireAllTimeframes: undefined,
    minLiquidity: undefined,
  };
}

export function useActiveBotConfig(pollMs = 30000) {
  const [bot, setBot] = useState<LiveBot | null>(null);
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [longCount, setLongCount] = useState(0);
  const [shortCount, setShortCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [bots, positions] = await Promise.all([
        fetchBotsList(),
        fetchExchangePositions(),
      ]);
      const active = pickRunning(bots);
      setBot(active);
      setConfig(active ? botToProConfig(active) : null);
      setLongCount(positions.filter(p => {
        const side = String(p.positionSide ?? '').toUpperCase();
        return side.includes('LONG') || (Number(p.positionAmt) > 0 && !side.includes('SHORT'));
      }).length);
      setShortCount(positions.filter(p => {
        const side = String(p.positionSide ?? '').toUpperCase();
        return side.includes('SHORT') || Number(p.positionAmt) < 0;
      }).length);
    } catch {
      setBot(null);
      setConfig(null);
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

  return { bot, config, longCount, shortCount, loading, refresh };
}
