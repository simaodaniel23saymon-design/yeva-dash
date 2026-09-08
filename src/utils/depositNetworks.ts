/**
 * Redes de depósito (espelho do backend) — ordenadas por fee.
 */
export type DepositNetworkId =
  | 'usdtbsc'
  | 'usdttrc20'
  | 'usdtpol'
  | 'btc'
  | 'usdterc20';

export interface DepositNetworkOption {
  id: DepositNetworkId;
  label: string;
  shortLabel: string;
  estimatedFeeUsd: number;
  feeLabel: string;
  warning?: string;
  recommended: boolean;
  feePctOfAmount: number;
  feeTooHigh: boolean;
  suggestCheaper: boolean;
}

const BASE: Omit<
  DepositNetworkOption,
  'feePctOfAmount' | 'feeTooHigh' | 'suggestCheaper'
>[] = [
  {
    id: 'usdtbsc',
    label: 'USDT — BEP20 (BSC)',
    shortLabel: 'BEP20',
    estimatedFeeUsd: 0.01,
    feeLabel: '~$0.01',
    recommended: true,
  },
  {
    id: 'usdttrc20',
    label: 'USDT — TRC20 (Tron)',
    shortLabel: 'TRC20',
    estimatedFeeUsd: 1,
    feeLabel: '~$1',
    recommended: true,
  },
  {
    id: 'usdtpol',
    label: 'USDT — Polygon',
    shortLabel: 'Polygon',
    estimatedFeeUsd: 0.01,
    feeLabel: '~$0.01',
    recommended: true,
  },
  {
    id: 'btc',
    label: 'Bitcoin (BTC)',
    shortLabel: 'BTC',
    estimatedFeeUsd: 2,
    feeLabel: '~$2',
    recommended: false,
  },
  {
    id: 'usdterc20',
    label: 'USDT — ERC20 (Ethereum)',
    shortLabel: 'ERC20',
    estimatedFeeUsd: 8,
    feeLabel: '~$8–15',
    warning: 'fee alta — evite para valores < $100',
    recommended: false,
  },
];

export function listDepositNetworks(amountUsd: number): DepositNetworkOption[] {
  const amount = Math.max(0, Number(amountUsd) || 0);
  return BASE.map((n) => {
    const feePct = amount > 0 ? (n.estimatedFeeUsd / amount) * 100 : 0;
    const feeTooHigh = amount > 0 && feePct > 5;
    return {
      ...n,
      feePctOfAmount: Number(feePct.toFixed(2)),
      feeTooHigh,
      suggestCheaper: feeTooHigh || Boolean(n.warning),
    };
  });
}

export function cheapestRecommended(
  networks: DepositNetworkOption[]
): DepositNetworkOption | null {
  return networks.find((n) => n.recommended) ?? networks[0] ?? null;
}
