import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PageLoader } from '../components/YevaTradeLoader';

type Count = { key: string; n: number };
type Decision = {
  id: string;
  symbol: string;
  decision: string;
  reason: string;
  score: number | null;
  marketRegime: string | null;
  capitalUsed: number | null;
  cycleId: string | null;
  timestamp: string;
};
type Cycle = {
  cycleId: string;
  symbol: string;
  status: string;
  startedAt: string | null;
  allocatedCapital: number | null;
  usedCapital: number | null;
  reservedCapital: number | null;
  entriesCount: number | null;
  averageEntry: number | null;
  paperPnl: number | null;
  scoreAtEntry: number | null;
  scoreAtExit: number | null;
  exitReason: string | null;
  durationMs: number | null;
  mfe: number | null;
  mae: number | null;
};
type Snapshot = {
  mode: 'PAPER';
  orderExecution: false;
  label: string;
  generatedAt: string;
  activity: {
    totalDecisions: number;
    opens: number;
    adds: number;
    holds: number;
    exits: number;
    rotations: number;
    rejects: number;
    invalidations: number;
  };
  cycles: { open: number; closed: number; profitable: number; losing: number };
  performance: {
    paperPnl: number;
    winRate: number | null;
    averagePnl: number | null;
    medianPnl: number | null;
    averageDrawdown: number | null;
    averageDurationMs: number | null;
    averageEntries: number | null;
    capitalUtilizationPct: number | null;
    closedCyclesExplain: string | null;
  };
  quality: {
    averageScoreAtEntry: number | null;
    averageScoreAtExit: number | null;
    averageScoreDrop: number | null;
    averageMfe: number | null;
    averageMae: number | null;
  };
  reasons: { decisions: Count[]; exits: Count[] };
  regimes: Count[];
  symbols: Array<{ symbol: string; decisions: number; rejects: number; opens: number }>;
  recentDecisions: Decision[];
  openCycles: Cycle[];
  checkpoints: Array<{ checkpoint: string; symbol: string; timestamp: string | null }>;
  error?: string;
};

function fmt(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-PT', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function when(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function tone(decision: string): string {
  if (decision === 'OPEN' || decision === 'ADD') return 'border-cyan-30 text-cyan';
  if (decision === 'EXIT' || decision === 'ROTATE') return 'border-gold-30 text-gold';
  if (decision === 'REJECT' || decision === 'INVALIDATE') return 'border-red-30 text-red';
  return 'border-border2 text-text2';
}

