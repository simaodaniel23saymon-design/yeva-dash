import { useCallback, useEffect, useRef, useState } from 'react';
import PilotAccountCard, { type PilotCardMessage } from '../components/spot/pilot/PilotAccountCard';
import { api } from '../lib/api';
import { approveThenRefresh, checkTotpCode, PILOT_TOTP_LENGTH, sanitizeTotpInput, submitPilotApproval } from '../utils/pilotApproval';
import {
  accountLabel,
  emptyAccountData,
  loadPilotOverview,
  loadPilotReadiness,
  pendingPurchases,
  plainReasons,
  usdt,
  type PilotAccountData,
  type PilotGet,
  type ReadCheckResult,
  type ReconcileResult,
  type ViewInput,
} from '../utils/spotPilotSimple';
import { pilotActionError, type ActionError, type PilotStatusResponse, type StrategyStatus } from '../utils/spotPilotView';

type DialogKind = 'ARM' | 'RESUME' | 'PAUSE_ENTRIES' | 'DISARM' | 'KILL';
type Dialog = { kind: DialogKind; accountId: string } | null;
type Review = { accountId: string; idempotencyKey: string } | null;

const KILL_CONFIRM_WORD = 'PARAR';

const get: PilotGet = (url, config) => api.get(url, config);

const toMessage = (where: PilotCardMessage['where'], error: ActionError): PilotCardMessage => ({
  where,
  ok: false,
  text: error.message,
  notes: plainReasons([...error.reasons, ...error.readinessBlockers]),
});

