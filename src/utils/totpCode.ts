/** Código TOTP de 6 dígitos a partir de texto colado ("123 456", "123-456"); null se não houver exatamente 6. */
export function extractTotpCode(text: string): string | null {
  const digits = text.replace(/\D/g, '')
  return digits.length === 6 ? digits : null
}

/** Agrupa a chave Base32 em blocos de 4 para ser transcrita à mão na app autenticadora. */
export function formatManualKey(secret: string): string {
  return secret.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}
