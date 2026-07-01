import type { BotConfig } from '../types/trading';
import { mergeProConfig } from './proTrading';

export interface CreateBotPayload {
  pair: string;
  market: string;
  mode: string;
  riskMode: string;
  leverage: number;
  capitalPerSide: number;
  ordersPerSide: number;
  spacing: number;
  tpDailyPct: number;
  maxLossPct: number;
  trailingStopEnabled: boolean;
  trailingStopActivation: number;
  trailingStopCallback: number;
  minProfitUsdt: number;
  dynamicSpacingEnabled: boolean;
  trailingStopActivationUsdt: number;
  trailingStopCallbackUsdt: number;
}

/** Payload alinhado com POST /api/bots do backend */
export function buildCreateBotPayload(
  pair: string,
  market: string,
  riskMode: string,
  leverage: number,
  capitalPerSide: number,
  proConfig?: BotConfig,
  options?: { mode?: string; ordersPerSide?: number; spacing?: number },
): CreateBotPayload {
  const c = mergeProConfig(proConfig);
  const ordersPerSide = options?.ordersPerSide
    ?? Math.max(c.maxLongPositions, c.maxShortPositions, 30);
  const spacing = options?.spacing ?? c.gridSpacing ?? 0.3;

  return {
    pair: pair.toUpperCase(),
    market,
    mode: options?.mode ?? 'One-way',
    riskMode,
    leverage: Math.round(Number(leverage)),
    capitalPerSide: Number(capitalPerSide),
    ordersPerSide: Math.round(ordersPerSide),
    spacing: Number(Number(spacing).toFixed(2)),
    tpDailyPct: Number(c.tpDailyPct ?? 1.5),
    maxLossPct: Number(c.maxLossPct ?? 3.0),
    trailingStopEnabled: c.trailingStopEnabled !== false,
    trailingStopActivation: Number(c.trailingStopActivation ?? 1.0),
    trailingStopCallback: Number(c.trailingStopCallback ?? 0.5),
    minProfitUsdt: Number(c.minProfitUsdt ?? 2),
    dynamicSpacingEnabled: c.dynamicSpacingEnabled !== false,
    trailingStopActivationUsdt: Number(c.trailingStopActivationUsdt ?? c.minProfitUsdt ?? 1),
    trailingStopCallbackUsdt: Number(c.trailingStopCallbackUsdt ?? 0.5),
  };
}
