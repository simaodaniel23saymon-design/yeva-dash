import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { QuickGuide } from '../components/QuickGuide';
import { LiveChart } from '../components/LiveChart';
import { OpenPositionCards } from '../components/OpenPositionCards';
import { useChartSymbol } from '../hooks/useChartSymbol';
import { AnimatedStat } from '../components/AnimatedStat';
import { IconWallet, IconTrendUp, IconTrendDown, IconActivity } from '../components/ui/Icons';
import { ProStrategyCardsLive } from '../components/pro/ProStrategyCards';
import { formatMoney } from '../utils/format';
import { fmtSignedUsd } from '../utils/binanceData';
import { useBinanceData } from '../hooks/useBinanceData';
import {
  fetchBotsList,
  fetchExchangePositions,
  parseNum,
  type ExchangePosition,
  type LiveBot,
} from '../utils/liveData';
import { DashboardExtendedSections } from '../components/dashboard/DashboardExtendedSections';
import { EnablePushButton } from '../components/notifications/EnablePushButton';
import { AmbientAliveCanvas } from '../components/SystemAliveBoot';
import { useDashboardExtended } from '../hooks/useDashboardExtended';
import { isBreakevenSl, type PositionOverlay } from '../utils/chartOverlays';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: binance, loading: binanceLoading, refreshing, error, refetch } = useBinanceData(10000);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [bots, setBots] = useState<LiveBot[]>([]);
  const [positions, setPositions] = useState<ExchangePosition[]>([]);
  const { data: extended } = useDashboardExtended(binance.exchangeConnected, '24h', 15000);

  const loadChartData = useCallback(async () => {
    if (!binance.exchangeConnected) {
      setBots([]);
      setPositions([]);
      setPositionsLoading(false);
      return;
    }
    try {
      const [botsList, posList] = await Promise.all([
        fetchBotsList(),
        fetchExchangePositions(),
      ]);
      setBots(botsList);
      setPositions(posList);
    } catch {
      /* silencioso */
    } finally {
      setPositionsLoading(false);
    }
  }, [binance.exchangeConnected]);

  useEffect(() => {
    loadChartData();
    if (!binance.exchangeConnected) return;

    const syncPositions = () => {
      void loadChartData();
    };

    const intervalId = window.setInterval(syncPositions, 10000);
    const onResume = () => {
      if (!document.hidden) syncPositions();
    };

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [loadChartData, binance.exchangeConnected]);

  const { symbol: chartSymbol, pairs, autoSymbol, selectSymbol, followAuto } = useChartSymbol(
    bots,
    positions,
  );

  const overlays: PositionOverlay[] = useMemo(() => {
    const bySym = new Map<string, PositionOverlay>();
    for (const bot of extended.bots) {
      const c = bot.dcaCycle;
      if (!c || !(c.avgEntry > 0)) continue;
      const sym = bot.symbol.toUpperCase();
      bySym.set(sym, {
        symbol: sym,
        side: c.side === 'SHORT' ? 'SHORT' : 'LONG',
        qty: c.totalQty,
        entry: c.avgEntry,
        tp: c.tpPrice,
        sl: c.slPrice,
        slIsBe: isBreakevenSl(
          c.side === 'SHORT' ? 'SHORT' : 'LONG',
          c.avgEntry,
          c.slPrice,
        ),
        safetyFilled: c.safetyFilled,
        maxSafetyOrders: c.maxSafetyOrders,
      });
    }
    for (const pos of positions) {
      const amt = Math.abs(parseNum(pos.positionAmt));
      if (!(amt > 0)) continue;
      const sym = pos.symbol.toUpperCase();
      const entry = parseNum(pos.entryPrice);
      const side = String(pos.positionSide || 'LONG').toUpperCase();
      const existing = bySym.get(sym);
      bySym.set(sym, {
        symbol: sym,
        side,
        qty: amt,
        entry: existing?.entry || entry,
        tp: existing?.tp ?? null,
        sl: existing?.sl ?? null,
        slIsBe: existing?.slIsBe,
        uPnl: parseNum(pos.unrealizedProfit),
        safetyFilled: existing?.safetyFilled,
        maxSafetyOrders: existing?.maxSafetyOrders,
      });
    }
    return [...bySym.values()];
  }, [extended.bots, positions]);

  const handleRefresh = () => {
    refetch();
    loadChartData();
  };

  const pnlAccent = (n: number): 'cyan' | 'red' => (n >= 0 ? 'cyan' : 'red');
  const posCount = binance.posicoesAbertas || positions.length;
  const updatedAt = new Date(binance.atualizadoEm);

  if (binanceLoading && positionsLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-4 relative">
      <div className="dashboard-panel rounded-[28px] px-4 py-5 sm:px-5">
        {!window.matchMedia('(max-width: 768px), (pointer: coarse)').matches && (
          <AmbientAliveCanvas />
        )}
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_14px_rgba(0,212,160,0.8)]" />
              <p className="eyebrow mb-0 text-[10px] tracking-[0.22em] text-cyan">Sessão activa</p>
            </div>
            <h2 className="display-title text-text1 text-[22px] sm:text-2xl">Painel de Controlo</h2>
            <p className="font-mono text-[10px] text-text2 tracking-[0.08em] mt-1.5 leading-relaxed">
              Actualizado {updatedAt.toLocaleTimeString('pt-PT')} · exchange em tempo real
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="font-mono text-[9px] uppercase tracking-[0.14em] px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:shadow-[0_0_18px_rgba(0,212,160,0.18)] disabled:opacity-50"
          >
            {refreshing ? 'A actualizar...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <QuickGuide
        title="Painel em tempo real"
        steps={[
          'Gráfico lightweight-charts com klines Binance (REST + WebSocket) e linhas ENTRY (amarelo), TP (verde), SL (vermelho)',
          'Card por posição: par, lado, qty, entry, TP, SL, uPnL, idade e safeties',
          'Na Binance: Futures → Positions (posição) e Open Orders → Algo Orders (TP/SL condicionais). Filtra por símbolo.',
          'Notificações: formato «ENTRY x · TP y · SL z (BE)»',
        ]}
      />

      <EnablePushButton />

      {error && (
        <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
          {error}
        </div>
      )}

      {!binance.exchangeConnected ? (
        <div className="bg-gold-dim border border-gold-30 p-6 text-center">
          <p className="font-mono text-[11px] text-gold mb-4">Nenhuma exchange conectada</p>
          <Link
            to="/exchanges"
            className="inline-block font-mono text-[9px] uppercase px-6 py-3 border border-cyan-30 bg-cyan-dim text-cyan"
          >
            Conectar Exchange
          </Link>
          <Link
            to="/api-guide"
            className="inline-block font-mono text-[9px] uppercase px-6 py-3 border border-border2 text-text2 hover:border-cyan hover:text-cyan ml-2"
          >
            Ver Guia API
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="dashboard-kpi rounded-[22px] p-3">
              <AnimatedStat
                label="Saldo Disponível"
                value={formatMoney(binance.saldoDisponivel)}
                sub="Binance · exchange"
                accent={pnlAccent(binance.saldoDisponivel)}
                delay={0}
                pulse={binance.activeBots > 0}
                icon={<IconWallet size={16} />}
              />
            </div>
            <div className="dashboard-kpi rounded-[22px] p-3">
              <AnimatedStat
                label="P&L Aberto"
                value={fmtSignedUsd(binance.pnlAberto)}
                sub={posCount > 0 ? `${posCount} posição(ões) · Binance` : 'Posições actuais'}
                accent={pnlAccent(binance.pnlAberto)}
                delay={80}
                pulse={binance.activeBots > 0}
                icon={binance.pnlAberto >= 0 ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />}
              />
            </div>
            <div className="dashboard-kpi rounded-[22px] p-3">
              <AnimatedStat
                label="Resultado Hoje"
                value={fmtSignedUsd(binance.resultadoHoje)}
                sub="Realizado · Binance"
                accent={pnlAccent(binance.resultadoHoje)}
                delay={160}
                pulse={binance.activeBots > 0}
                icon={binance.resultadoHoje >= 0 ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />}
              />
            </div>
            <div className="dashboard-kpi rounded-[22px] p-3">
              <AnimatedStat
                label="Saldo Líquido Total"
                value={formatMoney(binance.saldoLiquido)}
                sub="Saldo de margem · Binance"
                accent={pnlAccent(binance.saldoLiquido)}
                delay={240}
                pulse={binance.activeBots > 0}
                icon={<IconActivity size={16} />}
              />
            </div>
          </div>

          <ProStrategyCardsLive />

          <div className="bg-bg1 border border-border1 p-4 animate-fade-in-up">
            <LiveChart
              symbol={chartSymbol}
              pairs={pairs}
              onSymbolChange={selectSymbol}
              autoSymbol={autoSymbol}
              onFollowAuto={followAuto}
              height={560}
              title="Gráfico"
              overlays={overlays}
            />
          </div>

          <OpenPositionCards
            positions={overlays}
            selectedSymbol={chartSymbol}
            onSelect={selectSymbol}
          />

          <DashboardExtendedSections
            enabled
            showLogs={!!user?.isAdmin}
            onSelectSymbol={selectSymbol}
          />
        </>
      )}
    </div>
  );
}

