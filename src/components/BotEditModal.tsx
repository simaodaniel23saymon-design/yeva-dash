/**
 * Modal editar bot — TP / SL / deviation / size / safeties.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type EditParams = {
  takeProfitPct: number;
  stopLossPct: number;
  deviationPct: number;
  size: number;
  maxSafetyOrders: number;
};

type EditLog = {
  id: string;
  userEmail: string | null;
  changes: Record<string, unknown>;
  note: string | null;
  createdAt: string;
};

type Props = {
  botId: string;
  pairLabel: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
};

export function BotEditModal({ botId, pairLabel, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [params, setParams] = useState<EditParams | null>(null);
  const [minNotional, setMinNotional] = useState(5);
  const [hasOpenCycle, setHasOpenCycle] = useState(false);
  const [note, setNote] = useState('');
  const [edits, setEdits] = useState<EditLog[]>([]);
  const [capacityHint, setCapacityHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{
          params: EditParams;
          minNotional: number;
          hasOpenCycle: boolean;
          note: string;
          edits: EditLog[];
        }>(`/bots/${botId}/edit`);
        if (cancelled) return;
        setParams(data.params);
        setMinNotional(data.minNotional || 5);
        setHasOpenCycle(!!data.hasOpenCycle);
        setNote(data.note || '');
        setEdits(data.edits || []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || 'Falha ao carregar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [botId]);

  useEffect(() => {
    if (!params?.size) {
      setCapacityHint(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const { data } = await api.get<{ warning?: string | null }>(
            '/bots/capacity-check',
            {
              params: {
                capitalPerSide: params.size,
                adding: false,
              },
            }
          );
          setCapacityHint(data.warning || null);
        } catch {
          setCapacityHint(null);
        }
      })();
    }, 400);
    return () => window.clearTimeout(t);
  }, [params?.size]);

  const setField = (key: keyof EditParams, raw: string) => {
    if (!params) return;
    const n = Number(raw);
    setParams({ ...params, [key]: Number.isFinite(n) ? n : params[key] });
  };

  const save = async () => {
    if (!params) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch<{
        exchangeUpdated?: boolean;
        capacityWarning?: string | null;
        message?: string;
      }>(`/bots/${botId}/edit`, params);
      const parts = ['Parâmetros guardados'];
      if (data.exchangeUpdated) parts.push('TP/SL actualizado na exchange');
      if (data.capacityWarning) parts.push(data.capacityWarning);
      onSaved(parts.join(' · '));
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-bg1 border border-border1 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border1 sticky top-0 bg-bg1">
          <h3 className="text-text1 font-bold text-base">Editar {pairLabel}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text2 hover:text-text1"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <p className="font-mono text-[10px] text-text3">A carregar…</p>
          )}
          {error && (
            <p className="font-mono text-[10px] text-red border border-red-30 bg-red-dim px-2 py-1.5">
              {error}
            </p>
          )}

          {params && (
            <>
              <p className="font-mono text-[10px] text-text2 leading-relaxed border border-border2 bg-bg2 px-2 py-2">
                {note ||
                  'Com ciclo aberto, só TP/SL actualizam a exchange já. Outros params aplicam a ciclos novos.'}
              </p>
              {hasOpenCycle && (
                <p className="font-mono text-[9px] uppercase text-gold border border-gold-30 bg-gold-dim px-2 py-1">
                  Ciclo aberto — editar TP/SL faz cancel+replace na exchange
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="font-mono text-[9px] uppercase text-text3">
                    TP % (0.5–10)
                  </span>
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={params.takeProfitPct}
                    onChange={(e) => setField('takeProfitPct', e.target.value)}
                    className="w-full bg-bg2 border border-border2 px-2 py-2 font-mono text-[11px] text-text1"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-mono text-[9px] uppercase text-text3">
                    SL % (2–20)
                  </span>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    step={0.1}
                    value={params.stopLossPct}
                    onChange={(e) => setField('stopLossPct', e.target.value)}
                    className="w-full bg-bg2 border border-border2 px-2 py-2 font-mono text-[11px] text-text1"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-mono text-[9px] uppercase text-text3">
                    Deviation %
                  </span>
                  <input
                    type="number"
                    min={0.3}
                    max={15}
                    step={0.1}
                    value={params.deviationPct}
                    onChange={(e) => setField('deviationPct', e.target.value)}
                    className="w-full bg-bg2 border border-border2 px-2 py-2 font-mono text-[11px] text-text1"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-mono text-[9px] uppercase text-text3">
                    Size ≥ ${minNotional}
                  </span>
                  <input
                    type="number"
                    min={minNotional}
                    step={1}
                    value={params.size}
                    onChange={(e) => setField('size', e.target.value)}
                    className="w-full bg-bg2 border border-border2 px-2 py-2 font-mono text-[11px] text-text1"
                  />
                </label>
                <label className="space-y-1 col-span-2">
                  <span className="font-mono text-[9px] uppercase text-text3">
                    Máx safeties (0–4)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    step={1}
                    value={params.maxSafetyOrders}
                    onChange={(e) =>
                      setField('maxSafetyOrders', e.target.value)
                    }
                    className="w-full bg-bg2 border border-border2 px-2 py-2 font-mono text-[11px] text-text1"
                  />
                </label>
              </div>

              {capacityHint && (
                <p className="font-mono text-[10px] text-gold border border-gold-30 bg-gold-dim px-2 py-1.5">
                  {capacityHint}
                </p>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="w-full py-3 border border-cyan text-cyan font-mono text-[11px] uppercase hover:bg-cyan-dim disabled:opacity-40"
              >
                {saving ? 'A guardar…' : 'Guardar'}
              </button>

              {edits.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border1">
                  <h4 className="font-mono text-[9px] uppercase text-text3 tracking-wider">
                    Histórico de edições
                  </h4>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {edits.map((e) => {
                      const ch = (e.changes?.changed || e.changes) as Record<
                        string,
                        unknown
                      >;
                      const keys = Object.keys(ch || {}).filter(
                        (k) => k !== 'from' && k !== 'to' && k !== 'changed' && k !== 'exchangeUpdated'
                      );
                      const summary =
                        keys.length > 0
                          ? keys
                              .map((k) => `${k}=${String(ch[k])}`)
                              .join(', ')
                          : e.note || 'edit';
                      return (
                        <li
                          key={e.id}
                          className="font-mono text-[9px] text-text2 border border-border2 px-2 py-1.5"
                        >
                          <span className="text-text3">
                            {new Date(e.createdAt).toLocaleString('pt-PT')}
                          </span>
                          {' · '}
                          <span className="text-cyan">
                            {e.userEmail || 'user'}
                          </span>
                          {' · '}
                          {summary}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
