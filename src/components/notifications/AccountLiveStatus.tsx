import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { YevaTradeLoader } from '../YevaTradeLoader';
import { IconActivity, IconWallet, IconTrendUp, IconTrendDown } from '../ui/Icons';
import { formatMoney } from '../../utils/format';
import {
  fetchBotsList,
  fetchExchangeStats,
  fetchWalletRealStats,
  isBotRunning,
  type ExchangeStats,
  type LiveBot,
  type RealWalletStats,
} from '../../utils/liveData';
import { useWallet } from '../../hooks/useWallet';

const emptyReal: RealWalletStats = {
  availableBalance: 0,
  unrealizedPnL: 0,
  dailyPnL: 0,
  netBalance: 0,
};

const emptyExchange: ExchangeStats = {
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

interface Props {
  pollMs?: number;
  compact?: boolean;
}

export function AccountLiveStatus({ pollMs = 10000, compact = false }: Props) {
  const { wallet, formatUSDT } = useWallet(pollMs);
  const [connected, setConnected] = useState(false);
  const [realStats, setRealStats] = useState<RealWalletStats>(emptyReal);
  const [exchangeStats, setExchangeStats] = useState<ExchangeStats>(emptyExchange);
  const [runningBots, setRunningBots] = useState(0);
  const [totalBots, setTotalBots] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const statusRes = await api.get<{ connected: boolean }>('/exchange/status');
      const isOn = statusRes.data.connected;
      setConnected(isOn);

      const bots = await fetchBotsList();
      const running = bots.filter((b: LiveBot) => isBotRunning(b.status)).length;
      setRunningBots(running);
      setTotalBots(bots.length);

      if (isOn) {
        const [real, ex] = await Promise.all([fetchWalletRealStats(), fetchExchangeStats()]);
        setRealStats(real ?? emptyReal);
        setExchangeStats(ex ?? { ...emptyExchange, botsCount: bots.length, runningBotsCount: running });
      } else {
        setRealStats(emptyReal);
        setExchangeStats({ ...emptyExchange, botsCount: bots.length, runningBotsCount: running });
      }
      setLastUpdate(new Date());
    } catch {
      /* polling silencioso */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const pnlTone = (n: number) => (n >= 0 ? 'text-cyan' : 'text-red');
  const fmtSigned = (n: number) => `${n >= 0 ? '+' : ''}${formatMoney(n)}`;

  if (loading) {
    return (
      <div className="bg-bg1 border border-border1 p-6 flex justify-center">
        <YevaTradeLoader size="sm" label="A carregar estado da conta..." />
      </div>
    );
  }

  return (
    <div className="bg-bg1 border border-border1 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border1 bg-bg2/50">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 bg-cyan-dim border border-cyan-20 flex items-center justify-center text-cyan">
            <IconActivity size={18} />
            {connected && runningBots > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan" />
              </span>
            )}
          </div>
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-text1 font-bold">
              Conta ao vivo
            </h3>
            <p className="font-mono text-[8px] text-text3 uppercase tracking-wider mt-0.5">
              Actualização automática a cada {pollMs / 1000}s
              {lastUpdate && ` · ${lastUpdate.toLocaleTimeString('pt-PT')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[9px] px-2 py-1 border uppercase tracking-wider ${connected ? 'text-cyan bg-cyan-dim border-cyan-20' : 'text-gold bg-gold-dim border-gold-30'}`}>
            {connected ? '● Exchange ligada' : '○ Exchange offline'}
          </span>
          <button
            type="button"
            onClick={() => load()}
            disabled={refreshing}
            className="font-mono text-[8px] uppercase px-2 py-1 border border-border2 text-text2 hover:border-cyan hover:text-cyan disabled:opacity-50"
          >
            {refreshing ? '...' : 'Sync'}
          </button>
        </div>
      </div>

      <div className={`grid gap-px bg-border1 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <LiveMetric
          label="Gás interno"
          value={`$${formatUSDT(wallet?.balance)}`}
          sub="Carteira YevaTrade"
          icon={<IconWallet size={14} />}
          accent="gold"
        />
        <LiveMetric
          label="Saldo disponível"
          value={connected ? formatMoney(realStats.availableBalance) : '—'}
          sub={connected ? `Binance${exchangeStats.exchange ? ` · ${exchangeStats.exchange}` : ''}` : 'Liga a exchange'}
          accent="cyan"
        />
        <LiveMetric
          label="P&L aberto"
          value={connected ? fmtSigned(realStats.unrealizedPnL) : '—'}
          sub="Posições actuais"
          valueClass={connected ? pnlTone(realStats.unrealizedPnL) : 'text-text2'}
          icon={realStats.unrealizedPnL >= 0 ? <IconTrendUp size={14} /> : <IconTrendDown size={14} />}
        />
        <LiveMetric
          label="Bots activos"
          value={`${runningBots}/${totalBots}`}
          sub={exchangeStats.positionsCount > 0 ? `${exchangeStats.positionsCount} posição(ões)` : 'Sem posições abertas'}
          accent={runningBots > 0 ? 'cyan' : 'neutral'}
        />
      </div>

      {connected && !compact && (
        <div className="px-4 py-3 border-t border-border1 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[10px]">
          <div>
            <span className="text-text3 block text-[8px] uppercase tracking-wider mb-0.5">Resultado hoje</span>
            <span className={pnlTone(realStats.dailyPnL)}>{fmtSigned(realStats.dailyPnL)}</span>
          </div>
          <div>
            <span className="text-text3 block text-[8px] uppercase tracking-wider mb-0.5">Saldo líquido</span>
            <span className={pnlTone(realStats.netBalance)}>{formatMoney(realStats.netBalance)}</span>
          </div>
          <div>
            <span className="text-text3 block text-[8px] uppercase tracking-wider mb-0.5">Margem em uso</span>
            <span className="text-gold">${exchangeStats.usedMargin.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveMetric({
  label,
  value,
  sub,
  icon,
  accent = 'neutral',
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
  accent?: 'cyan' | 'gold' | 'neutral';
  valueClass?: string;
}) {
  const accentCls = accent === 'cyan' ? 'text-cyan' : accent === 'gold' ? 'text-gold' : 'text-text1';
  return (
    <div className="bg-bg1 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[8px] uppercase tracking-wider text-text3">{label}</span>
        {icon && <span className="text-text3">{icon}</span>}
      </div>
      <p className={`text-lg font-bold ${valueClass ?? accentCls}`}>{value}</p>
      <p className="font-mono text-[9px] text-text3 mt-1">{sub}</p>
    </div>
  );
}
