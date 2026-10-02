/**
 * Dashboard — Winners / Losers (análise only).
 * Sem compra/venda · sem execução REAL.
 */

import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { YevaTradeLoader } from '../YevaTradeLoader';
import { useMomentumRanking } from '../../hooks/useMomentumRanking';
import { useAuth } from '../../context/AuthContext';
import { canAccessSpotPaper } from '../../utils/access';
import {
  decisionBadgeClass,
  formatMfeMae,
  formatPrice,
  formatScore,
  formatUpdatedAt,
  rankingViewState,
  type MomentumRankingRow,
} from '../../utils/momentumRankingView';
import type { SymbolHistoryMetrics } from '../../utils/momentumRankingView';

function TfChip({ tf, value }: { tf: string; value?: string }) {
  const v = value || '—';
  const up = /UP|PULLBACK_OK|BREAKOUT|TIMING_OK/.test(v);
  const down = /DOWN|PULLBACK_FAIL|NO_BREAKOUT|TIMING_FAIL/.test(v);
  const cls = up
    ? 'border-cyan-30 text-cyan'
    : down
      ? 'border-red-30 text-red'
      : 'border-border2 text-text3';
  return (
    <span className={`inline-flex flex-col px-2 py-1 border font-mono ${cls}`}>
      <span className="text-[8px] uppercase tracking-wider opacity-70">{tf}</span>
      <span className="text-[10px] uppercase">{v}</span>
    </span>
  );
}

