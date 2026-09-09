/** Disclaimer de risco — config de bots / primeiro login */

import { useState } from 'react';

const DISCLAIMER_TEXT =
  'Trading de criptomoedas envolve risco elevado de perda de capital. Bots automáticos não garantem lucro. Só uses fundos que podes perder. YevaTrade não presta aconselhamento financeiro.';

export function RiskDisclaimerInline({ className = '' }: { className?: string }) {
  return (
    <div
      className={`border border-gold-30 bg-gold-dim p-3 font-mono text-[10px] text-gold leading-relaxed ${className}`}
    >
      <p className="uppercase tracking-wider text-[9px] mb-1">Aviso de risco</p>
      <p>{DISCLAIMER_TEXT}</p>
    </div>
  );
}

export function CapacityWarningModal({
  open,
  warning,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  warning: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-bg1 border border-border1 max-w-md w-full p-5 space-y-4">
        <h3 className="text-text1 font-bold text-base">Capacidade da banca</h3>
        <p className="font-mono text-[12px] text-gold leading-relaxed whitespace-pre-wrap">{warning}</p>
        <p className="font-mono text-[10px] text-text2">
          Isto é um aviso — podes confirmar e criar na mesma, ou ajustar capital / número de bots.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-2 border border-border2 text-text2 font-mono text-[11px] uppercase hover:border-cyan disabled:opacity-40"
          >
            Ajustar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-3 py-2 border border-gold text-gold font-mono text-[11px] uppercase hover:bg-gold-dim disabled:opacity-40"
          >
            {busy ? 'A criar…' : 'Confirmar mesmo assim'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FirstLoginRiskGate({ userId }: { userId: string }) {
  const key = `yeva_risk_ack_${userId}`;
  const [acked, setAcked] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });

  if (acked) return null;

  const accept = () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* */
    }
    setAcked(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-bg1 border border-gold-30 max-w-md w-full p-5 space-y-4">
        <h3 className="text-text1 font-bold text-lg">Antes de continuares</h3>
        <RiskDisclaimerInline />
        <p className="font-mono text-[11px] text-text2">
          Ao continuar, confirmas que compreendes os riscos de trading automatizado.
        </p>
        <button
          type="button"
          onClick={accept}
          className="w-full py-3 border border-cyan text-cyan font-mono text-[12px] uppercase tracking-wider hover:bg-cyan-dim"
        >
          Compreendo os riscos — continuar
        </button>
      </div>
    </div>
  );
}

export { DISCLAIMER_TEXT };
