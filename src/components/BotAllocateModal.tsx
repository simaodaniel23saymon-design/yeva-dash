/**
 * Modal ON — valor a alocar a este bot (USDT).
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Props = {
  label: string;
  minNotional: number;
  availableBalanceUsdt: number;
  defaultValue?: number;
  onConfirm: (allocationUsdt: number) => void | Promise<void>;
  onCancel: () => void;
};

export function BotAllocateModal({
  label,
  minNotional,
  availableBalanceUsdt,
  defaultValue,
  onConfirm,
  onCancel,
}: Props) {
  const minN = Math.max(5, minNotional || 5);
  const maxN = Math.max(minN, availableBalanceUsdt || minN);
  const [value, setValue] = useState(
    String(defaultValue && defaultValue >= minN ? defaultValue : minN)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [capHint, setCapHint] = useState<string | null>(null);

  useEffect(() => {
    const n = Number(value);
    if (!(n > 0)) {
      setCapHint(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const { data } = await api.get<{ warning?: string | null }>(
            '/bots/capacity-check',
            { params: { allocationUsdt: n, capitalPerSide: n, adding: true } }
          );
          setCapHint(data.warning || null);
        } catch {
          setCapHint(null);
        }
      })();
    }, 350);
    return () => window.clearTimeout(t);
  }, [value]);

  const submit = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < minN) {
      setError(`Mínimo $${minN.toFixed(2)} (min notional)`);
      return;
    }
    if (availableBalanceUsdt > 0 && n > availableBalanceUsdt) {
      setError(`Máximo $${availableBalanceUsdt.toFixed(2)} (saldo disponível)`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(n);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Falha');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-bg1 border border-border1 max-w-md w-full p-5 space-y-4">
        <h3 className="text-text1 font-bold text-base">
          Alocar a {label}
        </h3>
        <p className="font-mono text-[11px] text-text2 leading-relaxed">
          Valor a alocar a este bot (USDT). O motor opera só dentro deste
          mandato (base + safeties + grid).
        </p>
        <label className="block space-y-1">
          <span className="font-mono text-[9px] uppercase text-text3">
            USDT · min ${minN.toFixed(2)}
            {availableBalanceUsdt > 0
              ? ` · max $${maxN.toFixed(2)}`
              : ''}
          </span>
          <input
            type="number"
            min={minN}
            max={availableBalanceUsdt > 0 ? maxN : undefined}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-bg2 border border-border2 px-3 py-3 font-mono text-sm text-text1"
            autoFocus
          />
        </label>
        {capHint && (
          <p className="font-mono text-[10px] text-gold border border-gold-30 bg-gold-dim px-2 py-1.5">
            {capHint}
          </p>
        )}
        {error && (
          <p className="font-mono text-[10px] text-red border border-red-30 bg-red-dim px-2 py-1.5">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="w-full py-3 border border-cyan text-cyan font-mono text-[11px] uppercase hover:bg-cyan-dim disabled:opacity-40"
          >
            {busy ? 'A ligar…' : 'Confirmar ON'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="w-full py-2 border border-border2 text-text3 font-mono text-[10px] uppercase"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
