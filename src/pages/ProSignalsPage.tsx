import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { YevaTradeLoader } from '../components/YevaTradeLoader';

type Signal = {
  id: string;
  source: string;
  strategy: string;
  symbol: string;
  body: string;
  createdAt: string;
};

export default function ProSignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get<{ signals: Signal[] }>('/pro/signals')
      .then((r) => setSignals(r.data.signals || []))
      .catch((e) => {
        if (e?.response?.status === 403) setForbidden(true);
        else setErr('Falha ao carregar sinais');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-text1 font-bold text-lg">Pro Signals</h2>
          <p className="font-mono text-[10px] text-text2 uppercase tracking-wider mt-0.5">
            Feed premium · real + paper
          </p>
        </div>
        <Link to="/pro" className="text-cyan text-sm hover:underline">
          Gerir subscrição
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <YevaTradeLoader label="A carregar sinais..." />
        </div>
      )}

      {forbidden && (
        <div className="bg-bg1 border border-gold-30 p-6 text-center space-y-3">
          <p className="text-text1 font-semibold">Subscrição Pro necessária</p>
          <p className="text-sm text-text2">
            Activa DCA Elite para ver o feed e receber sinais no Telegram.
          </p>
          <Link
            to="/pro"
            className="inline-block px-4 py-2 border border-cyan text-cyan text-sm font-semibold"
          >
            Ver planos
          </Link>
        </div>
      )}

      {err && <p className="text-red text-sm">{err}</p>}

      {!loading && !forbidden && (
        <div className="space-y-2">
          {signals.length === 0 && (
            <p className="text-text3 text-sm">Ainda sem sinais — o motor paper corre a cada 5 min.</p>
          )}
          {signals.map((s) => (
            <div key={s.id} className="bg-bg1 border border-border1 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-cyan">
                  {s.source}
                </span>
                <span className="font-mono text-[9px] text-text3">
                  {new Date(s.createdAt).toLocaleString('pt-PT')}
                </span>
              </div>
              <p className="text-sm text-text1 whitespace-pre-wrap">{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
