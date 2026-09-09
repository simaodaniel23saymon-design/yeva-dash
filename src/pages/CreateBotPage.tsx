import { useState } from 'react';
import { PageLoader, YevaTradeLoader } from '../components/YevaTradeLoader';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { BinancePairSelector } from '../components/BinancePairSelector';
import { BotStartedAlert } from '../components/BotStartedAlert';
import { DailyPnlPanel } from '../components/DailyPnlPanel';
import { useWallet } from '../hooks/useWallet';
import { useExchange, type MarketType } from '../hooks/useExchange';
import { useBotEligibility } from '../hooks/useBotCreationBalance';
import { getFriendlyError } from '../utils/errorHandler';
import { formatMoney } from '../utils/format';
import type { ChartMarket } from '../utils/chartData';
import type { BotConfig } from '../types/trading';
import { DEFAULT_PRO_CONFIG } from '../types/trading';
import { ProBotConfigFields } from '../components/pro/ProBotConfigFields';
import { MarketProtectionBanner } from '../components/MarketProtectionBanner';
import { buildCreateBotPayload } from '../utils/botPayload';
import {
  RiskDisclaimerInline,
} from '../components/RiskDisclaimer';

export default function CreateBotPage() {
  const navigate = useNavigate();
  const { wallet, formatUSDT } = useWallet(30000);
  const { isConnected, loading: exchangeLoading } = useExchange(30000, { fetchBalance: false });
  const {
    isDemo,
    isEligible,
    balance,
    minimumRequired,
    loading: balanceLoading,
    message: eligibilityMessage,
    balanceLabel,
    refresh: refreshEligibility,
  } = useBotEligibility(30000);

  const [pair, setPair] = useState('');
  const [market, setMarket] = useState<MarketType>('FUTURES');
  const [mode, setMode] = useState('One-way');
  const [riskMode, setRiskMode] = useState('MODERATE');
  const [leverage, setLeverage] = useState(10);
  const [capitalPerSide, setCapitalPerSide] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startPhase, setStartPhase] = useState<'idle' | 'creating'>('idle');
  const [startedBot, setStartedBot] = useState<{ pair: string; market: string } | null>(null);
  const [proConfig, setProConfig] = useState<BotConfig>({ ...DEFAULT_PRO_CONFIG });
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);

  const effectiveLeverage = market === 'SPOT' ? 1 : leverage;
  const marginUsed = market === 'FUTURES' ? capitalPerSide / effectiveLeverage : capitalPerSide;
  const availableBalance = balance - marginUsed;
  const canSubmit = isConnected && !!pair.trim() && isEligible;

  const inputClass = 'w-full bg-bg3 border border-border2 text-text1 font-mono text-[13px] px-4 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2';

  const doCreate = async () => {
    setLoading(true);
    setError('');
    setStartPhase('creating');
    setCapacityWarning(null);
    setPendingConfirm(false);

    const pairUpper = pair.toUpperCase();
    try {
      await api.post('/bots', buildCreateBotPayload(
        pairUpper,
        market,
        riskMode,
        effectiveLeverage,
        capitalPerSide,
        proConfig,
        { mode, accountType: isDemo ? 'DEMO' : 'REAL', autoStart: true },
      ));

      try {
        await api.post('/bots/start');
      } catch {
        /* bot já pode estar running após create */
      }

      setStartedBot({ pair: pairUpper, market });
      setTimeout(() => navigate('/bots'), 2500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
      if (axiosErr.response?.status === 403) {
        const latest = await refreshEligibility();
        setError(latest?.message || axiosErr.response?.data?.message || axiosErr.response?.data?.error || 'Saldo insuficiente para criar bots.');
      } else {
        setError(getFriendlyError(err).message);
      }
    } finally {
      setLoading(false);
      setStartPhase('idle');
    }
  };

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair.trim()) {
      setError('Informe o par de trading.');
      return;
    }

    const eligibility = await refreshEligibility();
    if (!eligibility?.eligible) {
      setError(eligibility?.message || eligibilityMessage || 'Saldo insuficiente para criar bots.');
      return;
    }

    try {
      const cap = await api.get<{ exceeds?: boolean; warning?: string | null }>('/bots/capacity-check', {
        params: {
          capitalPerSide,
          leverage: effectiveLeverage,
          market,
          adding: true,
        },
      });
      if (cap.data.exceeds && cap.data.warning) {
        setCapacityWarning(cap.data.warning);
      }
    } catch {
      /* fail-open: criar sem aviso se capacity-check falhar */
    }

    await doCreate();
  };

  if (exchangeLoading || balanceLoading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-4 max-w-lg pb-6">
      <QuickGuide title="Criar novo bot" steps={[
        'Escolhe Spot ou Futures e o par de moedas',
        'Define modo de risco, alavancagem e capital',
        isDemo ? 'Conta demo: saldo fictício disponível' : `Mínimo de ${formatMoney(minimumRequired || 17)} na carteira interna`,
      ]} />

      <div>
        <h2 className="text-text1 font-bold text-xl">Criar Novo Bot</h2>
        <p className="font-mono text-[12px] text-text2 uppercase tracking-wider mt-1">
          Gás: <span className="text-gold">${formatUSDT(wallet?.balance)}</span>
          {' · '}
          <span className={isDemo ? 'text-gold' : 'text-cyan'}>{balanceLabel}</span>
          {isDemo && (
            <span className="ml-2 font-mono text-[9px] uppercase px-1.5 py-0.5 border border-gold-30 bg-gold-dim text-gold">DEMO</span>
          )}
        </p>
      </div>

      {isDemo && (
        <div className="bg-gold-dim border border-gold-30 p-3 font-mono text-[11px] text-gold">
          Modo DEMO — o bot usa a mesma estratégia com dinheiro fictício (sem ordens reais).
        </div>
      )}

      <MarketProtectionBanner />

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
            <p className="text-text2">Grid: {proConfig.maxLongPositions ?? 5}L+{proConfig.maxShortPositions ?? 5}S · Spacing {proConfig.gridSpacing ?? 0.8}%</p>
            <p className="text-gold/80 text-[10px] pt-1">Protecção explosiva activa no motor (só segue a tendência em pumps)</p>
          </div>
        )}

        <ProBotConfigFields
          config={proConfig}
          onChange={patch => setProConfig(prev => ({ ...prev, ...patch }))}
          inputClass={inputClass}
        />

        <div>
          <label className="font-mono text-[12px] uppercase tracking-wider text-text2 mb-2 block">Estratégia</label>
          <select value={mode} onChange={e => setMode(e.target.value)} className={inputClass}>
            <option value="One-way">One-way</option>
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
            Alavancagem: {market === 'SPOT' ? '1x (Spot sem alavancagem)' : `${leverage}x`}
          </label>
          <input
            type="number"
            value={market === 'SPOT' ? 1 : leverage}
            onChange={e => setLeverage(Number(e.target.value))}
            min={1}
            max={125}
            disabled={market === 'SPOT'}
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

        <RiskDisclaimerInline />

        <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[12px] space-y-1">
          <p className="text-text2">{balanceLabel}</p>
          <p className="text-text2">Margem usada: <span className="text-gold">${marginUsed.toFixed(2)}</span></p>
          <p className="text-text2">Disponível: <span className="text-cyan">${availableBalance.toFixed(2)}</span></p>
        </div>

        {!isEligible && eligibilityMessage && (
          <p className="text-red font-mono text-[12px] bg-red-dim border border-red-30 p-3">{eligibilityMessage}</p>
        )}

        {error && (
          <p className="text-red font-mono text-[12px] bg-red-dim border border-red-30 p-3">{error}</p>
        )}

        {loading && (
          <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[12px] text-cyan flex items-center gap-2">
            <YevaTradeLoader size="xs" />
            {startPhase === 'creating' ? 'A criar e activar bot...' : 'A processar...'}
          </div>
        )}

        {capacityWarning && (
          <p className="text-[11px] text-text3 font-mono leading-relaxed">{capacityWarning}</p>
        )}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full bg-cyan-dim border border-cyan-30 text-cyan py-3 font-mono text-[12px] uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? 'A criar...' : 'Criar e Iniciar Bot'}
        </button>

        {!isDemo && minimumRequired > 0 && (
          <div className="bg-gold-dim border border-gold-30 p-4">
            <p className="text-[12px] text-text2 leading-relaxed">
              {`É necessário um saldo mínimo de ${formatMoney(minimumRequired)} na carteira interna para criar bots.`}
            </p>
          </div>
        )}
      </form>
      )}
    </div>
  );
}
