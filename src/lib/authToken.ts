/** Lê o `exp` do payload JWT (sem validar assinatura — isso é do servidor). */
export function accessTokenExpMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    const exp = Number(JSON.parse(atob(padded))?.exp);
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** true só quando o `exp` é legível e cai dentro da janela; token ilegível segue para o servidor decidir. */
export function accessTokenExpiresWithin(token: string, windowMs: number, nowMs = Date.now()): boolean {
  const expMs = accessTokenExpMs(token);
  return expMs != null && expMs - nowMs <= windowMs;
}

export function bearerToken(header: unknown): string | null {
  const value = typeof header === 'string' ? header : '';
  return value.startsWith('Bearer ') ? value.slice(7) : null;
}
