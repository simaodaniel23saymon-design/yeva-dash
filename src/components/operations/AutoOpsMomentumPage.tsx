/**
 * Página módulo Gainers / Losers — top 10 REAL, AUTO, posição, feed, Entrar.
 */

import { useState } from 'react';
import {
  badgeClass,
  fmtVol,
  stateLabel,
  useAutoOps,
} from '../../hooks/useAutoOps';
import type { AutoOpsModuleId } from '../../types/autoOps';
import { OperationsSubNav } from './OperationsSubNav';
import { AutoOpsPositionCard } from './AutoOpsPositionCard';
import { AutoOpsActionFeed } from './AutoOpsActionFeed';

export function AutoOpsMomentumPage({
  moduleId,
}: {
  moduleId: Extract<AutoOpsModuleId, 'gainers' | 'losers'>;
}) {
  const {
    module,
    scannedAt,
    loading,
    error,
    busyToggle,
    flash,
    showFlash,
    onToggle,
    manualEnter,
    capacityCheck,
  } = useAutoOps(moduleId);

  const [pending, setPending] = useState<string | null>(null);
  const [capacityWarning, setCapacityWarning] = useState('');
  const [enterBusy, setEnterBusy] = useState(false);

  const openManual = async (symbol: string) => {
    setPending(symbol);
    setCapacityWarning(await capacityCheck());
  };

  const confirmManual = async () => {
    if (!pending) return;
    setEnterBusy(true);
    try {
      const data = await manualEnter(pending);
      if (data.capacityWarning) setCapacityWarning(data.capacityWarning);
      if (data.ok) {
        showFlash(`Entrada ${pending}: ${data.reason}`);
        setPending(null);
      } else {
        showFlash(data.reason || 'Não abriu');
      }
    } finally {
      setEnterBusy(false);
    }
  };

  const title = moduleId === 'gainers' ? 'Gainers' : 'Losers';

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h2 className="text-text1 font-bold text-lg">Operações</h2>
        <p className="font-mono text-[9px] text-text3 uppercase tracking-wider">
          {title} · top 10 real por Δ24h
          {scannedAt
            ? ` · radar ${new Date(scannedAt).toLocaleTimeString('pt-PT')}`
            : ''}
        </p>
      </div>

      <OperationsSubNav />

      {flash && (
        <span className="inline-block font-mono text-[10px] text-cyan border border-cyan-30 bg-cyan-dim px-2 py-1">
          {flash}
        </span>
      )}
      {error && (
        <p className="font-mono text-[10px] text-red border border-red-30 bg-red-dim px-2 py-1.5">
          {error}
        </p>
      )}
      {loading && !module && (
        <p className="font-mono text-[10px] text-text3">A carregar…</p>
      )}

      {module && (
        <div className="space-y-4">
          <div className="bg-bg1 border border-border1 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-text1 font-bold text-base">
                  {module.emoji} {module.label}
                </h3>
                <p className="font-mono text-[10px] text-text2 mt-1">
                  {module.title}
                </p>
                <span className="font-mono text-[8px] uppercase tracking-wider text-text3">
                  Estado: {stateLabel(module.state)}
                  {module.enabled ? ' · AUTO activo' : ' · AUTO parado'}
                </span>
              </div>
              <button
                type="button"
                disabled={busyToggle || module.state === 'KILL'}
                onClick={() => void onToggle()}
                className={`font-mono text-[10px] uppercase px-3 py-1.5 border transition-colors disabled:opacity-40 ${
                  module.enabled
                    ? 'border-cyan-30 bg-cyan-dim text-cyan'
                    : 'border-border2 text-text3'
                }`}
              >
                {module.enabled ? 'AUTO ON' : 'AUTO OFF'}
              </button>
            </div>

            {module.autoBadge && (
              <div className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 border border-cyan-30 bg-cyan-dim text-cyan">
                {module.autoBadge}
              </div>
            )}

            <AutoOpsPositionCard open={module.open} />

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[10px] min-w-[640px]">
                <thead>
                  <tr className="text-text3 border-b border-border2">
                    <th className="py-2 pr-2 font-medium">Par</th>
                    <th className="py-2 pr-2 font-medium">Δ24h</th>
                    <th className="py-2 pr-2 font-medium">Volume</th>
                    <th className="py-2 pr-2 font-medium">Regime</th>
                    <th className="py-2 pr-2 font-medium">Filtro</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {module.candidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-3 text-text3">
                        Sem movers no radar
                      </td>
                    </tr>
                  ) : (
                    module.candidates.map((c) => (
                      <tr key={c.symbol} className="border-b border-border1/60">
                        <td className="py-2 pr-2 text-text1 font-semibold">
                          {c.symbol.replace(/USDT$/, '')}
                        </td>
                        <td
                          className={`py-2 pr-2 ${
                            c.change24hPct >= 0 ? 'text-cyan' : 'text-red'
                          }`}
                        >
                          {c.change24hPct >= 0 ? '+' : ''}
                          {c.change24hPct.toFixed(1)}%
                        </td>
                        <td className="py-2 pr-2 text-text2">
                          {fmtVol(c.quoteVolume24h)}
                        </td>
                        <td className="py-2 pr-2 text-text2">{c.regime}</td>
                        <td className="py-2 pr-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 border text-[8px] uppercase ${badgeClass(
                              c.trigger.tone
                            )}`}
                          >
                            {c.trigger.label}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => void openManual(c.symbol)}
                            className="font-mono text-[8px] uppercase px-2 py-1 border border-border2 text-text2 hover:border-cyan hover:text-cyan"
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
          </div>

          <div className="bg-bg1 border border-border1 p-4">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-3">
              Feed de acções
            </h4>
            <AutoOpsActionFeed
              events={module.feed || []}
              modulePnl={module.modulePnl}
              modulePnlDay={module.modulePnlDay}
            />
          </div>
        </div>
      )}

      {pending && module && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-bg1 border border-border1 max-w-md w-full p-5 space-y-4">
            <h3 className="text-text1 font-bold text-base">
              Entrar manual · {pending}
            </h3>
            <p className="font-mono text-[11px] text-text2">{module.rules.title}</p>
            <ul className="space-y-1 font-mono text-[10px] text-text2 list-disc pl-4">
              {module.rules.bullets.map((b) => (
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
              Lado {module.rules.side} · paper · o aviso não bloqueia a entrada.
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
