import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getFriendlyError } from '../../utils/errorHandler';

type PilotState = 'DISABLED' | 'ARMED' | 'ACTIVE' | 'PAUSED' | 'BLOCKED';

type Safety = {
  spotLiveEnabled: boolean;
  spotKillSwitch: boolean;
  cexLiveWriteEnabledInBuild: boolean;
  realSpotPilotEnabled: boolean;
  realSpotPilotMaxNotional: number | null;
  blockers: string[];
};

type Control = { exchangeAccountId: string; state: PilotState; reason: string | null; updatedBy: string | null; updatedAt: string | null };

type StatusResponse = { safety: Safety; executorWired: boolean; accounts: Array<{ id: string; userId: string; isActive: boolean; control: Control }> };

type Detail = {
  control: Control;
  decisions: Array<{ id: string; createdAt: string; symbol: string; side: string; notional: string | null; decision: string; reasons: string[] }>;
  intents: Array<{ idempotencyKey: string; intentId: string; symbol: string; side: string; quantity: number; notional: number; state: string; createdAt: string }>;
  mismatches: Array<{ id: string; kind: string; severity: string; symbol: string | null; asset: string | null }>;
};

const STATE_TONE: Record<PilotState, string> = {
  DISABLED: 'text-text3 border-border2',
  ARMED: 'text-gold border-gold',
  ACTIVE: 'text-cyan border-cyan-30',
  PAUSED: 'text-text2 border-border2',
  BLOCKED: 'text-red border-red-30',
};

const yesNo = (v: boolean) => (v ? 'true' : 'false');

