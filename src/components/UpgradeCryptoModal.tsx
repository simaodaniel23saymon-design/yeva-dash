import { useEffect, useRef, useState } from 'react';
import { YevaTradeLoader } from '../YevaTradeLoader';
import { api } from '../../lib/api';
import { getFriendlyError } from '../../utils/errorHandler';
import { MIN_DEPOSIT } from '../../utils/constants';

interface Deposit {
  paymentId: string;
  payAddress: string;
  payCurrency: string;
  payAmount: number;
  expiresAt?: string;
}

const NETWORKS = [
  { value: 'usdttrc20', label: 'USDT — TRC20 (Tron)' },
  { value: 'usdtbsc', label: 'USDT — BEP20 (BSC)' },
  { value: 'usdterc20', label: 'USDT — ERC20 (Ethereum)' },
  { value: 'usdtpol', label: 'USDT — Polygon' },
  { value: 'btc', label: 'Bitcoin (BTC)' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCredited?: () => void;
  /** Valor sugerido (USDT) — informativo; NOWPayments gera o mínimo do pedido */
  suggestedAmountUsdt?: number;
}

/**
 * Modal de depósito cripto via NOWPayments (webhook assinado).
 * Substitui o crédito manual /wallet/deposit (removido no P0).
 */
export function UpgradeCryptoModal({ open, onClose, onCredited, suggestedAmountUsdt }: Props) {
  const [currency, setCurrency] = useState('usdttrc20');
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      setDeposit(null);
      setPayStatus(null);
      setError(null);
      setBusy(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-bg1 border border-border1 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border1">
          <div>
            <h3 className="text-text1 font-bold text-base">Depositar com cripto</h3>
            <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
              NOWPayments · mín. ${suggestedAmountUsdt ?? MIN_DEPOSIT} USDT
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
            <div className="p-3 border border-red-30 bg-red-dim text-red font-mono text-[10px]">{error}</div>
          )}

          {!deposit ? (
            <>
              <p className="font-mono text-[10px] text-text2">
                Gera um endereço único. O saldo interno é creditado automaticamente após confirmação on-chain
                (webhook assinado — sem crédito manual).
              </p>
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1.5 block">
                  Rede
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={selectClass}
                >
                  {NETWORKS.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
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
                <p className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1">Endereço</p>
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
                  <span className="text-text1">{deposit.payCurrency?.toUpperCase()}</span>
                </div>
                <div className="bg-bg2 border border-border1 p-3">
                  <span className="text-text3 block mb-1">Mínimo</span>
                  <span className="text-cyan">
                    {deposit.payAmount} {deposit.payCurrency?.toUpperCase()}
                  </span>
                </div>
              </div>
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
  );
}