function RankingTable({
  title,
  tone,
  rows,
  selected,
  onSelect,
  history,
  showPaperHistory,
  emptyLabel,
}: {
  title: string;
  tone: 'win' | 'lose';
  rows: MomentumRankingRow[];
  selected: string | null;
  onSelect: (symbol: string) => void;
  history: Record<string, SymbolHistoryMetrics>;
  showPaperHistory: boolean;
  emptyLabel: string;
}) {
  const accent =
    tone === 'win' ? 'border-cyan-30 text-cyan' : 'border-red-30 text-red';

  return (
    <div className="bg-bg1 border border-border1 rounded-[22px] overflow-hidden">
      <div className="px-5 py-4 border-b border-border1 flex items-center justify-between gap-2">
        <h4 className={`dash-label ${accent}`}>{title}</h4>
        <span className="font-mono text-[9px] uppercase tracking-wider text-text3">
          só análise · {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-text2 text-lg">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[10px] min-w-[720px]">
            <thead>
              <tr className="text-text3 border-b border-border2">
                <th className="py-2 px-4 font-medium">Rank</th>
                <th className="py-2 pr-2 font-medium">Symbol</th>
                <th className="py-2 pr-2 font-medium">Score</th>
                <th className="py-2 pr-2 font-medium">Setup</th>
                <th className="py-2 pr-2 font-medium">Entry</th>
                <th className="py-2 pr-2 font-medium">Risk</th>
                <th className="py-2 pr-2 font-medium">Ext.</th>
                <th className="py-2 pr-2 font-medium">Decision</th>
                <th className="py-2 pr-2 font-medium">Preço</th>
                <th className="py-2 pr-4 font-medium">Atualização</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const open = selected === r.symbol;
                const hist = history[r.symbol];
                const hasHist =
                  hist &&
                  ((hist.mfe != null && Number.isFinite(hist.mfe)) ||
                    (hist.mae != null && Number.isFinite(hist.mae)));
                return (
                  <Fragment key={r.symbol}>
                    <tr
                      className={`border-b border-border1/60 cursor-pointer hover:bg-bg2/80 ${
                        open ? 'bg-bg2/60' : ''
                      }`}
                      onClick={() => onSelect(r.symbol)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onSelect(r.symbol);
                      }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={open}
                    >
                      <td className="py-2.5 px-4 text-text3">
                        {r.rank ?? i + 1}
                      </td>
                      <td className="py-2.5 pr-2 text-text1 font-semibold">
                        {r.symbol.replace(/USDT$/, '')}
                      </td>
                      <td className="py-2.5 pr-2 text-text1">
                        {formatScore(r.score)}
                      </td>
                      <td className="py-2.5 pr-2 text-text2">
                        {formatScore(r.setupQuality)}
                      </td>
                      <td className="py-2.5 pr-2 text-text2">
                        {formatScore(r.entryQuality)}
                      </td>
                      <td className="py-2.5 pr-2 text-text2">
                        {formatScore(r.riskQuality)}
                      </td>
                      <td className="py-2.5 pr-2 text-text2">
                        {formatScore(r.extensionRisk)}
                      </td>
                      <td className="py-2.5 pr-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 border text-[8px] uppercase tracking-wider ${decisionBadgeClass(
                            r.decision
                          )}`}
                        >
                          {r.decision || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-text2">
                        {formatPrice(r.price)}
                      </td>
                      <td className="py-2.5 pr-4 text-text3">
                        {formatUpdatedAt(r.timestamp)}
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border1">
                        <td colSpan={10} className="px-4 py-4 bg-bg0/40">
                          <div className="flex flex-wrap gap-2 mb-3">
                            <TfChip tf="4H" value={r.mtf?.tf4h} />
                            <TfChip tf="1H" value={r.mtf?.tf1h} />
                            <TfChip tf="15M" value={r.mtf?.tf15m} />
                            <TfChip tf="5M" value={r.mtf?.tf5m} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="font-mono text-[8px] uppercase tracking-wider text-cyan mb-1">
                                Fatores positivos
                              </p>
                              <ul className="font-mono text-[10px] text-text2 space-y-0.5">
                                {(r.factors?.positive || []).length ? (
                                  (r.factors?.positive || []).map((f) => (
                                    <li key={f}>· {f}</li>
                                  ))
                                ) : (
                                  <li className="text-text3">Nenhum</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <p className="font-mono text-[8px] uppercase tracking-wider text-red mb-1">
                                Fatores negativos
                              </p>
                              <ul className="font-mono text-[10px] text-text2 space-y-0.5">
                                {(r.factors?.negative || []).length ? (
                                  (r.factors?.negative || []).map((f) => (
                                    <li key={f}>· {f}</li>
                                  ))
                                ) : (
                                  <li className="text-text3">Nenhum</li>
                                )}
                              </ul>
                            </div>
                          </div>
                          <p className="font-mono text-[10px] text-text2 mt-3">
                            <span className="text-text3 uppercase tracking-wider text-[8px]">
                              Motivo ·{' '}
                            </span>
                            {r.decisionReason || '—'}
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2 font-mono text-[10px] text-text2">
                            <span>
                              R:R{' '}
                              <span className="text-text1">
                                {r.riskReward != null && Number.isFinite(r.riskReward)
                                  ? r.riskReward.toFixed(2)
                                  : 'n/d'}
                              </span>
                            </span>
                            {!showPaperHistory ? null : hasHist ? (
                              <>
                                <span>
                                  MFE{' '}
                                  <span className="text-cyan">
                                    {formatMfeMae(hist.mfe)}
                                  </span>
                                </span>
                                <span>
                                  MAE{' '}
                                  <span className="text-red">
                                    {formatMfeMae(hist.mae)}
                                  </span>
                                </span>
                              </>
                            ) : (
                              <span className="text-text3">
                                MFE/MAE — sem histórico paper
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MomentumWinnersLosersSection() {
  const { user } = useAuth();
  const isAdmin = canAccessSpotPaper(user);
  const { winners, losers, scannedAt, stale, history, loading, error, reload } =
    useMomentumRanking(60_000, isAdmin);
  const [selected, setSelected] = useState<string | null>(null);
  const view = rankingViewState({
    loading,
    error,
    winnerCount: winners.length,
    loserCount: losers.length,
    stale,
  });

  const toggle = (symbol: string) => {
    setSelected((cur) => (cur === symbol ? null : symbol));
  };

  return (
    <section className="dash-section" data-testid="momentum-winners-losers">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="dash-label text-text1">Momentum · Winners & Losers</h3>
          <p className="font-mono text-[10px] text-text3 uppercase tracking-wider mt-1">
            Análise only · APPROVED ≠ ordem
            {scannedAt
              ? ` · radar ${new Date(scannedAt).toLocaleTimeString('pt-PT')}`
              : ''}
          </p>
          <p className="text-text2 text-sm mt-2">
            Este bloco não é o Spot. Rejeitar aqui não é uma ordem.
            {isAdmin && (
              <>
                {' '}
                <Link to="/spot-paper" className="text-cyan">
                  Abrir Spot Paper
                </Link>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="dash-btn font-mono uppercase tracking-wider px-4 py-2 border border-border2 text-text2 hover:border-cyan hover:text-cyan text-[10px]"
        >
          Recarregar
        </button>
      </div>

      {view === 'loading' && (
        <div
          className="bg-bg1 border border-border1 rounded-[22px] p-10 flex justify-center"
          data-testid="momentum-ranking-loading"
        >
          <YevaTradeLoader size="sm" label="A carregar ranking…" />
        </div>
      )}

      {view === 'error' && (
        <p
          className="font-mono text-[10px] text-red border border-red-30 bg-red-dim px-3 py-2 rounded-[12px]"
          data-testid="momentum-ranking-error"
        >
          {error}
        </p>
      )}

      {view === 'stale' && (
        <p
          className="font-mono text-[10px] text-gold border border-gold-30 bg-gold-dim px-3 py-2 rounded-[12px] mb-3"
          data-testid="momentum-ranking-stale"
        >
          Dados stale — o radar tem mais de 15 minutos. Ranking ainda visível.
        </p>
      )}

      {view === 'empty' && (
          <p
            className="font-mono text-[10px] text-text2 bg-bg1 border border-border1 rounded-[22px] p-6"
            data-testid="momentum-ranking-empty"
          >
            Sem Winners nem Losers neste scan — universo sem qualidade suficiente.
          </p>
        )}

      {view !== 'loading' && view !== 'error' && (winners.length > 0 || losers.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RankingTable
            title="WINNERS"
            tone="win"
            rows={winners}
            selected={selected}
            onSelect={toggle}
            history={history}
            showPaperHistory={isAdmin}
            emptyLabel="Sem Winners neste scan"
          />
          <RankingTable
            title="LOSERS"
            tone="lose"
            rows={losers}
            selected={selected}
            onSelect={toggle}
            history={history}
            showPaperHistory={isAdmin}
            emptyLabel="Sem Losers neste scan"
          />
        </div>
      )}
    </section>
  );
}
