import {
  accountHeadline,
  accountLabel,
  accountSummary,
  canRecheckReadiness,
  opportunityView,
  pendingPurchases,
  riskRules,
  safetyControls,
  searchAction,
  usdt,
  wizardSteps,
  WIZARD_STATUS_TEXT,
  type Tone,
  type ViewInput,
  type WizardStatus,
} from '../../../utils/spotPilotSimple';
import PilotTechnicalDetails from './PilotTechnicalDetails';

export type PilotAccountActions = {
  onVerify: () => void;
  onConfirm: () => void;
  onRecheck: () => void;
  onActivate: () => void;
  onStartSearch: () => void;
  onReview: (idempotencyKey: string) => void;
  onPauseEntries: () => void;
  onDisarm: () => void;
  onKill: () => void;
};

/** Resultado da última ação nesta conta, mostrado junto do passo a que pertence. */
export type PilotCardMessage = { where: 'VERIFY' | 'CONFIRM' | 'ACTIVATE' | 'SEARCH' | 'GENERAL'; ok: boolean; text: string; notes: string[] };

function Message({ msg }: { msg: PilotCardMessage }) {
  return (
    <div className={`mt-2 border p-2 text-[12px] ${msg.ok ? 'border-cyan-20 bg-cyan-dim text-cyan' : 'border-red-30 bg-red-dim text-red'}`} role="status" data-testid="pilot-card-message">
      {msg.text}
      {msg.notes.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {msg.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TONE: Record<Tone, string> = {
  ok: 'border-cyan-30 text-cyan',
  warn: 'border-gold text-gold',
  bad: 'border-red-30 text-red',
  neutral: 'border-border2 text-text1',
};

const STEP_TONE: Record<WizardStatus, string> = {
  done: 'text-cyan border-cyan-30',
  todo: 'text-text2 border-border2',
  failed: 'text-red border-red-30',
  expired: 'text-gold border-gold',
  locked: 'text-text3 border-border1',
};

const btn = 'text-[12px] font-medium border px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed';

/** Cartão de UMA conta: estado, assistente, oportunidades, compras pendentes, segurança e detalhes técnicos. */
export default function PilotAccountCard({
  view,
  index,
  lastUpdated,
  actions,
  message = null,
}: {
  view: ViewInput;
  index: number;
  lastUpdated: string | null;
  actions: PilotAccountActions;
  message?: PilotCardMessage | null;
}) {
  const head = accountHeadline(view);
  const summary = accountSummary(view, lastUpdated);
  const steps = wizardSteps(view);
  const search = searchAction(view);
  const opp = opportunityView(view);
  const pending = pendingPurchases(view);
  const rules = riskRules(view.strategy, view.safety);
  const safety = safetyControls(view);

  return (
    <article className="space-y-3" data-testid={`pilot-account-${view.data.id}`}>
      <section className={`border bg-bg1 p-4 ${TONE[head.tone]}`} data-testid="pilot-main-card">
        <div className="font-mono text-[10px] uppercase tracking-wider text-text3">{accountLabel(view.data.id, index)}</div>
        <h2 className="mt-1 text-lg font-semibold">{head.title}</h2>
        <p className="text-[13px] text-text2">{head.subtitle}</p>
        {head.attention.length > 1 && (
          <ul className="mt-2 space-y-0.5 text-[12px] text-red">
            {head.attention.slice(1).map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        )}
        {message?.where === 'GENERAL' && <Message msg={message} />}
        <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {summary.map((r) => (
            <div key={r.label} className="flex justify-between gap-3 border-b border-border1 py-1.5 text-[12px]">
              <dt className="text-text3">{r.label}</dt>
              <dd className="text-right text-text1">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border border-border1 bg-bg1 p-4" data-testid="pilot-wizard">
        <h3 className="mb-3 text-[14px] font-semibold text-text1">Ativar o teu bot em três passos</h3>
        <ol className="space-y-2">
          {steps.map((s) => (
            <li key={s.key} className="border border-border1 p-3" data-testid={`pilot-step-${s.key}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-text3">Passo {s.number}</span>
                <span className="text-[13px] font-medium text-text1">{s.title}</span>
                <span className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase ${STEP_TONE[s.status]}`}>{WIZARD_STATUS_TEXT[s.status]}</span>
              </div>
              <p className="mt-1 text-[12px] text-text2">{s.explanation}</p>
              {s.notes.length > 0 && (
                <ul className={`mt-1 space-y-0.5 text-[12px] ${s.status === 'failed' ? 'text-red' : 'text-text3'}`}>
                  {s.notes.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              )}
              {s.status !== 'done' || s.key !== 'ACTIVATE' ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!s.enabled}
                    onClick={s.key === 'VERIFY' ? actions.onVerify : s.key === 'CONFIRM' ? actions.onConfirm : actions.onActivate}
                    className={`${btn} ${s.key === 'ACTIVATE' ? 'border-gold text-gold' : 'border-cyan-30 text-cyan'}`}
                  >
                    {s.button}
                  </button>
                  {s.key === 'ACTIVATE' && canRecheckReadiness(view) && (
                    <button type="button" onClick={actions.onRecheck} className={`${btn} border-border2 text-text2`}>
                      Verificar outra vez
                    </button>
                  )}
                </div>
              ) : null}
              {message?.where === s.key && <Message msg={message} />}
            </li>
          ))}
        </ol>

        {search.visible && (
          <div className="mt-3 border border-border1 p-3" data-testid="pilot-search-action">
            <div className="text-[13px] font-medium text-text1">Começar a procurar oportunidades</div>
            <p className="mt-1 text-[12px] text-text2">
              {search.on
                ? 'A procura está ligada. Quando o bot encontrar uma compra, pede a tua aprovação.'
                : 'O bot está ativo mas ainda não procura compras. Ao ligares a procura, ela aplica-se a todas as contas com o bot ativo; cada compra continua a precisar da tua aprovação.'}
            </p>
            {search.notes.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[12px] text-text3">
                {search.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}
            {!search.on && (
              <button type="button" disabled={!search.enabled} onClick={actions.onStartSearch} className={`${btn} mt-2 border-gold text-gold`}>
                Começar a procurar oportunidades
              </button>
            )}
            {message?.where === 'SEARCH' && <Message msg={message} />}
          </div>
        )}
      </section>

      <section className="border border-border1 bg-bg1 p-4" data-testid="pilot-opportunities">
        <h3 className="text-[14px] font-semibold text-text1">Oportunidades de mercado</h3>
        <p className={`mt-1 text-[13px] ${opp.kind === 'UNCERTAIN' || opp.kind === 'DATA_UNAVAILABLE' ? 'text-red' : opp.kind === 'PROPOSED' ? 'text-gold' : 'text-text2'}`} data-testid="pilot-opportunity-message">
          {opp.message}
        </p>
        {opp.symbol && (
          <dl className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {[
              ['Moeda', opp.symbol],
              ['Valor estimado', usdt(opp.valueUsdt)],
              ['Motivo', opp.reason ?? '—'],
              ['Estado da proposta', opp.proposalState ?? 'Ainda sem proposta'],
              ['Aprovação', opp.approvalState ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-border1 py-1.5 text-[12px]">
                <dt className="text-text3">{k}</dt>
                <dd className="text-right text-text1">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {opp.candidates.length > 0 && (
          <div className="mt-3" data-testid="pilot-candidates">
            <div className="text-[12px] text-text3">
              {opp.candidatesSource === 'BOT'
                ? `Na última procura, o bot analisou ${opp.candidates.length} ${opp.candidates.length === 1 ? 'moeda' : 'moedas'} pela ordem do ranking:`
                : `Verificação de agora (simulação, sem ordens): ${opp.candidates.length} ${opp.candidates.length === 1 ? 'moeda analisada' : 'moedas analisadas'} pela ordem do ranking:`}
            </div>
            <ul className="mt-1 space-y-0.5 text-[12px]">
              {opp.candidates.map((c) => (
                <li key={c.symbol} className={c.chosen ? 'text-cyan' : c.ok ? 'text-text1' : 'text-text2'}>
                  {c.symbol} — {c.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-text3">Regras de risco e de saída</summary>
          <ul className="mt-1 space-y-0.5 text-[12px] text-text2">
            {rules.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </details>
      </section>

      <section className="border border-border1 bg-bg1 p-4" data-testid="pilot-pending">
        <h3 className="text-[14px] font-semibold text-text1">Compras à espera da tua aprovação</h3>
        {pending.length === 0 ? (
          <p className="mt-1 text-[12px] text-text3">Não há compras à espera.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {pending.map((p) => (
              <li key={p.idempotencyKey} className="border border-border1 p-3 text-[12px]" data-testid="pilot-pending-item">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text1">{p.symbol}</span>
                  <span className="text-text2">{usdt(p.valueUsdt)}</span>
                  <span className="text-text3">· {p.state}</span>
                </div>
                <p className="mt-1 text-text2">{p.reason}</p>
                <p className={`mt-0.5 ${p.expired ? 'text-red' : 'text-text3'}`}>{p.approval}</p>
                <button type="button" disabled={view.busy} onClick={() => actions.onReview(p.idempotencyKey)} className={`${btn} mt-2 border-gold text-gold`}>
                  Rever compra
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="border border-border1 bg-bg1" data-testid="pilot-safety-controls">
        <summary className="cursor-pointer select-none px-3 py-2 text-[12px] text-text3">Controlos de segurança</summary>
        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3">
          <div className="space-y-2 border border-border1 p-3">
            <div className="text-[13px] font-medium text-text1">Pausar entradas</div>
            <p className="text-[11px] text-text3">Para a procura de novas compras em todas as contas. As vendas automáticas das posições abertas continuam.</p>
            <button type="button" disabled={!safety.pauseEntries} onClick={actions.onPauseEntries} className={`${btn} border-border2 text-text2`}>
              Pausar entradas
            </button>
          </div>
          <div className="space-y-2 border border-border1 p-3">
            <div className="text-[13px] font-medium text-text1">Desativar o bot nesta conta</div>
            <p className="text-[11px] text-text3">Sem novas compras nem aprovações nesta conta. As vendas automáticas das posições abertas continuam.</p>
            <button type="button" disabled={!safety.disarm} onClick={actions.onDisarm} className={`${btn} border-border2 text-text2`}>
              Desativar
            </button>
          </div>
          <div className="space-y-2 border border-red-30 p-3">
            <div className="text-[13px] font-medium text-red">Paragem de emergência desta conta</div>
            <p className="text-[11px] text-text3">
              O bot deixa de enviar qualquer ordem nesta conta, incluindo as vendas automáticas. Uma posição aberta fica sem gestão pela aplicação. Não é uma pausa.
            </p>
            <button type="button" disabled={!safety.kill} onClick={actions.onKill} className={`${btn} border-red-30 text-red`}>
              Paragem de emergência
            </button>
          </div>
        </div>
        <p className="px-3 pb-3 text-[11px] text-text3">A paragem de emergência geral do servidor (kill switch global) só muda na configuração do servidor.</p>
      </details>

      <PilotTechnicalDetails view={view} />
    </article>
  );
}
