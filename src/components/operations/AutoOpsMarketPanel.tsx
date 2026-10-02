/**
 * Vista Auto-Ops para utilizadores normais: candidatos de mercado, regras e ciclos REAL do próprio.
 * O laboratório Paper (posições, feed, PnL, controlos AUTO e PAPER/REAL) é só para administradores.
 */

import type { AutoOpsUserModule } from '../../types/autoOps';
import { badgeClass, fmtAge, fmtVol } from '../../hooks/useAutoOps';

export function AutoOpsMarketPanel({ module }: { module: AutoOpsUserModule }) {
  const isStable = module.id === 'stable';
  return (
    <div className="space-y-4" data-testid="auto-ops-market-panel">
      <div className="bg-bg1 border border-border1 p-4 space-y-3">
        <div>
          <h3 className="text-text1 font-bold text-base">
            {module.emoji} {module.label}
          </h3>
          <p className="font-mono text-[10px] text-text2 mt-1">{module.title}</p>
        </div>

        <p className="font-mono text-[9px] text-text3 leading-relaxed border border-border2 p-2">
          {isStable
            ? 'Os ciclos abaixo são REAL: ciclos DCA da tua conta nos majors.'
            : 'Análise de mercado. Execução automática ainda não disponível para a tua conta.'}
        </p>

        <ul className="font-mono text-[10px] text-text2 space-y-0.5">
          {module.rules.bullets.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>

        {isStable ? (
          <div>
            {module.stable && (
              <p className="font-mono text-[10px] text-text2 mb-2">
                Preset lento · desvio {module.stable.preset.deviationPct}% · TP {module.stable.preset.takeProfitPct}% · SL{' '}
                {module.stable.preset.stopLossPct}%{module.stable.bidirectional ? ' · LONG+SHORT' : ' · LONG'}
              </p>
            )}
            <h4 className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-2">
              Os teus ciclos REAL ({module.stable?.cyclesCount ?? 0})
            </h4>
            {!module.stable?.activeCycles?.length ? (
              <p className="font-mono text-[10px] text-text3">Nenhum ciclo DCA nos majors</p>
            ) : (
              <ul className="space-y-2">
                {module.stable.activeCycles.map((c) => (
                  <li key={c.id} className="border border-border2 p-3 font-mono text-[10px] text-text2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <span className="text-text1 font-semibold">
                      {c.side} {c.symbol.replace(/USDT$/, '')}
                    </span>
                    <span>Entrada ${c.avgEntry > 10 ? c.avgEntry.toFixed(2) : c.avgEntry.toFixed(4)}</span>
                    <span>Qtd {c.quantity?.toPrecision?.(4) ?? '—'}</span>
                    <span>Idade {fmtAge(c.ageMs)}</span>
                    <span className="uppercase text-text3">REAL</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px] min-w-[560px]">
              <thead>
                <tr className="text-text3 border-b border-border2">
                  <th className="py-2 pr-2 font-medium">Par</th>
                  <th className="py-2 pr-2 font-medium">Δ24h</th>
                  <th className="py-2 pr-2 font-medium">Volume</th>
                  <th className="py-2 pr-2 font-medium">Regime</th>
                  <th className="py-2 pr-2 font-medium">Filtro</th>
                </tr>
              </thead>
              <tbody>
                {module.candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-text3">Sem movers no radar</td>
                  </tr>
                ) : (
                  module.candidates.map((c) => (
                    <tr key={c.symbol} className="border-b border-border1/60">
                      <td className="py-2 pr-2 text-text1 font-semibold">{c.symbol.replace(/USDT$/, '')}</td>
                      <td className={`py-2 pr-2 ${c.change24hPct >= 0 ? 'text-cyan' : 'text-red'}`}>
                        {c.change24hPct >= 0 ? '+' : ''}
                        {c.change24hPct.toFixed(1)}%
                      </td>
                      <td className="py-2 pr-2 text-text2">{fmtVol(c.quoteVolume24h)}</td>
                      <td className="py-2 pr-2 text-text2">{c.regime}</td>
                      <td className="py-2 pr-2">
                        <span className={`inline-block px-1.5 py-0.5 border text-[8px] uppercase ${badgeClass(c.trigger.tone)}`}>
                          {c.trigger.label}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