export default function SpotPilotPage() {
  const [status, setStatus] = useState<PilotStatusResponse | null>(null);
  const [strategy, setStrategy] = useState<StrategyStatus | null>(null);
  const [accounts, setAccounts] = useState<Record<string, PilotAccountData>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Record<string, PilotCardMessage | null>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [ack, setAck] = useState(false);
  const [totp, setTotp] = useState('');
  const [killWord, setKillWord] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [review, setReview] = useState<Review>(null);
  const [reviewAck, setReviewAck] = useState(false);
  const [approveTotp, setApproveTotp] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const busyRef = useRef(false);

  const patchAccount = useCallback((id: string, patch: Partial<PilotAccountData>) => {
    setAccounts((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  }, []);

  /** Verificação "está tudo pronto?" (GET, dry-run no servidor, sem ordens) de uma conta. */
  const refreshReadiness = useCallback(
    async (id: string) => {
      try {
        const r = await loadPilotReadiness(get, id);
        patchAccount(id, { readiness: r, readinessAtMs: Date.now(), readinessError: null });
      } catch {
        patchAccount(id, { readiness: null, readinessAtMs: null, readinessError: 'Não conseguimos confirmar se está tudo pronto. Tenta outra vez.' });
      }
    },
    [patchAccount]
  );

  /** Só leituras. Cada conta guarda os seus dados; nada é partilhado entre contas. */
  const refresh = useCallback(
    async (withReadiness = false) => {
      try {
        const o = await loadPilotOverview(get);
        setStatus(o.status);
        setStrategy(o.strategy);
        setAccounts((prev) => {
          const next: Record<string, PilotAccountData> = {};
          for (const a of o.accounts) {
            const base = prev[a.account.id] ?? emptyAccountData(a.account);
            next[a.account.id] = { ...base, account: a.account, detail: a.detail ?? base.detail, history: a.history ?? base.history, loadError: a.error };
          }
          return next;
        });
        setOrder(o.accounts.map((a) => a.account.id));
        setLastUpdated(new Date().toISOString());
        setLoadError(null);
        if (withReadiness) await Promise.all(o.accounts.map((a) => refreshReadiness(a.account.id)));
      } catch (e) {
        setLoadError(pilotActionError(e).message);
      }
    },
    [refreshReadiness]
  );

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(true), 0);
    const t = window.setInterval(() => {
      setNowMs(Date.now());
      if (!busyRef.current) void refresh();
    }, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [refresh]);

  /** Uma operação de cada vez; o estado é sempre relido do servidor depois, com sucesso ou erro. */
  async function run(accountId: string, where: PilotCardMessage['where'], label: string, fn: () => Promise<ActionError | void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessages((m) => ({ ...m, [accountId]: null }));
    try {
      const failure = await fn();
      setMessages((m) => ({ ...m, [accountId]: failure ? toMessage(where, failure) : { where, ok: true, text: label, notes: [] } }));
    } catch (e) {
      const error = pilotActionError(e);
      setMessages((m) => ({ ...m, [accountId]: toMessage(where, error) }));
    } finally {
      await refresh();
      setNowMs(Date.now());
      busyRef.current = false;
      setBusy(false);
    }
  }

  const doReadCheck = (accountId: string) =>
    void run(accountId, 'VERIFY', 'Conta verificada. Nada foi alterado na Binance.', async () => {
      const r = (await api.post<ReadCheckResult>(`/spot-pilot/accounts/${accountId}/read-check`)).data;
      patchAccount(accountId, { readResult: r });
      const check = r.activationCheck;
      if (!check || !check.ok) return { message: 'A verificação não passou. Corrige o que está indicado e verifica outra vez.', code: null, reasons: check?.reasons ?? r.reasons ?? [], readinessBlockers: [] };
    });

  const doReconcile = (accountId: string) =>
    void run(accountId, 'CONFIRM', 'Conta confirmada: o bot e a Binance coincidem.', async () => {
      patchAccount(accountId, { readiness: null, readinessAtMs: null, readinessError: null });
      const r = (await api.post<ReconcileResult>(`/spot-pilot/accounts/${accountId}/reconcile`)).data;
      patchAccount(accountId, { reconcileResult: r });
      if (!r.ok) return { message: 'A confirmação encontrou diferenças ou falhou. Só podes ativar depois de uma confirmação sem diferenças.', code: null, reasons: r.reasons, readinessBlockers: [] };
      await refreshReadiness(accountId);
    });

  const doRecheck = (accountId: string) =>
    void run(accountId, 'ACTIVATE', 'Verificação de segurança feita agora (sem ordens).', async () => {
      patchAccount(accountId, { readiness: null, readinessAtMs: null, readinessError: null });
      await refreshReadiness(accountId);
    });

  const openDialog = (kind: DialogKind, accountId: string) => {
    setDialog({ kind, accountId });
    setAck(false);
    setTotp('');
    setKillWord('');
    setDialogError(null);
  };
  const closeDialog = () => {
    setDialog(null);
    setAck(false);
    setTotp('');
    setKillWord('');
    setDialogError(null);
  };

  /** O código TOTP é usado num único pedido e limpo logo a seguir; nunca é guardado nem registado. */
  function confirmDialog() {
    if (!dialog) return;
    const { kind, accountId } = dialog;
    const code = totp;
    if (kind === 'ARM' || kind === 'RESUME') {
      const c = checkTotpCode(code);
      if (!c.ok) {
        setDialogError(c.message);
        return;
      }
    }
    closeDialog();
    if (kind === 'ARM') {
      void run(accountId, 'ACTIVATE', 'Bot ativado nesta conta. Ainda não procura compras: usa «Começar a procurar oportunidades» quando quiseres.', async () => {
        await api.post(`/spot-pilot/accounts/${accountId}/state`, { state: 'ARMED', totpCode: code }, { skipAuthRetry: true });
      });
    } else if (kind === 'RESUME') {
      void run(accountId, 'SEARCH', 'O bot começou a procurar oportunidades. Cada compra continua a precisar da tua aprovação.', async () => {
        await api.post('/spot-pilot/strategy/entries', { enabled: true, totpCode: code }, { skipAuthRetry: true });
      });
    } else if (kind === 'PAUSE_ENTRIES') {
      void run(accountId, 'GENERAL', 'Entradas pausadas. As vendas automáticas das posições abertas continuam.', async () => {
        await api.post('/spot-pilot/strategy/entries', { enabled: false });
      });
    } else if (kind === 'DISARM') {
      void run(accountId, 'GENERAL', 'Bot desativado nesta conta: sem novas compras. As vendas automáticas continuam.', async () => {
        await api.post(`/spot-pilot/accounts/${accountId}/state`, { state: 'PAUSED', reason: 'Desarmada na página Spot Pilot' });
      });
    } else if (kind === 'KILL') {
      void run(accountId, 'GENERAL', 'Paragem de emergência acionada: o bot não envia nenhuma ordem nesta conta, incluindo vendas.', async () => {
        await api.post(`/spot-pilot/accounts/${accountId}/state`, { state: 'DISABLED', reason: 'Kill switch na página Spot Pilot' });
      });
    }
  }

  const openReview = (accountId: string, idempotencyKey: string) => {
    setReview({ accountId, idempotencyKey });
    setReviewAck(false);
    setApproveTotp('');
    setDialogError(null);
  };
  const closeReview = () => {
    setReview(null);
    setReviewAck(false);
    setApproveTotp('');
    setDialogError(null);
  };

  async function confirmApprove() {
    if (!review || busyRef.current) return;
    const { accountId, idempotencyKey } = review;
    const c = checkTotpCode(approveTotp);
    if (!c.ok) {
      setDialogError(c.message);
      return;
    }
    const code = approveTotp;
    setApproveTotp('');
    busyRef.current = true;
    setBusy(true);
    try {
      const { outcome, message } = await approveThenRefresh(
        () =>
          submitPilotApproval((url, body, config) => api.post(url, body, config), {
            accountId,
            idempotencyKey,
            totpCode: code,
            approvalTtlMs: accounts[accountId]?.detail?.safety?.approvalTtlMs ?? null,
          }),
        () => refresh()
      );
      if (outcome.kind === 'INVALID_INPUT') {
        setDialogError(message);
      } else {
        closeReview();
        setMessages((m) => ({ ...m, [accountId]: { where: 'GENERAL', ok: outcome.kind === 'APPROVED', text: message, notes: [] } }));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const reject = (accountId: string, idempotencyKey: string) => {
    closeReview();
    void run(accountId, 'GENERAL', 'Compra rejeitada. Não foi enviada à Binance.', async () => {
      await api.post(`/spot-pilot/accounts/${accountId}/reject`, { idempotencyKey });
    });
  };

  const safety = status?.safety ?? null;
  const viewFor = (id: string): ViewInput | null => (accounts[id] ? { data: accounts[id], safety, strategy, nowMs, busy } : null);
  const reviewView = review ? viewFor(review.accountId) : null;
  const reviewItem = review && reviewView ? pendingPurchases(reviewView).find((p) => p.idempotencyKey === review.idempotencyKey) ?? null : null;
  const dialogIndex = dialog ? order.indexOf(dialog.accountId) : -1;

  return (
    <div className="mx-auto max-w-4xl space-y-4" data-testid="spot-pilot-page">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text1">Spot Pilot</h1>
          <p className="text-[13px] text-text2">O teu bot analisa o mercado e procura oportunidades dentro dos limites que definiste.</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh(true)}
          className="ml-auto border border-border2 px-3 py-1.5 text-[12px] text-text2 disabled:opacity-40"
        >
          Atualizar
        </button>
      </header>

      {loadError && <div className="border border-red-30 bg-red-dim p-3 text-[12px] text-red">{loadError}</div>}

      {status && order.length === 0 && (
        <section className="border border-border1 bg-bg1 p-4 text-[13px] text-text2">Nenhuma conta está autorizada para o piloto. Esta lista só muda pela configuração do servidor.</section>
      )}
      {!status && !loadError && <p className="text-[13px] text-text3">A carregar…</p>}

      {order.map((id, index) => {
        const view = viewFor(id);
        if (!view) return null;
        return (
          <PilotAccountCard
            key={id}
            view={view}
            index={index}
            lastUpdated={lastUpdated}
            message={messages[id] ?? null}
            actions={{
              onVerify: () => doReadCheck(id),
              onConfirm: () => doReconcile(id),
              onRecheck: () => doRecheck(id),
              onActivate: () => openDialog('ARM', id),
              onStartSearch: () => openDialog('RESUME', id),
              onReview: (key) => openReview(id, key),
              onPauseEntries: () => openDialog('PAUSE_ENTRIES', id),
              onDisarm: () => openDialog('DISARM', id),
              onKill: () => openDialog('KILL', id),
            }}
          />
        );
      })}

      {dialog && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-3 border border-border2 bg-bg1 p-4">
            <div className="font-mono text-[10px] uppercase text-text3">{accountLabel(dialog.accountId, dialogIndex)}</div>
            {dialog.kind === 'ARM' && (
              <>
                <h3 className="font-semibold text-text1">Ativar o meu bot</h3>
                <p className="text-[12px] text-text2">
                  O servidor volta a confirmar a verificação, a confirmação e a segurança da conta antes de ativar. Ativar não começa a procurar compras nem envia ordens; cada compra
                  continua a precisar da tua aprovação, até {usdt(safety?.realSpotPilotMaxNotional)} por conta.
                </p>
              </>
            )}
            {dialog.kind === 'RESUME' && (
              <>
                <h3 className="font-semibold text-text1">Começar a procurar oportunidades</h3>
                <p className="text-[12px] text-text2">
                  O bot passa a poder propor compras reais na Binance, até {usdt(safety?.realSpotPilotMaxNotional)} por conta. Esta opção aplica-se a todas as contas com o bot ativo.
                  Cada compra precisa da tua aprovação. As vendas são automáticas e sem garantia de preço.
                </p>
              </>
            )}
            {dialog.kind === 'PAUSE_ENTRIES' && (
              <>
                <h3 className="font-semibold text-text1">Pausar entradas</h3>
                <p className="text-[12px] text-text2">O bot deixa de procurar novas compras em todas as contas. As vendas automáticas das posições abertas continuam.</p>
              </>
            )}
            {dialog.kind === 'DISARM' && (
              <>
                <h3 className="font-semibold text-text1">Desativar o bot nesta conta</h3>
                <p className="text-[12px] text-text2">Sem novas compras nem aprovações nesta conta. As vendas automáticas continuam. Para voltar a ativar, repetes os três passos.</p>
              </>
            )}
            {dialog.kind === 'KILL' && (
              <>
                <h3 className="font-semibold text-red">Paragem de emergência desta conta</h3>
                <p className="text-[12px] text-text2">
                  O bot deixa de enviar qualquer ordem nesta conta, <strong>incluindo as saídas automáticas</strong>. Uma posição aberta fica sem gestão pela aplicação até o bot voltar a ser
                  ativado. Não é uma pausa. Escreve {KILL_CONFIRM_WORD} para confirmar.
                </p>
                <input
                  value={killWord}
                  onChange={(e) => setKillWord(e.target.value.toUpperCase())}
                  className="w-full border border-border2 bg-bg2 px-2 py-1 font-mono text-text1"
                  aria-label="Confirmação"
                />
              </>
            )}
            <label className="flex items-start gap-2 text-[12px] text-text2">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>Confirmo que li e quero continuar.</span>
            </label>
            {(dialog.kind === 'ARM' || dialog.kind === 'RESUME') && (
              <div className="flex items-center gap-2">
                <label htmlFor="pilot-dialog-totp" className="text-[12px] text-text3">
                  Código da app de autenticação
                </label>
                <input
                  id="pilot-dialog-totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={PILOT_TOTP_LENGTH}
                  value={totp}
                  onChange={(e) => setTotp(sanitizeTotpInput(e.target.value))}
                  className="w-28 border border-border2 bg-bg2 px-2 py-1 font-mono tracking-widest text-text1"
                />
              </div>
            )}
            {dialogError && <p className="text-[12px] text-red">{dialogError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeDialog} className="border border-border2 px-3 py-1.5 text-[12px] text-text2">
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  !ack ||
                  ((dialog.kind === 'ARM' || dialog.kind === 'RESUME') && totp.length !== PILOT_TOTP_LENGTH) ||
                  (dialog.kind === 'KILL' && killWord !== KILL_CONFIRM_WORD)
                }
                onClick={confirmDialog}
                className={`border px-3 py-1.5 text-[12px] disabled:opacity-40 ${dialog.kind === 'KILL' ? 'border-red-30 text-red' : 'border-gold text-gold'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {review && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" data-testid="pilot-review-dialog">
          <div className="w-full max-w-md space-y-3 border border-border2 bg-bg1 p-4">
            <div className="font-mono text-[10px] uppercase text-text3">{accountLabel(review.accountId, order.indexOf(review.accountId))}</div>
            <h3 className="font-semibold text-text1">Rever compra</h3>
            {reviewItem ? (
              <>
                <dl className="text-[12px]">
                  {[
                    ['Moeda', reviewItem.symbol],
                    ['Valor estimado', usdt(reviewItem.valueUsdt)],
                    ['Quantidade', String(reviewItem.quantity)],
                    ['Motivo', reviewItem.reason],
                    ['Estado', reviewItem.state],
                    ['Aprovação', reviewItem.approval],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-border1 py-1">
                      <dt className="text-text3">{k}</dt>
                      <dd className="text-right text-text1">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[12px] text-text2">
                  Esta é uma compra real. Depois de aprovada, o bot só a envia se as regras de segurança voltarem a permitir. O preço final pode ser diferente (slippage) e as vendas são
                  feitas pela aplicação: não há ordem de proteção colocada na Binance.
                </p>
                {reviewItem.canApprove ? (
                  <>
                    <label className="flex items-start gap-2 text-[12px] text-text2">
                      <input type="checkbox" checked={reviewAck} onChange={(e) => setReviewAck(e.target.checked)} />
                      <span>Revi os detalhes e quero aprovar esta compra.</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label htmlFor="pilot-approve-totp" className="text-[12px] text-text3">
                        Código da app de autenticação
                      </label>
                      <input
                        id="pilot-approve-totp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={PILOT_TOTP_LENGTH}
                        value={approveTotp}
                        onChange={(e) => setApproveTotp(sanitizeTotpInput(e.target.value))}
                        disabled={busy}
                        className="w-28 border border-border2 bg-bg2 px-2 py-1 font-mono tracking-widest text-text1"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-text3">
                    {reviewItem.expired
                      ? 'A proposta expirou e já não pode ser aprovada. Rejeita-a; o bot fará uma nova se ainda fizer sentido.'
                      : reviewItem.approved
                        ? 'Esta compra já foi aprovada.'
                        : 'Só podes aprovar com o bot ativo nesta conta.'}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[12px] text-text3">Esta proposta já não está à espera de aprovação.</p>
            )}
            {dialogError && <p className="text-[12px] text-red">{dialogError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeReview} className="border border-border2 px-3 py-1.5 text-[12px] text-text2">
                Fechar
              </button>
              {reviewItem?.canReject && (
                <button type="button" disabled={busy} onClick={() => reject(review.accountId, review.idempotencyKey)} className="border border-border2 px-3 py-1.5 text-[12px] text-text2 disabled:opacity-40">
                  Rejeitar compra
                </button>
              )}
              {reviewItem?.canApprove && (
                <button
                  type="button"
                  disabled={busy || !reviewAck || approveTotp.length !== PILOT_TOTP_LENGTH}
                  onClick={() => void confirmApprove()}
                  className="border border-gold px-3 py-1.5 text-[12px] text-gold disabled:opacity-40"
                >
                  Aprovar compra
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
