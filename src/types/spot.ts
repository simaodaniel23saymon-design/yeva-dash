/** Contratos de GET /api/spot/venues · /bots · /coins (contexto REAL do utilizador; sem dados Paper). */

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

/** Resumo REAL da conta. null = ainda não lido da exchange. */
export type SpotRealAccount = {
  exchange: string;
  status: 'CONNECTED' | 'NOT_CONNECTED';
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
};

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
  generatedAt: string;
  view?: 'ADMIN' | 'USER';
  coins: SpotCoin[];
};
