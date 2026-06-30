import { formatMoney } from './format';

export interface AccountLiveStatus {
  gasBalance: number;
  binanceBalance: number;
  exchangeConnected: boolean;
  openPnl: number;
  activeBots: number;
  todayResult: number;
  dailyProfit: number;
  dailyLoss: number;
  margin: number;
}

const EMPTY: AccountLiveStatus = {
  gasBalance: 0,
  binanceBalance: 0,
  exchangeConnected: false,
  openPnl: 0,
  activeBots: 0,
  todayResult: 0,
  dailyProfit: 0,
  dailyLoss: 0,
  margin: 0,
};

function num(raw: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

/** Normaliza resposta de GET /account/live-status */
export function normalizeAccountLiveStatus(raw: Record<string, unknown>): AccountLiveStatus {
  const dailyProfit = num(raw, ['dailyProfit', 'daily_profit', 'todayProfit', 'today_profit']);
  const dailyLoss = num(raw, ['dailyLoss', 'daily_loss', 'todayLoss', 'today_loss']);
  const todayResult = num(raw, ['todayResult', 'today_result']);
  const resolvedToday = todayResult !== 0 ? todayResult : dailyProfit - dailyLoss;

  return {
    gasBalance: num(raw, ['gasBalance', 'gas_balance']),
    binanceBalance: num(raw, ['binanceBalance', 'binance_balance']),
    exchangeConnected: Boolean(raw.exchangeConnected ?? raw.exchange_connected),
    openPnl: num(raw, ['openPnl', 'open_pnl']),
    activeBots: num(raw, ['activeBots', 'active_bots']),
    todayResult: resolvedToday,
    dailyProfit,
    dailyLoss,
    margin: num(raw, ['margin', 'usedMargin', 'used_margin']),
  };
}

export function fmtSignedUsd(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatMoney(value)}`;
}

/** Texto /status do bot Telegram — dados Binance reais */
export function buildTelegramStatusText(data: AccountLiveStatus, botsLine?: string): string {
  if (!data.exchangeConnected) {
    return [
      '📊 *Estado da tua conta*',
      '',
      '○ Exchange não ligada — conecta a Binance no painel.',
      botsLine ? `\n🤖 *Bots:*\n${botsLine}` : '',
    ].filter(Boolean).join('\n');
  }

  const netBalance = data.binanceBalance + data.openPnl;

  return [
    '📊 *Estado da tua conta · Binance*',
    '',
    `💰 Saldo disponível: ${formatMoney(data.binanceBalance)}`,
    `📈 P&L aberto: ${fmtSignedUsd(data.openPnl)}`,
    `✅ Ganhos hoje: ${fmtSignedUsd(data.dailyProfit)}`,
    `❌ Perdas hoje: ${formatMoney(data.dailyLoss)}`,
    `📊 Resultado hoje: ${fmtSignedUsd(data.todayResult)}`,
    `💵 Saldo líquido: ${formatMoney(netBalance)}`,
    botsLine ? `\n🤖 *Bots (${data.activeBots} activo(s)):*\n${botsLine}` : '',
  ].filter(Boolean).join('\n');
}

export { EMPTY as EMPTY_ACCOUNT_LIVE_STATUS };
