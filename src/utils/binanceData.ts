import { formatMoney } from './format';

export interface BinanceData {
  saldoTotal: number;
  saldoDisponivel: number;
  pnlAberto: number;
  resultadoHoje: number;
  posicoesAbertas: number;
  saldoLiquido: number;
  exchangeConnected: boolean;
  activeBots: number;
  atualizadoEm: string;
}

export const EMPTY_BINANCE_DATA: BinanceData = {
  saldoTotal: 0,
  saldoDisponivel: 0,
  pnlAberto: 0,
  resultadoHoje: 0,
  posicoesAbertas: 0,
  saldoLiquido: 0,
  exchangeConnected: false,
  activeBots: 0,
  atualizadoEm: new Date().toISOString(),
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

/** Normaliza GET /account/live-status para valores reais da Binance Futures */
export function normalizeBinanceData(raw: Record<string, unknown>): BinanceData {
  const saldoDisponivel = num(raw, [
    'binanceAvailableBalance', 'binance_available_balance',
    'availableBalance', 'available_balance',
    'binanceBalance', 'binance_balance',
  ]);

  const saldoTotal = num(raw, [
    'binanceWalletBalance', 'binance_wallet_balance',
    'totalWalletBalance', 'total_wallet_balance',
    'walletBalance', 'wallet_balance',
  ]) || saldoDisponivel;

  const pnlAberto = num(raw, [
    'openPnl', 'open_pnl',
    'totalUnrealizedProfit', 'total_unrealized_profit',
    'unrealizedPnL', 'unrealizedPnl', 'unrealized_pnl',
  ]);

  const saldoLiquidoRaw = num(raw, [
    'liquidBalance', 'liquid_balance',
    'totalMarginBalance', 'total_margin_balance',
  ]);
  const saldoLiquido = saldoLiquidoRaw || (saldoTotal + pnlAberto) || (saldoDisponivel + pnlAberto);

  const resultadoHoje = num(raw, ['todayResult', 'today_result']);

  return {
    saldoTotal,
    saldoDisponivel,
    pnlAberto,
    resultadoHoje,
    posicoesAbertas: num(raw, ['openPositionsCount', 'open_positions_count']),
    saldoLiquido,
    exchangeConnected: Boolean(raw.exchangeConnected ?? raw.exchange_connected),
    activeBots: num(raw, ['activeBots', 'active_bots']),
    atualizadoEm: String(raw.updatedAt ?? raw.updated_at ?? new Date().toISOString()),
  };
}

export function fmtSignedUsd(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatMoney(value)}`;
}
