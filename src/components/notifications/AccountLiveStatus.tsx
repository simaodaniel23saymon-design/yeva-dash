import { IconActivity, IconTrendUp, IconTrendDown } from '../ui/Icons';
import { formatMoney } from '../../utils/format';
import type { AccountLiveStatus } from '../../utils/accountSnapshot';
import { YevaTradeLoader } from '../YevaTradeLoader';

interface Props {
  data: AccountLiveStatus;
  loading?: boolean;
  refreshing?: boolean;
  lastUpdate?: Date | null;
  onRefresh?: () => void;
}

/** Painel live — apenas dados Binance (sem gás/carteira interna) */
export function AccountLiveStatusPanel({
  data,
  loading = false,
  refreshing = false,
  lastUpdate,
  onRefresh,
}: Props) {
  const pnlTone = (n: number) => (n >= 0 ? 'text-cyan' : 'text-red');
  const fmtSigned = (n: number) => `${n >= 0 ? '+' : ''}${formatMoney(n)}`;
  const netBalance = data.liquidBalance || (data.binanceWalletBalance + data.openPnl);

  if (loading) {
    return (
      <div className="bg-bg1 border border-border1 p-6 flex justify-center">
        <YevaTradeLoader size="sm" label="A carregar estado ao vivo..." />
      </div>
    );
  }

  return (
    <div className="bg-bg1 border border-border1 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border1 bg-bg2/50">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 bg-cyan-dim border border-cyan-20 flex items-center justify-center text-cyan">
            <IconActivity size={18} />
            {data.exchangeConnected && data.activeBots > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan" />
              </span>
            )}
          </div>
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-text1 font-bold">Estado ao vivo · Binance</h3>
            <p className="font-mono text-[8px] text-text3 uppercase tracking-wider mt-0.5">
              Actualização a cada 10s
              {lastUpdate && ` · ${lastUpdate.toLocaleTimeString('pt-PT')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[9px] px-2 py-1 border uppercase tracking-wider ${data.exchangeConnected ? 'text-cyan bg-cyan-dim border-cyan-20' : 'text-gold bg-gold-dim border-gold-30'}`}>
            {data.exchangeConnected ? '● Exchange ligada' : '○ Exchange offline'}
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="font-mono text-[8px] uppercase px-2 py-1 border border-border2 text-text2 hover:border-cyan hover:text-cyan disabled:opacity-50"
            >
              {refreshing ? '...' : 'Sync'}
            </button>
          )}
        </div>
      </div>

      {data.circuitBreakerActive && (
        <div className="mx-4 mt-3 mb-1 border border-red-30 bg-red-dim px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-red font-bold">
            🛑 Circuit breaker activo
          </p>
          <p className="font-mono text-[10px] text-text2 mt-1 leading-relaxed">
            Perda diária {data.circuitBreakerLossPct.toFixed(1)}% ≥ limite{' '}
            {data.circuitBreakerLimitPct}% — sem novos ciclos DCA até 00:00 UTC.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border1">
        <Metric
          label="Saldo disponível"
          value={data.exchangeConnected ? formatMoney(data.binanceBalance) : '—'}
          sub="Binance · exchange"
          accent="cyan"
        />
        <Metric
          label="P&L aberto"
          value={data.exchangeConnected ? fmtSigned(data.openPnl) : '—'}
          sub="Posições actuais"
          valueClass={data.exchangeConnected ? pnlTone(data.openPnl) : 'text-text2'}
          icon={data.openPnl >= 0 ? <IconTrendUp size={14} /> : <IconTrendDown size={14} />}
        />
        <Metric
          label="Resultado de hoje"
          value={data.exchangeConnected ? fmtSigned(data.todayResult) : '—'}
          sub="Realizado + funding − comissões"
          valueClass={data.exchangeConnected ? pnlTone(data.todayResult) : 'text-text2'}
        />
        <Metric
          label="Saldo líquido total"
          value={data.exchangeConnected ? formatMoney(netBalance) : '—'}
          sub="Saldo + P&L aberto"
          valueClass={data.exchangeConnected ? pnlTone(netBalance) : 'text-text2'}
        />
      </div>
    </div>
  );
}

function Metric({
  label, value, sub, icon, accent = 'neutral', valueClass,
}: {
  label: string; value: string; sub: string; icon?: React.ReactNode;
  accent?: 'cyan' | 'gold' | 'neutral'; valueClass?: string;
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
