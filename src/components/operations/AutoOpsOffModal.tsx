/**
 * Diálogo AUTO OFF — cancelar ordens + manter/fechar posição.
 */

import { useState } from 'react';

type Props = {
  label: string;
  hasOpen: boolean;
  openSymbol?: string;
  onConfirm: (input: {
    cancelOrders: boolean;
    positionAction: 'keep' | 'close';
  }) => void | Promise<void>;
  onCancel: () => void;
};

export function AutoOpsOffModal({
  label,
  hasOpen,
  openSymbol,
  onConfirm,
  onCancel,
}: Props) {
  const [cancelOrders, setCancelOrders] = useState(true);
  const [positionAction, setPositionAction] = useState<'keep' | 'close'>('keep');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm({ cancelOrders, positionAction });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Falha');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-bg1 border border-border1 max-w-md w-full p-5 space-y-4">
        <h3 className="text-text1 font-bold text-base">AUTO OFF · {label}</h3>
        <label className="flex items-start gap-2 font-mono text-[11px] text-text2">
          <input
            type="checkbox"
            checked={cancelOrders}
            onChange={(e) => setCancelOrders(e.target.checked)}
            className="mt-0.5"
          />
          <span>Cancelar ordens pendentes (TP/SL)</span>
        </label>

        {hasOpen && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] text-text3 uppercase">
              Posição {openSymbol ? `(${openSymbol})` : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPositionAction('keep')}
                className={`flex-1 py-2 border font-mono text-[10px] uppercase ${
                  positionAction === 'keep'
                    ? 'border-cyan text-cyan bg-cyan-dim'
                    : 'border-border2 text-text3'
                }`}
              >
                Manter
              </button>
              <button
                type="button"
                onClick={() => setPositionAction('close')}
                className={`flex-1 py-2 border font-mono text-[10px] uppercase ${
                  positionAction === 'close'
                    ? 'border-red text-red bg-red-dim'
                    : 'border-border2 text-text3'
                }`}
              >
                Fechar tudo
              </button>
            </div>
          </div>
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
            className="w-full py-3 border border-red text-red font-mono text-[11px] uppercase hover:bg-red-dim disabled:opacity-40"
          >
            {busy ? 'A desligar…' : 'Confirmar AUTO OFF'}
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
