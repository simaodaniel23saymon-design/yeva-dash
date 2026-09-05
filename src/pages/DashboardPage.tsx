import { useCallback, useEffect, useState } from 'react';
import { PageLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { QuickGuide } from '../components/QuickGuide';
import { LiveChart } from '../components/LiveChart';
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

export default function DashboardPage() {
  const { data: binance, loading: binanceLoading, refreshing, error, refetch } = useBinanceData(10000);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [bots, setBots] = useState<LiveBot[]>([]);
  const [positions, setPositions] = useState<ExchangePosition[]>([]);

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
      <div className="relative overflow-hidden border border-border1 bg-bg1 px-4 py-5 sm:px-5">
        <AmbientAliveCanvas />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="eyebrow mb-1.5">Sessão activa</p>
            <h2 className="display-title text-text1 text-[22px] sm:text-2xl">Painel de Controlo</h2>
            <p className="font-mono text-[10px] text-text2 tracking-[0.08em] mt-1.5 leading-relaxed">
              Dados Binance em tempo real
              {!Number.isNaN(updatedAt.getTime()) && (
                <> · Actualizado: {updatedAt.toLocaleTimeString('pt-PT')}{refreshing ? ' · a sincronizar…' : ''}</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="font-mono text-[9px] uppercase tracking-[0.14em] px-4 py-2 border border-border2 text-text2 hover:border-cyan hover:text-cyan disabled:opacity-50"
          >
            {refreshing ? 'A actualizar...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <QuickGuide title="Painel em tempo real" steps={[
        'Saldo disponível, P&L aberto, resultado de hoje e saldo líquido (Binance)',
        'Actualização automática a cada 10 segundos',
        'Gráfico e posições abertas na exchange',
      ]} />

      <EnablePushButton />

      {error && (
        <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
          {error}
        </div>
      )}

      {!binance.exchangeConnected ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AnimatedStat
              label="Saldo Disponível"
              value={formatMoney(binance.saldoDisponivel)}
              sub="Binance · exchange"
              accent={pnlAccent(binance.saldoDisponivel)}
              delay={0}
              pulse={binance.activeBots > 0}
              icon={<IconWallet size={16} />}
            />
            <AnimatedStat
              label="P&L Aberto"
              value={fmtSignedUsd(binance.pnlAberto)}
              sub={posCount > 0 ? `${posCount} posição(ões) · Binance` : 'Posições actuais'}
              accent={pnlAccent(binance.pnlAberto)}
              delay={80}
              icon={binance.pnlAberto >= 0 ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />}
            />
            <AnimatedStat
              label="Resultado de Hoje"
              value={fmtSignedUsd(binance.resultadoHoje)}
              sub="Realizado + funding − comissões (24h)"
              accent={pnlAccent(binance.resultadoHoje)}
              delay={160}
              icon={binance.resultadoHoje >= 0 ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />}
            />
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
              drawings
            />
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Novas secções — layout existente intacto acima */}
          <DashboardExtendedSections enabled />
        </>
      )}
    </div>
  );
}
