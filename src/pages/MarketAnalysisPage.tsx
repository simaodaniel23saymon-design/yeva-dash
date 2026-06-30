import { useEffect, useMemo, useState } from 'react';
import { YevaTradeLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { QuickGuide } from '../components/QuickGuide';
import { MarketStatusCard } from '../components/pro/MarketStatusCard';
import { useProTrading } from '../hooks/useProTrading';
import { fetchBotsList, botPair } from '../utils/liveData';

export default function MarketAnalysisPage() {
  const [pairs, setPairs] = useState<string[]>([]);

  useEffect(() => {
    fetchBotsList().then(bots => {
      const list = [...new Set(bots.map(b => botPair(b)).filter(Boolean))];
      setPairs(list);
    });
  }, []);

  const { marketAnalysis, loading } = useProTrading(pairs);

  const sorted = useMemo(
    () => [...marketAnalysis].sort((a, b) => a.pair.localeCompare(b.pair)),
    [marketAnalysis],
  );

  return (
    <div className="space-y-4">
      <QuickGuide title="Análise de mercado PRO" steps={[
        'Multi-timeframe: 1h + 4h + 1d com confirmação exigida',
        'Mercado lateralizado pausa entradas até haver tendência',
        'Liquidez mínima de $500k volume 24h',
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-text1 font-bold text-lg">Análise de Mercado</h2>
          <p className="font-mono text-[10px] text-text2 uppercase tracking-wider mt-0.5">
            Estratégia PRO · Multi-timeframe + liquidez
          </p>
        </div>
        <Link to="/bot-stats"
          className="font-mono text-[9px] uppercase px-4 py-2 border border-cyan-30 text-cyan">
          Ver Estatísticas
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <YevaTradeLoader size="md" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-bg1 border border-border1 p-10 text-center font-mono text-[11px] text-text2">
          {pairs.length === 0
            ? 'Sem bots configurados — cria um bot para analisar os pares.'
            : 'Análise de mercado indisponível — endpoint PRO ainda sem dados.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map(a => (
            <MarketStatusCard key={a.pair} analysis={a} />
          ))}
        </div>
      )}
    </div>
  );
}