export default function SpotPaperPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<Snapshot>('/spot-paper/snapshot');
      setData(res.data);
      setError(res.data.error || '');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setData(null);
        setError('Acesso restrito: o Spot Paper é só para administradores.');
      } else {
        setError('Não foi possível ler o Spot Paper.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !data) return <PageLoader />;

  const activity = data?.activity;
  const perf = data?.performance;
  const closed = data?.cycles.closed ?? 0;

  return (
    <div className="space-y-8 mb-12">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan mb-2" data-testid="spot-paper-banner">
          Spot Paper · {data?.label ?? 'simulação · sem ordens reais'} · orderExecution=false
        </p>
        <h2 className="text-text1 font-bold text-[28px] leading-tight">Spot Paper</h2>
        <p className="text-text2 mt-2 max-w-2xl">
          Isto é simulação. Não compra, não vende e não usa o saldo da conta.
          O radar de Winners no Dashboard é só análise.
        </p>
        <p className="font-mono text-[10px] text-text3 mt-2 uppercase tracking-wider">
          Ciclo cerca de 5 min
          {data?.generatedAt ? ` · lido ${when(data.generatedAt)}` : ''}
        </p>
      </div>

      {error && <p className="text-red">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Decisões', activity?.totalDecisions ?? 0],
          ['Rejeições', activity?.rejects ?? 0],
          ['Ciclos abertos', data?.cycles.open ?? 0],
          ['Ciclos fechados', closed],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-bg1 border border-border1 rounded-[18px] p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-text3">{label}</p>
            <p className="text-2xl text-text1 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-bg1 border border-border1 rounded-[18px] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3">Paper PnL</p>
          <p className="text-2xl text-cyan mt-1">{fmt(perf?.paperPnl ?? 0)} USDT</p>
          <p className="text-text3 text-sm mt-2">
            {perf?.closedCyclesExplain ?? 'Só ciclos fechados. Não é lucro real.'}
          </p>
        </div>
        <div className="bg-bg1 border border-border1 rounded-[18px] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3">Paper win rate</p>
          <p className="text-2xl text-text1 mt-1">
            {perf?.winRate == null ? '—' : `${fmt(perf.winRate * 100, 1)}%`}
          </p>
          <p className="text-text3 text-sm mt-2">
            {closed === 0 ? 'Sem ciclos fechados, a taxa não é calculada.' : `${data?.cycles.profitable ?? 0} ganhos · ${data?.cycles.losing ?? 0} perdas`}
          </p>
        </div>
        <div className="bg-bg1 border border-border1 rounded-[18px] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3">Qualidade</p>
          <p className="text-text2 text-sm mt-2">Score entrada {fmt(data?.quality.averageScoreAtEntry ?? null, 1)}</p>
          <p className="text-text2 text-sm">Score saída {fmt(data?.quality.averageScoreAtExit ?? null, 1)}</p>
          <p className="text-text2 text-sm">MFE {fmt(data?.quality.averageMfe ?? null)} · MAE {fmt(data?.quality.averageMae ?? null)}</p>
        </div>
      </div>

      <section className="bg-bg1 border border-border1 rounded-[22px] overflow-hidden">
        <div className="px-5 py-4 border-b border-border1">
          <h3 className="text-text1 font-semibold">Ciclos abertos</h3>
        </div>
        {(data?.openCycles.length ?? 0) === 0 ? (
          <p className="p-6 text-text2">
            Ainda sem ciclo spot. O paper só abre quando um winner passa o filtro. Uma rejeição não é uma ordem.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] min-w-[720px]">
              <thead>
                <tr className="text-text3 border-b border-border2">
                  <th className="py-2 px-4">Símbolo</th>
                  <th>Estado</th>
                  <th>Abertura</th>
                  <th>Alocado</th>
                  <th>Usado</th>
                  <th>Reservado</th>
                  <th>Entradas</th>
                  <th>Preço médio</th>
                </tr>
              </thead>
              <tbody>
                {data?.openCycles.map((cycle) => (
                  <tr key={cycle.cycleId} className="border-b border-border1 text-text1">
                    <td className="py-2 px-4">{cycle.symbol}</td>
                    <td>{cycle.status}</td>
                    <td>{when(cycle.startedAt)}</td>
                    <td>{fmt(cycle.allocatedCapital)}</td>
                    <td>{fmt(cycle.usedCapital)}</td>
                    <td>{fmt(cycle.reservedCapital)}</td>
                    <td>{cycle.entriesCount ?? '—'}</td>
                    <td>{fmt(cycle.averageEntry, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-bg1 border border-border1 rounded-[22px] overflow-hidden">
        <div className="px-5 py-4 border-b border-border1 flex items-center justify-between">
          <h3 className="text-text1 font-semibold">Últimas decisões</h3>
          <span className="font-mono text-[10px] uppercase text-text3">paper</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] min-w-[680px]">
            <thead>
              <tr className="text-text3 border-b border-border2">
                <th className="py-2 px-4">Hora</th>
                <th>Símbolo</th>
                <th>Decisão</th>
                <th>Motivo</th>
                <th>Score</th>
                <th>Regime</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentDecisions ?? []).map((row) => (
                <tr key={row.id} className="border-b border-border1 text-text1">
                  <td className="py-2 px-4 text-text3">{when(row.timestamp)}</td>
                  <td>{row.symbol.replace('USDT', '')}</td>
                  <td>
                    <span className={`inline-block border px-2 py-0.5 ${tone(row.decision)}`}>{row.decision}</span>
                  </td>
                  <td>{row.reason}</td>
                  <td>{fmt(row.score, 1)}</td>
                  <td>{row.marketRegime ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-bg1 border border-border1 rounded-[18px] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-2">Motivos</p>
          {(data?.reasons.decisions ?? []).slice(0, 8).map((row) => (
            <p key={row.key} className="text-text2 text-sm">{row.key} · {row.n}</p>
          ))}
        </div>
        <div className="bg-bg1 border border-border1 rounded-[18px] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-2">Regime e símbolos</p>
          {(data?.regimes ?? []).map((row) => (
            <p key={row.key} className="text-text2 text-sm">{row.key} · {row.n}</p>
          ))}
          <div className="mt-3">
            {(data?.symbols ?? []).slice(0, 6).map((row) => (
              <p key={row.symbol} className="text-text2 text-sm">
                {row.symbol.replace('USDT', '')} · {row.decisions} decisões · {row.rejects} rejeições
              </p>
            ))}
          </div>
        </div>
      </div>

      <p className="text-text3 text-sm">
        Checkpoints 24h, 72h, 5d e 7d aparecem aqui quando um ciclo chegar a essa idade. Não fecham a posição.
        {' '}
        <Link to="/dashboard" className="text-cyan">Voltar ao radar de análise</Link>
      </p>
    </div>
  );
}
