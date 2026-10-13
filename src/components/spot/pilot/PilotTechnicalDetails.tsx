import { SPOT_BALANCE_STATE_TEXT } from '../../../utils/pilotReadinessView';
import {
  CONTROL_STATE_TEXT,
  entryCheckText,
  entryPlanText,
  eventKindText,
  intentStateText,
  pilotEvents,
  policyRows,
  reasonText,
} from '../../../utils/spotPilotView';
import { controlState, usdt, type ViewInput } from '../../../utils/spotPilotSimple';

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('pt-PT') : '—');

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border1 py-1 font-mono text-[10px]">
      <dt className="text-text3">{k}</dt>
      <dd className="text-right break-all text-text1">{v}</dd>
    </div>
  );
}

function Codes({ codes }: { codes: string[] }) {
  if (!codes.length) return <span className="text-text3">nenhum</span>;
  return (
    <ul className="space-y-0.5">
      {codes.map((c) => (
        <li key={c}>{reasonText(c)}</li>
      ))}
    </ul>
  );
}

/** Acordeão fechado por omissão: códigos internos, filtros Binance, diagnóstico e dados avançados de UMA conta. */
export default function PilotTechnicalDetails({ view }: { view: ViewInput }) {
  const { data, safety, strategy } = view;
  const control = data.detail?.control ?? data.account.control ?? null;
  const sa = strategy?.accounts.find((a) => a.accountId === data.id) ?? null;
  const r = data.readiness && data.readiness.accountId === data.id ? data.readiness : null;
  const checks = data.detail?.activationChecks;
  const events = pilotEvents({ checks, control, history: data.history, intents: data.detail?.intents, lastAction: sa?.lastAction ?? null });
  const rows = policyRows(strategy?.policy ?? null, safety);
  const st = controlState(view);

  return (
    <details className="border border-border1 bg-bg1" data-testid="pilot-technical-details">
      <summary className="cursor-pointer select-none px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-text3">Detalhes técnicos</summary>
      <div className="space-y-4 p-3 text-[11px] text-text2">
        <section>
          <h4 className="mb-1 font-mono text-[10px] uppercase text-text3">Conta e servidor</h4>
          <dl>
            <Row k="ID da conta" v={data.id} />
            <Row k="Controlo do piloto" v={st ? `${st} · ${CONTROL_STATE_TEXT[st] ?? ''}` : '—'} />
            <Row k="Alterado em / motivo" v={`${when(control?.updatedAt)} · ${control?.reason ?? '—'}`} />
            <Row k="Na allowlist (REAL_SPOT_PILOT_ACCOUNT_IDS)" v={(safety?.realSpotPilotAccountIds ?? []).includes(data.id) ? 'sim' : 'não'} />
            <Row k="Na estratégia (REAL_SPOT_PILOT_STRATEGY_ACCOUNT_IDS)" v={strategy ? (strategy.strategyAccountIds.includes(data.id) ? 'sim' : 'não') : '—'} />
            <Row k="REAL_SPOT_PILOT_ENABLED / SPOT_LIVE_ENABLED" v={safety ? `${safety.realSpotPilotEnabled} / ${safety.spotLiveEnabled}` : '—'} />
            <Row k="SPOT_KILL_SWITCH (global)" v={safety ? (safety.spotKillSwitch ? 'ATIVO' : 'inativo') : '—'} />
            <Row k="REAL_SPOT_PILOT_MAX_NOTIONAL (teto)" v={safety ? `${safety.realSpotPilotMaxNotional ?? '—'} (${safety.realSpotPilotMaxNotionalCap ?? '—'})` : '—'} />
            <Row k="Entradas (interruptor global)" v={strategy ? (strategy.entriesEnabled ? 'ligadas' : 'suspensas') : '—'} />
            <Row k="Loop da estratégia" v={strategy ? (strategy.loopRunning ? 'a correr' : 'parado') : '—'} />
          </dl>
          <div className="mt-1 font-mono text-[10px]">
            Bloqueios globais: <Codes codes={strategy?.blockers ?? safety?.blockers ?? []} />
          </div>
        </section>

        <section>
          <h4 className="mb-1 font-mono text-[10px] uppercase text-text3">Verificações de ativação</h4>
          <dl>
            <Row k="Read-check" v={checks?.readCheck ? `${checks.readCheck.ok ? 'OK' : 'FALHOU'} · ${when(checks.readCheck.at)}` : 'por fazer'} />
            <Row k="Reconciliação" v={checks?.reconcile ? `${checks.reconcile.ok ? 'OK' : 'FALHOU'} · ${when(checks.reconcile.at)}` : 'por fazer'} />
          </dl>
          <div className="mt-1 font-mono text-[10px]">
            <Codes codes={[...(checks?.readCheck?.reasons ?? []), ...(checks?.reconcile?.reasons ?? [])]} />
          </div>
          {data.reconcileResult && (
            <p className="mt-1 font-mono text-[10px]">
              Divergências críticas em aberto: {data.reconcileResult.openCriticalMismatches ?? '—'} · saldos verificados: {data.reconcileResult.balances.length}
              {data.reconcileResult.controlBlocked ? ' · conta colocada em BLOCKED' : ''}
            </p>
          )}
        </section>

        <section>
          <h4 className="mb-1 font-mono text-[10px] uppercase text-text3">Readiness (dry-run, sem ordens)</h4>
          {r ? (
            <>
              <dl>
                <Row k="Resultado" v={r.readiness} />
                <Row k="Saldo Spot (estado · livre · bloqueado)" v={r.spotBalance ? `${SPOT_BALANCE_STATE_TEXT[r.spotBalance.state] ?? r.spotBalance.state} · ${usdt(r.spotBalance.usdtFree)} · ${usdt(r.spotBalance.usdtLocked)}` : '—'} />
                <Row k="Entrada calculada / limite efetivo" v={`${usdt(r.bot?.config?.entryCapitalUsdt)} / ${usdt(r.limits?.effectiveLimitUsdt)}`} />
                <Row k="Ordens abertas / posições externas" v={`${r.baseline?.openOrders ?? '—'} / ${r.externalPositions ?? '—'}`} />
                <Row k="Plano de entrada" v={entryPlanText(r.entryPlan)} />
                <Row k="Risk Guard (dry-run)" v={r.dryRun ? `${r.dryRun.decision} ${r.dryRun.reasons.join(',')}` : '—'} />
                <Row k="Gates" v={r.safety.gates.join(', ') || '—'} />
              </dl>
              <div className="mt-1 font-mono text-[10px]">
                Bloqueios: <Codes codes={r.blockers} />
              </div>
              {r.entryPlan && r.entryPlan.checks.length > 0 && (
                <ul className="mt-1 space-y-0.5 font-mono text-[10px]" data-testid="pilot-tech-preview-checks">
                  {r.entryPlan.checks.map((c) => (
                    <li key={c.symbol}>{entryCheckText(c)}</li>
                  ))}
                </ul>
              )}
              {r.entryPlan && r.entryPlan.selectionReasons.length > 0 && <p className="mt-1 font-mono text-[10px]">Seleção: {r.entryPlan.selectionReasons.join(' · ')}</p>}
            </>
          ) : (
            <p className="font-mono text-[10px]">{data.readinessError ?? 'Ainda não lido.'}</p>
          )}
        </section>

        <section>
          <h4 className="mb-1 font-mono text-[10px] uppercase text-text3">Motor da estratégia</h4>
          <dl>
            <Row k="Estado" v={sa ? `${sa.state} · ${sa.reasons.join(', ') || '—'}` : '—'} />
            <Row k="Último ciclo" v={when(sa?.lastTickAt)} />
            <Row k="Última ação" v={sa?.lastAction ? `${sa.lastAction.symbol} ${sa.lastAction.side} · ${sa.lastAction.decision} · ${sa.lastAction.state ?? '—'}` : '—'} />
          </dl>
          {sa?.entryChecks && sa.entryChecks.length > 0 && (
            <ul className="mt-1 space-y-0.5 font-mono text-[10px]" data-testid="pilot-tech-bot-checks">
              {sa.entryChecks.map((c) => (
                <li key={c.symbol}>{entryCheckText(c)}</li>
              ))}
            </ul>
          )}
          {sa?.position && (
            <p className="mt-1 font-mono text-[10px]">
              {sa.position.symbol} {sa.position.quantity} · médio {sa.position.averageEntryPrice ?? '—'} · preço {sa.position.price ?? '—'} · PnL {sa.position.pnlPct == null ? '—' : `${sa.position.pnlPct.toFixed(2)}%`} · SL{' '}
              {sa.position.stopLossPrice ?? '—'} · TP {sa.position.takeProfitPrice ?? '—'}
            </p>
          )}
        </section>

        <section>
          <h4 className="mb-1 font-mono text-[10px] uppercase text-text3">Intenções e divergências</h4>
          {(data.detail?.intents ?? []).length === 0 && (data.detail?.mismatches ?? []).length === 0 ? (
            <p className="font-mono text-[10px]">Nenhuma.</p>
          ) : (
            <ul className="space-y-0.5 font-mono text-[10px]">
              {(data.detail?.intents ?? []).map((x) => (
                <li key={x.idempotencyKey}>
                  {x.symbol} {x.side} {x.quantity} (~{x.notional.toFixed(2)} USDT) · {x.state} · {intentStateText(x.state)}
                  {x.errorCode ? ` · ${x.errorCode}` : ''}
                </li>
              ))}
              {(data.detail?.mismatches ?? []).map((m) => (
                <li key={m.id}>
                  {m.severity} · {m.kind} · {m.symbol ?? m.asset ?? '—'}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="mb-1 font-mono text-[10px] uppercase text-text3">Política do servidor</h4>
          <table className="w-full font-mono text-[10px]">
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-border1">
                  <td className="py-0.5">{row.label}</td>
                  <td className={`py-0.5 text-right ${row.diverges ? 'text-gold' : 'text-text1'}`}>
                    {row.server}
                    {row.diverges ? ` (especificação ${row.reference})` : ''}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border1">
                <td className="py-0.5">Entrada mínima da estratégia / margem de preço</td>
                <td className="py-0.5 text-right">
                  {strategy?.policy.minStrategyEntryQuote ?? '—'} USDT / {strategy?.policy.entryPriceBufferPct ?? '—'}%
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1">
            Fluxo de uma compra: decisão da estratégia → Risk Guard → intenção PENDING → aprovação TOTP → envio pelo executor do piloto → execução confirmada pela Binance. Decisões,
            intenções e aprovações não são ordens executadas. Não há ordem de proteção colocada na Binance: as saídas são ordens a mercado da aplicação, sujeitas a atrasos e slippage.
          </p>
        </section>

        <section>
          <h4 className="mb-1 font-mono text-[10px] uppercase text-text3">Histórico</h4>
          {events.length === 0 ? (
            <p className="font-mono text-[10px]">Sem eventos registados.</p>
          ) : (
            <ul className="space-y-0.5">
              {events.slice(0, 40).map((e, idx) => (
                <li key={`${e.kind}-${e.at}-${idx}`} className="font-mono text-[10px]">
                  {when(e.at)} · {eventKindText(e.kind)} · {e.title}
                  {e.detail ? ` · ${e.detail}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </details>
  );
}
