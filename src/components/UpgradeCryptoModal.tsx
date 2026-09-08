import { useEffect, useMemo, useRef, useState } from 'react';
import { YevaTradeLoader } from './YevaTradeLoader';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';
import { MIN_DEPOSIT } from '../utils/constants';
import {
  cheapestRecommended,
  listDepositNetworks,
  type DepositNetworkOption,
} from '../utils/depositNetworks';

interface Deposit {
  paymentId: string;
  payAddress: string;
  payCurrency: string;
  payAmount: number;
  expiresAt?: string;
  networkLabel?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCredited?: () => void;
  suggestedAmountUsdt?: number;
}

function HowToDepositGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75" role="dialog">
      <div className="w-full max-w-md bg-bg1 border border-border1 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="display-title text-text1 text-lg leading-snug">
            Como depositar sem pagar gas caro
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] text-text2 border border-border2 px-2 py-1"
          >
            Fechar
          </button>
        </div>
        <ol className="space-y-3 font-mono text-[11px] text-text2 leading-relaxed">
          <li className="border border-border1 bg-bg2 p-3">
            <span className="text-cyan font-bold block mb-1">1 · Escolhe rede barata</span>
            Usa <span className="text-text1">BEP20</span>, <span className="text-text1">TRC20</span> ou{' '}
            <span className="text-text1">Polygon</span>. Evita ERC20 em valores baixos — a fee da rede
            pode comer o depósito.
          </li>
          <li className="border border-border1 bg-bg2 p-3">
            <span className="text-cyan font-bold block mb-1">2 · Confirma a fee antes de enviar</span>
            Vê “fee estimada da rede” no ecrã. Se for &gt; 5% do valor, muda para a rede sugerida.
          </li>
          <li className="border border-border1 bg-bg2 p-3">
            <span className="text-cyan font-bold block mb-1">3 · Envia só para o endereço gerado</span>
            Copia o endereço YevaTrade, envia USDT na mesma rede, e espera a confirmação automática
            (NOWPayments). Não envies ERC20 para endereço BEP20/TRC20.
          </li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Modal de depósito cripto via NOWPayments (webhook assinado).
 */
