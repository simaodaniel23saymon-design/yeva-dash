/** Contratos de /api/spot/* e /api/market/movers (contexto REAL do utilizador; sem dados Paper). */

export type SpotVenueStatus = 'CONNECTED' | 'AVAILABLE' | 'NOT_CONNECTED' | 'COMING_SOON' | 'NOT_SUPPORTED';

export type VenueMarketState = { status: SpotVenueStatus; trading: 'LIVE' | 'DISABLED' | 'BOTS' };
export type VenueAction = 'MANAGE' | 'CONNECT' | 'LEARN' | 'DISABLED';

/** Entrada do catálogo único de exchanges (backend é a fonte de verdade). */
export type SpotVenue = {
  exchange: string;
  name: string;
  type: 'CEX' | 'DEX';
  markets: Array<'SPOT' | 'FUTURES' | 'PERP'>;
  auth: 'API_KEY' | 'WALLET';
  status: SpotVenueStatus;
  accountConnected: boolean;
  marketDataAvailable: boolean;
  spotAvailable: boolean;
  tradingAvailable: boolean;
  liveEnabled: boolean;
  note: string;
  availability: string;
  spot: VenueMarketState | null;
  futures: VenueMarketState | null;
  action: VenueAction;
  connection: { method: 'API_KEY' | 'WALLET'; fields: string[]; steps: string[]; requirements: string[] };
  flow: string[];
};

export type SecurityLayerInfo = {
  name: string;
  role: 'SECURITY_LAYER';
  status: 'COMING_SOON';
  cexFlow: string[];
  dexFlow: string[];
};

export type SpotVenuesResponse = { liveEnabled: boolean; venues: SpotVenue[]; securityLayer?: SecurityLayerInfo };

export type SpotExecutionStatus = 'LIVE' | 'PILOT' | 'DISABLED';

/** Estado do último intent REAL do piloto para a moeda. */
export type SpotCoinExecutionState =
  | 'PENDING'
  | 'SUBMITTING'
  | 'UNKNOWN'
  | 'SUBMITTED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REQUIRES_RECONCILIATION'
  | 'SETTLED';

export type SpotAccountSpotState = 'READY' | 'PILOT' | 'DISABLED';
export type SpotAccountFuturesState = 'ENABLED' | 'AVAILABLE' | 'UNKNOWN';

export type SpotBot = {
  id: string;
  name: string;
  market: 'SPOT';
  mode: 'REAL';
  execution: SpotExecutionStatus;
  selectable: boolean;
  exchanges: string[];
  note: string;
};

export type SpotCoinStrategyState = 'OPPORTUNITY' | 'WATCHING' | 'NO_SIGNAL' | 'OUTSIDE_RANKING' | 'UNKNOWN';
export type SpotCoinDisplayState = 'OFF' | 'ON' | Exclude<SpotCoinStrategyState, 'UNKNOWN'>;
export type SpotCoinPositionState = 'NO_POSITION' | 'OPEN' | 'CLOSING' | 'CLOSED';
export type SpotCoinExecutionPhase = 'DISABLED' | 'READY' | 'BLOCKED' | 'EXECUTING' | 'EXECUTED';

/** Posição REAL na exchange do utilizador, já calculada pelo backend. */
export type SpotRealPosition = {
  quantity: number;
  entryPrice: number | null;
  currentPrice: number | null;
  unrealizedPnl: number | null;
  realizedPnl: number | null;
  roiPct: number | null;
  updatedAt: string;
};

/** Estado dos dados da conta (backend). ZERO_BALANCE = leitura OK com 0 USDT; DATA_UNAVAILABLE = leitura falhou. */
export type AccountDataState = 'NOT_CONNECTED' | 'CONNECTED' | 'DATA_UNAVAILABLE' | 'DATA_STALE' | 'ZERO_BALANCE';
export type AccountTradingState = 'TRADING_AVAILABLE' | 'TRADING_DISABLED';

/** Resumo REAL da conta. null = ainda não lido da exchange. */
export type SpotRealAccount = {
  exchange: string;
  status: 'CONNECTED' | 'NOT_CONNECTED';
  dataState?: AccountDataState;
  tradingState?: AccountTradingState;
  fetchedAt?: string | null;
  /** Spot e Futures separados: "Binance connected" não implica "Spot enabled". */
  spotState: SpotAccountSpotState;
  futuresState: SpotAccountFuturesState;
  balanceUsdt: number | null;
  availableUsdt: number | null;
  unrealizedPnl: number | null;
  realizedPnl: number | null;
  roiPct: number | null;
  dataSource: 'NONE' | 'BINANCE_SPOT';
};

export type SpotCoin = {
  symbol: string;
  base: string;
  price: number | null;
  change24hPct: number | null;
  score: number | null;
  rank: number | null;
  enabled: boolean;
  strategyState: SpotCoinStrategyState;
  displayState: SpotCoinDisplayState;
  position: SpotRealPosition | null;
  positionState: SpotCoinPositionState;
  execution: SpotExecutionStatus;
  executionPhase: SpotCoinExecutionPhase;
  /** Estado interno do intent — só vem preenchido para admin. */
  executionState: SpotCoinExecutionState | null;
  sources?: SpotCoinSource[];
  /** Config guardada para a moeda; null = ainda não configurada. */
  config?: SpotBotConfig | null;
  /** DRAFT = guardada mas incompleta (não pode ser ligada) · READY_TO_ACTIVATE = completa. */
  configState?: BotConfigState | null;
  /** Só nos resultados da pesquisa (catálogo de símbolos da exchange). */
  baseAsset?: string;
  quoteAsset?: string;
  market?: 'SPOT';
  status?: string;
};

