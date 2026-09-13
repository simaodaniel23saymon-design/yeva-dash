/**
 * Spot Auto Bot — ON/OFF grande por moeda (+ futures simples).
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

type SpotPairRow = {
  pair: string;
  on: boolean;
  botId: string | null;
  status: string;
  hasOpenCycle: boolean;
  avgEntry: number | null;
};

type FutRow = {
  pair: string;
  on: boolean;
  botId: string;
  status: string;
};

export function SpotAutoBotsPanel() {
  const [pairs, setPairs] = useState<SpotPairRow[]>([]);
  const [futures, setFutures] = useState<FutRow[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [defaults, setDefaults] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [offAsk, setOffAsk] = useState<SpotPairRow | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{
        enabled: boolean;
        defaults: Record<string, number>;
        pairs: SpotPairRow[];
        futures: FutRow[];
      }>('/spot-bots/status');
      setEnabled(!!data.enabled);
      setDefaults(data.defaults || null);
      setPairs(data.pairs || []);
      setFutures(data.futures || []);
    } catch (err: any) {
      setFlash(err?.response?.data?.error || 'Spot bots indisponível');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  const show = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 4000);
  };

  const turnOn = async (pair: string) => {
    setBusy(pair);
    try {
      const { data } = await api.post<{ message?: string }>(
        `/spot-bots/${pair}/on`,
        {}
      );
      show(data.message || `${pair} ON`);
      await load();
    } catch (err: any) {
      show(err?.response?.data?.error || 'Falha ao ligar');
    } finally {
      setBusy(null);
    }
  };

  const confirmOff = async (action: 'keep' | 'sell') => {
    if (!offAsk) return;
    const pair = offAsk.pair;
    setBusy(pair);
    setOffAsk(null);
    try {
      const { data } = await api.post<{ message?: string }>(
        `/spot-bots/${pair}/off`,
        { action }
      );
      show(data.message || `${pair} OFF`);
      await load();
    } catch (err: any) {
      show(err?.response?.data?.error || 'Falha ao desligar');
    } finally {
      setBusy(null);
    }
  };

  const toggleFutures = async (row: FutRow) => {
    setBusy(row.botId);
    try {
      await api.post(`/spot-bots/futures/${row.botId}/toggle`, {
        on: !row.on,
      });
      show(`${row.pair} futures ${!row.on ? 'ON' : 'OFF'}`);
      await load();
    } catch (err: any) {
      show(err?.response?.data?.error || 'Falha no toggle');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-text1 font-bold text-base">Spot Auto Bot</h3>
          <p className="font-mono text-[9px] text-text3 uppercase tracking-wider">
            DCA SPOT · sem alavancagem · maker · TP/SL
            {defaults
              ? ` · dev ${defaults.deviationPct}% · TP ${defaults.takeProfitPct}% · SL ${defaults.stopLossPct}%`
              : ''}
          </p>
        </div>
        {flash && (
          <span className="font-mono text-[10px] text-cyan border border-cyan-30 bg-cyan-dim px-2 py-1">
            {flash}
          </span>
        )}
      </div>

      {!enabled && (
        <p className="font-mono text-[10px] text-gold border border-gold-30 bg-gold-dim px-2 py-1.5">
          SPOT_BOT_ENABLED=false — kill switch activo
        </p>
      )}

      {loading ? (
        <p className="font-mono text-[10px] text-text3">A carregar…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pairs.map((p) => (
            <div
              key={p.pair}
              className="bg-bg1 border border-border1 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-text1 font-bold text-lg">
                  {p.pair.replace('USDT', '')}
                </span>
                <span className="font-mono text-[8px] uppercase text-text3">
                  {p.hasOpenCycle ? 'ciclo aberto' : p.on ? 'a vigiar' : 'off'}
                </span>
              </div>
              <button
                type="button"
                disabled={busy === p.pair || !enabled}
                onClick={() => {
                  if (p.on) setOffAsk(p);
                  else void turnOn(p.pair);
                }}
                className={`w-full py-4 font-mono text-sm font-bold uppercase tracking-wider border transition-colors disabled:opacity-40 ${
                  p.on
                    ? 'border-cyan text-cyan bg-cyan-dim'
                    : 'border-border2 text-text2 hover:border-cyan hover:text-cyan'
                }`}
              >
                {busy === p.pair ? '…' : p.on ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
        </div>
      )}

      {futures.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-text2 font-mono text-[10px] uppercase tracking-wider">
            Futuros — ON/OFF simples
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {futures.map((f) => (
              <div
                key={f.botId}
                className="bg-bg1 border border-border1 p-3 flex items-center justify-between gap-2"
              >
                <span className="font-mono text-[11px] text-text1 font-semibold">
                  {f.pair.replace('USDT', '')}
                </span>
                <button
                  type="button"
                  disabled={busy === f.botId}
                  onClick={() => void toggleFutures(f)}
                  className={`px-4 py-2 font-mono text-[10px] uppercase border ${
                    f.on
                      ? 'border-cyan text-cyan bg-cyan-dim'
                      : 'border-border2 text-text3'
                  }`}
                >
                  {f.on ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {offAsk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-bg1 border border-border1 max-w-md w-full p-5 space-y-4">
            <h3 className="text-text1 font-bold text-base">
              Desligar {offAsk.pair.replace('USDT', '')}?
            </h3>
            <p className="font-mono text-[11px] text-text2 leading-relaxed">
              Ordens pendentes serão canceladas. Queres manter a posição em
              carteira ou vender tudo a mercado?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void confirmOff('keep')}
                className="w-full py-3 border border-cyan text-cyan font-mono text-[11px] uppercase hover:bg-cyan-dim"
              >
                Manter posição
              </button>
              <button
                type="button"
                onClick={() => void confirmOff('sell')}
                className="w-full py-3 border border-red text-red font-mono text-[11px] uppercase hover:bg-red-dim"
              >
                Vender tudo
              </button>
              <button
                type="button"
                onClick={() => setOffAsk(null)}
                className="w-full py-2 border border-border2 text-text3 font-mono text-[10px] uppercase"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
