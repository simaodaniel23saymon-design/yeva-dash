/** Contratos de GET /api/spot/venues · /bots · /coins. */

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

export type SpotBot = {
  id: string;
  name: string;
  market: 'SPOT';
  mode: 'PAPER' | 'REAL';
  selectable: boolean;
  exchanges: string[];
  note: string;
};

export type SpotCoinStrategyState = 'WATCHING' | 'POSITION_OPEN' | 'OUTSIDE_RANKING' | 'INVALIDATED' | 'EXITED' | 'UNKNOWN';
export type SpotCoinDisplayState = 'OFF' | 'ON' | Exclude<SpotCoinStrategyState, 'UNKNOWN'>;

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
  position: null | {
    cycleId: string;
    status: string;
    openedAt: string | null;
    capitalUsed: number | null;
    paperPnl: number | null;
    returnPct: number | null;
    entries: number | null;
  };
  lastExit: null | { closedAt: string; paperPnl: number | null; reason: string | null };
  lastDecision: null | { decision: string; reason: string; at: string };
};

export type SpotCoinsResponse = {
  exchange: string;
  bot: string;
  mode: 'PAPER' | 'REAL';
  orderExecution: false;
  liveEnabled: boolean;
  paperScope: 'GLOBAL';
  preferencesAvailable: boolean;
  rankingScannedAt: string | null;
  rankingFresh: boolean;
  marketScannedAt: string | null;
  marketStale: boolean;
  generatedAt: string;
  coins: SpotCoin[];
};
