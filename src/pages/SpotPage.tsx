import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLoader } from '../components/YevaTradeLoader';
import SpotCoinRow from '../components/spot/SpotCoinRow';
import BotConfigPanel from '../components/spot/BotConfigPanel';
import { useSpot, type SpotTab } from '../hooks/useSpot';
import { accountFacts, executionLabel } from '../utils/spotView';
import { DATA_STATE_TEXT, EMPTY_TEXT, SPOT_TRADING_TEXT, balanceText, fmtWhen, spotAccountState, spotTradingState } from '../utils/dataStates';
import { BOT_STATUS_LABEL, botOptionLabel, botStatusTone, isSelectableHere } from '../utils/botConfigView';
import { spotMarketUpdating, spotMyCoins, spotTopWinnerCoins } from '../utils/marketDiscovery';
import { useAuth } from '../context/AuthContext';
import { canAccessSpotPaper } from '../utils/access';
import type { SpotCoin } from '../types/spot';

const selectClass =
  'w-full bg-bg2 border border-border2 text-text1 px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan-30';

const actionClass = 'mt-2 font-mono text-[11px] uppercase tracking-wider px-4 py-2 border border-cyan-30 text-cyan hover:bg-cyan-dim';

const TABS: Array<{ id: SpotTab; label: string }> = [
  { id: 'TOP_WINNERS', label: 'Top Winners' },
  { id: 'MY_COINS', label: 'Minhas moedas' },
  { id: 'SEARCH', label: 'Pesquisar' },
];

function TopFact({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="bg-bg1 border border-border1 rounded-[18px] p-4 space-y-2 min-w-0" data-testid={testId}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-text3">{label}</p>
      {children}
    </div>
  );
}

function Empty({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <div className="p-6 text-text2 bg-bg1 border border-border1 rounded-[18px] space-y-1" data-testid={testId}>
      {children}
    </div>
  );
}

