/**
 * Página módulo Gainers / Losers — zero-config AUTO + PAPER/REAL.
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
import { AutoOpsAllocateModal } from './AutoOpsAllocateModal';
import { AutoOpsOffModal } from './AutoOpsOffModal';
import { api } from '../../lib/api';

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
    enableOn,
    disableOff,
    setMode,
    manualEnter,
  } = useAutoOps(moduleId);

  const [showOnModal, setShowOnModal] = useState(false);
  const [showOffModal, setShowOffModal] = useState(false);
  const [enterSymbol, setEnterSymbol] = useState<string | null>(null);
  const [enterPrice, setEnterPrice] = useState<number | undefined>();

  const title = moduleId === 'gainers' ? 'Gainers' : 'Losers';
  const side = moduleId === 'losers' ? 'SHORT' : 'LONG';

  const openEnter = async (symbol: string, price: number) => {
    setEnterSymbol(symbol);
    setEnterPrice(price);
    try {
      const { data } = await api.get<{ price?: string }>(
        // fallback: use candidate price already known
        '/auto-ops/status'
      );
      void data;
    } catch {
      /* */
    }
  };

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
                  {!module.enabled ? ' · OFF' : ' · AUTO activo'}
                  {module.allocationUsdt
                    ? ` · alocado $${module.allocationUsdt}`
                    : ''}
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
                {module.enabled ? 'AUTO ON' : 'AUTO OFF'}
              </button>
            </div>

            {/* PAPER | REAL */}
            <div className="space-y-2 border border-border2 p-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void setMode('PAPER')}
                  className={`flex-1 py-2 border font-mono text-[10px] uppercase ${
                    module.execMode === 'PAPER'
                      ? 'border-cyan text-cyan bg-cyan-dim'
                      : 'border-border2 text-text3'
                  }`}
                >
                  PAPER
                </button>
                <button
                  type="button"
                  disabled={!module.realGate?.ready}
                  title={module.realGate?.reason}
                  onClick={() => void setMode('REAL')}
                  className={`flex-1 py-2 border font-mono text-[10px] uppercase disabled:opacity-40 ${
                    module.execMode === 'REAL'
                      ? 'border-gold text-gold bg-gold-dim'
                      : 'border-border2 text-text3'
                  }`}
                >
                  REAL
                </button>
              </div>
              <p className="font-mono text-[9px] text-text3 leading-relaxed">
                PAPER: simulado, NÃO aparece na Binance.
                <br />
                REAL: ordens reais na tua conta Binance (visíveis e geríveis
                lá).
              </p>
              {module.realGate && (
                <p
                  className={`font-mono text-[9px] ${
                    module.realGate.ready ? 'text-cyan' : 'text-text3'
                  }`}
                >
                  Gate REAL:{' '}
                  {module.realGate.ready ? 'OK' : 'bloqueado'} ·{' '}
                  {module.realGate.reason}
                  {module.realGate.override ? ' · override admin' : ''}
                  {' · '}
                  paper {module.realGate.paperDays.toFixed(1)}d · PF{' '}
                  {module.realGate.profitFactor.toFixed(2)} · DD{' '}
                  {module.realGate.maxDrawdownPct.toFixed(1)}%
                </p>
              )}
            </div>

            {(module.autoBadge || !module.enabled) && (
              <div
                className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 border ${
                  module.enabled
                    ? 'border-cyan-30 bg-cyan-dim text-cyan'
                    : 'border-border2 text-text3'
                }`}
              >
                {module.enabled ? module.autoBadge : 'OFF'}
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
                            onClick={() => void openEnter(c.symbol, c.price)}
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

      {showOnModal && module && (
        <AutoOpsAllocateModal
          title={`AUTO ON · ${module.label}`}
          minNotional={module.minNotionalUsdt || 10}
          availableBalanceUsdt={module.availableBalanceUsdt || 0}
          defaultAllocation={module.allocationUsdt || module.minNotionalUsdt}
          confirmLabel="Confirmar AUTO ON"
          onCancel={() => setShowOnModal(false)}
          onConfirm={async ({ allocationUsdt }) => {
            await enableOn(allocationUsdt);
            setShowOnModal(false);
          }}
        />
      )}

      {showOffModal && module && (
        <AutoOpsOffModal
          label={module.label}
          hasOpen={Boolean(module.open)}
          openSymbol={module.open?.symbol}
          onCancel={() => setShowOffModal(false)}
          onConfirm={async (opts) => {
            await disableOff(opts);
            setShowOffModal(false);
          }}
        />
      )}

      {enterSymbol && module && (
        <AutoOpsAllocateModal
          title={`Entrar manual · ${enterSymbol}`}
          minNotional={module.minNotionalUsdt || 10}
          availableBalanceUsdt={module.availableBalanceUsdt || 0}
          defaultAllocation={module.allocationUsdt || module.minNotionalUsdt}
          defaultTpPct={module.defaultTpPct}
          defaultSlPct={module.defaultSlPct}
          showTpSl
          side={side}
          entryPriceHint={enterPrice}
          confirmLabel="Confirmar entrada"
          onCancel={() => setEnterSymbol(null)}
          onConfirm={async ({ allocationUsdt, tpPrice, slPrice }) => {
            const data = await manualEnter({
              symbol: enterSymbol,
              allocationUsdt,
              tpPrice,
              slPrice,
            });
            if (data.ok) {
              showFlash(`Entrada ${enterSymbol}: ${data.reason}`);
              setEnterSymbol(null);
            } else {
              showFlash(data.reason || 'Não abriu');
              throw new Error(data.reason);
            }
          }}
        />
      )}
    </div>
  );
}
