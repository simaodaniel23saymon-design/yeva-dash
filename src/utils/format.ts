// Valores monetários podem vir em USDT directo (17) ou micro-unidades (17000000).
export const USDT_UNIT = 1_000_000;

/** Detecta se o valor parece estar em micro-unidades (inteiros >= 1 USDT em micro). */
export function isMicroUnits(value: number | null | undefined): boolean {
  const v = value ?? 0;
  return v !== 0 && Number.isInteger(v) && Math.abs(v) >= USDT_UNIT;
}

/** Converte para USDT numérico, independentemente da unidade de origem. */
export function toUSDT(value: number | null | undefined): number {
  const v = value ?? 0;
  return isMicroUnits(v) ? v / USDT_UNIT : v;
}

/** Formata como string USDT com 2 casas decimais. */
export function formatUSDT(value: number | null | undefined): string {
  return toUSDT(value).toFixed(2);
}

/** Converte USDT introduzido pelo utilizador para a unidade usada na wallet de referência. */
export function toWalletUnits(usdt: number, referenceBalance?: number | null): number {
  if (isMicroUnits(referenceBalance)) {
    return Math.round(usdt * USDT_UNIT);
  }
  return usdt;
}

/** @deprecated Usar toWalletUnits — mantido por compatibilidade. */
export function toMicroUnits(usdt: number): number {
  return Math.round(usdt * USDT_UNIT);
}

/** Formata com prefixo $ para exibição. */
export function formatMoney(value: number | null | undefined): string {
  const n = toUSDT(value);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
