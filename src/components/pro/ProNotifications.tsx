import type { ProNotification, ProNotificationType } from '../../types/trading';

const META: Record<ProNotificationType, { icon: string; color: string }> = {
  trend_detected: { icon: '📈', color: 'border-pro-green/30 bg-pro-green/10 text-pro-green' },
  against_trend: { icon: '⚠️', color: 'border-pro-yellow/30 bg-pro-yellow/10 text-pro-yellow' },
  trailing_stop: { icon: '🛡️', color: 'border-pro-blue/30 bg-pro-blue/10 text-pro-blue' },
  ranging_market: { icon: '⏸️', color: 'border-pro-yellow/30 bg-gold-dim text-gold' },
  low_liquidity: { icon: '💧', color: 'border-pro-red/30 bg-red-dim text-red' },
};

interface Props {
  items: ProNotification[];
  loading?: boolean;
  compact?: boolean;
  maxItems?: number;
}

export function ProNotifications({ items, loading, compact = false, maxItems = 8 }: Props) {
  const list = items.slice(0, maxItems);

  if (loading) {
    return (
      <div className="bg-bg1 border border-border1 p-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className={`bg-bg1 border border-border1 ${compact ? 'p-3' : 'p-5'} font-mono text-[11px] text-text3 text-center`}>
        Sem alertas PRO recentes
      </div>
    );
  }

  return (
    <div className={`bg-bg1 border border-border1 ${compact ? 'p-3 space-y-2' : 'p-4 space-y-2'}`}>
      {!compact && (
        <h3 className="text-sm font-bold text-text1 mb-1">Alertas PRO</h3>
      )}
      {list.map(n => {
        const meta = META[n.type] ?? META.trend_detected;
        return (
          <div key={n.id} className={`flex items-start gap-2.5 border p-2.5 ${meta.color}`}>
            <span className="text-base shrink-0">{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide">{n.title}</p>
              <p className="font-mono text-[10px] text-text2 mt-0.5 leading-relaxed">{n.message}</p>
              {n.pair && (
                <p className="font-mono text-[9px] text-text3 mt-1">{n.pair}</p>
              )}
            </div>
            <span className="font-mono text-[8px] text-text3 shrink-0">
              {new Date(n.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const DEMO_PRO_NOTIFICATIONS: ProNotification[] = [
  {
    id: '1',
    type: 'trend_detected',
    title: 'Tendência Detectada',
    message: 'Bot entrou em operação após confirmação multi-timeframe.',
    pair: 'BTCUSDT',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'trailing_stop',
    title: 'Trailing Stop Activado',
    message: 'Lucro protegido com trailing stop de 1%.',
    pair: 'ETHUSDT',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];
