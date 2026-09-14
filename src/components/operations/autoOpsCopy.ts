export function buildOnSummaryClient(allocationUsdt: number): string {
  const x = Number(allocationUsdt).toFixed(0);
  return `O bot entra com até $${x} quando o sinal disparar. TP/SL default do módulo.`;
}
