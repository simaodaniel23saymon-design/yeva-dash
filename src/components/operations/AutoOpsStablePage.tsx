/**
 * Página Estáveis — majors, ciclos, preset, ON/OFF com alocação.
 */

import { useState } from 'react';
import {
  fmtAge,
  stateLabel,
  useAutoOps,
} from '../../hooks/useAutoOps';
import { OperationsSubNav } from './OperationsSubNav';
import { AutoOpsPositionCard } from './AutoOpsPositionCard';
import { AutoOpsActionFeed } from './AutoOpsActionFeed';
import { AutoOpsAllocateModal } from './AutoOpsAllocateModal';
import { AutoOpsOffModal } from './AutoOpsOffModal';

export function AutoOpsStablePage() {
  const {
    module,
    scannedAt,
    loading,
    error,
    busyToggle,
    flash,
    enableOn,
    disableOff,
  } = useAutoOps('stable');

  const [showOnModal, setShowOnModal] = useState(false);
  const [showOffModal, setShowOffModal] = useState(false);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h2 className="text-text1 font-bold text-lg">Operações</h2>
        <p className="font-mono text-[9px] text-text3 uppercase tracking-wider">
          Estáveis · majors DCA preset lento
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
                  {module.emoji} Estáveis
                </h3>
                <p className="font-mono text-[10px] text-text2 mt-1">
                  {module.title}
                </p>
                <span className="font-mono text-[8px] uppercase tracking-wider text-text3">
                  Estado: {stateLabel(module.state)} · REAL (DCA)
                </span>
              </div>
              <button
                type="button"
                disabled={busyToggle || module.state === 'KILL'}
                onClick={() => {
                  if (module.enabled) setShowOffModal(true);
                  else setShowOnModal(true);
                }}
                className={`font-mono text-[10px] uppercase px-3 py-1.5 border transition-colors disabled:opacity-40 ${
                  module.enabled
                    ? 'border-cyan-30 bg-cyan-dim text-cyan'
                    : 'border-border2 text-text3'
                }`}
              >
                {module.enabled ? 'MODO ON' : 'MODO OFF'}
              </button>
            </div>

            <p className="font-mono text-[9px] text-text3 leading-relaxed border border-border2 p-2">
              Este módulo opera em REAL (DCA na Binance). PAPER não se aplica.
            </p>

            {module.stable && (
              <p className="font-mono text-[10px] text-text2">
                Preset lento · desvio {module.stable.preset.deviationPct}% · TP{' '}
                {module.stable.preset.takeProfitPct}% · SL{' '}
                {module.stable.preset.stopLossPct}%
                {module.stable.bidirectional ? ' · LONG+SHORT' : ' · LONG'}
              </p>
            )}

            <AutoOpsPositionCard
              open={module.open}
              emptyLabel="Nenhum ciclo estáveis em destaque"
            />

            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-2">
                Ciclos activos ({module.stable?.cyclesCount ?? 0})
              </h4>
              {!module.stable?.activeCycles?.length ? (
                <p className="font-mono text-[10px] text-text3">
                  Nenhum ciclo DCA nos majors
                </p>
              ) : (
                <ul className="space-y-2">
                  {module.stable.activeCycles.map((c) => (
                    <li
                      key={c.id}
                      className="border border-border2 p-3 font-mono text-[10px] text-text2 grid grid-cols-2 sm:grid-cols-3 gap-2"
                    >
                      <span className="text-text1 font-semibold">
                        {c.side} {c.symbol.replace(/USDT$/, '')}
                      </span>
                      <span>
                        Entrada $
                        {c.avgEntry > 10
                          ? c.avgEntry.toFixed(2)
                          : c.avgEntry.toFixed(4)}
                      </span>
                      <span>Qtd {c.quantity?.toPrecision?.(4) ?? '—'}</span>
                      <span>
                        Alocado ${(c.allocatedUsdt ?? 0).toFixed(2)}
                      </span>
                      <span>Em uso ${(c.marginUsdt ?? 0).toFixed(2)}</span>
                      <span>Idade {fmtAge(c.ageMs)}</span>
                      <span className="uppercase text-text3">REAL</span>
                    </li>
                  ))}
                </ul>
              )}
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

      {showOnModal && module && (
        <AutoOpsAllocateModal
          title="MODO ON · Estáveis"
          minNotional={module.minNotionalUsdt || 10}
          availableBalanceUsdt={module.availableBalanceUsdt || 0}
          defaultAllocation={module.allocationUsdt || module.minNotionalUsdt}
          confirmLabel="Confirmar MODO ON"
          onCancel={() => setShowOnModal(false)}
          onConfirm={async ({ allocationUsdt }) => {
            await enableOn(allocationUsdt);
            setShowOnModal(false);
          }}
        />
      )}

      {showOffModal && module && (
        <AutoOpsOffModal
          label="Estáveis"
          hasOpen={(module.stable?.cyclesCount || 0) > 0}
          onCancel={() => setShowOffModal(false)}
          onConfirm={async (opts) => {
            await disableOff(opts);
            setShowOffModal(false);
          }}
        />
      )}
    </div>
  );
}
