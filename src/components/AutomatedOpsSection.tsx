/**
 * Operações Automatizadas — Gainers / Losers / Estáveis.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export type AutoOpsModuleId = 'gainers' | 'losers' | 'stable';

type Trigger = { label: string; tone: 'green' | 'red' | 'neutral' };

type Candidate = {
  symbol: string;
  change24hPct: number;
  quoteVolume24h: number;
  regime: string;
  price: number;
  trigger: Trigger;
};

type StableCycle = {
  id: string;
  symbol: string;
  side: string;
  avgEntry: number;
  stableMode: boolean;
  openedAt: string;
};

type ModuleCard = {
  id: AutoOpsModuleId;
  emoji: string;
  label: string;
  title: string;
  enabled: boolean;
  state: string;
  open: {
    symbol: string;
    side: string;
    entryPrice: number;
    unrealizedPnl: number | null;
  } | null;
  modulePnl: number;
  autoBadge: string | null;
  candidates: Candidate[];
  rules: { title: string; side: string; bullets: string[] };
  stable?: {
    pairs: string[];
    preset: { deviationPct: number; takeProfitPct: number; stopLossPct: number };
    bidirectional: boolean;
    activeCycles: StableCycle[];
    cyclesCount: number;
  };
};

function fmtVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function stateLabel(s: string): string {
  if (s === 'IN') return 'EM POSIÇÃO';
  if (s === 'PAPER') return 'PAPER';
  if (s === 'PAPER_SOON') return 'PAPER (em breve)';
  if (s === 'STABLE') return 'MODO ESTÁVEIS';
  if (s === 'KILL') return 'KILL SWITCH';
  if (s === 'OFF') return 'OFF';
  if (s === 'AUTO') return 'AUTO';
  return s;
}

function triggerClass(tone: string): string {
  if (tone === 'green') return 'border-cyan-30 bg-cyan-dim text-cyan';
  if (tone === 'red') return 'border-red-30 bg-red-dim text-red';
  return 'border-border2 text-text3';
}

export function AutomatedOpsSection({
  onSelectSymbol,
}: {
  onSelectSymbol?: (symbol: string) => void;
}) {
  const [modules, setModules] = useState<ModuleCard[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyToggle, setBusyToggle] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // manual enter modal
  const [pending, setPending] = useState<{
    module: AutoOpsModuleId;
    symbol: string;
    rules: ModuleCard['rules'];
  } | null>(null);
  const [capacityWarning, setCapacityWarning] = useState<string>('');
  const [enterBusy, setEnterBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<{
        scannedAt: string | null;
        modules: ModuleCard[];
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
    window.setTimeout(() => setFlash(null), 4000);
  };

  const onToggle = async (m: ModuleCard) => {
    setBusyToggle(m.id);
    try {
      await api.post(`/auto-ops/${m.id}/toggle`, { enabled: !m.enabled });
      await load();
      showFlash(`${m.label}: ${!m.enabled ? 'AUTO ON' : 'AUTO OFF'}`);
    } catch (err: any) {
      showFlash(err?.response?.data?.error || 'Falha no toggle');
    } finally {
      setBusyToggle(null);
    }
  };

  const openManual = async (m: ModuleCard, symbol: string) => {
    setPending({ module: m.id, symbol, rules: m.rules });
    setCapacityWarning('');
    try {
      const cap = await api.get<{ exceeds?: boolean; warning?: string | null }>(
        '/bots/capacity-check',
        { params: { capitalPerSide: 20, leverage: 3, market: 'FUTURES', adding: 1 } }
      );
      const warn =
        cap.data.warning ||
        'Aviso de capacidade: confirma se a banca aguenta esta entrada em paralelo com bots DCA.';
      setCapacityWarning(warn);
    } catch {
      setCapacityWarning(
        'Não foi possível verificar a banca — podes continuar na mesma (não bloqueia).'
      );
    }
  };

  const confirmManual = async () => {
    if (!pending) return;
    setEnterBusy(true);
    try {
      const { data } = await api.post<{
        ok: boolean;
        reason: string;
        capacityWarning?: string | null;
        open?: { symbol: string };
      }>(`/auto-ops/${pending.module}/manual-enter`, {
        symbol: pending.symbol,
      });
      if (data.capacityWarning) setCapacityWarning(data.capacityWarning);
      if (data.ok) {
        showFlash(`Entrada ${pending.symbol}: ${data.reason}`);
        onSelectSymbol?.(pending.symbol);
        setPending(null);
        await load();
      } else {
        showFlash(data.reason || 'Não abriu');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.reason ||
        err?.response?.data?.error ||
        'Falha na entrada';
      showFlash(msg);
      if (err?.response?.status === 409) setPending(null);
    } finally {
      setEnterBusy(false);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-text1 font-bold text-base">Operações Automatizadas</h3>
          <p className="font-mono text-[9px] text-text3 uppercase tracking-wider">
            Gainers · Losers · Estáveis · máx 1 auto / módulo
            {scannedAt
              ? ` · radar ${new Date(scannedAt).toLocaleTimeString('pt-PT')}`
              : ''}
          </p>
        </div>
        {flash && (
          <span className="font-mono text-[10px] text-cyan border border-cyan-30 bg-cyan-dim px-2 py-1">
            {flash}
          </span>
        )}
      </div>

      {error && (
        <p className="font-mono text-[10px] text-red border border-red-30 bg-red-dim px-2 py-1.5">
          {error}
        </p>
      )}

      {loading && (
        <p className="font-mono text-[10px] text-text3">A carregar módulos…</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {modules.map((m) => (
          <div
            key={m.id}
            className="bg-bg1 border border-border1 p-4 space-y-3 flex flex-col"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-text1 font-bold text-sm">
                  {m.emoji} {m.label}
                </h4>
                <span className="font-mono text-[8px] uppercase tracking-wider text-text3">
                  {stateLabel(m.state)}
                </span>
              </div>
              <button
                type="button"
                disabled={busyToggle === m.id || m.state === 'KILL'}
                onClick={() => void onToggle(m)}
                className={`font-mono text-[9px] uppercase px-2.5 py-1 border transition-colors disabled:opacity-40 ${
                  m.enabled
                    ? 'border-cyan-30 bg-cyan-dim text-cyan'
                    : 'border-border2 text-text3'
                }`}
              >
                {m.id === 'stable'
                  ? m.enabled
                    ? 'MODO ON'
                    : 'MODO OFF'
                  : m.enabled
                    ? 'AUTO ON'
                    : 'AUTO OFF'}
              </button>
            </div>

            {(m.autoBadge || m.open) && (
              <div className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-cyan-30 bg-cyan-dim text-cyan">
                {m.autoBadge || `AUTO EM: ${m.open!.symbol}`}
              </div>
            )}

            {m.id === 'stable' && m.stable && (
              <div className="space-y-2">
                <p className="font-mono text-[9px] text-text2">
                  Preset · dev {m.stable.preset.deviationPct}% · TP{' '}
                  {m.stable.preset.takeProfitPct}% · SL{' '}
                  {m.stable.preset.stopLossPct}%
                  {m.stable.bidirectional ? ' · LONG+SHORT' : ' · LONG'}
                </p>
                <p className="font-mono text-[8px] text-text3 uppercase tracking-wider">
                  Ciclos activos ({m.stable.cyclesCount})
                </p>
                {m.stable.activeCycles.length === 0 ? (
                  <p className="font-mono text-[10px] text-text3">
                    Nenhum ciclo DCA nos majores
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {m.stable.activeCycles.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-2 font-mono text-[10px] border border-border2 px-2 py-1"
                      >
                        <button
                          type="button"
                          className="text-text1 hover:text-cyan font-semibold"
                          onClick={() => onSelectSymbol?.(c.symbol)}
                        >
                          {c.side} {c.symbol.replace('USDT', '')}
                        </button>
                        <span className="text-text3">
                          @ {c.avgEntry > 10 ? c.avgEntry.toFixed(2) : c.avgEntry.toFixed(4)}
                          {c.stableMode ? ' · preset' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="border border-border2 p-2">
                <div className="text-text3 text-[8px] uppercase">
                  {m.id === 'stable' ? 'Ciclos' : 'Posição'}
                </div>
                <div className="text-text1">
                  {m.id === 'stable'
                    ? `${m.stable?.cyclesCount ?? 0} activos`
                    : m.open
                      ? `${m.open.side} ${m.open.symbol}`
                      : '—'}
                </div>
                {m.open?.unrealizedPnl != null && m.id !== 'stable' && (
                  <div
                    className={
                      m.open.unrealizedPnl >= 0 ? 'text-cyan' : 'text-red'
                    }
                  >
                    uPnL ${m.open.unrealizedPnl.toFixed(2)}
                  </div>
                )}
              </div>
              <div className="border border-border2 p-2">
                <div className="text-text3 text-[8px] uppercase">PnL módulo</div>
                <div
                  className={
                    m.modulePnl >= 0 ? 'text-cyan' : 'text-red'
                  }
                >
                  ${m.modulePnl.toFixed(2)}
                </div>
              </div>
            </div>

            {m.id !== 'stable' && (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left font-mono text-[10px]">
                <thead>
                  <tr className="text-text3 border-b border-border2">
                    <th className="py-1 pr-1 font-medium">Par</th>
                    <th className="py-1 pr-1 font-medium">24h</th>
                    <th className="py-1 pr-1 font-medium">Trigger</th>
                    <th className="py-1 pr-1 font-medium">Vol</th>
                    <th className="py-1 pr-1 font-medium">Reg</th>
                    <th className="py-1 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {m.candidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-2 text-text3">
                        Sem candidatos no radar
                      </td>
                    </tr>
                  ) : (
                    m.candidates.map((c) => (
                      <tr key={c.symbol} className="border-b border-border1/60">
                        <td className="py-1.5 pr-1 text-text1 font-semibold">
                          <button
                            type="button"
                            className="hover:text-cyan"
                            onClick={() => onSelectSymbol?.(c.symbol)}
                          >
                            {c.symbol.replace('USDT', '')}
                          </button>
                        </td>
                        <td
                          className={`py-1.5 pr-1 ${
                            c.change24hPct >= 0 ? 'text-cyan' : 'text-red'
                          }`}
                        >
                          {c.change24hPct >= 0 ? '+' : ''}
                          {c.change24hPct.toFixed(1)}%
                        </td>
                        <td className="py-1.5 pr-1">
                          <span
                            className={`inline-block px-1 py-0.5 border text-[8px] uppercase ${triggerClass(
                              c.trigger.tone
                            )}`}
                          >
                            {c.trigger.label}
                          </span>
                        </td>
                        <td className="py-1.5 pr-1 text-text2">
                          {fmtVol(c.quoteVolume24h)}
                        </td>
                        <td className="py-1.5 pr-1 text-text2">{c.regime}</td>
                        <td className="py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => void openManual(m, c.symbol)}
                            className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text2 hover:border-cyan hover:text-cyan"
                          >
                            Entrar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
            {m.id === 'stable' && (
              <p className="font-mono text-[9px] text-text3 leading-relaxed">
                Majors: {(m.stable?.pairs || []).map((p) => p.replace('USDT', '')).join(', ')}.
                Liga o modo para novos ciclos DCA nestes pares usarem o preset lento.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Modal: regras + capacity (não bloqueia) */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-bg1 border border-border1 max-w-md w-full p-5 space-y-4">
            <h3 className="text-text1 font-bold text-base">
              Entrar manual · {pending.symbol}
            </h3>
            <p className="font-mono text-[11px] text-text2">{pending.rules.title}</p>
            <ul className="space-y-1 font-mono text-[10px] text-text2 list-disc pl-4">
              {pending.rules.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {capacityWarning && (
              <div className="border border-gold-30 bg-gold-dim p-3 font-mono text-[10px] text-gold leading-relaxed whitespace-pre-wrap">
                <p className="uppercase tracking-wider text-[8px] mb-1">
                  Capacidade da banca (aviso)
                </p>
                {capacityWarning}
              </div>
            )}
            <p className="font-mono text-[9px] text-text3">
              Side {pending.rules.side} · paper · o aviso não bloqueia a entrada.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={enterBusy}
                className="px-3 py-2 border border-border2 text-text2 font-mono text-[11px] uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmManual()}
                disabled={enterBusy}
                className="px-3 py-2 border border-cyan text-cyan font-mono text-[11px] uppercase hover:bg-cyan-dim disabled:opacity-40"
              >
                {enterBusy ? 'A abrir…' : 'Confirmar entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
