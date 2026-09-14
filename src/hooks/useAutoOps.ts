/**
 * Hook + helpers Auto-Ops.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type {
  AutoOpsExecMode,
  AutoOpsModule,
  AutoOpsModuleId,
} from '../types/autoOps';

export function fmtVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtAge(ms?: number): string {
  if (ms == null || ms < 0) return '—';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 48) return `${h}h ${rm}m`;
  return `${Math.floor(h / 24)}d`;
}

export function stateLabel(s: string): string {
  if (s === 'IN') return 'EM POSIÇÃO';
  if (s === 'PAPER') return 'PAPER';
  if (s === 'REAL') return 'REAL';
  if (s === 'STABLE') return 'MODO ESTÁVEIS';
  if (s === 'KILL') return 'KILL SWITCH';
  if (s === 'OFF') return 'OFF';
  if (s === 'AUTO') return 'AUTO';
  return s;
}

export function badgeClass(tone: string): string {
  if (tone === 'green') return 'border-cyan-30 bg-cyan-dim text-cyan';
  if (tone === 'red') return 'border-red-30 bg-red-dim text-red';
  return 'border-border2 text-text3';
}

export function useAutoOps(moduleId?: AutoOpsModuleId) {
  const [modules, setModules] = useState<AutoOpsModule[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyToggle, setBusyToggle] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<{
        scannedAt: string | null;
        modules: AutoOpsModule[];
      }>('/auto-ops/status');
      setModules(data.modules || []);
      setScannedAt(data.scannedAt);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Auto-Ops indisponível');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 4500);
  };

  const module = moduleId
    ? modules.find((m) => m.id === moduleId) || null
    : null;

  const enableOn = async (allocationUsdt: number) => {
    if (!module) throw new Error('módulo em falta');
    setBusyToggle(true);
    try {
      const { data } = await api.post<{ toast?: string }>(
        `/auto-ops/${module.id}/toggle`,
        { enabled: true, allocationUsdt }
      );
      await load();
      showFlash(data.toast || `AUTO ON · $${allocationUsdt}`);
    } finally {
      setBusyToggle(false);
    }
  };

  const disableOff = async (input: {
    cancelOrders: boolean;
    positionAction: 'keep' | 'close';
  }) => {
    if (!module) throw new Error('módulo em falta');
    setBusyToggle(true);
    try {
      const { data } = await api.post<{ toast?: string }>(
        `/auto-ops/${module.id}/toggle`,
        {
          enabled: false,
          cancelOrders: input.cancelOrders,
          positionAction: input.positionAction,
        }
      );
      await load();
      showFlash(data.toast || 'AUTO OFF confirmado');
    } finally {
      setBusyToggle(false);
    }
  };

  const setMode = async (mode: AutoOpsExecMode) => {
    if (!module) return;
    try {
      await api.post(`/auto-ops/${module.id}/mode`, { mode });
      await load();
      showFlash(`Modo ${mode}`);
    } catch (err: any) {
      showFlash(
        err?.response?.data?.error || 'Não foi possível mudar o modo'
      );
    }
  };

  const manualEnter = async (input: {
    symbol: string;
    allocationUsdt: number;
    tpPrice?: number;
    slPrice?: number;
  }) => {
    if (!module) return { ok: false, reason: 'módulo em falta' };
    try {
      const { data } = await api.post<{
        ok: boolean;
        reason: string;
        capacityWarning?: string | null;
      }>(`/auto-ops/${module.id}/manual-enter`, input);
      if (data.ok) await load();
      return data;
    } catch (err: any) {
      return {
        ok: false,
        reason:
          err?.response?.data?.reason ||
          err?.response?.data?.error ||
          'Falha na entrada',
        capacityWarning: err?.response?.data?.capacityWarning,
      };
    }
  };

  return {
    modules,
    module,
    scannedAt,
    loading,
    error,
    busyToggle,
    flash,
    showFlash,
    load,
    enableOn,
    disableOff,
    setMode,
    manualEnter,
  };
}
