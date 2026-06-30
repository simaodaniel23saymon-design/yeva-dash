import { useCallback, useEffect, useState } from 'react';
import { PageLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { QuickGuide } from '../components/QuickGuide';
import { LiveChart } from '../components/LiveChart';
import { useChartSymbol } from '../hooks/useChartSymbol';
import { ProStrategyCardsDefaults } from '../components/pro/ProStrategyCards';
import { ProPositionDetails } from '../components/pro/ProPositionDetails';
import { enrichPosition } from '../utils/proTrading';
import { useAccountLiveStatus } from '../hooks/useAccountLiveStatus';
import { AccountLiveStatusPanel } from '../components/notifications/AccountLiveStatus';
import {
  fetchBotsList,
  fetchExchangePositions,
  parseNum,
  type ExchangePosition,
  type LiveBot,
} from '../utils/liveData';

export default function DashboardPage() {
  const { data: live, loading: liveLoading, refreshing, lastUpdate, refresh } = useAccountLiveStatus(10000);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [bots, setBots] = useState<LiveBot[]>([]);
  const [positions, setPositions] = useState<ExchangePosition[]>([]);

  const loadChartData = useCallback(async () => {
    if (!live.exchangeConnected) {
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
  }, [live.exchangeConnected]);

  useEffect(() => {
    loadChartData();
    if (!live.exchangeConnected) return;
    const id = setInterval(loadChartData, 10000);
    return () => clearInterval(id);
  }, [loadChartData, live.exchangeConnected]);

  const { symbol: chartSymbol, pairs, autoSymbol, selectSymbol, followAuto } = useChartSymbol(
    bots,
    positions,
  );

  const handleRefresh = () => {
    refresh();
    loadChartData();
  };

  if (liveLoading && positionsLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-4">
      <QuickGuide title="Painel em tempo real" steps={[
        'Saldo disponível, P&L aberto, resultado de hoje e saldo líquido (Binance)',
        'Actualização automática a cada 10 segundos',
        'Gráfico e posições abertas na exchange',
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-text1 font-bold text-lg">Painel de Controlo</h2>
          <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">
            Dados Binance em tempo real
            {lastUpdate && (
              <> · Actualizado: {lastUpdate.toLocaleTimeString('pt-PT')}</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="font-mono text-[9px] uppercase px-4 py-2 border border-border2 text-text2 hover:border-cyan hover:text-cyan disabled:opacity-50"
        >
          {refreshing ? 'A actualizar...' : 'Actualizar'}
        </button>
      </div>

      <AccountLiveStatusPanel
        data={live}
        loading={liveLoading}
        refreshing={refreshing}
        lastUpdate={lastUpdate}
        onRefresh={handleRefresh}
      />

      {!live.exchangeConnected ? (
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
          <ProStrategyCardsDefaults />

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
                    </div>
                    <ProPositionDetails position={enriched} pnl={pnl} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
