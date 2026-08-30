import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

type Product = {
  id: string;
  name: string;
  priceUsd: number;
  comingSoon?: boolean;
  note?: string;
  includesGrid?: boolean;
  earlyBirdPriceUsd?: number | null;
};

export default function ProPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [earlyLimit, setEarlyLimit] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [pay, setPay] = useState<{
    payAddress: string;
    payAmount: number;
    payCurrency: string;
    priceUsd: number;
    earlyBird: boolean;
  } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get<{ products: Product[]; earlyBirdLimit: number }>('/pro/products')
      .then((r) => {
        setProducts(r.data.products || []);
        setEarlyLimit(r.data.earlyBirdLimit || 10);
      })
      .catch(() => setErr('Falha ao carregar produtos'));
  }, []);

  async function subscribe(productId: string) {
    if (!user) {
      window.location.href = '/login?next=/pro';
      return;
    }
    setBusy(productId);
    setErr('');
    setPay(null);
    try {
      const r = await api.post('/pro/subscribe', { productId, currency: 'usdttrc20' });
      setPay(r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Falha ao criar pagamento');
    } finally {
      setBusy(null);
    }
  }

  const cards = [
    products.find((p) => p.id === 'dca_elite'),
    products.find((p) => p.id === 'grid_bundle') || {
      id: 'grid_bundle',
      name: 'Grid Pro',
      priceUsd: 0,
      note: 'Incluído no DCA Elite',
    },
    products.find((p) => p.id === 'funding_arb'),
  ].filter(Boolean) as Product[];

  return (
    <div className="min-h-screen bg-bg0 text-text1">
      <header className="border-b border-border1 px-6 py-4 flex items-center justify-between">
        <BrandLogo variant="sidebar" subtitle="BOTS PRO" />
        <div className="flex gap-3 text-[13px]">
          <Link to="/performance" className="text-text2 hover:text-cyan">
            Performance
          </Link>
          {user ? (
            <Link to="/pro/signals" className="text-cyan hover:underline">
              Pro Signals
            </Link>
          ) : (
            <Link to="/login" className="text-text2 hover:text-text1">
              Login
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">BOTS PRO</h1>
          <p className="text-text2 max-w-xl mx-auto">
            Feed de sinais premium — DCA Elite + Grid Pro em paper. Sem pedir as tuas
            chaves de exchange. Early-bird: primeiros {earlyLimit} a 50% off.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {cards.map((p) => {
            const isDca = p.id === 'dca_elite';
            const isGrid = p.id === 'grid_bundle';
            const soon = Boolean(p.comingSoon);
            const price = isDca
              ? p.earlyBirdPriceUsd ?? p.priceUsd
              : p.priceUsd;
            return (
              <div
                key={p.id}
                className={`bg-bg1 border p-6 flex flex-col ${
                  isDca ? 'border-cyan' : 'border-border1'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg">{p.name}</h2>
                  {soon && (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-gold border border-gold-30 px-2 py-0.5">
                      Em breve
                    </span>
                  )}
                </div>
                {isGrid ? (
                  <p className="text-2xl font-bold text-cyan mb-2">Incluído</p>
                ) : (
                  <p className="text-2xl font-bold mb-2">
                    {soon ? `$${p.priceUsd}` : `$${price}`}
                    <span className="text-sm font-normal text-text2">/mês</span>
                  </p>
                )}
                {isDca && p.earlyBirdPriceUsd != null && p.earlyBirdPriceUsd < p.priceUsd && (
                  <p className="font-mono text-[10px] text-gold mb-2">
                    Early-bird ${p.earlyBirdPriceUsd} (lista ${p.priceUsd})
                  </p>
                )}
                <p className="text-sm text-text2 flex-1 mb-4">
                  {isDca && 'Sinais DCA Elite + Grid Pro · Telegram privado · dashboard'}
                  {isGrid && (p.note || 'Vem com o DCA Elite')}
                  {p.id === 'funding_arb' && 'Funding arbitrage signals — lançamento em breve'}
                </p>
                <button
                  type="button"
                  disabled={soon || isGrid || busy === p.id}
                  onClick={() => subscribe(p.id)}
                  className={`w-full py-2.5 text-sm font-semibold border transition-colors ${
                    soon || isGrid
                      ? 'border-border1 text-text3 cursor-not-allowed'
                      : 'border-cyan bg-cyan-dim text-cyan hover:bg-cyan hover:text-bg0'
                  }`}
                >
                  {soon ? 'Em breve' : isGrid ? 'No DCA Elite' : busy === p.id ? 'A criar…' : 'Assinar com crypto'}
                </button>
              </div>
            );
          })}
        </div>

        {err && <p className="text-red text-sm text-center">{err}</p>}

        {pay && (
          <div className="bg-bg1 border border-cyan p-6 max-w-md mx-auto space-y-3">
            <h3 className="font-bold">Pagamento NOWPayments</h3>
            <p className="text-sm text-text2">
              Envia exactamente <strong className="text-text1">{pay.payAmount} {pay.payCurrency}</strong>
              {pay.earlyBird ? ' (early-bird)' : ''} (~${pay.priceUsd})
            </p>
            <p className="font-mono text-[11px] break-all bg-bg2 p-3 border border-border1">
              {pay.payAddress}
            </p>
            <p className="font-mono text-[10px] text-text3">
              Após confirmação: proTier activo por 30 dias. Resultados passados não garantem futuros.
            </p>
          </div>
        )}

        <p className="text-center font-mono text-[10px] text-text3 uppercase tracking-wider">
          Resultados passados não garantem resultados futuros.
        </p>
      </main>
    </div>
  );
}
