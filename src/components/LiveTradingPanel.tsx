import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatUSDT } from '../utils/format';

interface BotStatus {
  id: string;
  symbol: string;
  status: string;
  takeProfitPercent?: number;
  stopLossPercent?: number;
}
interface StatusResp {
  wallet?: { balance: number };
  bots: BotStatus[];
  botsCount: number;
  anyRunning: boolean;
}
interface Ticker {
  symbol: string;
  price: number;
  change24h: number;
}

export function LiveTradingPanel() {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const [s, t] = await Promise.all([
          api.get<StatusResp>('/bots/status'),
          api.get<Ticker[]>('/binance/futures-ticker?symbols=BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT'),
        ]);
        if (!active) return;
        setStatus(s.data);
        setTickers(Array.isArray(t.data) ? t.data : []);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Endpoints indisponíveis — não mostrar painel partido
  if (failed && !status) return null;
  if (!status) {
    return (
      <div className="bg-bg1 border border-border1 p-6 text-center font-mono text-[10px] text-text2">
        A carregar painel em tempo real...
      </div>
    );
  }

  const bots = status.bots ?? [];
  const activeCount = bots.filter(b => b.status === 'running').length;

  return (
    <div className="space-y-3">
      {/* Saldo + estado */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-bg1 border border-cyan-20 p-4">
          <div className="font-mono text-[8px] uppercase tracking-[2px] text-text3 mb-1.5">Saldo Disponível</div>
          <div className="text-xl font-bold text-cyan">${formatUSDT(status.wallet?.balance)}</div>
        </div>
        <div className="bg-bg1 border border-border1 p-4">
          <div className="font-mono text-[8px] uppercase tracking-[2px] text-text3 mb-1.5">Bots Activos</div>
          <div className="text-xl font-bold text-text1">{activeCount}/{status.botsCount ?? bots.length}</div>
        </div>
        <div className="bg-bg1 border border-border1 p-4 col-span-2 sm:col-span-1">
          <div className="font-mono text-[8px] uppercase tracking-[2px] text-text3 mb-1.5">Estado</div>
          <div className={`text-xl font-bold ${status.anyRunning ? 'text-cyan' : 'text-text3'}`}>
            {status.anyRunning ? '● Activo' : '○ Parado'}
          </div>
        </div>
      </div>

      {/* Preços em tempo real */}
      {tickers.length > 0 && (
        <div className="bg-bg1 border border-border1 p-4">
          <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-3">Preços em Tempo Real</h3>
          <div className="grid grid-cols-2 gap-2">
            {tickers.map(t => (
              <div key={t.symbol} className="flex justify-between items-center p-2 bg-bg2 border border-border1">
                <span className="font-mono text-xs font-bold text-text1">{t.symbol.replace('USDT', '')}</span>
                <span className={`font-mono text-[10px] ${t.change24h >= 0 ? 'text-cyan' : 'text-red'}`}>
                  ${Number(t.price ?? 0).toFixed(2)} ({t.change24h >= 0 ? '+' : ''}{Number(t.change24h ?? 0).toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de bots */}
      {bots.length > 0 && (
        <div className="bg-bg1 border border-border1 p-4">
          <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-3">Os Meus Bots</h3>
          <div className="divide-y divide-border1">
            {bots.map(bot => (
              <div key={bot.id} className="flex justify-between items-center py-2.5">
                <div>
                  <p className="font-mono text-xs font-bold text-text1">{bot.symbol}</p>
                  {(bot.takeProfitPercent != null || bot.stopLossPercent != null) && (
                    <p className="font-mono text-[9px] text-text3">TP: {bot.takeProfitPercent ?? '—'}% · SL: {bot.stopLossPercent ?? '—'}%</p>
                  )}
                </div>
                <span className={`font-mono text-[8px] uppercase px-2 py-1 border ${
                  bot.status === 'running' ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text3'
                }`}>
                  {bot.status === 'running' ? '● A operar' : '○ Parado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