export default function SpotPilotAdminPanel() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [check, setCheck] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus((await api.get<StatusResponse>('/spot-pilot/status')).data);
    } catch (e) {
      setMsg({ ok: false, text: getFriendlyError(e).message });
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail((await api.get<Detail>(`/spot-pilot/accounts/${id}`)).data);
    } catch (e) {
      setMsg({ ok: false, text: getFriendlyError(e).message });
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    setCheck(null);
    if (selected) void loadDetail(selected);
  }, [selected, loadDetail]);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      setMsg({ ok: true, text: label });
      if (r !== undefined) setCheck(r);
      await loadStatus();
      if (selected) await loadDetail(selected);
    } catch (e) {
      setMsg({ ok: false, text: getFriendlyError(e).message });
    } finally {
      setBusy(false);
    }
  }

  const setState = (state: 'ARMED' | 'PAUSED' | 'DISABLED') => {
    if (!selected) return;
    if (state === 'ARMED' && !window.confirm('Armar o piloto para esta conta? A primeira ordem real continua a exigir aprovação explícita.')) return;
    void act(`Estado → ${state}`, async () => {
      await api.post(`/spot-pilot/accounts/${selected}/state`, { state });
      return undefined;
    });
  };

  const decide = (kind: 'approve' | 'reject', idempotencyKey: string) => {
    if (!selected) return;
    if (kind === 'approve' && !window.confirm('Aprovar esta ordem REAL? Ela só é enviada se o Risk Guard voltar a permitir.')) return;
    void act(kind === 'approve' ? 'Ordem aprovada (não enviada daqui)' : 'Intent rejeitado', async () => {
      await api.post(`/spot-pilot/accounts/${selected}/${kind}`, { idempotencyKey });
      return undefined;
    });
  };

  const s = status?.safety;

  return (
    <div className="space-y-4" data-testid="spot-pilot-admin">
      <div className="bg-bg1 border border-border1 p-4">
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-3">Segurança global (só leitura — alterada apenas por configuração do servidor)</h3>
        {s ? (
          <dl className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-[11px]">
            <div><dt className="text-text3">SPOT_LIVE_ENABLED</dt><dd className="text-text1">{yesNo(s.spotLiveEnabled)}</dd></div>
            <div><dt className="text-text3">SPOT_KILL_SWITCH</dt><dd className={s.spotKillSwitch ? 'text-red' : 'text-text1'}>{yesNo(s.spotKillSwitch)}</dd></div>
            <div><dt className="text-text3">CEX_LIVE_WRITE_ENABLED_IN_BUILD</dt><dd className="text-text1">{yesNo(s.cexLiveWriteEnabledInBuild)}</dd></div>
            <div><dt className="text-text3">REAL_SPOT_PILOT_ENABLED</dt><dd className="text-text1">{yesNo(s.realSpotPilotEnabled)}</dd></div>
            <div><dt className="text-text3">Limite por ordem/ciclo/conta</dt><dd className="text-text1">{s.realSpotPilotMaxNotional == null ? 'não configurado' : `${s.realSpotPilotMaxNotional} USDT`}</dd></div>
          </dl>
        ) : (
          <p className="text-text3 text-sm">A ler…</p>
        )}
        {s && s.blockers.length > 0 && <p className="mt-3 text-gold font-mono text-[10px]">Bloqueios ativos: {s.blockers.join(' · ')}</p>}
        {status && !status.executorWired && <p className="mt-1 text-text3 font-mono text-[10px]">Executor não ligado ao runtime da estratégia. Nenhuma ordem é enviada a partir deste painel.</p>}
      </div>

      {msg && <div className={`p-3 border font-mono text-[10px] ${msg.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>{msg.text}</div>}

      <div className="bg-bg1 border border-border1 scroll-area-x">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-border1">
              {['Conta Binance', 'Utilizador', 'Ativa', 'Piloto', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-wider text-text3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border1">
            {(status?.accounts ?? []).map((a) => (
              <tr key={a.id} className={selected === a.id ? 'bg-bg2' : 'hover:bg-bg2'}>
                <td className="px-4 py-2.5 font-mono text-[10px] text-text2">{a.id}</td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-text3">{a.userId}</td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-text3">{a.isActive ? 'sim' : 'não'}</td>
                <td className="px-4 py-2.5">
                  <span className={`font-mono text-[9px] uppercase border px-1.5 py-0.5 ${STATE_TONE[a.control.state]}`}>{a.control.state}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button type="button" className="font-mono text-[9px] uppercase text-cyan hover:underline" onClick={() => setSelected(a.id)}>Abrir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && detail && (
        <div className="bg-bg1 border border-border1 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-[10px] uppercase border px-2 py-0.5 ${STATE_TONE[detail.control.state]}`}>{detail.control.state}</span>
            <button type="button" disabled={busy || detail.control.state === 'ACTIVE'} onClick={() => setState('ARMED')} className="font-mono text-[9px] uppercase border border-gold text-gold px-2 py-1 disabled:opacity-40">Armar</button>
            <button type="button" disabled={busy} onClick={() => setState('PAUSED')} className="font-mono text-[9px] uppercase border border-border2 text-text2 px-2 py-1 disabled:opacity-40">Pausar</button>
            <button type="button" disabled={busy} onClick={() => setState('DISABLED')} className="font-mono text-[9px] uppercase border border-border2 text-text2 px-2 py-1 disabled:opacity-40">Desativar</button>
            <button type="button" disabled={busy} onClick={() => void act('Leitura da conta concluída', async () => (await api.post(`/spot-pilot/accounts/${selected}/read-check`)).data)} className="font-mono text-[9px] uppercase border border-cyan-30 text-cyan px-2 py-1 disabled:opacity-40">Verificar leitura</button>
            <button type="button" disabled={busy} onClick={() => void act('Reconciliação concluída', async () => (await api.post(`/spot-pilot/accounts/${selected}/reconcile`)).data)} className="font-mono text-[9px] uppercase border border-cyan-30 text-cyan px-2 py-1 disabled:opacity-40">Reconciliar</button>
          </div>

          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-2">Intents por resolver</h4>
            {detail.intents.length === 0 ? (
              <p className="text-text3 text-[12px]">Nenhum.</p>
            ) : (
              <ul className="space-y-1">
                {detail.intents.map((i) => (
                  <li key={i.idempotencyKey} className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-text2">
                    <span>{i.symbol} {i.side} {i.quantity} (~{i.notional.toFixed(2)} USDT)</span>
                    <span className="text-text1">{i.state}</span>
                    {i.state === 'PENDING' && detail.control.state === 'ARMED' && (
                      <button type="button" disabled={busy} onClick={() => decide('approve', i.idempotencyKey)} className="uppercase border border-gold text-gold px-1.5 disabled:opacity-40">Aprovar</button>
                    )}
                    {i.state === 'PENDING' && (
                      <button type="button" disabled={busy} onClick={() => decide('reject', i.idempotencyKey)} className="uppercase border border-border2 text-text3 px-1.5 disabled:opacity-40">Rejeitar</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-2">Divergências em aberto</h4>
            {detail.mismatches.length === 0 ? (
              <p className="text-text3 text-[12px]">Nenhuma.</p>
            ) : (
              <ul className="space-y-1 font-mono text-[10px]">
                {detail.mismatches.map((m) => (
                  <li key={m.id} className={m.severity === 'CRITICAL' ? 'text-red' : 'text-gold'}>{m.severity} · {m.kind} · {m.symbol ?? m.asset ?? '—'}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-2">Últimas decisões</h4>
            {detail.decisions.length === 0 ? (
              <p className="text-text3 text-[12px]">Nenhuma.</p>
            ) : (
              <ul className="space-y-1 font-mono text-[10px] text-text2">
                {detail.decisions.map((d) => (
                  <li key={d.id}>
                    {new Date(d.createdAt).toLocaleString('pt-PT')} · {d.symbol} {d.side} · <span className={d.decision === 'ALLOW' ? 'text-cyan' : d.decision === 'BLOCK' ? 'text-red' : 'text-gold'}>{d.decision}</span>
                    {d.reasons.length > 0 && <span className="text-text3"> · {d.reasons.join(', ')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {check != null && (
            <pre className="bg-bg2 border border-border1 p-3 font-mono text-[10px] text-text2 overflow-x-auto max-h-80">{JSON.stringify(check, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