export function UpgradeCryptoModal({ open, onClose, onCredited, suggestedAmountUsdt }: Props) {
  const amountHint = Math.max(MIN_DEPOSIT, Number(suggestedAmountUsdt) || MIN_DEPOSIT);
  const networks = useMemo(() => listDepositNetworks(amountHint), [amountHint]);
  const [currency, setCurrency] = useState('usdtbsc');
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = networks.find((n) => n.id === currency) ?? networks[0];
  const cheaper = cheapestRecommended(networks);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      setDeposit(null);
      setPayStatus(null);
      setError(null);
      setBusy(false);
      setShowHowTo(false);
      setCurrency('usdtbsc');
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open]);

  if (!open) return null;

  const statusLabel: Record<string, string> = {
    waiting: 'À espera do pagamento…',
    confirming: 'A confirmar na blockchain…',
    confirmed: 'Confirmado',
    finished: 'Pago e creditado',
    expired: 'Expirado',
    failed: 'Falhou',
  };

  const startPolling = (paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<{ status: string; actuallyPaid: number }>(
          `/payments/deposit/${paymentId}/status`
        );
        setPayStatus(res.data.status);
        if (res.data.status === 'finished' || res.data.status === 'confirmed') {
          clearInterval(pollRef.current!);
          onCredited?.();
        }
      } catch {
        /* polling best-effort */
      }
    }, 20000);
  };

  const startDeposit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<Deposit>('/payments/deposit', { currency });
      setDeposit(res.data);
      setPayStatus('waiting');
      startPolling(res.data.paymentId);
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const copyAddress = async () => {
    if (!deposit?.payAddress) return;
    await navigator.clipboard.writeText(deposit.payAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectClass =
    'w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/40';

  const optionLabel = (n: DepositNetworkOption) =>
    `${n.label} · fee ${n.feeLabel}${n.warning ? ' ⚠' : ''}`;

  return (
    <>
      {showHowTo && <HowToDepositGuide onClose={() => setShowHowTo(false)} />}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md bg-bg1 border border-border1 shadow-xl max-h-[90dvh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border1">
            <div>
              <h3 className="text-text1 font-bold text-base">Depositar com cripto</h3>
              <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
                NOWPayments · mín. ${amountHint} USDT
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[10px] text-text2 hover:text-text1 px-2 py-1 border border-border2"
            >
              Fechar
            </button>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="p-3 border border-red-30 bg-red-dim text-red font-mono text-[10px]">
                {error}
              </div>
            )}

            {!deposit ? (
              <>
                <p className="font-mono text-[10px] text-text2 leading-relaxed">
                  Redes ordenadas por fee estimada. O saldo é creditado automaticamente após
                  confirmação (webhook assinado).
                </p>

                <button
                  type="button"
                  onClick={() => setShowHowTo(true)}
                  className="w-full py-2 border border-gold-30 bg-gold-dim text-gold font-mono text-[9px] uppercase tracking-wider hover:opacity-90"
                >
                  Como depositar sem pagar gas caro
                </button>

                <div>
                  <label className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1.5 block">
                    Rede (baratas primeiro)
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={selectClass}
                  >
                    {networks.map((n) => (
                      <option key={n.id} value={n.id}>
                        {optionLabel(n)}
                      </option>
                    ))}
                  </select>
                </div>

                {selected && (
                  <div className="bg-bg2 border border-border1 p-3 space-y-1.5">
                    <p className="font-mono text-[10px] text-cyan">
                      fee estimada da rede: {selected.feeLabel}
                    </p>
                    {selected.warning && (
                      <p className="font-mono text-[10px] text-gold">{selected.warning}</p>
                    )}
                    {selected.feeTooHigh && cheaper && cheaper.id !== selected.id && (
                      <p className="font-mono text-[10px] text-gold leading-relaxed">
                        Fee &gt; 5% do valor (~{selected.feePctOfAmount}%). Sugestão:{' '}
                        <button
                          type="button"
                          className="underline text-cyan"
                          onClick={() => setCurrency(cheaper.id)}
                        >
                          {cheaper.shortLabel} ({cheaper.feeLabel})
                        </button>
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void startDeposit()}
                  disabled={busy}
                  className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-cyan/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <YevaTradeLoader size="xs" /> A gerar…
                    </>
                  ) : (
                    'Gerar endereço de pagamento'
                  )}
                </button>
              </>
            ) : (
              <>
                <div
                  className={`flex items-center gap-2 font-mono text-[10px] px-3 py-2 border ${
                    payStatus === 'finished' || payStatus === 'confirmed'
                      ? 'bg-cyan-dim border-cyan-20 text-cyan'
                      : 'bg-gold-dim border-gold-30 text-gold'
                  }`}
                >
                  {statusLabel[payStatus ?? 'waiting'] ?? payStatus}
                </div>
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1">
                    Endereço
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-bg2 border border-border1 px-3 py-2 text-cyan font-mono text-xs break-all">
                      {deposit.payAddress}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyAddress()}
                      className="px-3 border border-border2 font-mono text-[9px] uppercase text-text2 hover:text-cyan"
                    >
                      {copied ? '✓' : 'Copiar'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                  <div className="bg-bg2 border border-border1 p-3">
                    <span className="text-text3 block mb-1">Rede</span>
                    <span className="text-text1">
                      {deposit.networkLabel || deposit.payCurrency?.toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-bg2 border border-border1 p-3">
                    <span className="text-text3 block mb-1">Mínimo</span>
                    <span className="text-cyan">
                      {deposit.payAmount} {deposit.payCurrency?.toUpperCase()}
                    </span>
                  </div>
                </div>
                {selected && (
                  <p className="font-mono text-[10px] text-text2">
                    fee estimada da rede: {selected.feeLabel} — envia na mesma rede do endereço
                  </p>
                )}
                {deposit.expiresAt && (
                  <p className="font-mono text-[9px] text-text3">
                    Expira: {new Date(deposit.expiresAt).toLocaleString('pt-PT')}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => startPolling(deposit.paymentId)}
                  className="w-full py-2.5 border border-cyan-30 text-cyan font-mono text-[9px] uppercase hover:bg-cyan-dim"
                >
                  Verificar agora
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
