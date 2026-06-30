import { formatMoney } from './format';

export interface BinanceData {
  /** totalWalletBalance — saldo USDT na carteira futures */
  saldoTotal: number;
  /** availableBalance — livre para novas ordens */
  saldoDisponivel: number;
  pnlAberto: number;
  resultadoHoje: number;
  posicoesAbertas: number;
  /** totalMarginBalance — saldo principal na app Binance (carteira + P&L aberto) */
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
    if (v !== undefined && v !== null && v !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

/** Normaliza GET /account/live-status — espelha campos da Binance Futures API */
export function normalizeBinanceData(raw: Record<string, unknown>): BinanceData {
  const saldoDisponivel = num(raw, [
    'binanceAvailableBalance', 'binance_available_balance',
    'availableBalance', 'available_balance',
  ]) || num(raw, ['binanceBalance', 'binance_balance']);

  const saldoTotal = num(raw, [
    'binanceWalletBalance', 'binance_wallet_balance',
    'totalWalletBalance', 'total_wallet_balance',
  ]);

  const pnlAberto = num(raw, [
    'openPnl', 'open_pnl',
    'totalUnrealizedProfit', 'total_unrealized_profit',
    'unrealizedPnL', 'unrealizedPnl', 'unrealized_pnl',
  ]);

  const saldoLiquido = num(raw, [
    'liquidBalance', 'liquid_balance',
    'totalMarginBalance', 'total_margin_balance',
  ]);

  const resolvedSaldoTotal = saldoTotal || (saldoLiquido - pnlAberto) || saldoDisponivel;
  const resolvedSaldoLiquido = saldoLiquido
    || (resolvedSaldoTotal !== 0 ? resolvedSaldoTotal + pnlAberto : 0);

  return {
    saldoTotal: resolvedSaldoTotal,
    saldoDisponivel,
    pnlAberto,
    resultadoHoje: num(raw, ['todayResult', 'today_result']),
    posicoesAbertas: num(raw, ['openPositionsCount', 'open_positions_count']),
    saldoLiquido: resolvedSaldoLiquido,
    exchangeConnected: Boolean(raw.exchangeConnected ?? raw.exchange_connected),
    activeBots: num(raw, ['activeBots', 'active_bots']),
    atualizadoEm: String(raw.updatedAt ?? raw.updated_at ?? new Date().toISOString()),
  };
}

export function fmtSignedUsd(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatMoney(value)}`;
}
