import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { BotToggleButton } from '../components/BotToggleButton';
import { LiveTradingPanel } from '../components/LiveTradingPanel';
import { LiveChart } from '../components/LiveChart';
import { useChartSymbol } from '../hooks/useChartSymbol';
import { AnimatedStat } from '../components/AnimatedStat';
import { useWallet } from '../hooks/useWallet';
import {
  fetchBotsList,
  fetchExchangePositions,
  fetchExchangeStats,
  stopAllBots,
  isBotRunning,
  botPair,
  parseNum,
  safeErrorMessage,
  type ExchangeStats,
  type ExchangePosition,
  type LiveBot,
} from '../utils/liveData';

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
        setBots([]);
        setPositions([]);
        return;
      }

      const [statsData, botsList, posList] = await Promise.all([
        fetchExchangeStats(),
        fetchBotsList(),
        fetchExchangePositions(),
      ]);

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

  const marginPct = stats.balance > 0 ? Math.min(100, (stats.usedMargin / stats.balance) * 100) : 0;

  const { symbol: chartSymbol, pairs, autoSymbol, selectSymbol, followAuto } = useChartSymbol(
    bots,
    positions,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <QuickGuide title="Painel em tempo real" steps={[
        'Saldo e margem actualizados a cada 10 segundos',
        'Posições abertas e P&L directamente da exchange',
        'Controlo rápido dos bots activos',
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AnimatedStat
              label="Saldo disponível"
              value={`$${stats.balance.toFixed(2)}`}
              sub={`${stats.accountType === 'demo' ? 'Demo' : 'Real'}${stats.exchange ? ` · ${stats.exchange}` : ''}`}
              accent="cyan"
              delay={0}
              pulse={stats.runningBotsCount > 0}
            />
            <AnimatedStat
              label="P&L aberto"
              value={`$${stats.totalPnl.toFixed(2)}`}
              accent={stats.totalPnl >= 0 ? 'cyan' : 'red'}
              delay={80}
            />
            <AnimatedStat
              label="Bots activos"
              value={`${stats.runningBotsCount}/${stats.botsCount}`}
              accent="default"
              delay={160}
              pulse={stats.runningBotsCount > 0}
            />
          </div>

          <div className="bg-bg1 border border-border1 p-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <LiveChart
              symbol={chartSymbol}
              pairs={pairs}
              onSymbolChange={selectSymbol}
              autoSymbol={autoSymbol}
              onFollowAuto={followAuto}
              height={420}
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
                  </div>
                );
              })}
            </div>
          )}

          {bots.length > 0 && (
            <div className="bg-bg1 border border-border1 p-4 space-y-3">
              <h3 className="text-sm font-bold text-text1">Os teus bots</h3>
              {bots.map(bot => (
                <div key={bot.id} className="bg-bg2 border border-border1 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-bold text-text1">{botPair(bot)}</span>
                      {bot.market && (
                        <span className="ml-2 font-mono text-[8px] uppercase text-text3">{bot.market}</span>
                      )}
                    </div>
                    <span className={`font-mono text-[8px] uppercase px-2 py-0.5 border ${
                      isBotRunning(bot.status) ? 'border-cyan-30 text-cyan' : 'border-border2 text-text3'
                    }`}>
                      {isBotRunning(bot.status) ? 'A operar' : 'Parado'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-text2">
                    <span>Alavancagem: <span className="text-text1">{bot.leverage ?? '—'}x</span></span>
                    <span>Capital: <span className="text-text1">${bot.capitalPerSide ?? '—'}</span></span>
                    <span>TP diário: <span className="text-text1">{bot.tpDailyPct ?? '—'}%</span></span>
                    <span>Stop: <span className="text-text1">{bot.maxLossPct ?? '—'}%</span></span>
                  </div>
                </div>
              ))}
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
