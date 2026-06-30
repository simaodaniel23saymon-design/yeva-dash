import type { BotConfig } from '../../types/trading';
import type { LiveBot } from '../../utils/liveData';
import { useActiveBotConfig } from '../../hooks/useActiveBotConfig';
import { YevaTradeLoader } from '../YevaTradeLoader';

interface Props {
  config?: BotConfig | null;
  bot?: LiveBot | null;
  longCount?: number;
  shortCount?: number;
}

function cardsFromBot(bot: LiveBot, longCount: number, shortCount: number) {
  const orders = bot.ordersPerSide ?? '—';
  const spacing = bot.spacing != null ? `${bot.spacing}%` : '—';
  const trailing = bot.trailingStopEnabled === false
    ? 'Desactivado'
    : `Activo · ${bot.trailingStopActivation ?? 1}% / recuo ${bot.trailingStopCallback ?? 0.5}%`;
  return [
    {
      title: 'Grid Trading',
      value: `${orders} ordens/lado`,
      sub: `Long ${longCount} · Short ${shortCount} abertas`,
      accent: 'border-cyan-20 bg-cyan-dim',
      icon: '▦',
    },
    {
      title: 'Spacing',
      value: spacing,
      sub: `${bot.pair ?? bot.symbol ?? 'Bot'} · ${bot.market ?? 'FUTURES'}`,
      accent: 'border-pro-blue/30 bg-pro-blue/10',
      icon: '📐',
    },
    {
      title: 'Alavancagem',
      value: bot.leverage != null ? `${bot.leverage}x` : '—',
      sub: `Capital $${bot.capitalPerSide ?? '—'}/lado`,
      accent: 'border-gold-30 bg-gold-dim',
      icon: '⚡',
    },
    {
      title: 'Risco',
      value: `TP ${bot.tpDailyPct ?? '—'}%`,
      sub: `SL max ${bot.maxLossPct ?? '—'}% · Trailing: ${trailing}`,
      accent: 'border-border1 bg-bg2',
      icon: '🎯',
    },
  ];
}

export function ProStrategyCards({ config: _config, bot, longCount = 0, shortCount = 0 }: Props) {
  if (!bot) {
    return (
      <div className="bg-bg1 border border-border1 p-6 text-center font-mono text-[11px] text-text2">
        Sem bots activos — configuração real aparece quando houver bots a operar.
      </div>
    );
  }

  const items = cardsFromBot(bot, longCount, shortCount);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-bold text-text1">Estratégia do Bot</h3>
        <span className="font-mono text-[9px] uppercase tracking-widest text-cyan border border-cyan-20 px-2 py-0.5">
          {String(bot.status).toLowerCase() === 'running' ? 'Activo' : bot.status}
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((card, i) => (
          <div
            key={card.title}
            className={`border p-4 animate-fade-in-up ${card.accent}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg leading-none">{card.icon}</span>
              <p className="font-mono text-[10px] uppercase tracking-wider text-text2">{card.title}</p>
            </div>
            <p className="font-bold text-text1 text-base leading-snug">{card.value}</p>
            <p className="font-mono text-[10px] text-text3 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cards com dados reais do bot activo (polling) */
export function ProStrategyCardsLive() {
  const { bot, longCount, shortCount, loading } = useActiveBotConfig(15000);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <YevaTradeLoader size="sm" label="A carregar estratégia..." />
      </div>
    );
  }

  return <ProStrategyCards bot={bot} longCount={longCount} shortCount={shortCount} />;
}
