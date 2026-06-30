import type { EmailAlertBlock } from '../templates/emailLayout';
import type { AccountLiveStatus } from './accountSnapshot';
import { fmtSignedUsd } from './accountSnapshot';
import { formatMoney } from './format';

/** Métricas reais para preview de notificações admin */
export function buildNotifyMetricsFromStatus(data: AccountLiveStatus): EmailAlertBlock[] {
  return [
    {
      label: 'Saldo Binance',
      value: formatMoney(data.liquidBalance || data.binanceWalletBalance),
      tone: 'cyan',
    },
    {
      label: 'P&L aberto',
      value: fmtSignedUsd(data.openPnl),
      tone: data.openPnl >= 0 ? 'cyan' : 'red',
    },
    {
      label: 'Ganhos hoje',
      value: fmtSignedUsd(data.dailyProfit),
      tone: 'cyan',
    },
    {
      label: 'Perdas hoje',
      value: formatMoney(data.dailyLoss),
      tone: 'red',
    },
    {
      label: 'Resultado hoje',
      value: fmtSignedUsd(data.todayResult),
      tone: data.todayResult >= 0 ? 'cyan' : 'red',
    },
  ];
}
