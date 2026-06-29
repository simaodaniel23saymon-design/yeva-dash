import { useCallback, useEffect, useState } from 'react';
import { PageLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { BotToggleButton } from '../components/BotToggleButton';
import { LiveTradingPanel } from '../components/LiveTradingPanel';
import { LiveChart } from '../components/LiveChart';
import { useChartSymbol } from '../hooks/useChartSymbol';
import { AnimatedStat } from '../components/AnimatedStat';
import { IconWallet, IconTrendUp, IconTrendDown, IconActivity } from '../components/ui/Icons';
import { BotLiveStatusBar } from '../components/BotLiveStatusBar';
import { ProStrategyCardsDefaults } from '../components/pro/ProStrategyCards';
import { ProNotifications } from '../components/pro/ProNotifications';
import { ProPositionDetails } from '../components/pro/ProPositionDetails';
import { useProTrading } from '../hooks/useProTrading';
import { enrichPosition } from '../utils/proTrading';
import { useWallet } from '../hooks/useWallet';
import { formatMoney } from '../utils/format';
import {
  fetchBotsList,
  fetchExchangePositions,
  fetchExchangeStats,
  fetchWalletRealStats,
  stopAllBots,
  isBotRunning,
  botPair,
  parseNum,
  safeErrorMessage,
  type ExchangeStats,
  type ExchangePosition,
  type LiveBot,
  type RealWalletStats,
} from '../utils/liveData';

const emptyRealStats: RealWalletStats = {
  availableBalance: 0,
  unrealizedPnL: 0,
  dailyPnL: 0,
  netBalance: 0,
};

const emptyStats: ExchangeStats = {
  balance: 0,
  availableMargin: 0,
  usedMargin: 0,
  totalPnl: 0,
  botsCount: 0,
  runningBotsCount: 0,
  positionsCount: 0,
  exchange: null,
  accountType: null,
};

export default function DashboardPage() {
  const { wallet, formatUSDT } = useWallet(30000);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<ExchangeStats>(emptyStats);
  const [realStats, setRealStats] = useState<RealWalletStats>(emptyRealStats);
  const [bots, setBots] = useState<LiveBot[]>([]);
  const [positions, setPositions] = useState<ExchangePosition[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [flash, setFlash] = useState('');

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const exchangeRes = await api.get<{ connected: boolean }>('/exchange/status');
      setIsConnected(exchangeRes.data.connected);

      if (!exchangeRes.data.connected) {
        setStats(emptyStats);
        setRealStats(emptyRealStats);
        setBots([]);
        setPositions([]);
        return;
      }

      const [statsData, realStatsData, botsList, posList] = await Promise.all([
        fetchExchangeStats(),
        fetchWalletRealStats(),
        fetchBotsList(),
        fetchExchangePositions(),
      ]);

      if (realStatsData) {
        setRealStats(realStatsData);
      } else {
        setRealStats(emptyRealStats);
      }

      if (statsData) {
        setStats(statsData);
      } else {
        const running = botsList.filter(b => isBotRunning(b.status));
        setStats({
          ...emptyStats,
          botsCount: botsList.length,
          runningBotsCount: running.length,
          positionsCount: posList.length,
          totalPnl: posList.reduce((s, p) => s + parseNum(p.unrealizedProfit), 0),
        });
      }

      setBots(botsList);
      setPositions(posList);
      setLastUpdate(new Date());
    } catch {
      /* polling silencioso */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => loadStats(true), 10000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const handleStopAll = async () => {
    if (!window.confirm('Parar todos os bots?')) return;
    try {
      await stopAllBots();
      await loadStats(true);
      setFlash('Todos os bots foram parados.');
      setTimeout(() => setFlash(''), 4000);
    } catch (err: unknown) {
      setFlash(safeErrorMessage(err, 'Erro ao parar bots.'));
      setTimeout(() => setFlash(''), 4000);
    }
  };

  const { notifications, loading: proLoading } = useProTrading(
    bots.map(b => botPair(b)),
    30000,
  );

  const marginPct = realStats.availableBalance > 0
    ? Math.min(100, (stats.usedMargin / realStats.availableBalance) * 100)
    : stats.balance > 0
      ? Math.min(100, (stats.usedMargin / stats.balance) * 100)
      : 0;

  const pnlAccent = (n: number): 'cyan' | 'red' => (n >= 0 ? 'cyan' : 'red');
  const fmtSignedPnl = (n: number) => `${n >= 0 ? '+' : ''}${formatMoney(n)}`;

  const { symbol: chartSymbol, pairs, autoSymbol, selectSymbol, followAuto } = useChartSymbol(
    bots,
    positions,
  );

  if (loading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-4">
      <QuickGuide title="Painel em tempo real" steps={[
        'Saldo e P&L reais da Binance actualizados a cada 10 segundos',
        'Posições abertas directamente da exchange',
        'Gestão completa dos bots na página Robôs',
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-text1 font-bold text-lg">Painel de Controlo</h2>
          <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
            Gás: <span className="text-gold">${formatUSDT(wallet?.balance)} USDT</span>
            {lastUpdate && (
              <> · Actualizado: {lastUpdate.toLocaleTimeString('pt-PT')}</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadStats()}
          disabled={refreshing}
          className="font-mono text-[9px] uppercase px-4 py-2 border border-border2 text-text2 hover:border-cyan hover:text-cyan disabled:opacity-50"
        >
          {refreshing ? 'A actualizar...' : 'Actualizar'}
        </button>
      </div>

      {flash && (
        <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] text-cyan">{flash}</div>
      )}

      <BotToggleButton />

      <LiveTradingPanel />

      {!isConnected ? (
        <div className="bg-gold-dim border border-gold-30 p-6 text-center">
          <p className="font-mono text-[11px] text-gold mb-4">Nenhuma exchange conectada</p>
          <Link to="/exchanges"
            className="inline-block font-mono text-[9px] uppercase px-6 py-3 border border-cyan-30 bg-cyan-dim text-cyan">
            Conectar Exchange
          </Link>
          <Link to="/api-guide"
            className="inline-block font-mono text-[9px] uppercase px-6 py-3 border border-border2 text-text2 hover:border-cyan hover:text-cyan ml-2">
            Ver Guia API
          </Link>
        </div>
      ) : (
        <>
          <BotLiveStatusBar
            runningCount={stats.runningBotsCount}
            totalCount={stats.botsCount}
            lastUpdate={lastUpdate}
          />

          <ProStrategyCardsDefaults />

          <ProNotifications items={notifications} loading={proLoading} compact maxItems={4} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AnimatedStat
              label="Saldo Disponível"
              value={formatMoney(realStats.availableBalance)}
              sub={`Binance${stats.exchange ? ` · ${stats.exchange}` : ''}${stats.accountType === 'demo' ? ' · Demo' : ''}`}
              accent={pnlAccent(realStats.availableBalance)}
              delay={0}
              pulse={stats.runningBotsCount > 0}
              icon={<IconWallet size={16} />}
            />
            <AnimatedStat
              label="P&L Aberto"
              value={fmtSignedPnl(realStats.unrealizedPnL)}
              sub="Posições actuais"
              accent={pnlAccent(realStats.unrealizedPnL)}
              delay={80}
              icon={realStats.unrealizedPnL >= 0 ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />}
            />
            <AnimatedStat
              label="Resultado de Hoje"
              value={fmtSignedPnl(realStats.dailyPnL)}
              sub="Realizado + funding − comissões (24h)"
              accent={pnlAccent(realStats.dailyPnL)}
              delay={160}
              icon={realStats.dailyPnL >= 0 ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />}
            />
            <AnimatedStat
              label="Saldo Líquido Total"
              value={formatMoney(realStats.netBalance)}
              sub="Saldo + P&L aberto"
              accent={pnlAccent(realStats.netBalance)}
              delay={240}
              pulse={stats.runningBotsCount > 0}
              icon={<IconActivity size={16} />}
            />
          </div>

          <div className="bg-bg1 border border-border1 p-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <LiveChart
              symbol={chartSymbol}
              pairs={pairs}
              onSymbolChange={selectSymbol}
              autoSymbol={autoSymbol}
              onFollowAuto={followAuto}
              height={560}
              title="Gráfico"
            />
          </div>

          <div className="bg-bg1 border border-border1 p-4">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-3">Margem</h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="font-mono text-[9px] text-text3">Disponível</p>
                <p className="text-lg font-bold text-cyan">${stats.availableMargin.toFixed(2)}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-text3">Em uso</p>
                <p className="text-lg font-bold text-gold">${stats.usedMargin.toFixed(2)}</p>
              </div>
            </div>
            <div className="w-full bg-bg3 h-2">
              <div className="bg-cyan h-2 transition-all" style={{ width: `${marginPct}%` }} />
            </div>
          </div>

          {positions.length > 0 && (
            <div className="bg-bg1 border border-border1 p-4 space-y-3">
              <h3 className="text-sm font-bold text-text1">
                Posições abertas ({positions.length})
              </h3>
              {positions.map((pos, idx) => {
                const pnl = parseNum(pos.unrealizedProfit);
                const enriched = enrichPosition(
                  {
                    symbol: pos.symbol,
                    positionSide: pos.positionSide,
                    unrealizedProfit: pos.unrealizedProfit,
                  },
                  idx,
                );
                return (
                  <div
                    key={`${pos.symbol}-${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectSymbol(pos.symbol)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') selectSymbol(pos.symbol); }}
                    className="bg-bg2 border border-border1 p-4 cursor-pointer hover:border-cyan-30 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-text1">{pos.symbol}</span>
                      <span className={`font-mono text-[10px] px-2 py-0.5 border ${pnl >= 0 ? 'border-cyan-30 text-cyan' : 'border-red-30 text-red'}`}>
                        ${pnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-text2">
                      <span>Lado: <span className="text-text1">{pos.positionSide}</span></span>
                      <span>Qtd: <span className="text-text1">{pos.positionAmt}</span></span>
                      <span>Entrada: <span className="text-text1">${parseNum(pos.entryPrice).toFixed(2)}</span></span>
                      <span>Marca: <span className="text-text1">${parseNum(pos.markPrice).toFixed(2)}</span></span>
                      <span>Margem: <span className="text-text1">${parseNum(pos.initialMargin).toFixed(2)}</span></span>
                      <span>Alavancagem: <span className="text-text1">{pos.leverage}x</span></span>
                    </div>
                    <ProPositionDetails position={enriched} pnl={pnl} />
                  </div>
                );
              })}
            </div>
          )}

          {stats.runningBotsCount > 0 && (
            <button
              type="button"
              onClick={handleStopAll}
              className="w-full py-3 border border-red-30 bg-red-dim text-red font-mono text-[10px] uppercase tracking-widest"
            >
              Parar todos os bots
            </button>
          )}
        </>
      )}
    </div>
  );
}
