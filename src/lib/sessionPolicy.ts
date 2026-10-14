/**
 * Quando é que a sessão terminou mesmo? Só quando o servidor recusa a credencial (401, ou 400 do refresh sem token).
 * Falhas transitórias (rede, timeout, 429, 5xx) nunca apagam a sessão nem mandam para o login: isso fazia pedir
 * novamente o código OTP sem necessidade.
 */

type MaybeHttpError = { response?: { status?: number } } | null | undefined;

export function httpStatusOf(error: unknown): number | null {
  const status = (error as MaybeHttpError)?.response?.status;
  return typeof status === 'number' ? status : null;
}

/** Resposta de /auth/refresh que significa "refresh token inválido, expirado ou em falta". */
export function isRefreshRejected(error: unknown): boolean {
  const s = httpStatusOf(error);
  return s === 401 || s === 400;
}

/** Resposta de /auth/me que significa "não há sessão válida" (depois da tentativa de refresh do interceptor). */
export function isSessionRejected(error: unknown): boolean {
  return httpStatusOf(error) === 401;
}

/** Esperas entre tentativas de confirmar a sessão no arranque quando o servidor não responde. */
export const SESSION_BOOT_RETRY_DELAYS_MS: readonly number[] = [1_000, 3_000];

export const SESSION_ENDED_MESSAGE = 'A tua sessão terminou. Entra novamente para continuar.';
