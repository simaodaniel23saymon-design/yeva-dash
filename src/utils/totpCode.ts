/** Código TOTP de 6 dígitos a partir de texto colado ("123 456", "123-456"); null se não houver exatamente 6. */
export function extractTotpCode(text: string): string | null {
  const digits = text.replace(/\D/g, '')
  return digits.length === 6 ? digits : null
}

export const TOTP_LENGTH = 6

/** Valor do campo OTP: só dígitos, no máximo 6 (aceita colagem/autopreenchimento com espaços ou hífen). */
export function sanitizeOtpInput(raw: string, length = TOTP_LENGTH): string {
  return raw.replace(/\D/g, '').slice(0, length)
}

/** Validação automática: só com 6 dígitos, sem pedido em curso e nunca duas vezes o mesmo código seguido. */
export function shouldAutoSubmitOtp(code: string, lastSubmitted: string | null, busy: boolean, length = TOTP_LENGTH): boolean {
  return !busy && code.length === length && code !== lastSubmitted
}

/** Agrupa a chave Base32 em blocos de 4 para ser transcrita à mão na app autenticadora. */
export function formatManualKey(secret: string): string {
  return secret.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}
