import { Link } from 'react-router-dom';
import { PageLoader } from '../components/YevaTradeLoader';
import SpotCoinRow from '../components/spot/SpotCoinRow';
import { useSpot } from '../hooks/useSpot';
import { BALANCE_UNAVAILABLE, accountFacts, executionLabel, fmtUsd } from '../utils/spotView';
import { useAuth } from '../context/AuthContext';
import { canAccessSpotPaper } from '../utils/access';

function when(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const selectClass =
  'w-full bg-bg2 border border-border2 text-text1 px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan-30';

function TopFact({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-2 min-w-0" data-testid={testId}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text3">{label}</p>
      {children}
    </div>
  );
}

export default function SpotPage() {
  const { user } = useAuth();
  const isAdmin = canAccessSpotPaper(user);
  const { venues, bots, exchange, setExchange, bot, setBot, coins, loading, error, pending, toggle } = useSpot();

  if (loading && !coins && venues.length === 0) return <PageLoader />;

  const spotVenues = venues.filter((v) => v.spotAvailable);
  const selectableBots = bots.filter((b) => b.selectable && b.exchanges.includes(exchange));
  const otherBots = bots.filter((b) => !b.selectable);
  const botDef = bots.find((b) => b.id === bot) ?? null;
  const live = coins?.liveEnabled ?? false;
  const execution = coins?.execution ?? botDef?.execution;
  const account = coins?.account ?? null;
  const connected = account?.status === 'CONNECTED';
  const list = coins?.coins ?? [];
  const activeCount = list.filter((c) => c.enabled).length;
  const openCount = list.filter((c) => c.position).length;
  const toggleDisabled = coins ? !coins.preferencesAvailable : true;

  return (
    <div className="space-y-6 mb-12">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan mb-2" data-testid="spot-mode-banner">
          Spot · {executionLabel(execution, live)}
        </p>
        <h2 className="text-text1 font-bold text-[28px] leading-tight">Spot</h2>
        <p className="text-text2 mt-2 max-w-2xl">
          Escolhe a exchange, o bot e as moedas. ON/OFF ativa a moeda para esta estratégia: não compra, não vende e não fecha posições.
          {execution === 'PILOT' ? ' Execução real só em piloto controlado.' : ' Trading ainda não está disponível.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3" data-testid="spot-top-bar">
        <TopFact label="Exchange">
          <select id="spot-exchange" aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value)} className={selectClass}>
            {spotVenues.length === 0 && <option value={exchange}>{exchange}</option>}
            {spotVenues.map((v) => (
              <option key={v.exchange} value={v.exchange}>{v.name}</option>
            ))}
          </select>
        </TopFact>

        <TopFact label="Bot">
          <select id="spot-bot" aria-label="Bot" value={bot} onChange={(e) => setBot(e.target.value)} className={selectClass}>
            {selectableBots.length === 0 && <option value={bot}>{bot}</option>}
            {selectableBots.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </TopFact>

        <TopFact label="Conta" testId="spot-account-status">
          <p className={`flex items-center gap-2 text-sm ${connected ? 'text-cyan' : 'text-text2'}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-cyan' : 'bg-text3'}`} />
            {account ? (connected ? 'Conectada' : 'Não conectada') : 'Dados indisponíveis'}
          </p>
          {account && !connected && (
            <Link to="/exchanges" className="text-cyan text-[12px] hover:underline">Conectar exchange</Link>
          )}
        </TopFact>

        <TopFact label="Saldo Spot" testId="spot-balance">
          <p className="text-text1 font-mono text-sm">
            {connected && account?.balanceUsdt != null ? fmtUsd(account.balanceUsdt) : connected ? BALANCE_UNAVAILABLE : 'Não disponível'}
          </p>
        </TopFact>

        <TopFact label="Execução" testId="spot-execution-status">
          <p className="text-text1 text-sm">{executionLabel(execution, live)}</p>
        </TopFact>
      </div>

      {account && connected && (
        <section className="bg-bg1 border border-border1 rounded-[18px] p-4" data-testid="spot-real-account">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-2">Conta Spot · {account.exchange}</p>
          <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-3 gap-y-2 text-[12px]">
            {accountFacts(account, execution, live).map(([k, v]) => (
              <div key={k}>
                <dt className="text-text3">{k}</dt>
                <dd className="text-text1 font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {error && <p className="text-text2 text-sm">{error}</p>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-between">
          <h3 className="text-text1 font-semibold">Moedas</h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3">
            {activeCount} ON · {openCount} com posição · mercado {coins?.rankingFresh ? when(coins.rankingScannedAt) : 'sem leitura recente'}
            {coins?.marketStale ? ' · preços antigos' : ''}
          </p>
        </div>
        {coins && !coins.preferencesAvailable && (
          <p className="text-text2 text-[12px]">As preferências ainda não estão disponíveis. Por agora só podes ver as moedas.</p>
        )}
        {list.length === 0 ? (
          <p className="p-6 text-text2 bg-bg1 border border-border1 rounded-[18px]">{coins ? 'Sem oportunidade no momento' : 'Dados indisponíveis'}</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((c) => (
              <SpotCoinRow key={c.symbol} coin={c} pending={Boolean(pending[c.symbol])} disabled={toggleDisabled} showDiagnostics={isAdmin} onToggle={toggle} />
            ))}
          </ul>
        )}
        <p className="text-text3 text-[11px]">
          Quatro estados separados: Preferência (ON/OFF), Estratégia, Posição (a tua conta na exchange) e Execução.
          ON não significa compra; OFF não significa venda.
        </p>
        {otherBots.map((b) => (
          <p key={b.id} className="text-text3 text-[11px]">
            {b.name}: {b.note} <Link to="/bots" className="text-cyan hover:underline">Bots</Link>
          </p>
        ))}
      </section>
    </div>
  );
}
