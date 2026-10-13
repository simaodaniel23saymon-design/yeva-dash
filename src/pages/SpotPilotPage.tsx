import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { approveThenRefresh, checkTotpCode, isIntentExpired, PILOT_TOTP_LENGTH, sanitizeTotpInput, submitPilotApproval } from '../utils/pilotApproval';
import { SPOT_BALANCE_STATE_TEXT, type PilotReadiness } from '../utils/pilotReadinessView';
import {
  armDisabledReasons,
  checkStepState,
  CONTROL_STATE_TEXT,
  DEFAULT_CHECK_MAX_AGE_MS,
  entryCheckText,
  entryPlanText,
  eventKindText,
  intentStateText,
  isArmed,
  operationalAccounts,
  pilotActionError,
  pilotEvents,
  policyRows,
  readinessArmBlockers,
  readinessStepState,
  reasonText,
  resumeEntriesDisabledReasons,
  type ActionError,
  type ActivationCheck,
  type GuideInput,
  type PilotAccountDetail,
  type PilotHistory,
  type PilotStatusResponse,
  type StepState,
  type StrategyStatus,
} from '../utils/spotPilotView';

type Readiness = PilotReadiness & {
  availableSpotBalanceUsdt?: number | null;
  baseline?: { openOrders: number | null; realPositions: Array<{ symbol: string; quantity: number; costBasisQuote: number }>; openMismatches: number | null } | null;
  bot?: PilotReadiness['bot'] & { config?: { entryCapitalUsdt: number | null; maxExposureUsdt: number | null } | null };
};

type ReadCheckResult = {
  ok: boolean;
  reasons?: string[];
  activationCheck?: ActivationCheck;
  eligibility?: { eligible: boolean; reasons: string[] };
  account?: { status: string; canTrade: boolean | null; usdtFree: number | null; usdtLocked: number | null };
  openOrders?: { status: string; count: number } | null;
};

type ReconcileResult = {
  ok: boolean;
  reasons: string[];
  activationCheck?: ActivationCheck;
  openCriticalMismatches: number | null;
  balances: Array<{ symbol: string; asset: string; tracked: number; exchangeTotal: number | null; status: string }>;
  controlBlocked: boolean;
};

type Dialog = 'ARM' | 'RESUME' | 'PAUSE_ENTRIES' | 'DISARM' | 'KILL' | null;

const READINESS_PARAMS = { symbol: 'BTCUSDT', symbols: 'ETHUSDT' };
const KILL_CONFIRM_WORD = 'PARAR';

