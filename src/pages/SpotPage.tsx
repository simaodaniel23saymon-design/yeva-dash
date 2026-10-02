import { Link } from 'react-router-dom';
import { PageLoader } from '../components/YevaTradeLoader';
import ExchangeList from '../components/spot/ExchangeList';
import SpotCoinRow from '../components/spot/SpotCoinRow';
import { useSpot } from '../hooks/useSpot';
import { modeLabel, venueFacts } from '../utils/spotView';

function when(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const selectClass =
  'w-full bg-bg2 border border-border2 text-text1 px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan-30';

export default function SpotPage() {
  const { venues, bots, exchange, setExchange, bot, setBot, coins, loading, error, pending, toggle } = useSpot();

  if (loading && !coins && venues.length === 0) return <PageLoader />;

  const spotVenues = venues.filter((v) => v.spotAvailable);
  const venue = venues.find((v) => v.exchange === exchange) ?? null;
  const selectableBots = bots.filter((b) => b.selectable && b.exchanges.includes(exchange));
  const otherBots = bots.filter((b) => !b.selectable);
  const botDef = bots.find((b) => b.id === bot) ?? null;
  const live = coins?.liveEnabled ?? false;
  const list = coins?.coins ?? [];
  const activeCount = list.filter((c) => c.enabled).length;
  const openCount = list.filter((c) => c.position).length;
  const toggleDisabled = coins ? !coins.preferencesAvailable : true;

  return (
    <div className="space-y-6 mb-12">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan mb-2" data-testid="spot-mode-banner">
          Spot · {modeLabel(coins?.mode ?? botDef?.mode ?? 'PAPER', live)} · sem ordens reais
        </p>
        <h2 className="text-text1 font-bold text-[28px] leading-tight">Spot</h2>
        <p className="text-text2 mt-2 max-w-2xl">
          Escolhe a exchange, o bot e as moedas. ON/OFF guarda só a tua preferência para este bot. Não compra, não vende e não fecha posições.
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_1fr_1.4fr] gap-3">
        <div className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-2">
          <label htmlFor="spot-exchange" className="font-mono text-[10px] uppercase tracking-wider text-text3">Exchange</label>
          <select id="spot-exchange" value={exchange} onChange={(e) => setExchange(e.target.value)} className={selectClass}>
            {spotVenues.length === 0 && <option value={exchange}>{exchange}</option>}
            {spotVenues.map((v) => (
              <option key={v.exchange} value={v.exchange}>{v.name}</option>
            ))}
          </select>
          <p className="text-text3 text-[11px]">Só aparecem exchanges com bots Spot.</p>
        </div>

        <div className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-2">
          <label htmlFor="spot-bot" className="font-mono text-[10px] uppercase tracking-wider text-text3">Bot</label>
          <select id="spot-bot" value={bot} onChange={(e) => setBot(e.target.value)} className={selectClass}>
            {selectableBots.length === 0 && <option value={bot}>{bot}</option>}
            {selectableBots.map((b) => (
              <option key={b.id} value={b.id}>{b.name} · {b.mode === 'PAPER' ? 'PAPER' : 'LIVE'}</option>
            ))}
          </select>
          {otherBots.map((b) => (
            <p key={b.id} className="text-text3 text-[11px]">
              {b.name}: {b.note} <Link to="/bots" className="text-cyan hover:underline">Bots</Link>
            </p>
          ))}
          <p className="text-text3 text-[11px]">Os bots Futures estão em Bots.</p>
        </div>

        <div className="bg-bg1 border border-border1 rounded-[18px] p-4" data-testid="spot-venue-facts">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-2">
            {venue ? `${venue.name} · ${venue.type}` : 'Exchange'}
          </p>
          {venue ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
              {venueFacts(venue).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-text3">{k}</dt>
                  <dd className="text-text1 font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-text3 text-sm">A ler…</p>
          )}
        </div>
      </div>

      {error && <p className="text-red text-sm">{error}</p>}

      <section className="bg-bg1 border border-border1 rounded-[22px] overflow-hidden">
        <div className="px-5 py-4 border-b border-border1 flex flex-wrap items-center gap-x-4 gap-y-1 justify-between">
          <h3 className="text-text1 font-semibold">Moedas</h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3">
            {activeCount} ON · {openCount} com posição paper · ranking {coins?.rankingFresh ? when(coins.rankingScannedAt) : 'sem leitura recente'}
            {coins?.marketStale ? ' · preços antigos' : ''}
          </p>
        </div>
        {coins && !coins.preferencesAvailable && (
          <p className="px-5 py-3 border-b border-border1 text-gold text-[12px]">
            As preferências ainda não estão ativas no servidor. Por agora só podes ver as moedas.
          </p>
        )}
        {list.length === 0 ? (
          <p className="p-6 text-text2">Sem moedas para mostrar.</p>
        ) : (
          <ul>
            {list.map((c) => (
              <SpotCoinRow key={c.symbol} coin={c} pending={Boolean(pending[c.symbol])} disabled={toggleDisabled} onToggle={toggle} />
            ))}
          </ul>
        )}
        <p className="px-5 py-3 border-t border-border1 text-text3 text-[11px]">
          O Spot Paper é uma simulação partilhada: as posições e o PnL vêm do runtime paper e a tua preferência ainda não o altera.
          Preço e variação 24h vêm do Market Radar. <Link to="/spot-paper" className="text-cyan hover:underline">Detalhe do Spot Paper</Link>
        </p>
      </section>

      <ExchangeList venues={venues} />
    </div>
  );
}
