import { useEffect, useState } from 'react';
import { PageLoader, YevaTradeLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { BotToggleButton } from '../components/BotToggleButton';
import { BinancePairSelector } from '../components/BinancePairSelector';
import { BotStartedAlert } from '../components/BotStartedAlert';
import { BotLiveStatusBar } from '../components/BotLiveStatusBar';
import { DailyPnlPanel } from '../components/DailyPnlPanel';
import { LiveOrders } from '../components/LiveOrders';
import { useWallet } from '../hooks/useWallet';
import { useExchange, type MarketType } from '../hooks/useExchange';
import { useBotEligibility } from '../hooks/useBotCreationBalance';
import { getFriendlyError } from '../utils/errorHandler';
import {
  resolveBotId,
  startBotById,
  stopAllBots,
  stopBotById,
  deleteBotById,
  deleteStoppedBots,
  isBotRunning,
  normalizeLiveBot,
} from '../utils/liveData';
import type { ChartMarket } from '../utils/chartData';
import type { BotConfig } from '../types/trading';
import { DEFAULT_PRO_CONFIG } from '../types/trading';
import { ProBotConfigFields } from '../components/pro/ProBotConfigFields';
import { buildProPayload } from '../utils/proTrading';

interface Bot {
  id: string;
  botId?: string;
  _id?: string;
  symbol?: string;
  pair?: string;
  status: string;
  isRunning?: boolean;
  running?: boolean;
  isActive?: boolean;
  market?: string;
  mode?: string;
  riskMode?: string;
  leverage?: number;
  capitalPerSide?: number;
  entryPercent?: number;
  takeProfitPercent?: number;
  stopLossPercent?: number;
}

export default function BotsPage() {
  const { wallet, formatUSDT } = useWallet(30000);
  const { isConnected, loading: exchangeLoading } = useExchange(30000, { fetchBalance: false });
  const {
    isDemo,
    isEligible,
    balance,
    loading: balanceLoading,
    message: eligibilityMessage,
    balanceLabel,
    refresh: refreshEligibility,
  } = useBotEligibility(30000);

  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [startedBot, setStartedBot] = useState<{ pair: string; market: string } | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [startPhase, setStartPhase] = useState<'idle' | 'creating' | 'starting'>('idle');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingStopped, setClearingStopped] = useState(false);

  const [market, setMarket] = useState<MarketType>('FUTURES');
  const [pair, setPair] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [capitalPerSide, setCapitalPerSide] = useState(14);
  const [riskMode, setRiskMode] = useState('MODERATE');
  const [useLegacyMode, setUseLegacyMode] = useState(false);
  const [entryPercent, setEntryPercent] = useState(10);
  const [takeProfit, setTakeProfit] = useState(60);
  const [stopLoss, setStopLoss] = useState(30);
  const [proConfig, setProConfig] = useState<BotConfig>({ ...DEFAULT_PRO_CONFIG });

  const normalizeBot = (b: Bot): Bot => normalizeLiveBot(b);

  const loadBots = async () => {
    try {
      const res = await api.get<{ bots: Bot[] }>('/bots/status');
      setBots((res.data.bots ?? []).map(normalizeBot));
      setLastSync(new Date());
    } catch {
      try {
        const res = await api.get<Bot[]>('/bots');
        setBots(res.data.map(normalizeBot));
        setLastSync(new Date());
      } catch {
        setBots([]);
      }
    }
  };

  useEffect(() => {
    loadBots().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showCreate) refreshEligibility();
  }, [showCreate, refreshEligibility]);

  const showFlash = (text: string) => { setFlash(text); setTimeout(() => setFlash(''), 4000); };

  const marginUsed = market === 'FUTURES' ? capitalPerSide / leverage : capitalPerSide;
  const availableBalance = balance - marginUsed;
  const canSubmit = !!pair.trim() && isEligible;

  const createAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair.trim()) { setError('Escreve o par (ex: BTCUSDT, HYPEUSDT).'); return; }
    const eligibility = await refreshEligibility();
    if (!eligibility?.eligible) {
      setError(eligibility?.message || eligibilityMessage || 'Saldo insuficiente para criar bots.');
      return;
    }
    setCreating(true);
    setError('');
    setStartPhase('creating');

    const pairUpper = pair.toUpperCase();
    const body = useLegacyMode
      ? {
          pair: pairUpper,
          market,
          mode: 'GRID',
          entryPercent,
          takeProfitPercent: takeProfit,
          stopLossPercent: stopLoss,
        }
      : {
          pair: pairUpper,
          market,
          leverage,
          capitalPerSide,
          mode: 'Hedge Pro',
          riskMode,
          tpDailyPct: 2,
          maxLossPct: 5,
          ...buildProPayload(proConfig),
        };

    try {
      await api.post('/bots', body);
      setStartPhase('starting');
      try {
        await api.post('/bots/start');
      } catch {
        /* start pode falhar se já estiver activo */
      }
      setShowCreate(false);
      setPair('');
      setStarting(true);
      await loadBots();
      setStartedBot({ pair: pairUpper, market });
      showFlash(`Bot ${pairUpper} criado e a operar.`);
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally {
      setCreating(false);
      setStarting(false);
      setStartPhase('idle');
    }
  };

  const stopBot = async (id: string) => {
    if (!id) {
      showFlash('Bot sem ID válido.');
      return;
    }
    if (!window.confirm('Parar este bot?')) return;
    try {
      await stopBotById(id);
      await loadBots();
      showFlash('Bot parado com sucesso.');
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message);
    }
  };

  const startBot = async (bot: Bot) => {
    const id = resolveBotId(bot);
    if (!id) {
      showFlash('Bot sem ID válido.');
      return;
    }
    if (!window.confirm('Iniciar este bot?')) return;
    try {
      await startBotById(id);
      await loadBots();
      setStartedBot({
        pair: bot.symbol ?? bot.pair ?? 'Bot',
        market: bot.market ?? 'FUTURES',
      });
      showFlash('Bot iniciado — sistema activo.');
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message);
    }
  };

  const stopAllBotsHandler = async () => {
    if (!window.confirm('Parar TODOS os bots?')) return;
    try {
      await stopAllBots();
      await loadBots();
      showFlash('Todos os bots parados.');
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message);
    }
  };

  const deleteBot = async (bot: Bot) => {
    const id = resolveBotId(bot);
    const sym = bot.symbol ?? bot.pair ?? 'bot';
    if (!id) {
      showFlash('Bot sem ID válido.');
      return;
    }
    const running = isBotRunning(bot.status);
    const msg = running
      ? `O bot ${sym} está a operar. Parar e apagar? Esta acção não pode ser desfeita.`
      : `Apagar o bot ${sym}? Esta acção não pode ser desfeita.`;
    if (!window.confirm(msg)) return;
    setDeletingId(id);
    try {
      if (running) await stopBotById(id);
      await deleteBotById(id);
      await loadBots();
      showFlash(`Bot ${sym} apagado.`);
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message);
    } finally {
      setDeletingId(null);
    }
  };

  const clearStoppedBots = async () => {
    const stopped = bots.filter(b => !isBotRunning(b.status));
    if (stopped.length === 0) {
      showFlash('Não há bots parados para limpar.');
      return;
    }
    if (!window.confirm(`Apagar ${stopped.length} bot(s) parado(s)? Esta acção não pode ser desfeita.`)) return;
    setClearingStopped(true);
    try {
      const deleted = await deleteStoppedBots();
      await loadBots();
      showFlash(deleted > 0 ? `${deleted} bot(s) parado(s) removido(s).` : `${stopped.length} bot(s) parado(s) removido(s).`);
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message);
    } finally {
      setClearingStopped(false);
    }
  };

  const runningCount = bots.filter(b => isBotRunning(b.status)).length;
  const stoppedCount = bots.filter(b => !isBotRunning(b.status)).length;

  const inputClass = 'w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2';

  if (loading || exchangeLoading || balanceLoading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-4">
      <QuickGuide title="Como usar os bots" steps={[
        'Conecta a exchange em API (Binance ou Bybit)',
        'Escolhe Spot ou Futures e escreve o par (ex: HYPEUSDT)',
        'Define alavancagem e capital por ordem',
        'Cria e inicia o bot — monitoriza em tempo real abaixo',
      ]} />

      {!isConnected ? (
        <div className="bg-gold-dim border border-gold-30 p-6 text-center">
          <p className="font-mono text-[11px] text-gold mb-4">Conecta uma exchange primeiro para operar.</p>
          <Link to="/exchanges"
            className="inline-block font-mono text-[9px] tracking-widest uppercase px-6 py-3 border border-cyan-30 bg-cyan-dim text-cyan">
            Conectar Exchange
          </Link>
        </div>
      ) : (
        <>
          <DailyPnlPanel compact />

          {startedBot && (
            <BotStartedAlert
              pair={startedBot.pair}
              market={startedBot.market}
              onDismiss={() => setStartedBot(null)}
            />
          )}

          <BotLiveStatusBar
            runningCount={runningCount}
            totalCount={bots.length}
            lastUpdate={lastSync}
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-text1 font-bold text-lg">Configurar Robô</h2>
              <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
                Gás: <span className="text-gold">${formatUSDT(wallet?.balance)}</span>
                {' · '}
                <span className={isDemo ? 'text-gold' : 'text-cyan'}>{balanceLabel}</span>
              </p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all">
              + Novo Bot
            </button>
            {stoppedCount > 0 && (
              <button
                type="button"
                onClick={clearStoppedBots}
                disabled={clearingStopped}
                className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-gold-30 bg-gold-dim text-gold hover:bg-gold/15 transition-all disabled:opacity-50"
              >
                {clearingStopped ? 'A limpar...' : `🧹 Limpar parados (${stoppedCount})`}
              </button>
            )}
            {bots.length > 0 && (
              <button type="button" onClick={stopAllBotsHandler}
                className="font-mono text-[9px] tracking-widest uppercase px-4 py-2 border border-red-30 bg-red-dim text-red hover:bg-red/15 transition-all">
                Parar Todos
              </button>
            )}
          </div>

          <BotToggleButton />
        </>
      )}

      {flash && (
        <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] text-cyan">{flash}</div>
      )}

      {isConnected && bots.length === 0 ? (
        <div className="bg-bg1 border border-border1 p-12 text-center">
          <p className="font-mono text-[11px] text-text2">Sem bots criados ainda.</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 font-mono text-[9px] uppercase px-4 py-2 border border-cyan-30 text-cyan">
            Configurar primeiro bot
          </button>
        </div>
      ) : isConnected && bots.length > 0 ? (
        <div className="space-y-3">
          {bots.map(bot => {
            const botId = resolveBotId(bot);
            const sym = bot.symbol ?? bot.pair ?? '—';
            const running = isBotRunning(bot.status);
            const isDeleting = deletingId === botId;
            return (
              <div key={botId || sym} className={`bg-bg1 border p-4 ${running ? 'border-cyan/20' : 'border-border1'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`w-[6px] h-[6px] rounded-full ${running ? 'bg-cyan animate-pulse' : 'bg-text3'}`} />
                      <span className="text-text1 font-bold">{sym}</span>
                      {bot.market && (
                        <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-border2 text-text3">{bot.market}</span>
                      )}
                      <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 border ${
                        running ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text3'
                      }`}>
                        {running ? 'A operar' : 'Parado'}
                      </span>
                    </div>
                    <div className="flex gap-4 font-mono text-[10px] text-text2 flex-wrap">
                      {bot.mode && <span>Modo: {bot.mode}</span>}
                      {bot.riskMode && <span>Risco: {bot.riskMode}</span>}
                      {bot.leverage != null && <span>Alavancagem: {bot.leverage}x</span>}
                      {bot.capitalPerSide != null && <span>Capital: ${bot.capitalPerSide}</span>}
                      {bot.entryPercent != null && <span>Entrada: {bot.entryPercent}%</span>}
                    </div>
                    <LiveOrders botId={botId} active={running} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0 min-w-[7.5rem]">
                    {running ? (
                      <button type="button" onClick={() => stopBot(botId)}
                        className="font-mono text-[9px] uppercase px-3 py-2 border border-red-30 text-red whitespace-nowrap">
                        Parar Este
                      </button>
                    ) : (
                      <button type="button" onClick={() => startBot(bot)}
                        className="font-mono text-[9px] uppercase px-3 py-2 border border-cyan-30 text-cyan whitespace-nowrap">
                        Iniciar Este
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteBot(bot)}
                      disabled={isDeleting}
                      title={running ? 'Parar e apagar bot' : 'Apagar bot'}
                      className="font-mono text-[9px] uppercase px-3 py-2 border border-red-30 bg-red-dim/40 text-red hover:bg-red/15 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isDeleting ? 'A apagar...' : '🗑️ Apagar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {showCreate && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-bg1 border border-border1 w-full max-w-lg max-h-[90vh] scroll-area">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border1 sticky top-0 bg-bg1">
              <h3 className="text-text1 font-bold">Novo Bot</h3>
              <button onClick={() => setShowCreate(false)} className="text-text2 hover:text-text1">✕</button>
            </div>

            <form onSubmit={createAndStart} className="p-5 pb-8 space-y-4">
              <BinancePairSelector
                compact
                selected={pair}
                onChange={setPair}
                market={market as ChartMarket}
                onMarketChange={m => {
                  setMarket(m as MarketType);
                  setPair('');
                }}
              />

              <div className="flex items-center gap-2">
                <input type="checkbox" id="legacy" checked={useLegacyMode}
                  onChange={e => setUseLegacyMode(e.target.checked)} className="accent-cyan" />
                <label htmlFor="legacy" className="font-mono text-[9px] text-text2">Modo Grid (% entrada / TP / SL)</label>
              </div>

              {!useLegacyMode ? (
                <>
                  {pair && (
                    <div className="bg-bg2 border border-border1 p-3 font-mono text-[10px] space-y-1">
                      <p className="text-text3 uppercase text-[9px] tracking-wider mb-2">Resumo da configuração</p>
                      <p className="text-text2">Par: <span className="text-text1 font-bold">{pair}</span> · {market}</p>
                      <p className="text-text2">Risco: <span className="text-text1">{riskMode}</span> · Alavancagem: <span className="text-text1">{leverage}x</span></p>
                      <p className="text-text2">Capital/ordem: <span className="text-cyan">${capitalPerSide}</span> · Modo: Hedge Pro</p>
                      <p className="text-text2">Grid PRO: {proConfig.maxLongPositions ?? 15}L+{proConfig.maxShortPositions ?? 15}S · {proConfig.gridSpacing ?? 0.8}%</p>
                    </div>
                  )}

                  <ProBotConfigFields
                    compact
                    config={proConfig}
                    onChange={patch => setProConfig(prev => ({ ...prev, ...patch }))}
                    inputClass={inputClass}
                  />

                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Modo de Risco</label>
                    <select value={riskMode} onChange={e => {
                      setRiskMode(e.target.value);
                      if (e.target.value === 'CONSERVATIVE') setLeverage(5);
                      else if (e.target.value === 'MODERATE') setLeverage(10);
                      else if (e.target.value === 'AGGRESSIVE') setLeverage(20);
                    }}
                      className={inputClass}>
                      <option value="CONSERVATIVE">Conservador (5x)</option>
                      <option value="MODERATE">Moderado (10x)</option>
                      <option value="AGGRESSIVE">Agressivo (20x)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">
                      Alavancagem: {leverage}x
                    </label>
                    <input type="range" min={1} max={20} value={leverage}
                      onChange={e => setLeverage(Number(e.target.value))} className="w-full accent-cyan" />
                    <div className="flex justify-between font-mono text-[9px] text-text3 mt-1">
                      <span>1x</span><span>20x</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">Capital por ordem (USDT)</label>
                    <input type="number" min={1} step={0.01} value={capitalPerSide}
                      onChange={e => setCapitalPerSide(Number(e.target.value))} className={inputClass} />
                    <p className="font-mono text-[9px] text-text3 mt-1">Margem ≈ notional ÷ alavancagem</p>
                  </div>

                  <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] space-y-1">
                    <p className="text-text2">{balanceLabel}</p>
                    <p className="text-text2">Margem usada: <span className="text-gold">${marginUsed.toFixed(2)}</span></p>
                    <p className="text-text2">Disponível: <span className="text-cyan">${availableBalance.toFixed(2)}</span></p>
                  </div>

                  {!isEligible && eligibilityMessage && (
                    <p className="text-red font-mono text-[10px] bg-red-dim border border-red-30 p-3">{eligibilityMessage}</p>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-mono text-[9px] uppercase text-text2 mb-1 block">Entrada %</label>
                    <input type="number" min={1} max={100} value={entryPercent}
                      onChange={e => setEntryPercent(+e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] uppercase text-text2 mb-1 block">TP %</label>
                    <input type="number" min={1} value={takeProfit}
                      onChange={e => setTakeProfit(+e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] uppercase text-text2 mb-1 block">SL %</label>
                    <input type="number" min={1} max={100} value={stopLoss}
                      onChange={e => setStopLoss(+e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}

              {error && <p className="text-red font-mono text-[10px] bg-red-dim border border-red-30 p-3">{error}</p>}

              {(creating || starting) && (
                <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[11px] text-cyan space-y-2">
                  <div className="flex items-center gap-2">
                    <YevaTradeLoader size="xs" />
                    {startPhase === 'creating' ? 'A configurar o bot...' : 'A iniciar motor de trading...'}
                  </div>
                  <p className="text-text2 text-[10px]">O sistema vai ficar activo em segundos. Aguarda a confirmação.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase">Cancelar</button>
                <button type="submit" disabled={creating || starting || !canSubmit}
                  className="flex-1 py-2.5 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase disabled:opacity-50">
                  {creating || starting
                    ? (startPhase === 'creating' ? 'A configurar...' : 'A iniciar...')
                    : 'Iniciar Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
