import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { BinancePairSelector } from '../components/BinancePairSelector';
import { BotStartedAlert } from '../components/BotStartedAlert';
import { DailyPnlPanel } from '../components/DailyPnlPanel';
import { useWallet } from '../hooks/useWallet';
import { useExchange, type MarketType } from '../hooks/useExchange';
import { getFriendlyError } from '../utils/errorHandler';
import { MIN_DEPOSIT } from '../utils/constants';
import type { ChartMarket } from '../utils/chartData';

export default function CreateBotPage() {
  const navigate = useNavigate();
  const { wallet, formatUSDT } = useWallet(30000);
  const { isConnected, exchangeBalance, loading: exchangeLoading } = useExchange(30000);

  const [pair, setPair] = useState('');
  const [market, setMarket] = useState<MarketType>('FUTURES');
  const [mode, setMode] = useState('Hedge Pro');
  const [riskMode, setRiskMode] = useState('MODERATE');
  const [leverage, setLeverage] = useState(10);
  const [capitalPerSide, setCapitalPerSide] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startPhase, setStartPhase] = useState<'idle' | 'creating'>('idle');
  const [startedBot, setStartedBot] = useState<{ pair: string; market: string } | null>(null);

  const balance = exchangeBalance ?? 0;
  const marginUsed = market === 'FUTURES' ? capitalPerSide / leverage : capitalPerSide;
  const availableBalance = balance - marginUsed;

  const inputClass = 'w-full bg-bg3 border border-border2 text-text1 font-mono text-[13px] px-4 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2';

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair.trim()) {
      setError('Informe o par de trading.');
      return;
    }

    setLoading(true);
    setError('');
    setStartPhase('creating');

    const pairUpper = pair.toUpperCase();
    try {
      await api.post('/bots', {
        pair: pairUpper,
        market,
        mode,
        riskMode,
        leverage: parseInt(String(leverage), 10),
        capitalPerSide: parseFloat(String(capitalPerSide)),
      });

      setStartedBot({ pair: pairUpper, market });
      setTimeout(() => navigate('/bots'), 2500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosErr.response?.status === 403) {
        setError(`Depósito mínimo de $${MIN_DEPOSIT} USDT necessário. Adiciona fundos na página de Depósitos.`);
      } else {
        setError(getFriendlyError(err).message);
      }
    } finally {
      setLoading(false);
      setStartPhase('idle');
    }
  };

  if (exchangeLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <QuickGuide title="Criar novo bot" steps={[
        'Escolhe Spot ou Futures e o par de moedas',
        'Define modo de risco, alavancagem e capital',
        `Depósito mínimo de $${MIN_DEPOSIT} USDT necessário`,
      ]} />

      <div>
        <h2 className="text-text1 font-bold text-xl">Criar Novo Bot</h2>
        <p className="font-mono text-[12px] text-text2 uppercase tracking-wider mt-1">
          Gás: <span className="text-gold">${formatUSDT(wallet?.balance)}</span>
          {' · '}
          Exchange: <span className="text-cyan">${balance.toFixed(2)} USDT</span>
        </p>
      </div>

      {!isConnected && (
        <div className="bg-gold-dim border border-gold-30 p-4 font-mono text-[12px] text-gold">
          Conecta uma exchange antes de criar bots.
        </div>
      )}

      {startedBot ? (
        <BotStartedAlert pair={startedBot.pair} market={startedBot.market} />
      ) : (
      <form onSubmit={createBot} className="bg-bg1 border border-border1 p-5 space-y-4">
        <DailyPnlPanel compact />
        <div>
          <BinancePairSelector
            selected={pair}
            onChange={setPair}
            market={market as ChartMarket}
            onMarketChange={m => {
              setMarket(m as MarketType);
              setPair('');
            }}
          />
        </div>

        {pair && (
          <div className="bg-bg2 border border-border1 p-3 font-mono text-[12px] space-y-1">
            <p className="text-text3 uppercase text-[11px] tracking-wider mb-2">Resumo</p>
            <p className="text-text2">Par: <span className="text-text1 font-bold">{pair}</span> · {market}</p>
            <p className="text-text2">Risco: {riskMode} · Alavancagem: {leverage}x · Capital: ${capitalPerSide}</p>
          </div>
        )}

        <div>
          <label className="font-mono text-[12px] uppercase tracking-wider text-text2 mb-2 block">Estratégia</label>
          <select value={mode} onChange={e => setMode(e.target.value)} className={inputClass}>
            <option value="Hedge Pro">Hedge Pro</option>
            <option value="GRID">Grid Trading</option>
          </select>
        </div>

        <div>
          <label className="font-mono text-[12px] uppercase tracking-wider text-text2 mb-2 block">Modo de Risco</label>
          <select
            value={riskMode}
            onChange={e => {
              setRiskMode(e.target.value);
              if (e.target.value === 'CONSERVATIVE') setLeverage(5);
              else if (e.target.value === 'MODERATE') setLeverage(10);
              else if (e.target.value === 'AGGRESSIVE') setLeverage(20);
            }}
            className={inputClass}
          >
            <option value="CONSERVATIVE">Conservador (Leverage 5x)</option>
            <option value="MODERATE">Moderado (Leverage 10x)</option>
            <option value="AGGRESSIVE">Agressivo (Leverage 20x)</option>
          </select>
        </div>

        <div>
          <label className="font-mono text-[12px] uppercase tracking-wider text-text2 mb-2 block">
            Alavancagem: {leverage}x
          </label>
          <input
            type="number"
            value={leverage}
            onChange={e => setLeverage(Number(e.target.value))}
            min={1}
            max={125}
            className={inputClass}
          />
        </div>

        <div>
          <label className="font-mono text-[12px] uppercase tracking-wider text-text2 mb-2 block">Capital por Lado ($)</label>
          <input
            type="number"
            value={capitalPerSide}
            onChange={e => setCapitalPerSide(Number(e.target.value))}
            min={10}
            step={0.01}
            className={inputClass}
          />
        </div>

        <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[12px] space-y-1">
          <p className="text-text2">Saldo exchange: <span className="text-cyan">${balance.toFixed(2)}</span></p>
          <p className="text-text2">Margem usada: <span className="text-gold">${marginUsed.toFixed(2)}</span></p>
          <p className="text-text2">Disponível: <span className="text-cyan">${availableBalance.toFixed(2)}</span></p>
        </div>

        {error && (
          <p className="text-red font-mono text-[12px] bg-red-dim border border-red-30 p-3">{error}</p>
        )}

        {loading && (
          <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[12px] text-cyan flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            {startPhase === 'creating' ? 'A criar e activar bot...' : 'A processar...'}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isConnected || !pair}
          className="w-full bg-cyan-dim border border-cyan-30 text-cyan py-3 font-mono text-[12px] uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? 'A criar...' : 'Criar e Iniciar Bot'}
        </button>

        <div className="bg-gold-dim border border-gold-30 p-4">
          <p className="text-[12px] text-text2 leading-relaxed">
            {`É necessário um depósito mínimo de $${MIN_DEPOSIT} USDT para criar bots.`}
          </p>
        </div>
      </form>
      )}
    </div>
  );
}
