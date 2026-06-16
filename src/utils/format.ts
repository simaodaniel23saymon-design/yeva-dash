// Saldo/valores monetários da BD em micro-unidades (6 decimais): 1 USDT = 1.000.000
export const USDT_UNIT = 1_000_000;

/** Converte micro-unidades em string USDT com 2 casas decimais (ex.: 17000000 → "17.00"). */
export function formatUSDT(microUnits: number | null | undefined): string {
  return ((microUnits || 0) / USDT_UNIT).toFixed(2);
}

/** Converte micro-unidades em número USDT (ex.: 17000000 → 17). */
export function toUSDT(microUnits: number | null | undefined): number {
  return (microUnits || 0) / USDT_UNIT;
}

/** Converte USDT em micro-unidades para enviar ao backend (ex.: 17 → 17000000). */
export function toMicroUnits(usdt: number): number {
  return Math.round(usdt * USDT_UNIT);
}
