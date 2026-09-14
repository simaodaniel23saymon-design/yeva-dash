/**
 * Modal alocação AUTO ON / Entrar — valor + TP/SL editáveis no Entrar.
 */

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { buildOnSummaryClient } from './autoOpsCopy';

type Props = {
  title: string;
  minNotional: number;
  availableBalanceUsdt: number;
  defaultAllocation?: number;
  defaultTpPct?: number;
  defaultSlPct?: number;
  /** Se true, mostra TP/SL editáveis (Entrar manual). */
  showTpSl?: boolean;
  side?: 'LONG' | 'SHORT';
  entryPriceHint?: number;
  confirmLabel?: string;
  onConfirm: (input: {
    allocationUsdt: number;
    tpPrice?: number;
    slPrice?: number;
  }) => void | Promise<void>;
  onCancel: () => void;
};

export function AutoOpsAllocateModal({
  title,
  minNotional,
  availableBalanceUsdt,
  defaultAllocation,
  defaultTpPct = 3,
  defaultSlPct = 5,
  showTpSl = false,
  side = 'LONG',
  entryPriceHint,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}: Props) {
  const minN = Math.max(1, minNotional || 10);
  const maxN = Math.max(minN, availableBalanceUsdt || minN);
  const [value, setValue] = useState(
    String(
      defaultAllocation && defaultAllocation >= minN
        ? defaultAllocation
        : minN
    )
  );
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [capHint, setCapHint] = useState<string | null>(null);

  useEffect(() => {
    if (!showTpSl || !(entryPriceHint && entryPriceHint > 0)) return;
    const entry = entryPriceHint;
    const tpPx =
      side === 'SHORT'
        ? entry * (1 - defaultTpPct / 100)
        : entry * (1 + defaultTpPct / 100);
    const slPx =
      side === 'SHORT'
        ? entry * (1 + defaultSlPct / 100)
        : entry * (1 - defaultSlPct / 100);
    setTp(tpPx >= 1 ? tpPx.toFixed(4) : tpPx.toFixed(6));
    setSl(slPx >= 1 ? slPx.toFixed(4) : slPx.toFixed(6));
  }, [showTpSl, entryPriceHint, side, defaultTpPct, defaultSlPct]);

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
      setError(`Mínimo $${minN.toFixed(2)} (notional mín do módulo)`);
      return;
    }
    if (availableBalanceUsdt > 0 && n > availableBalanceUsdt) {
      setError(`Máximo $${availableBalanceUsdt.toFixed(2)} (saldo)`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm({
        allocationUsdt: n,
        tpPrice: showTpSl && Number(tp) > 0 ? Number(tp) : undefined,
        slPrice: showTpSl && Number(sl) > 0 ? Number(sl) : undefined,
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Falha');
      setBusy(false);
    }
  };

  const n = Number(value) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-bg1 border border-border1 max-w-md w-full p-5 space-y-4">
        <h3 className="text-text1 font-bold text-base">{title}</h3>
        <p className="font-mono text-[11px] text-text2 leading-relaxed">
          Valor que estás disposto a alocar (USDT)
        </p>
        <label className="block space-y-1">
          <span className="font-mono text-[9px] uppercase text-text3">
            USDT · min ${minN.toFixed(2)}
            {availableBalanceUsdt > 0 ? ` · max $${maxN.toFixed(2)}` : ''}
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

        {showTpSl && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="font-mono text-[9px] uppercase text-text3">TP</span>
              <input
                type="number"
                step="any"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                className="w-full bg-bg2 border border-border2 px-2 py-2 font-mono text-sm text-text1"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[9px] uppercase text-text3">SL</span>
              <input
                type="number"
                step="any"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                className="w-full bg-bg2 border border-border2 px-2 py-2 font-mono text-sm text-text1"
              />
            </label>
          </div>
        )}

        <p className="font-mono text-[10px] text-text2 border border-border2 px-2 py-2 leading-relaxed">
          {buildOnSummaryClient(n > 0 ? n : minN)}
        </p>

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
            {busy ? 'A confirmar…' : confirmLabel}
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
