const ALLOWED_TELEGRAM_HOSTS = new Set(['t.me', 'telegram.me']);

export function sanitizeTelegramLink(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!ALLOWED_TELEGRAM_HOSTS.has(host)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isSafeTelegramUrl(url: string): boolean {
  return sanitizeTelegramLink(url) !== null;
}
