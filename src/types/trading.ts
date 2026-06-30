export type TrendDirection = 'UP' | 'DOWN';
export type MarketStatus = 'ranging' | 'trending';

export interface BotConfig {
  maxLongPositions?: number;
  maxShortPositions?: number;
  gridSpacing?: number;
  tpDailyPct?: number;
  maxLossPct?: number;
  trailingStopEnabled?: boolean;
  trailingStopActivation?: number;
  trailingStopCallback?: number;
  timeframes?: string[];
  requireAllTimeframes?: boolean;
  minLiquidity?: number;
}

export interface Position {
  symbol?: string;
  positionSide?: string;
  positionAmt?: string | number;
  entryPrice?: string | number;
  markPrice?: string | number;
  unrealizedProfit?: string | number;
  gridPosition?: number;
  gridMax?: number;
  trailingStopActive?: boolean;
  trailingStopProfit?: number;
  marketTrend?: TrendDirection;
}

export interface MarketAnalysis {
  pair: string;
  status: MarketStatus;
  timeframes: {
    h1: TrendDirection;
    h4: TrendDirection;
    d1: TrendDirection;
  };
  confirmed: boolean;
  liquidity24h: number;
  adx: number;
  slope: number;
  trendStrength: number;
}

export interface BotProStats {
  gridLongUsed: number;
  gridLongMax: number;
  gridShortUsed: number;
  gridShortMax: number;
  trailingActivations: number;
  trailingProtected: number;
  mtfSignalsConfirmed: number;
  mtfAccuracyPct: number;
  liquidityPairsIgnored: number;
  liquidityAvgVolume: number;
}

export type ProNotificationType =
  | 'trend_detected'
  | 'against_trend'
  | 'trailing_stop'
  | 'ranging_market'
  | 'low_liquidity';

export interface ProNotification {
  id: string;
  type: ProNotificationType;
  title: string;
  message: string;
  pair?: string;
  createdAt: string;
  read?: boolean;
}

export const DEFAULT_PRO_CONFIG: Required<BotConfig> = {
  maxLongPositions: 15,
  maxShortPositions: 15,
  gridSpacing: 0.8,
  tpDailyPct: 1.5,
  maxLossPct: 3.0,
  trailingStopEnabled: true,
  trailingStopActivation: 1.0,
  trailingStopCallback: 0.5,
  timeframes: ['1h', '4h', '1d'],
  requireAllTimeframes: true,
  minLiquidity: 500_000,
};