export default function SpotPage() {
  const { user } = useAuth();
  const isAdmin = canAccessSpotPaper(user);
  const s = useSpot();
  const { venues, catalog, exchange, setExchange, bot, setBot, coins, loading, error, pending } = s;
  const [tab, setTab] = useState<SpotTab>('TOP_WINNERS');
  const [query, setQuery] = useState('');
  const [configuring, setConfiguring] = useState<SpotCoin | null>(null);

  if (loading && !coins && venues.length === 0) return <PageLoader />;

  const spotVenues = venues.filter((v) => v.markets.includes('SPOT'));
  const spotBots = catalog.filter((b) => b.market === 'SPOT');
  const botDef = catalog.find((b) => b.id === bot) ?? null;
  const live = coins?.liveEnabled ?? false;
  const execution = coins?.execution;
  const account = coins?.account ?? null;
  const accountState = spotAccountState(account, loading);
  const connected = account?.status === 'CONNECTED';
  const actionsDisabled = coins ? !coins.preferencesAvailable : true;

  const winners = spotTopWinnerCoins(coins);
  const mine = spotMyCoins(coins);
  const updating = spotMarketUpdating(coins);
  const list = tab === 'TOP_WINNERS' ? winners : tab === 'MY_COINS' ? mine : s.searchResults ?? [];

  const row = (c: SpotCoin) => (
    <SpotCoinRow
      key={c.symbol}
      coin={c}
      botName={botDef?.name ?? bot}
      pending={Boolean(pending[c.symbol])}
      disabled={actionsDisabled}
      showDiagnostics={isAdmin}
      onConfigure={setConfiguring}
      onDeactivate={(sym) => void s.deactivate(sym)}
    />
  );

  return (
    <div className="space-y-6 mb-12">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan mb-2" data-testid="spot-mode-banner">
          Spot · {execution === 'PILOT' ? executionLabel(execution, live) : SPOT_TRADING_TEXT[spotTradingState(account)]}
        </p>
        <h2 className="text-text1 font-bold text-[28px] leading-tight">Spot</h2>
        <p className="text-text2 mt-2 max-w-2xl">
          Escolhe a exchange, o bot e as moedas. ATIVAR guarda a configuração do bot para a moeda: não compra, não vende e não fecha posições.
          {execution === 'PILOT' ? ' Execução real só em piloto controlado.' : ` ${SPOT_TRADING_TEXT[spotTradingState(account)]}`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3" data-testid="spot-top-bar">
        <TopFact label="Exchange">
          <select id="spot-exchange" aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value)} className={selectClass}>
            {spotVenues.length === 0 && <option value={exchange}>{exchange}</option>}
            {spotVenues.map((v) => (
              <option key={v.exchange} value={v.exchange} disabled={!v.spotAvailable}>
                {v.name}{v.spotAvailable ? '' : v.status === 'COMING_SOON' ? ' · em breve' : ' · não suportado'}
              </option>
            ))}
          </select>
        </TopFact>

        <TopFact label="Bot">
          <select id="spot-bot" aria-label="Bot" value={bot} onChange={(e) => setBot(e.target.value)} className={selectClass} data-testid="spot-bot-select">
            {spotBots.length === 0 && <option value={bot}>{bot}</option>}
            {spotBots.map((b) => (
              <option key={b.id} value={b.id} disabled={!isSelectableHere(b)}>{botOptionLabel(b)}</option>
            ))}
          </select>
          {botDef && <p className="text-text3 text-[11px]">{botDef.note}</p>}
        </TopFact>

        <TopFact label="Conta" testId="spot-account-status">
          <p className={`flex items-center gap-2 text-sm ${connected ? 'text-cyan' : 'text-text2'}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-cyan' : 'bg-text3'}`} />
            {accountState === 'DATA_LOADING' ? DATA_STATE_TEXT.DATA_LOADING : connected ? 'Conectada' : 'Não conectada'}
          </p>
          {accountState === 'NOT_CONNECTED' && (
            <Link to="/exchanges" className="text-cyan text-[12px] hover:underline">Conectar exchange</Link>
          )}
        </TopFact>

        <TopFact label="Saldo Spot" testId="spot-balance">
          <p className="text-text1 font-mono text-sm" data-testid="spot-balance-value" data-state={accountState}>
            {balanceText(accountState, account?.balanceUsdt ?? null)}
          </p>
          {accountState === 'DATA_STALE' && <p className="text-text3 text-[11px]">{DATA_STATE_TEXT.DATA_STALE} · {fmtWhen(account?.fetchedAt)}</p>}
        </TopFact>

        <TopFact label="Execução" testId="spot-execution-status">
          <p className="text-text1 text-sm" data-state={spotTradingState(account)}>
            {execution === 'PILOT' ? executionLabel(execution, live) : SPOT_TRADING_TEXT[spotTradingState(account)]}
          </p>
        </TopFact>
      </div>

      {spotBots.length > 0 && (
        <ul className="flex flex-wrap gap-2" data-testid="spot-bot-catalog">
          {spotBots.map((b) => (
            <li key={b.id} className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-1 ${botStatusTone(b.status)}`}>
              {b.name} · {BOT_STATUS_LABEL[b.status]}
              {b.status === 'AVAILABLE' && b.configurable === 'BOTS_PAGE' && (
                <Link to="/bots" className="ml-1 text-cyan hover:underline normal-case">Bots</Link>
              )}
            </li>
          ))}
        </ul>
      )}

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
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Fontes de moedas" data-testid="spot-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`font-mono text-[11px] uppercase tracking-wider border px-3 py-1.5 ${tab === t.id ? 'border-cyan-30 text-cyan bg-cyan-dim' : 'border-border2 text-text3 hover:text-text1'}`}
              data-testid={`spot-tab-${t.id}`}
            >
              {t.label}
              {t.id === 'TOP_WINNERS' && winners.length > 0 ? ` · ${winners.length}` : ''}
              {t.id === 'MY_COINS' && mine.length > 0 ? ` · ${mine.length}` : ''}
            </button>
          ))}
          <p className="ml-auto font-mono text-[10px] uppercase tracking-wider text-text3">
            {mine.filter((c) => c.enabled).length} ativas · {mine.filter((c) => c.position).length} com posição
          </p>
        </div>

        {coins && !coins.preferencesAvailable && (
          <p className="text-text2 text-[12px]">As preferências ainda não estão disponíveis. Por agora só podes ver as moedas.</p>
        )}

        {tab === 'SEARCH' && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void s.search(query);
            }}
            data-testid="spot-search"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Símbolo (ex.: BTC)"
              aria-label="Pesquisar moeda"
              maxLength={24}
              className={selectClass}
            />
            <button type="submit" disabled={s.searching} className="font-mono text-[11px] uppercase tracking-wider px-4 py-2 border border-cyan-30 text-cyan disabled:opacity-40">
              Pesquisar
            </button>
          </form>
        )}

        {!coins ? (
          <Empty>{loading ? EMPTY_TEXT.UPDATING : EMPTY_TEXT.DATA_ERROR}</Empty>
        ) : tab === 'TOP_WINNERS' && (updating || winners.length === 0) ? (
          <Empty testId="spot-market-updating">
            <p className="text-text1">{updating ? EMPTY_TEXT.MARKET_UPDATING : EMPTY_TEXT.NO_OPPORTUNITY}</p>
            <p className="text-text3 text-[12px]">{EMPTY_TEXT.LAST_SCAN}: {fmtWhen(coins.discovery?.updatedAt ?? coins.rankingScannedAt)}</p>
            <button type="button" onClick={() => void s.reload()} className={actionClass} data-testid="spot-winners-refresh">
              Atualizar
            </button>
          </Empty>
        ) : tab === 'MY_COINS' && mine.length === 0 ? (
          <Empty testId="spot-my-coins-empty">
            <p className="text-text1">{EMPTY_TEXT.MY_COINS_EMPTY}</p>
            <button type="button" onClick={() => setTab('SEARCH')} className={actionClass} data-testid="spot-my-coins-search">
              Pesquisar moeda
            </button>
          </Empty>
        ) : tab === 'SEARCH' && s.searchResults == null ? (
          <Empty>Pesquisa qualquer moeda Spot (par USDT) disponível na exchange.</Empty>
        ) : list.length === 0 ? (
          <Empty testId="spot-search-empty">{EMPTY_TEXT.SEARCH_EMPTY}</Empty>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{list.map(row)}</ul>
        )}

        {tab === 'TOP_WINNERS' && !updating && coins?.discovery?.updatedAt && (
          <p className="text-text3 text-[11px]">Ranking de mercado · {fmtWhen(coins.discovery.updatedAt)}{coins.marketStale ? ' · preços antigos' : ''}</p>
        )}
        <p className="text-text3 text-[11px]">
          Estados separados: Preferência (ON/OFF), Estratégia, Posição (a tua conta na exchange) e Execução. ATIVAR não significa compra; DESATIVAR não significa venda.
        </p>
      </section>

      {configuring && (
        <BotConfigPanel
          symbol={configuring.symbol}
          base={configuring.base}
          botName={botDef?.name ?? bot}
          loadConfig={s.loadConfig}
          previewConfig={s.previewConfig}
          activate={s.activate}
          saveDraft={s.saveDraft}
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  );
}
