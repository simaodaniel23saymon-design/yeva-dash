import { useEffect, useState } from 'react';
import type { BotConfigContext, BotConfigError, BotConfigResponse, BotConfigState, BotPreviewResponse } from '../../types/spot';
import {
  CONFIG_ERROR_LABEL,
  CONFIG_GROUPS,
  CONFIG_STATE_LABEL,
  NOT_CONFIGURED,
  PROTECTION_LABEL,
  REENTRY_CONDITION_LABEL,
  STOP_REQUIRED_TEXT,
  configFromForm,
  confirmationLines,
  formFromConfig,
  riskPreviewRows,
  suggestedSplit,
  type ConfigForm,
  type NumericConfigField,
} from '../../utils/botConfigView';
import { fmtUsd } from '../../utils/spotView';

type Props = {
  symbol: string;
  base: string;
  botName: string;
  loadConfig: (symbol: string) => Promise<BotConfigResponse>;
  previewConfig: (config: Record<string, unknown>) => Promise<BotPreviewResponse>;
  activate: (symbol: string, config: Record<string, unknown>) => Promise<{ ok: true } | { ok: false; message: string; errors: BotConfigError[] }>;
  onClose: () => void;
  /** Guarda a configuração como rascunho (pode estar incompleta) e deixa a moeda OFF. */
  saveDraft?: (symbol: string, config: Record<string, unknown>) => Promise<{ ok: true; configState: BotConfigState | null } | { ok: false; message: string; errors: BotConfigError[] }>;
  /** REAL (conta do utilizador, exige stop) ou PAPER (laboratório do admin, experimental). */
  context?: BotConfigContext;
};

const inputClass =
  'w-full bg-bg2 border border-border2 text-text1 px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan-30 aria-[invalid=true]:border-red-30';

