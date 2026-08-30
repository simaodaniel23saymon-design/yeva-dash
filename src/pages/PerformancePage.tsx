import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { BrandLogo } from '../components/BrandLogo';
import { YevaTradeLoader } from '../components/YevaTradeLoader';

type Metrics = {
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  netPnl: number;
};

type PerfPayload = {
  disclaimer: string;
  real: { metrics: Metrics; equity: { t: string; equity: number }[]; openCycles: number };
  paper: { label: string; metrics: Metrics; equity: { t: string; equity: number }[]; openCycles: number };
  cached?: boolean;
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg1 border border-border1 p-4">
      <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-2">{label}</p>
      <p className="font-bold text-text1 text-lg">{value}</p>
    </div>
  );
}

function EquitySpark({ points }: { points: { equity: number }[] }) {
  if (!points.length) {
    return <p className="font-mono text-[11px] text-text3">Sem rounds fechados ainda.</p>;
  }
  const vals = points.map((p) => p.equity);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0);
  const span = Math.max(max - min, 1e-6);
  const w = 320;
  const h = 80;
  const path = vals
    .map((v, i) => {
      const x = (i / Math.max(vals.length - 1, 1)) * w;
      const y = h - ((v - min) / span) * (h - 8) - 4;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="currentColor" className="text-cyan" strokeWidth="1.5" />
    </svg>
  );
}

export default function PerformancePage() {
  const [data, setData] = useState<PerfPayload | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PerfPayload>('/performance')
      .then((r) => setData(r.data))
      .catch(() => setErr('Não foi possível carregar performance.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg0 text-text1">
      <header className="border-b border-border1 px-6 py-4 flex items-center justify-between">
        <BrandLogo variant="sidebar" subtitle="Performance" />
        <div className="flex gap-3 text-[13px]">
          <Link to="/pro" className="text-cyan hover:underline">
            BOTS PRO
          </Link>
          <Link to="/login" className="text-text2 hover:text-text1">
            Login
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Performance pública</h1>
          <p className="text-text2 text-sm mt-1">Read-only · cache 1h · sem autenticação</p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <YevaTradeLoader size="lg" label="A carregar..." />
          </div>
        )}
        {err && <p className="text-red text-sm">{err}</p>}

        {data && (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Real (Rounds)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Win rate" value={`${data.real.metrics.winRate}%`} />
                <MetricCard label="Profit factor" value={`${data.real.metrics.profitFactor}`} />
                <MetricCard label="Drawdown" value={`${data.real.metrics.maxDrawdown}%`} />
                <MetricCard label="Ciclos abertos" value={`${data.real.openCycles}`} />
              </div>
              <div className="bg-bg1 border border-border1 p-4">
                <p className="font-mono text-[9px] uppercase text-text2 mb-2">
                  Curva de equity · net ${data.real.metrics.netPnl} · {data.real.metrics.totalTrades} trades
                </p>
                <EquitySpark points={data.real.equity} />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{data.paper.label}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Win rate" value={`${data.paper.metrics.winRate}%`} />
                <MetricCard label="Profit factor" value={`${data.paper.metrics.profitFactor}`} />
                <MetricCard label="Drawdown" value={`${data.paper.metrics.maxDrawdown}%`} />
                <MetricCard label="Abertos paper" value={`${data.paper.openCycles}`} />
              </div>
              <div className="bg-bg1 border border-border1 p-4">
                <p className="font-mono text-[9px] uppercase text-text2 mb-2">
                  Equity paper · net ${data.paper.metrics.netPnl} · {data.paper.metrics.totalTrades} rounds
                </p>
                <EquitySpark points={data.paper.equity} />
              </div>
            </section>

            <footer className="border-t border-border1 pt-6 text-center">
              <p className="font-mono text-[11px] text-text3 uppercase tracking-wider">
                {data.disclaimer}
              </p>
              {data.cached && (
                <p className="text-[10px] text-text3 mt-2">Resposta em cache</p>
              )}
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