const usd = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(2)} USDT`);
const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('pt-PT') : '—');

const STEP_TONE: Record<StepState, string> = {
  OK: 'text-cyan border-cyan-30',
  FAILED: 'text-red border-red-30',
  STALE: 'text-gold border-gold',
  PENDING: 'text-text3 border-border2',
};
const STEP_TEXT: Record<StepState, string> = { OK: 'aprovado', FAILED: 'falhou', STALE: 'expirado', PENDING: 'por fazer' };

function Badge({ state }: { state: StepState }) {
  return <span className={`font-mono text-[9px] uppercase border px-1.5 py-0.5 ${STEP_TONE[state]}`}>{STEP_TEXT[state]}</span>;
}

function Card({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="bg-bg1 border border-border1 p-4" data-testid={testId}>
      <h2 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v, tone }: { k: string; v: React.ReactNode; tone?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border1 py-1.5 font-mono text-[11px]">
      <dt className="text-text3">{k}</dt>
      <dd className={`text-right break-all ${tone ?? 'text-text1'}`}>{v}</dd>
    </div>
  );
}

function ReasonList({ codes }: { codes: string[] }) {
  if (!codes.length) return null;
  return (
    <ul className="mt-1 space-y-0.5 font-mono text-[10px] text-gold">
      {codes.map((c) => (
        <li key={c}>• {reasonText(c)}</li>
      ))}
    </ul>
  );
}

export default function SpotPilotPage() {
  const [status, setStatus] = useState<PilotStatusResponse | null>(null);
  const [strategy, setStrategy] = useState<StrategyStatus | null>(null);
  const [detail, setDetail] = useState<PilotAccountDetail | null>(null);
  const [history, setHistory] = useState<PilotHistory | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [readinessAtMs, setReadinessAtMs] = useState<number | null>(null);
  const [readResult, setReadResult] = useState<ReadCheckResult | null>(null);
  const [reconcileResult, setReconcileResult] = useState<ReconcileResult | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; error?: ActionError } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [ack, setAck] = useState(false);
  const [totp, setTotp] = useState('');
  const [killWord, setKillWord] = useState('');
  const [approveKey, setApproveKey] = useState<string | null>(null);
  const [approveTotp, setApproveTotp] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const busyRef = useRef(false);

  const accounts = useMemo(() => operationalAccounts(status), [status]);
  const account = accounts[0] ?? null;
  const accountId = account?.id ?? null;

  const refresh = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([api.get<PilotStatusResponse>('/spot-pilot/status'), api.get<StrategyStatus>('/spot-pilot/strategy/status')]);
      setStatus(s.data);
      setStrategy(st.data);
      const id = operationalAccounts(s.data)[0]?.id ?? null;
      if (id) {
        const [d, h] = await Promise.all([api.get<PilotAccountDetail>(`/spot-pilot/accounts/${id}`), api.get<PilotHistory>(`/spot-pilot/accounts/${id}/history`, { params: { limit: 30 } })]);
        setDetail(d.data);
        setHistory(h.data);
      } else {
        setDetail(null);
        setHistory(null);
      }
      setLastUpdated(new Date().toISOString());
      setLoadError(null);
    } catch (e) {
      setLoadError(pilotActionError(e).message);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
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
  async function run(label: string, fn: () => Promise<ActionError | void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const failure = await fn();
      setMsg(failure ? { ok: false, text: failure.message, error: failure } : { ok: true, text: label });
    } catch (e) {
      const error = pilotActionError(e);
      setMsg({ ok: false, text: error.message, error });
    } finally {
      await refresh();
      setNowMs(Date.now());
      busyRef.current = false;
      setBusy(false);
    }
  }

  const doReadCheck = () =>
    accountId &&
    void run('Verificação de leitura concluída (só leitura; nada foi alterado na Binance).', async () => {
      const r = (await api.post<ReadCheckResult>(`/spot-pilot/accounts/${accountId}/read-check`)).data;
      setReadResult(r);
      const check = r.activationCheck;
      if (!check || !check.ok) return { message: 'A verificação de leitura não passou. Corrige o motivo e repete.', code: null, reasons: check?.reasons ?? r.reasons ?? [], readinessBlockers: [] };
    });

  const doReconcile = () =>
    accountId &&
    void run('Reconciliação concluída sem divergências.', async () => {
      setReadiness(null);
      setReadinessAtMs(null);
      const r = (await api.post<ReconcileResult>(`/spot-pilot/accounts/${accountId}/reconcile`)).data;
      setReconcileResult(r);
      if (!r.ok) return { message: 'A reconciliação falhou ou encontrou divergências. O armamento fica impedido até uma reconciliação limpa.', code: null, reasons: r.reasons, readinessBlockers: [] };
    });

  const doReadiness = () =>
    accountId &&
    void run('Readiness verificado agora (dry-run; nenhuma ordem foi criada).', async () => {
      setReadiness(null);
      setReadinessAtMs(null);
      const r = (await api.get<Readiness>(`/spot-pilot/accounts/${accountId}/readiness`, { params: READINESS_PARAMS })).data;
      setReadiness(r);
      setReadinessAtMs(Date.now());
    });

  const openDialog = (d: Dialog) => {
    setDialog(d);
    setAck(false);
    setTotp('');
    setKillWord('');
    setMsg(null);
  };
  const closeDialog = () => {
    setDialog(null);
    setAck(false);
    setTotp('');
    setKillWord('');
  };

  /** O código TOTP é usado num único pedido e limpo logo a seguir; nunca é guardado nem registado. */
  function confirmDialog() {
    if (!accountId || !dialog) return;
    const kind = dialog;
    const code = totp;
    if (kind === 'ARM' || kind === 'RESUME') {
      const c = checkTotpCode(code);
      if (!c.ok) {
        setMsg({ ok: false, text: c.message });
        return;
      }
    }
    closeDialog();
    if (kind === 'ARM') {
      void run('Conta armada. As entradas continuam separadas: retoma-as só quando quiseres permitir compras.', async () => {
        await api.post(`/spot-pilot/accounts/${accountId}/state`, { state: 'ARMED', totpCode: code }, { skipAuthRetry: true });
      });
    } else if (kind === 'RESUME') {
      void run('Entradas retomadas. Cada compra continua a exigir aprovação TOTP.', async () => {
        await api.post('/spot-pilot/strategy/entries', { enabled: true, totpCode: code }, { skipAuthRetry: true });
      });
    } else if (kind === 'PAUSE_ENTRIES') {
      void run('Entradas suspensas. As saídas automáticas das posições abertas continuam.', async () => {
        await api.post('/spot-pilot/strategy/entries', { enabled: false });
      });
    } else if (kind === 'DISARM') {
      void run('Conta desarmada (PAUSED): sem novas compras nem aprovações; saídas automáticas continuam.', async () => {
        await api.post(`/spot-pilot/accounts/${accountId}/state`, { state: 'PAUSED', reason: 'Desarmada na página Spot Pilot' });
      });
    } else if (kind === 'KILL') {
      void run('Kill switch da conta acionado (DISABLED): o piloto não envia nenhuma ordem, incluindo saídas.', async () => {
        await api.post(`/spot-pilot/accounts/${accountId}/state`, { state: 'DISABLED', reason: 'Kill switch na página Spot Pilot' });
      });
    }
  }

  async function confirmApprove(idempotencyKey: string) {
    if (!accountId || busyRef.current) return;
    const c = checkTotpCode(approveTotp);
    if (!c.ok) {
      setMsg({ ok: false, text: c.message });
      return;
    }
    if (!window.confirm('Aprovar esta compra REAL? Ela só é enviada se o Risk Guard voltar a permitir.')) return;
    const code = approveTotp;
    setApproveTotp('');
    busyRef.current = true;
    setBusy(true);
    try {
      const { outcome, message } = await approveThenRefresh(
        () => submitPilotApproval((url, body, config) => api.post(url, body, config), { accountId, idempotencyKey, totpCode: code, approvalTtlMs: detail?.safety?.approvalTtlMs ?? null }),
        refresh
      );
      setMsg({ ok: outcome.kind === 'APPROVED', text: message });
      if (outcome.kind !== 'INVALID_INPUT') setApproveKey(null);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const reject = (idempotencyKey: string) =>
    accountId &&
    void run('Intenção rejeitada (nunca enviada).', async () => {
      await api.post(`/spot-pilot/accounts/${accountId}/reject`, { idempotencyKey });
    });

  const s = status?.safety ?? null;
  const control = detail?.control ?? account?.control ?? null;
  const maxAge = detail?.activationCheckMaxAgeMs ?? DEFAULT_CHECK_MAX_AGE_MS;
  const checks = detail?.activationChecks;
  const readStep = checkStepState(checks?.readCheck, nowMs, maxAge);
  const reconcileStep = checkStepState(checks?.reconcile, nowMs, maxAge);
  const readinessStep = readinessStepState(readiness && readiness.accountId === accountId ? readiness : null, readinessAtMs, checks?.reconcile, nowMs, maxAge);
  const stratAccount = strategy?.accounts.find((a) => a.accountId === accountId) ?? null;
  const guide: GuideInput = {
    accountId,
    inAllowlist: !!accountId && (s?.realSpotPilotAccountIds ?? []).includes(accountId),
    control: control?.state ?? null,
    readCheck: readStep,
    reconcile: reconcileStep,
    readiness: readinessStep,
    entriesEnabled: strategy ? strategy.entriesEnabled : null,
    strategyBlockers: strategy?.blockers ?? [],
    strategyAccountIds: strategy?.strategyAccountIds ?? [],
    busy,
  };
  const armBlock = armDisabledReasons(guide);
  const resumeBlock = resumeEntriesDisabledReasons(guide);
  const events = pilotEvents({ checks, control, history, intents: detail?.intents, lastAction: stratAccount?.lastAction ?? null });
  const rows = policyRows(strategy?.policy ?? null, s);
  const pendingIntents = (detail?.intents ?? []).filter((i) => i.state === 'PENDING');
  const balance = readiness?.spotBalance ?? null;

  const step = (n: number, title: string, state: StepState, body: React.ReactNode, action?: React.ReactNode) => (
    <li className="border border-border1 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-text3">Etapa {n}</span>
        <span className="text-[13px] text-text1 font-medium">{title}</span>
        <Badge state={state} />
        <span className="ml-auto">{action}</span>
      </div>
      <div className="text-[12px] text-text2">{body}</div>
    </li>
  );

  return (
    <div className="space-y-4 max-w-6xl mx-auto" data-testid="spot-pilot-page">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text1">Spot Pilot</h1>
          <p className="text-[12px] text-text3">Piloto real Binance Spot · controlo do administrador · separado da página Spot e do Momentum Rotation em Paper</p>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-text3">
          <span>Última atualização: {when(lastUpdated)}</span>
          <button type="button" disabled={busy} onClick={() => void refresh()} className="border border-border2 text-text2 px-2 py-1 uppercase disabled:opacity-40">Atualizar</button>
        </div>
      </header>

      {loadError && <div className="p-3 border border-red-30 bg-red-dim text-red font-mono text-[11px]">{loadError}</div>}
      {msg && (
        <div className={`p-3 border font-mono text-[11px] ${msg.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`} role="status">
          {msg.text}
          {msg.error && <ReasonList codes={msg.error.reasons} />}
          {msg.error && msg.error.readinessBlockers.length > 0 && (
            <>
              <div className="mt-1 text-text2">Bloqueios do readiness no momento do pedido:</div>
              <ReasonList codes={msg.error.readinessBlockers} />
            </>
          )}
        </div>
      )}

      {status && !account && (
        <Card title="Conta autorizada">
          <p className="text-[12px] text-text2">Nenhuma conta na lista operacional do servidor (REAL_SPOT_PILOT_ACCOUNT_IDS). A lista só é alterada por configuração do servidor.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="1 · Configuração do piloto na API" testId="pilot-config">
          {s ? (
            <dl>
              <Row k="Exchange" v="Binance · Spot" />
              <Row k="Conta operacional" v={accountId ?? '—'} />
              <Row k="Conta ativa" v={account ? (account.isActive ? 'sim' : 'não') : '—'} />
              <Row k="Piloto ligado (REAL_SPOT_PILOT_ENABLED)" v={s.realSpotPilotEnabled ? 'sim' : 'não'} />
              <Row k="Execução real (SPOT_LIVE_ENABLED)" v={s.spotLiveEnabled ? 'sim' : 'não'} />
              <Row k="Kill switch global (SPOT_KILL_SWITCH)" v={s.spotKillSwitch ? 'ATIVO' : 'inativo'} tone={s.spotKillSwitch ? 'text-red' : 'text-text1'} />
              <Row k="Escrita na build" v={s.cexLiveWriteEnabledInBuild ? 'sim' : 'não'} />
              <Row k="Limite por ordem / ciclo / conta" v={s.realSpotPilotMaxNotional == null ? 'não configurado' : `${s.realSpotPilotMaxNotional} USDT (teto ${s.realSpotPilotMaxNotionalCap ?? '—'})`} />
              <Row k="Conta na estratégia automática" v={accountId && strategy ? (strategy.strategyAccountIds.includes(accountId) ? 'sim' : 'não') : '—'} />
              <Row k="Loop da estratégia" v={strategy ? (strategy.loopRunning ? 'a correr' : 'parado') : '—'} />
            </dl>
          ) : (
            <p className="text-text3 text-sm">A ler…</p>
          )}
          {s && s.blockers.length > 0 && (
            <div className="mt-2">
              <div className="font-mono text-[10px] text-text3">Bloqueios globais</div>
              <ReasonList codes={s.blockers} />
            </div>
          )}
          <p className="mt-2 text-[11px] text-text3">Só leitura: estes valores mudam apenas pela configuração do servidor. O motor Spot legado (SPOT_BOT_ENABLED) e a página Spot não indicam o estado do piloto.</p>
        </Card>

        <Card title="2 · Readiness da conta" testId="pilot-readiness-summary">
          {readiness && readiness.accountId === accountId ? (
            <dl>
              <Row k="Resultado" v={readiness.readiness === 'READY' ? 'Pronto' : 'Não pronto'} tone={readiness.readiness === 'READY' ? 'text-cyan' : 'text-gold'} />
              <Row k="Verificado em" v={readinessAtMs ? new Date(readinessAtMs).toLocaleString('pt-PT') : '—'} />
              <Row k="Ligação Binance" v={balance ? SPOT_BALANCE_STATE_TEXT[balance.state] ?? balance.state : '—'} />
              <Row k="Saldo Spot USDT (livre / bloqueado)" v={balance ? `${usd(balance.usdtFree)} / ${usd(balance.usdtLocked)}` : '—'} />
              <Row k="Saldo disponível para o piloto" v={usd(readiness.availableSpotBalanceUsdt)} />
              <Row k="Entrada calculada pelo servidor" v={usd(readiness.bot?.config?.entryCapitalUsdt)} />
              <Row k="Limite efetivo" v={usd(readiness.limits?.effectiveLimitUsdt)} />
              <Row k="Ordens abertas / posições externas" v={`${readiness.baseline?.openOrders ?? '—'} / ${readiness.externalPositions ?? '—'}`} />
              <Row k="Plano de entrada (lógica do motor)" v={entryPlanText(readiness.entryPlan)} tone={readiness.entryPlan?.state === 'ENTRY_DATA_UNAVAILABLE' ? 'text-red' : 'text-text1'} />
              <Row k="Risk Guard (dry-run)" v={readiness.dryRun ? readiness.dryRun.decision : '—'} />
            </dl>
          ) : (
            <p className="text-[12px] text-text3">Ainda não verificado nesta sessão. Usa «Verificar readiness» na etapa 3 (só leitura). Saldo e ligação aparecem depois dessa verificação.</p>
          )}
          {readiness && readiness.accountId === accountId && (
            <>
              <ReasonList codes={readiness.blockers} />
              {readiness.entryPlan && readiness.entryPlan.checks.length > 0 && (
                <ul className="mt-1 space-y-0.5 font-mono text-[10px]" data-testid="pilot-readiness-entry-checks">
                  {readiness.entryPlan.checks.map((c) => (
                    <li key={c.symbol} className={c.ok ? 'text-cyan' : 'text-text2'}>
                      {entryCheckText(c)}
                    </li>
                  ))}
                </ul>
              )}
              {readiness.safety.gates.length > 0 && <p className="mt-1 font-mono text-[10px] text-text3">Gates: {readiness.safety.gates.map(reasonText).join(' · ')}</p>}
            </>
          )}
        </Card>

        <Card title="3 · Armamento da conta" testId="pilot-arming">
          <dl>
            <Row k="Estado" v={control ? CONTROL_STATE_TEXT[control.state] ?? control.state : '—'} tone={control?.state === 'BLOCKED' ? 'text-red' : isArmed(control?.state) ? 'text-gold' : 'text-text1'} />
            <Row k="Alterado em" v={when(control?.updatedAt)} />
            <Row k="Motivo" v={control?.reason ?? '—'} />
          </dl>
        </Card>

        <Card title="4 · Permissão para novas entradas" testId="pilot-entries">
          <dl>
            <Row
              k="Novas entradas"
              v={strategy ? (strategy.entriesEnabled ? 'ligadas' : 'suspensas') : '—'}
              tone={strategy?.entriesEnabled ? 'text-cyan' : 'text-text1'}
            />
            <Row k="Aprovação de cada compra" v="TOTP do administrador" />
            <Row k="Estado da estratégia nesta conta" v={stratAccount ? stratAccount.state : '—'} />
          </dl>
          {stratAccount && stratAccount.reasons.length > 0 && <p className="mt-1 font-mono text-[10px] text-text3">{stratAccount.reasons.join(' · ')}</p>}
          {stratAccount?.entryChecks && stratAccount.entryChecks.length > 0 && (
            <div className="mt-2" data-testid="pilot-entry-checks">
              <div className="font-mono text-[10px] uppercase text-text3">Validação Binance por símbolo (decisão da estratégia, não uma ordem)</div>
              <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                {stratAccount.entryChecks.map((c) => (
                  <li key={c.symbol} className={c.ok ? 'text-cyan' : 'text-text2'}>
                    {entryCheckText(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card title="5 · Execução e posições" testId="pilot-execution">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <Row k="Posições do piloto" v={stratAccount ? (stratAccount.position ? '1' : '0') : '—'} />
          <Row k="Intenções por resolver" v={detail ? String(detail.intents.length) : '—'} />
          <Row k="Divergências em aberto" v={detail ? String(detail.mismatches.length) : '—'} tone={detail?.mismatches.length ? 'text-red' : 'text-text1'} />
          <Row k="Último ciclo da estratégia" v={when(stratAccount?.lastTickAt)} />
        </dl>
        {stratAccount?.position && (
          <p className="mt-2 font-mono text-[11px] text-text2">
            {stratAccount.position.symbol} {stratAccount.position.quantity} · médio {stratAccount.position.averageEntryPrice ?? '—'} · preço {stratAccount.position.price ?? '—'} · PnL{' '}
            {stratAccount.position.pnlPct == null ? '—' : `${stratAccount.position.pnlPct.toFixed(2)}%`} · SL {stratAccount.position.stopLossPrice ?? '—'} · TP {stratAccount.position.takeProfitPrice ?? '—'}
          </p>
        )}
        {stratAccount?.reasons.includes('POSITION_UNPROTECTED') && <p className="mt-1 text-red font-mono text-[11px]">Posição aberta sem saída automática enquanto os gates estiverem fechados.</p>}
        {detail && detail.mismatches.length > 0 && (
          <ul className="mt-2 space-y-0.5 font-mono text-[10px]">
            {detail.mismatches.map((m) => (
              <li key={m.id} className={m.severity === 'CRITICAL' ? 'text-red' : 'text-gold'}>
                {m.severity} · {m.kind} · {m.symbol ?? m.asset ?? '—'}
              </li>
            ))}
          </ul>
        )}
        {pendingIntents.length > 0 && (
          <div className="mt-3 space-y-2" data-testid="pilot-pending-approvals">
            <div className="font-mono text-[10px] uppercase text-text3">Compras a aguardar aprovação</div>
            {pendingIntents.map((i) => {
              const expired = isIntentExpired(i.createdAt, detail?.safety?.intentMaxAgeMs, nowMs);
              const canApprove = isArmed(control?.state) && !expired;
              return (
                <div key={i.idempotencyKey} className="border border-border1 p-2 font-mono text-[11px] text-text2 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      {i.symbol} {i.side} {i.quantity} (~{i.notional.toFixed(2)} USDT) · {intentStateText(i.state)}
                    </span>
                    {expired && <span className="text-red">expirada: rejeita-a</span>}
                    {canApprove && approveKey !== i.idempotencyKey && (
                      <button type="button" disabled={busy} onClick={() => { setApproveKey(i.idempotencyKey); setApproveTotp(''); }} className="uppercase border border-gold text-gold px-1.5 disabled:opacity-40">Aprovar</button>
                    )}
                    <button type="button" disabled={busy} onClick={() => reject(i.idempotencyKey)} className="uppercase border border-border2 text-text3 px-1.5 disabled:opacity-40">Rejeitar</button>
                  </div>
                  {canApprove && approveKey === i.idempotencyKey && (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void confirmApprove(i.idempotencyKey);
                      }}
                    >
                      <label htmlFor={`approve-${i.idempotencyKey}`} className="text-text3">Código TOTP</label>
                      <input
                        id={`approve-${i.idempotencyKey}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={PILOT_TOTP_LENGTH}
                        value={approveTotp}
                        onChange={(e) => setApproveTotp(sanitizeTotpInput(e.target.value))}
                        disabled={busy}
                        className="w-24 bg-bg2 border border-border2 px-1.5 py-0.5 text-text1 tracking-widest"
                      />
                      <button type="submit" disabled={busy || approveTotp.length !== PILOT_TOTP_LENGTH} className="uppercase border border-gold text-gold px-1.5 disabled:opacity-40">Confirmar aprovação</button>
                      <button type="button" disabled={busy} onClick={() => { setApproveKey(null); setApproveTotp(''); }} className="uppercase border border-border2 text-text3 px-1.5">Cancelar</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {(detail?.intents ?? []).some((i) => ['UNKNOWN', 'SUBMITTING', 'REQUIRES_RECONCILIATION'].includes(i.state)) && (
          <p className="mt-2 text-red font-mono text-[11px]">
            Há uma ordem em estado incerto. Não repitas a ordem: inspeciona-a no <Link to="/admin" className="underline">painel Admin → Spot Pilot</Link>.
          </p>
        )}
      </Card>

      <Card title="Assistente de ativação" testId="pilot-guide">
        <ol className="space-y-2">
          {step(
            1,
            'Verificar leitura',
            readStep,
            <>
              <p>Lê permissões da chave, conta, saldo e ordens abertas na Binance (só pedidos GET).</p>
              <p className="font-mono text-[10px] text-text3">Última verificação: {when(checks?.readCheck?.at)}</p>
              {checks?.readCheck && !checks.readCheck.ok && <ReasonList codes={checks.readCheck.reasons} />}
              {readResult?.account && (
                <p className="font-mono text-[10px] text-text3">
                  Conta {readResult.account.status} · USDT livre {usd(readResult.account.usdtFree)} · ordens abertas {readResult.openOrders?.count ?? '—'}
                </p>
              )}
            </>,
            <button type="button" disabled={busy || !accountId} onClick={doReadCheck} className="font-mono text-[10px] uppercase border border-cyan-30 text-cyan px-2 py-1 disabled:opacity-40">Verificar leitura</button>
          )}
          {step(
            2,
            'Reconciliar',
            reconcileStep,
            <>
              <p>Compara as ordens e execuções do piloto com a Binance. Divergências ou falha impedem o armamento.</p>
              <p className="font-mono text-[10px] text-text3">Última reconciliação: {when(checks?.reconcile?.at)}</p>
              {checks?.reconcile && !checks.reconcile.ok && <ReasonList codes={checks.reconcile.reasons} />}
              {reconcileResult && (
                <p className="font-mono text-[10px] text-text3">
                  Divergências críticas em aberto: {reconcileResult.openCriticalMismatches ?? '—'} · saldos verificados: {reconcileResult.balances.length}
                  {reconcileResult.controlBlocked && <span className="text-red"> · conta colocada em BLOCKED</span>}
                </p>
              )}
            </>,
            <button type="button" disabled={busy || !accountId} onClick={doReconcile} className="font-mono text-[10px] uppercase border border-cyan-30 text-cyan px-2 py-1 disabled:opacity-40">Reconciliar</button>
          )}
          {step(
            3,
            'Verificar readiness',
            readinessStep,
            <>
              <p>Recalcula o readiness agora (dry-run, sem ordens). Só conta se for pedido depois da reconciliação; o servidor volta a calculá-lo no momento de armar.</p>
              {readiness && readiness.accountId === accountId && <ReasonList codes={readinessArmBlockers(readiness)} />}
            </>,
            <button type="button" disabled={busy || !accountId} onClick={doReadiness} className="font-mono text-[10px] uppercase border border-cyan-30 text-cyan px-2 py-1 disabled:opacity-40">Verificar readiness</button>
          )}
          {step(
            4,
            'Armar conta',
            isArmed(control?.state) ? 'OK' : 'PENDING',
            <>
              <p>Arma a conta no servidor com confirmação e código TOTP. Não liga entradas e não envia ordens.</p>
              {armBlock.length > 0 && !isArmed(control?.state) && (
                <ul className="font-mono text-[10px] text-text3">
                  {armBlock.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              )}
            </>,
            <button type="button" disabled={armBlock.length > 0} onClick={() => openDialog('ARM')} className="font-mono text-[10px] uppercase border border-gold text-gold px-2 py-1 disabled:opacity-40">Armar conta</button>
          )}
          {step(
            5,
            'Retomar entradas',
            strategy?.entriesEnabled ? 'OK' : 'PENDING',
            <>
              <p>Permite que a estratégia proponha compras reais. Cada compra exige aprovação TOTP.</p>
              {resumeBlock.length > 0 && !strategy?.entriesEnabled && (
                <ul className="font-mono text-[10px] text-text3">
                  {resumeBlock.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              )}
            </>,
            <button type="button" disabled={resumeBlock.length > 0} onClick={() => openDialog('RESUME')} className="font-mono text-[10px] uppercase border border-gold text-gold px-2 py-1 disabled:opacity-40">Retomar entradas</button>
          )}
        </ol>
      </Card>

      <Card title="Controlos de segurança" testId="pilot-safety-controls">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-border1 p-3 space-y-2">
            <div className="text-[13px] text-text1 font-medium">Pausar entradas</div>
            <p className="text-[11px] text-text3">Impede novas compras da estratégia. As posições abertas continuam com saídas automáticas.</p>
            <button type="button" disabled={busy || !strategy?.entriesEnabled} onClick={() => openDialog('PAUSE_ENTRIES')} className="font-mono text-[10px] uppercase border border-border2 text-text2 px-2 py-1 disabled:opacity-40">Pausar entradas</button>
          </div>
          <div className="border border-border1 p-3 space-y-2">
            <div className="text-[13px] text-text1 font-medium">Desarmar</div>
            <p className="text-[11px] text-text3">Coloca a conta em PAUSED: sem novas compras nem aprovações. As saídas automáticas das posições abertas continuam.</p>
            <button type="button" disabled={busy || !accountId || !isArmed(control?.state)} onClick={() => openDialog('DISARM')} className="font-mono text-[10px] uppercase border border-border2 text-text2 px-2 py-1 disabled:opacity-40">Desarmar</button>
          </div>
          <div className="border border-red-30 p-3 space-y-2">
            <div className="text-[13px] text-red font-medium">Kill switch da conta</div>
            <p className="text-[11px] text-text3">Coloca a conta em DISABLED: o piloto deixa de enviar qualquer ordem, incluindo saídas automáticas. Uma posição aberta fica sem gestão pela aplicação. Não é uma pausa.</p>
            <button type="button" disabled={busy || !accountId || control?.state === 'DISABLED'} onClick={() => openDialog('KILL')} className="font-mono text-[10px] uppercase border border-red-30 text-red px-2 py-1 disabled:opacity-40">Acionar kill switch</button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-text3">O kill switch global (SPOT_KILL_SWITCH) é configuração do servidor e não é alterado a partir desta página.</p>
      </Card>

      <Card title="Como funciona a estratégia" testId="pilot-strategy-explainer">
        <div className="space-y-2 text-[12px] text-text2">
          <p>A estratégia Momentum Rotation (LONG, sem alavancagem) escolhe moedas a partir do ranking de Winners: só pares negociáveis em Binance Spot que passem o Spot Qualifier com ranking recente. Uma moeda elegível não é uma ordem garantida.</p>
          <p>Uma compra real só acontece pelo fluxo normal: decisão da estratégia → Risk Guard → aprovação TOTP do administrador → execução pelo serviço do piloto. Decisões e intenções não significam que uma ordem foi executada.</p>
          <p>O piloto limita a exposição e o número de entradas conforme a política do servidor (tabela abaixo). Se um valor do servidor divergir da especificação, é o do servidor que vale e a divergência fica assinalada.</p>
          <p className="text-gold">As saídas (Stop Loss, Take Profit, trailing e perda de momentum) são executadas pela aplicação, com ordens a mercado depois do sinal. Não há ordem de proteção colocada na Binance: falhas do serviço, da rede ou da exchange podem atrasar a saída, e o preço executado pode sofrer slippage. Não há garantia de preço.</p>
        </div>
        <table className="mt-3 w-full font-mono text-[11px]">
          <thead>
            <tr className="text-text3 text-left">
              <th className="py-1 font-normal">Limite</th>
              <th className="py-1 font-normal text-right">Servidor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border1">
                <td className="py-1 text-text2">{r.label}</td>
                <td className={`py-1 text-right ${r.diverges ? 'text-gold' : 'text-text1'}`}>
                  {r.server}
                  {r.diverges && <span className="block text-[10px]">diverge da especificação ({r.reference})</span>}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border1">
              <td className="py-1 text-text2">Entrada mínima da estratégia (venda no Stop Loss acima do mínimo da Binance)</td>
              <td className="py-1 text-right text-text1">{strategy?.policy.minStrategyEntryQuote == null ? '—' : `${strategy.policy.minStrategyEntryQuote} USDT`}</td>
            </tr>
            <tr className="border-t border-border1">
              <td className="py-1 text-text2">Margem de preço na compra</td>
              <td className="py-1 text-right text-text1">{strategy?.policy.entryPriceBufferPct == null ? '—' : `${strategy.policy.entryPriceBufferPct}%`}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-text3">
          Primeiro teste com valor menor: o limite por ordem, ciclo e conta é o REAL_SPOT_PILOT_MAX_NOTIONAL do servidor (nunca acima do teto compilado). Um limite de 5 USDT não permite entradas, porque a entrada ficaria abaixo do mínimo vendável no Stop Loss; o servidor recusa-a.
        </p>
      </Card>

      <Card title="Histórico e diagnóstico" testId="pilot-history">
        {events.length === 0 ? (
          <p className="text-[12px] text-text3">Sem eventos registados.</p>
        ) : (
          <ul className="space-y-1">
            {events.map((e, idx) => (
              <li key={`${e.kind}-${e.at}-${idx}`} className="grid grid-cols-1 md:grid-cols-[150px_220px_1fr] gap-x-3 border-b border-border1 py-1 font-mono text-[10px]">
                <span className="text-text3">{when(e.at)}</span>
                <span className="text-text2">{eventKindText(e.kind)}</span>
                <span className={e.tone === 'ok' ? 'text-cyan' : e.tone === 'bad' ? 'text-red' : e.tone === 'warn' ? 'text-gold' : 'text-text1'}>
                  {e.title}
                  {e.detail && <span className="text-text3"> · {e.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-text3">As verificações de leitura e reconciliação ficam guardadas no servidor até ao próximo reinício da API; depois disso têm de ser repetidas antes de armar.</p>
      </Card>

      {dialog && (
        <div className="fixed inset-0 z-[400] bg-black/75 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-bg1 border border-border2 p-4 space-y-3">
            {dialog === 'ARM' && (
              <>
                <h3 className="text-text1 font-semibold">Armar a conta</h3>
                <p className="text-[12px] text-text2">O servidor volta a verificar leitura, reconciliação e readiness antes de armar. Armar não liga entradas nem envia ordens; as compras continuam a exigir aprovação TOTP.</p>
              </>
            )}
            {dialog === 'RESUME' && (
              <>
                <h3 className="text-text1 font-semibold">Retomar entradas reais</h3>
                <p className="text-[12px] text-text2">
                  A estratégia passa a poder propor compras reais na Binance, até {s?.realSpotPilotMaxNotional ?? '—'} USDT por conta. Cada compra exige a tua aprovação TOTP. As saídas são automáticas e sem garantia de preço.
                </p>
              </>
            )}
            {dialog === 'PAUSE_ENTRIES' && (
              <>
                <h3 className="text-text1 font-semibold">Pausar entradas</h3>
                <p className="text-[12px] text-text2">Novas compras ficam suspensas. As saídas automáticas das posições abertas continuam.</p>
              </>
            )}
            {dialog === 'DISARM' && (
              <>
                <h3 className="text-text1 font-semibold">Desarmar a conta</h3>
                <p className="text-[12px] text-text2">A conta passa a PAUSED: sem novas compras nem aprovações. As saídas automáticas continuam. Para voltar a armar é preciso repetir leitura, reconciliação, readiness e TOTP.</p>
              </>
            )}
            {dialog === 'KILL' && (
              <>
                <h3 className="text-red font-semibold">Kill switch da conta</h3>
                <p className="text-[12px] text-text2">
                  A conta passa a DISABLED e o piloto deixa de enviar qualquer ordem, <strong>incluindo as saídas automáticas</strong>. Uma posição aberta fica sem proteção gerida pela aplicação até a conta voltar a ser armada. Escreve {KILL_CONFIRM_WORD} para confirmar.
                </p>
                <input value={killWord} onChange={(e) => setKillWord(e.target.value.toUpperCase())} className="w-full bg-bg2 border border-border2 px-2 py-1 text-text1 font-mono" aria-label="Confirmação" />
              </>
            )}
            <label className="flex items-start gap-2 text-[12px] text-text2">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>Confirmo que li e quero continuar.</span>
            </label>
            {(dialog === 'ARM' || dialog === 'RESUME') && (
              <div className="flex items-center gap-2">
                <label htmlFor="pilot-dialog-totp" className="font-mono text-[11px] text-text3">Código TOTP</label>
                <input
                  id="pilot-dialog-totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={PILOT_TOTP_LENGTH}
                  value={totp}
                  onChange={(e) => setTotp(sanitizeTotpInput(e.target.value))}
                  className="w-28 bg-bg2 border border-border2 px-2 py-1 text-text1 font-mono tracking-widest"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeDialog} className="font-mono text-[10px] uppercase border border-border2 text-text2 px-3 py-1.5">Cancelar</button>
              <button
                type="button"
                disabled={
                  busy ||
                  !ack ||
                  ((dialog === 'ARM' || dialog === 'RESUME') && totp.length !== PILOT_TOTP_LENGTH) ||
                  (dialog === 'KILL' && killWord !== KILL_CONFIRM_WORD)
                }
                onClick={confirmDialog}
                className={`font-mono text-[10px] uppercase border px-3 py-1.5 disabled:opacity-40 ${dialog === 'KILL' ? 'border-red-30 text-red' : 'border-gold text-gold'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