/** Configuração do bot para uma moeda. Validar → resumo de risco → confirmação → guardar. Não envia ordens. */
export default function BotConfigPanel({ symbol, base, botName, loadConfig, previewConfig, activate, onClose, saveDraft, context = 'REAL' }: Props) {
  const [configState, setConfigState] = useState<BotConfigState | null>(null);
  const [data, setData] = useState<BotConfigResponse | null>(null);
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<BotConfigError[]>([]);
  const [review, setReview] = useState<BotPreviewResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const real = context === 'REAL';
  const stopMissing = errors.some((e) => e.code === 'STOP_LOSS_REQUIRED');

  useEffect(() => {
    let alive = true;
    loadConfig(symbol)
      .then((r) => {
        if (!alive) return;
        setData(r);
        setForm(formFromConfig(r.config));
        setConfigState(r.configured ? (r.configState ?? null) : null);
      })
      .catch(() => alive && setLoadError('Não foi possível atualizar os dados.'));
    return () => {
      alive = false;
    };
  }, [symbol, loadConfig]);

  const errorFor = (f: string) => errors.find((e) => e.field === f);
  const set = (patch: Partial<ConfigForm>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setReview(null);
    setConfirming(false);
  };

  const onReview = async () => {
    if (!form) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await previewConfig(configFromForm(form));
      setErrors(r.errors);
      setReview(r.valid ? r : null);
      setConfigState(r.configState ?? (r.valid ? 'READY_TO_ACTIVATE' : 'DRAFT'));
      if (!r.valid) setMessage(r.errors.some((e) => e.code === 'STOP_LOSS_REQUIRED') ? STOP_REQUIRED_TEXT : 'Corrige os campos assinalados.');
    } catch {
      setMessage('Não foi possível atualizar os dados.');
    } finally {
      setBusy(false);
    }
  };

  const onSaveDraft = async () => {
    if (!form || !saveDraft) return;
    setBusy(true);
    setMessage('');
    const r = await saveDraft(symbol, configFromForm(form));
    setBusy(false);
    if (r.ok) {
      setErrors([]);
      setConfigState(r.configState);
      setMessage(r.configState === 'READY_TO_ACTIVATE' ? 'Configuração guardada. Pronta para ativar.' : 'Rascunho guardado. A moeda fica desligada até ativar.');
    } else {
      setErrors(r.errors);
      setMessage(r.message);
    }
  };

  const onActivate = async () => {
    if (!form || !review || !confirming) return;
    setBusy(true);
    const r = await activate(symbol, configFromForm(form));
    setBusy(false);
    if (r.ok) onClose();
    else {
      setErrors(r.errors);
      setReview(null);
      setConfirming(false);
      setMessage(r.errors.some((e) => e.code === 'STOP_LOSS_REQUIRED') ? STOP_REQUIRED_TEXT : r.message);
    }
  };

  const d = data?.strategyDefaults ?? null;
  const capital = form ? Number(form.capitalTotalUsdt.replace(',', '.')) : NaN;
  const split = d && Number.isFinite(capital) ? suggestedSplit(capital, d) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`Configurar ${base}`} data-testid="bot-config-panel">
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-bg1 border border-border2 rounded-t-[22px] sm:rounded-[22px] p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text3">{botName} · Spot · {real ? 'REAL' : 'Experimental (admin)'}</p>
            <h3 className="text-text1 font-bold text-xl">Configurar {base}</h3>
            <p className="text-text2 text-[12px] mt-1">
              {real
                ? 'ATIVAR guarda esta configuração e liga a moeda para o bot. Não compra, não vende e não envia ordens. Stop loss obrigatório.'
                : 'Configuração experimental do laboratório: não afeta contas reais nem as preferências dos utilizadores.'}
            </p>
            {configState && (
              <p className="font-mono text-[11px] mt-2" data-testid="bot-config-state" data-state={configState}>
                <span className="text-text3">Status: </span>
                <span className={configState === 'READY_TO_ACTIVATE' ? 'text-cyan' : 'text-text1'}>{CONFIG_STATE_LABEL[configState]}</span>
                <span className="text-text3"> · Proteção: </span>
                <span className="text-text1">{configState === 'READY_TO_ACTIVATE' ? PROTECTION_LABEL.COMPLETE : PROTECTION_LABEL.INCOMPLETE}</span>
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="font-mono text-[11px] uppercase text-text3 hover:text-text1 px-2 py-1" aria-label="Fechar">
            Fechar
          </button>
        </div>

        {loadError && <p className="text-text2 text-sm">{loadError}</p>}
        {!form && !loadError && <p className="text-text2 text-sm">Dados em atualização.</p>}

        {form && d && (
          <>
            {CONFIG_GROUPS.map((g) => (
              <fieldset key={g.id} className="space-y-3" data-testid={`bot-config-group-${g.id}`}>
                <legend className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-1">{g.title}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {g.fields.map((f) => {
                    const err = errorFor(f.field);
                    const hint = defaultHint(f.field, data, split);
                    return (
                      <label key={f.field} className="block space-y-1">
                        <span className="text-text2 text-[12px]">
                          {f.label}
                          {f.unit && <span className="text-text3"> ({f.unit})</span>}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step={f.step}
                          min="0"
                          value={form[f.field]}
                          placeholder={NOT_CONFIGURED}
                          aria-invalid={err ? 'true' : 'false'}
                          onChange={(e) => set({ [f.field]: e.target.value } as Partial<ConfigForm>)}
                          className={inputClass}
                          data-testid={`bot-config-${f.field}`}
                        />
                        {err ? <span className="text-red text-[11px]">{CONFIG_ERROR_LABEL[err.code] ?? err.code}</span> : hint && <span className="text-text3 text-[11px]">{hint}</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <fieldset className="space-y-3" data-testid="bot-config-group-reentry">
              <legend className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-1">Reentrada</legend>
              <label className="flex items-center gap-2 text-text1 text-[13px]">
                <input type="checkbox" checked={form.reentryEnabled} onChange={(e) => set({ reentryEnabled: e.target.checked })} data-testid="bot-config-reentryEnabled" />
                {form.reentryEnabled ? 'Ativada' : 'Desativada'}
              </label>
              {form.reentryEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-text2 text-[12px]">Condição</span>
                    <select
                      value={form.reentryCondition}
                      onChange={(e) => set({ reentryCondition: e.target.value as ConfigForm['reentryCondition'] })}
                      className={inputClass}
                      aria-invalid={errorFor('reentryCondition') ? 'true' : 'false'}
                    >
                      <option value="">{NOT_CONFIGURED}</option>
                      {(Object.keys(REENTRY_CONDITION_LABEL) as Array<keyof typeof REENTRY_CONDITION_LABEL>).map((k) => (
                        <option key={k} value={k}>{REENTRY_CONDITION_LABEL[k]}</option>
                      ))}
                    </select>
                    {errorFor('reentryCondition') && <span className="text-red text-[11px]">{CONFIG_ERROR_LABEL[errorFor('reentryCondition')!.code]}</span>}
                  </label>
                  <label className="block space-y-1">
                    <span className="text-text2 text-[12px]">Cooldown <span className="text-text3">(min)</span></span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.reentryCooldownMin}
                      placeholder={NOT_CONFIGURED}
                      onChange={(e) => set({ reentryCooldownMin: e.target.value })}
                      className={inputClass}
                      aria-invalid={errorFor('reentryCooldownMin') ? 'true' : 'false'}
                    />
                    {errorFor('reentryCooldownMin') && <span className="text-red text-[11px]">{CONFIG_ERROR_LABEL[errorFor('reentryCooldownMin')!.code]}</span>}
                  </label>
                </div>
              )}
            </fieldset>

            {review && (
              <section className="border border-cyan-30 rounded-[18px] p-4 space-y-2" data-testid="bot-risk-preview">
                <p className="font-mono text-[10px] uppercase tracking-wider text-cyan">Resumo de risco · antes de ativar</p>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-[12px]">
                  {riskPreviewRows(review.preview).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-text3">{k}</dt>
                      <dd className={`font-mono ${v === NOT_CONFIGURED ? 'text-text3' : 'text-text1'}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-text3 text-[11px]">Execução real desativada: ativar não cria ordens nem posições.</p>
              </section>
            )}

            {review && confirming && (
              <section className="border border-cyan-30 rounded-[18px] p-4 space-y-2" data-testid="bot-activation-confirm">
                <p className="font-mono text-[10px] uppercase tracking-wider text-text3">Confirmação</p>
                {confirmationLines(review.preview).map((line, i) => (
                  <p key={line} className={i === 0 ? 'text-text1 text-[13px] font-semibold' : 'text-text1 text-[13px] font-mono'}>
                    {line}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="font-mono text-[11px] uppercase tracking-wider px-4 py-2 border border-border2 text-text2" data-testid="bot-confirm-cancel">
                    Cancelar
                  </button>
                  <button type="button" onClick={() => void onActivate()} disabled={busy} className="font-mono text-[11px] uppercase tracking-wider px-5 py-2 border border-cyan-30 bg-cyan-dim text-cyan disabled:opacity-40" data-testid="bot-confirm-activate">
                    Confirmar ativação
                  </button>
                </div>
              </section>
            )}

            {message && <p className={`text-sm ${stopMissing ? 'text-red' : 'text-text2'}`} role="alert">{message}</p>}

            {!confirming && (
              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={onClose} className="font-mono text-[11px] uppercase tracking-wider px-4 py-2 border border-border2 text-text2">
                  Cancelar
                </button>
                {saveDraft && (
                  <button
                    type="button"
                    onClick={() => void onSaveDraft()}
                    disabled={busy}
                    title="Guarda a configuração sem ativar. A moeda fica desligada."
                    className="font-mono text-[11px] uppercase tracking-wider px-4 py-2 border border-border2 text-text1 disabled:opacity-40"
                    data-testid="bot-config-save-draft"
                  >
                    Guardar rascunho
                  </button>
                )}
                {!review ? (
                  <button type="button" onClick={() => void onReview()} disabled={busy} className="font-mono text-[11px] uppercase tracking-wider px-4 py-2 border border-cyan-30 text-cyan disabled:opacity-40" data-testid="bot-config-review">
                    Rever risco
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirming(true)} disabled={busy} className="font-mono text-[11px] uppercase tracking-wider px-5 py-2 border border-cyan-30 bg-cyan-dim text-cyan disabled:opacity-40" data-testid="bot-config-activate">
                    ATIVAR
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function defaultHint(field: NumericConfigField, data: BotConfigResponse | null, split: { entry: number; reserve: number } | null): string | null {
  const d = data?.strategyDefaults;
  if (!d) return null;
  switch (field) {
    case 'entryCapitalUsdt':
      return split ? `Config da estratégia: ${d.initialAllocationPct}% do capital = ${fmtUsd(split.entry)}` : `Config da estratégia: ${d.initialAllocationPct}% do capital`;
    case 'reserveUsdt':
      return split ? `Config da estratégia: ${d.reservePct}% do capital = ${fmtUsd(split.reserve)}` : `Config da estratégia: ${d.reservePct}% do capital`;
    case 'maxEntries':
      return `Config da estratégia: ${d.maxEntries}`;
    case 'takeProfitPct':
      return d.takeProfitPct == null ? `Estratégia: ${NOT_CONFIGURED}` : `Config da estratégia: ${d.takeProfitPct}%`;
    case 'trailingActivationPct':
      return d.trailingActivationPct == null ? `Estratégia: ${NOT_CONFIGURED}` : `Config da estratégia: ${d.trailingActivationPct}%`;
    case 'trailingGivebackPct':
      return d.trailingGivebackPct == null ? `Estratégia: ${NOT_CONFIGURED}` : `Config da estratégia: ${d.trailingGivebackPct}%`;
    case 'stopLossPct':
    case 'trailingStopPct':
    case 'capitalTotalUsdt':
    case 'maxPerCoinUsdt':
      return `Estratégia: ${NOT_CONFIGURED}`;
    default:
      return null;
  }
}
