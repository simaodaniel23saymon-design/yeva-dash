/**
 * Timing do splash de boot — exportado para testes.
 */
export const MIN_BOOT_MS = 12_000;

export function shouldCompleteBoot(input: {
  elapsedMs: number;
  minMs?: number;
  dataReady: boolean;
}): boolean {
  const min = input.minMs ?? MIN_BOOT_MS;
  return input.elapsedMs >= min && input.dataReady;
}

/** Progresso visual: sobe até ~92% no minMs; completa a 100% só quando ready. */
export function bootProgressPct(input: {
  elapsedMs: number;
  minMs?: number;
  dataReady: boolean;
}): number {
  const min = input.minMs ?? MIN_BOOT_MS;
  if (input.dataReady && input.elapsedMs >= min) return 100;
  const timed = Math.min(0.92, input.elapsedMs / min);
  return Math.round(timed * 100);
}