export type BotConfigState = 'DRAFT' | 'READY_TO_ACTIVATE';

export type SpotCoinSource = 'TOP_WINNER' | 'MY_COIN' | 'SEARCH' | 'WATCHLIST';

/** Top Winners (ranking existente) e moedas do utilizador. UPDATING = sem scan recente. */
export type SpotDiscovery = {
  marketState: 'FRESH' | 'UPDATING';
  updatedAt: string | null;
  topWinners: string[];
  myCoins: string[];
};

export type SpotSearchResponse = {
  query: string;
  orderExecution: false;
  catalog: { status: 'OK' | 'STALE'; fetchedAt: string | null; size: number };
  results: SpotCoin[];
};

/** Catálogo de bots (GET /spot/bots → catalog). Só AVAILABLE é configurável. */
export type BotCatalogStatus = 'AVAILABLE' | 'COMING_SOON' | 'NOT_SUPPORTED' | 'DISABLED';
export type BotCatalogEntry = {
  id: string;
  name: string;
  market: 'SPOT' | 'FUTURES';
  status: BotCatalogStatus;
  configurable: 'HERE' | 'BOTS_PAGE' | null;
  execution: 'LIVE' | 'DISABLED' | 'BOTS';
  exchanges: string[];
  note: string;
};

export type ReentryCondition = 'NEW_SIGNAL' | 'PULLBACK';

/** Configuração por moeda. null = não configurado. Valores em USDT e %. */
export type SpotBotConfig = {
  capitalTotalUsdt: number | null;
  entryCapitalUsdt: number | null;
  reserveUsdt: number | null;
  maxPerCoinUsdt: number | null;
  maxEntries: number | null;
  stopLossPct: number | null;
  trailingStopPct: number | null;
  takeProfitPct: number | null;
  trailingActivationPct: number | null;
  trailingGivebackPct: number | null;
  reentryEnabled: boolean;
  reentryCondition: ReentryCondition | null;
  reentryCooldownMin: number | null;
};

export type SpotStrategyDefaults = {
  source: 'SPOT_ROTATION_CONFIG';
  initialAllocationPct: number;
  reservePct: number;
  maxEntries: number;
  takeProfitPct: number | null;
  trailingActivationPct: number | null;
  trailingGivebackPct: number | null;
  stopLossPct: null;
  minEntryUsdt: number;
  trailingSupported: boolean;
};

export type BotConfigError = { field: keyof SpotBotConfig; code: string };

export type BotRiskPreview = {
  capitalUsdt: number | null;
  initialEntryUsdt: number | null;
  reserveUsdt: number | null;
  maxExposureUsdt: number | null;
  maxEntries: number | null;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  trailingStopPct: number | null;
  trailingActivationPct: number | null;
  trailingGivebackPct: number | null;
  reentryEnabled: boolean;
  reentryCondition: ReentryCondition | null;
  reentryCooldownMin: number | null;
  maxLossAtStopUsdt: number | null;
};

/** REAL = conta do utilizador (exige proteção de perda) · PAPER = laboratório do admin. */
export type BotConfigContext = 'REAL' | 'PAPER';

export type BotConfigResponse = {
  exchange: string;
  bot: string;
  symbol: string;
  context?: BotConfigContext;
  enabled: boolean;
  configured: boolean;
  configState?: BotConfigState;
  activationErrors?: BotConfigError[];
  config: SpotBotConfig;
  defaults: SpotBotConfig;
  strategyDefaults: SpotStrategyDefaults;
  preview: BotRiskPreview;
  orderExecution: false;
};

export type BotPreviewResponse = {
  context?: BotConfigContext;
  valid: boolean;
  configState?: BotConfigState;
  /** true = pode ser guardada como rascunho (sem valores incoerentes). */
  draftValid?: boolean;
  errors: BotConfigError[];
  config: SpotBotConfig;
  preview: BotRiskPreview;
  orderExecution: false;
};

/** Top Winners / Losers Futures (GET /market/movers). */
export type FuturesMover = {
  symbol: string;
  base: string;
  price: number;
  change24hPct: number;
  quoteVolume24h: number | null;
  opportunityState: 'SIGNAL' | 'MONITORED';
};
export type FuturesMoversResponse = { market: 'FUTURES'; scannedAt: string | null; stale: boolean; winners: FuturesMover[]; losers: FuturesMover[] };
export type FuturesSearchResponse = { market: 'FUTURES'; query: string; scannedAt: string | null; stale: boolean; results: FuturesMover[] };

export type SpotCoinsResponse = {
  exchange: string;
  bot: string;
  mode: 'REAL';
  execution: SpotExecutionStatus;
  orderExecution: false;
  liveEnabled: boolean;
  account: SpotRealAccount;
  preferencesAvailable: boolean;
  rankingScannedAt: string | null;
  rankingFresh: boolean;
  marketScannedAt: string | null;
  marketStale: boolean;
  discovery?: SpotDiscovery;
  generatedAt: string;
  view?: 'ADMIN' | 'USER';
  coins: SpotCoin[];
};
