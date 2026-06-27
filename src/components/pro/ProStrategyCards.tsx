import type { BotConfig } from '../../types/trading';
import { DEFAULT_PRO_CONFIG, mergeProConfig } from '../../utils/proTrading';

interface Props {
  config?: BotConfig;
}

const cards = (c: Required<BotConfig>) => [
  {
    title: 'Grid Trading',
    value: `${c.maxLongPositions} Long + ${c.maxShortPositions} Short`,
    sub: `Spacing: ${c.gridSpacing}%`,
    accent: 'border-cyan-20 bg-cyan-dim',
    icon: '▦',
  },
  {
    title: 'Trailing Stop',
    value: c.trailingStopEnabled ? 'ACTIVO' : 'INACTIVO',
    sub: `Protecção: ${c.trailingStopActivation}%`,
    accent: 'border-pro-blue/30 bg-pro-blue/10',
    icon: '🛡️',
  },
  {
    title: 'Multi-Timeframe',
    value: c.timeframes.join(' + '),
    sub: c.requireAllTimeframes ? 'Confirmação exigida' : 'Confirmação parcial',
    accent: 'border-gold-30 bg-gold-dim',
    icon: '📊',
  },
  {
    title: 'Filtro Liquidez',
    value: `$${(c.minLiquidity / 1000).toFixed(0)}k volume 24h`,
    sub: 'Mínimo exigido',
    accent: 'border-border1 bg-bg2',
    icon: '💧',
  },
];

export function ProStrategyCards({ config }: Props) {
  const c = mergeProConfig(config);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-text1">Estratégia PRO</h3>
        <span className="font-mono text-[8px] uppercase tracking-widest text-cyan border border-cyan-20 px-2 py-0.5">
          Hedge Pro
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards(c).map((card, i) => (
          <div
            key={card.title}
            className={`border p-4 animate-fade-in-up ${card.accent}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-base leading-none">{card.icon}</span>
              <p className="font-mono text-[9px] uppercase tracking-wider text-text2">{card.title}</p>
            </div>
            <p className="font-bold text-text1 text-sm leading-snug">{card.value}</p>
            <p className="font-mono text-[9px] text-text3 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProStrategyCardsDefaults() {
  return <ProStrategyCards config={DEFAULT_PRO_CONFIG} />;
}
