import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import OwnerPilotAccount, { type OwnerAccountMessage } from '../components/spot/pilot/OwnerPilotAccount';
import OtpCodeInput from '../components/ui/OtpCodeInput';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { TOTP_LENGTH } from '../utils/totpCode';
import {
  accountTitle,
  ownerActionError,
  ownerReasonText,
  ownerRules,
  usdtText,
  type PilotMeResponse,
  type PilotOverview,
} from '../utils/spotPilotOwner';

type Dialog = { kind: 'ACTIVATE' | 'DEACTIVATE'; accountId: string } | null;

const REFRESH_MS = 30_000;

export default function SpotPilotPage() {
  const { user } = useAuth();
  const [me, setMe] = useState<PilotMeResponse | null>(null);
  const [overviews, setOverviews] = useState<Record<string, PilotOverview | null>>({});
  const [overviewErrors, setOverviewErrors] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Record<string, OwnerAccountMessage>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [ack, setAck] = useState(false);
  const [totp, setTotp] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const busyRef = useRef(false);

  /** Só leituras: estado do piloto nas contas do próprio utilizador (o servidor filtra pelo dono). */
  const refresh = useCallback(async () => {
    try {
      const data = (await api.get<PilotMeResponse>('/spot-pilot/me')).data;
      setMe(data);
      setLoadError(null);
      await Promise.all(
        data.accounts.map(async (a) => {
          try {
            const o = (await api.get<PilotOverview>(`/spot-pilot/accounts/${a.id}/overview`)).data;
            setOverviews((prev) => ({ ...prev, [a.id]: o }));
            setOverviewErrors((prev) => ({ ...prev, [a.id]: null }));
          } catch {
            setOverviewErrors((prev) => ({ ...prev, [a.id]: 'Não conseguimos ler os dados desta conta agora. Tenta atualizar.' }));
          }
        })
      );
    } catch (e) {
      setLoadError(ownerActionError(e).message);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const t = window.setInterval(() => {
      if (!busyRef.current && document.visibilityState !== 'hidden') void refresh();
    }, REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [refresh]);

  /** Uma ação de cada vez; o estado é sempre relido do servidor depois. */
  async function run(accountId: string, okText: string, fn: () => Promise<unknown>): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setMessages((m) => ({ ...m, [accountId]: null }));
    let ok = false;
    try {
      await fn();
      ok = true;
      setMessages((m) => ({ ...m, [accountId]: { ok: true, text: okText, notes: [] } }));
    } catch (e) {
      const err = ownerActionError(e);
      setMessages((m) => ({ ...m, [accountId]: { ok: false, text: err.message, notes: err.notes } }));
    } finally {
      await refresh();
      busyRef.current = false;
      setBusy(false);
    }
    return ok;
  }

  const openDialog = (kind: 'ACTIVATE' | 'DEACTIVATE', accountId: string) => {
    setDialog({ kind, accountId });
    setAck(false);
    setTotp('');
    setDialogError(null);
  };
  const closeDialog = () => {
    setDialog(null);
    setAck(false);
    setTotp('');
    setDialogError(null);
  };

  /** O código é usado num único pedido e limpo logo a seguir; nunca é guardado. */
  async function confirmActivate(code: string) {
    if (!dialog || dialog.kind !== 'ACTIVATE' || busyRef.current) return;
    if (!ack) {
      setDialogError('Confirma que leste as regras e os riscos.');
      return;
    }
    if (code.length !== TOTP_LENGTH) {
      setDialogError('Introduz os 6 dígitos da aplicação autenticadora.');
      return;
    }
    const { accountId } = dialog;
    setTotp('');
    setDialogError(null);
    busyRef.current = true;
    setBusy(true);
    try {
      await api.post(`/spot-pilot/accounts/${accountId}/activate`, { acknowledgeRisk: true, totpCode: code }, { skipAuthRetry: true });
      closeDialog();
      setMessages((m) => ({ ...m, [accountId]: { ok: true, text: 'Piloto ativado. A partir de agora compra e vende automaticamente dentro dos teus limites.', notes: [] } }));
    } catch (e) {
      const err = ownerActionError(e);
      if (err.code?.startsWith('TOTP_')) setDialogError(err.message);
      else {
        closeDialog();
        setMessages((m) => ({ ...m, [accountId]: { ok: false, text: err.message, notes: err.notes } }));
      }
    } finally {
      await refresh();
      busyRef.current = false;
      setBusy(false);
    }
  }

  const pause = (id: string) => void run(id, 'Novas compras pausadas. As posições abertas continuam a ser geridas.', () => api.post(`/spot-pilot/accounts/${id}/pause`));
  const resume = (id: string) => void run(id, 'Piloto retomado.', () => api.post(`/spot-pilot/accounts/${id}/resume`));
  const deactivate = async (id: string) => {
    closeDialog();
    await run(id, 'Piloto desativado e autorização revogada.', () => api.post(`/spot-pilot/accounts/${id}/deactivate`));
  };

  const accounts = me?.accounts ?? [];
  const platform = me?.platform ?? null;
  const dialogIndex = dialog ? accounts.findIndex((a) => a.id === dialog.accountId) : -1;
  const dialogAccount = dialogIndex >= 0 ? accounts[dialogIndex] : null;
  const dialogLimit = dialog ? overviews[dialog.accountId]?.limits.maxNotionalPerOrder ?? platform?.maxNotionalPerOrder ?? null : null;
  const twoFactorReady = user?.twoFAEnabled === true;

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-10" data-testid="spot-pilot-page">
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-text1">Spot Pilot</h1>
          <p className="text-[13px] text-text2">Ativas uma vez e o piloto compra e vende automaticamente na tua conta Binance Spot, dentro de limites fixos.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => void refresh()} className="border border-border2 px-3 py-1.5 text-[12px] text-text2 disabled:opacity-40">
          Atualizar
        </button>
      </header>

      {loadError && <div className="border border-red-30 bg-red-dim p-3 text-[12px] text-red">{loadError}</div>}
      {!me && !loadError && <p className="text-[13px] text-text3">A carregar…</p>}

      {platform && !platform.available && (
        <section className="border border-gold-30 bg-gold-dim p-3 text-[12px] text-gold" role="status">
          <p className="font-semibold">O piloto está temporariamente indisponível na plataforma.</p>
          {ownerReasonText(platform.blockers).map((r) => (
            <p key={r}>• {r}</p>
          ))}
        </section>
      )}

      {me && accounts.length === 0 && (
        <section className="space-y-2 border border-border1 bg-bg1 p-4 text-[13px] text-text2">
          <p className="font-semibold text-text1">Liga a tua conta Binance para usar o piloto.</p>
          <p>Cria uma chave de API só com Spot ativo (sem levantamentos nem transferências) e restrita ao IP do servidor.</p>
          <Link to="/exchanges" className="inline-block border border-cyan-30 bg-cyan-dim px-3 py-1.5 text-[12px] text-cyan">
            Ligar conta Binance
          </Link>
        </section>
      )}

      {accounts.map((a, i) => (
        <OwnerPilotAccount
          key={a.id}
          index={i}
          summary={a}
          overview={overviews[a.id] ?? null}
          overviewError={overviewErrors[a.id] ?? null}
          platform={platform}
          policy={me?.policy ?? null}
          busy={busy}
          message={messages[a.id] ?? null}
          onActivate={() => openDialog('ACTIVATE', a.id)}
          onPause={() => pause(a.id)}
          onResume={() => resume(a.id)}
          onDeactivate={() => openDialog('DEACTIVATE', a.id)}
        />
      ))}

      {dialog && dialogAccount && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" data-testid="pilot-owner-dialog">
          <div className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto border border-border2 bg-bg1 p-4">
            <div className="font-mono text-[10px] uppercase text-text3">{accountTitle(dialogAccount, dialogIndex)}</div>
            {dialog.kind === 'ACTIVATE' ? (
              <>
                <h3 className="font-semibold text-text1">Ativar piloto automático</h3>
                <p className="text-[12px] text-text2">
                  Depois de ativares, o piloto compra e vende sozinho nesta conta, sem te pedir aprovação a cada ordem, até {usdtText(dialogLimit)} por compra. Podes pausar ou desativar a
                  qualquer momento. O servidor verifica a tua chave e o estado da conta na Binance antes de ativar.
                </p>
                <ul className="space-y-0.5 text-[12px] text-text2">
                  {ownerRules(overviews[dialog.accountId]?.limits ?? null, me?.policy ?? null).map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                  <li>• Operar tem risco de perda. Resultados passados não garantem resultados futuros.</li>
                </ul>
                <label className="flex items-start gap-2 text-[12px] text-text1">
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
                  <span>Li as regras e os riscos e autorizo a execução automática nesta conta.</span>
                </label>
                {twoFactorReady ? (
                  <div className="space-y-1">
                    <label htmlFor="pilot-activate-totp" className="text-[12px] text-text3">
                      Código da aplicação autenticadora
                    </label>
                    <OtpCodeInput id="pilot-activate-totp" value={totp} onChange={setTotp} onComplete={(code) => void (ack ? confirmActivate(code) : undefined)} busy={busy} />
                  </div>
                ) : (
                  <p className="text-[12px] text-gold">
                    Para ativar precisas da verificação em dois passos.{' '}
                    <Link to="/settings" className="underline">
                      Ativar nas Definições
                    </Link>
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="font-semibold text-red">Desativar o piloto nesta conta</h3>
                <p className="text-[12px] text-text2">
                  A autorização é revogada: o piloto deixa de comprar e de vender nesta conta. Uma posição aberta fica na tua conta Binance sem gestão automática. Para voltar a usar,
                  ativas novamente. Se só queres parar novas compras, usa «Pausar novas compras».
                </p>
              </>
            )}
            {dialogError && <p className="text-[12px] text-red">{dialogError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeDialog} className="border border-border2 px-3 py-2 text-[12px] text-text2">
                Cancelar
              </button>
              {dialog.kind === 'ACTIVATE' ? (
                <button
                  type="button"
                  disabled={busy || !ack || !twoFactorReady || totp.length !== TOTP_LENGTH}
                  onClick={() => void confirmActivate(totp)}
                  className="border border-gold px-3 py-2 text-[12px] text-gold disabled:opacity-40"
                >
                  Ativar
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void deactivate(dialog.accountId)} className="border border-red-30 px-3 py-2 text-[12px] text-red disabled:opacity-40">
                  Desativar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
