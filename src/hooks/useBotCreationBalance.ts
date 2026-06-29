import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatMoney, toUSDT } from '../utils/format';

export interface BotEligibilityData {
  eligible: boolean;
  balance: number;
  isDemo: boolean;
  minimumRequired: number;
  message: string;
}

type BotEligibilityRaw = Record<string, unknown>;

function pickBool(raw: BotEligibilityRaw, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) return Boolean(value);
  }
  return false;
}

function pickNum(raw: BotEligibilityRaw, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) {
      const n = Number(value);
      return Number.isFinite(n) ? toUSDT(n) : 0;
    }
  }
  return 0;
}

function pickStr(raw: BotEligibilityRaw, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return '';
}

export function normalizeBotEligibility(raw: BotEligibilityRaw): BotEligibilityData {
  const isDemo = pickBool(raw, 'isDemo', 'is_demo');
  const eligible = pickBool(raw, 'eligible');

  return {
    eligible: isDemo || eligible,
    balance: pickNum(raw, 'balance'),
    isDemo,
    minimumRequired: pickNum(raw, 'minimumRequired', 'minimum_required'),
    message: pickStr(raw, 'message'),
  };
}

export async function fetchBotEligibility(): Promise<BotEligibilityData | null> {
  try {
    const res = await api.get<BotEligibilityRaw>('/bots/check-eligibility');
    return normalizeBotEligibility(res.data);
  } catch {
    return null;
  }
}

export function useBotEligibility(pollMs = 30000) {
  const [isEligible, setIsEligible] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [minimumRequired, setMinimumRequired] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const applyEligibility = useCallback((data: BotEligibilityData | null) => {
    if (data) {
      setIsEligible(data.eligible);
      setBalance(data.balance);
      setIsDemo(data.isDemo);
      setMinimumRequired(data.minimumRequired);
      setMessage(data.eligible ? '' : (data.message || 'Saldo insuficiente para criar bots.'));
      return data;
    }

    setIsEligible(false);
    setBalance(0);
    setIsDemo(false);
    setMinimumRequired(0);
    setMessage('Não foi possível verificar elegibilidade para criar bots.');
    return null;
  }, []);

  const refresh = useCallback(async (): Promise<BotEligibilityData | null> => {
    try {
      const data = await fetchBotEligibility();
      return applyEligibility(data);
    } catch {
      applyEligibility(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyEligibility]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh().finally(() => { if (active) setLoading(false); });

    if (pollMs <= 0) return () => { active = false; };

    const id = setInterval(refresh, pollMs);
    return () => { active = false; clearInterval(id); };
  }, [refresh, pollMs]);

  const balanceLabel = isDemo
    ? `Conta Demo - Saldo: ${formatMoney(balance)}`
    : `Saldo Carteira: ${formatMoney(balance)}`;

  return {
    isEligible,
    isDemo,
    balance,
    minimumRequired,
    message,
    loading,
    refresh,
    balanceLabel,
    hasInsufficientBalance: !isEligible,
    insufficientMessage: message,
  };
}

/** @deprecated Usar useBotEligibility */
export const useBotCreationBalance = useBotEligibility;
