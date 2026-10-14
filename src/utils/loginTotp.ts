import { getFriendlyError } from './errorHandler'

/** Códigos devolvidos pelo servidor no passo do código de 6 dígitos do login. */
export const LOGIN_TOTP_TEXT: Readonly<Record<string, string>> = Object.freeze({
  TOTP_REQUIRED: 'Introduz o código de 6 dígitos da aplicação autenticadora.',
  TOTP_INVALID: 'Código inválido. Confirma o código atual na aplicação autenticadora.',
  TOTP_REPLAYED: 'Este código já foi usado. Aguarda o próximo código na aplicação autenticadora.',
  TOTP_LOCKED: 'Demasiadas tentativas com código errado. Aguarda 15 minutos e tenta novamente.',
  TOTP_NOT_CONFIGURED: 'A verificação em dois passos não está configurada para esta conta.',
  TOTP_UNAVAILABLE: 'Não foi possível validar o código neste momento. Tenta novamente dentro de instantes.',
})

export type LoginTotpError = { message: string; code: string; rateLimited: boolean }

/** Mensagem clara para o passo do código; nunca inclui o código introduzido. */
export function loginTotpError(error: unknown): LoginTotpError {
  const data = (error as { response?: { data?: { code?: unknown } } })?.response?.data
  const code = typeof data?.code === 'string' ? data.code : null
  if (code && LOGIN_TOTP_TEXT[code]) return { message: LOGIN_TOTP_TEXT[code], code, rateLimited: code === 'TOTP_LOCKED' }
  const friendly = getFriendlyError(error)
  return { message: friendly.message, code: friendly.code, rateLimited: friendly.code === 'RATE_LIMITED' }
}
