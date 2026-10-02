/** Contratos de GET /api/spot/venues · /bots · /coins (contexto REAL do utilizador; sem dados Paper). */

export type SpotVenueStatus = 'CONNECTED' | 'AVAILABLE' | 'NOT_CONNECTED' | 'COMING_SOON' | 'NOT_SUPPORTED';

export type SpotVenue = {
  exchange: string;
  name: string;
  type: 'CEX' | 'DEX';
  markets: Array<'SPOT' | 'PERP'>;
  auth: 'API_KEY' | 'WALLET';
  status: SpotVenueStatus;
  accountConnected: boolean;
  marketDataAvailable: boolean;
  spotAvailable: boolean;
  tradingAvailable: boolean;
  liveEnabled: boolean;
  note: string;
};

export type SpotExecutionStatus = 'LIVE' | 'DISABLED';

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

export type SpotCoinStrategyState = 'WATCHING' | 'OUTSIDE_RANKING' | 'UNKNOWN';
export type SpotCoinDisplayState = 'OFF' | 'ON' | Exclude<SpotCoinStrategyState, 'UNKNOWN'>;

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
  balanceUsdt: number | null;
  unrealizedPnl: number | null;
  realizedPnl: number | null;
  roiPct: number | null;
  dataSource: 'NONE';
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
  execution: SpotExecutionStatus;
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
  coins: SpotCoin[];
};
