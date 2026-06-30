/** Cores alinhadas ao painel YevaTrade */
export const EMAIL_THEME = {
  bg: '#060a08',
  card: '#0b100d',
  border: '#1e2b1f',
  text: '#c8d4c9',
  muted: '#6b8a6e',
  cyan: '#00d4a0',
  gold: '#d4a843',
  red: '#e05252',
} as const;

const PRODUCTION_ORIGIN = 'https://dashboard.yevatrade.com';

export function brandAssetUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `${PRODUCTION_ORIGIN}${path}`;
}

export interface EmailAlertBlock {
  label: string;
  value: string;
  tone?: 'cyan' | 'gold' | 'red' | 'neutral';
}

export interface EmailLayoutOptions {
  subject: string;
  headline?: string;
  body: string;
  /** Blocos de métricas (ex.: saldo, P&L) */
  metrics?: EmailAlertBlock[];
  footerNote?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

function toneColor(tone: EmailAlertBlock['tone']): string {
  if (tone === 'cyan') return EMAIL_THEME.cyan;
  if (tone === 'gold') return EMAIL_THEME.gold;
  if (tone === 'red') return EMAIL_THEME.red;
  return EMAIL_THEME.text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bodyToHtml(body: string): string {
  return escapeHtml(body.trim())
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:${EMAIL_THEME.text};">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/** Layout HTML para emails transacionais e alertas admin */
export function buildEmailHtml(options: EmailLayoutOptions): string {
  const logoUrl = brandAssetUrl('/yeva-logo-horizontal.png');
  const iconUrl = brandAssetUrl('/favicon-192.png');
  const headline = options.headline ?? options.subject;
  const metricsHtml = (options.metrics ?? [])
    .map(m => `
      <td style="width:50%;padding:10px 8px;vertical-align:top;">
        <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${EMAIL_THEME.muted};margin-bottom:4px;">${escapeHtml(m.label)}</div>
        <div style="font-size:15px;font-weight:700;color:${toneColor(m.tone)};">${escapeHtml(m.value)}</div>
      </td>`)
    .join('');

  const metricsSection = options.metrics?.length
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;border-collapse:collapse;background:${EMAIL_THEME.bg};border:1px solid ${EMAIL_THEME.border};">
        <tr>
          <td colspan="2" style="padding:10px 12px;border-bottom:1px solid ${EMAIL_THEME.border};">
            <span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${EMAIL_THEME.cyan};">Estado da conta · ao vivo</span>
          </td>
        </tr>
        <tr>${metricsHtml}</tr>
      </table>`
    : '';

  const ctaSection = options.ctaLabel && options.ctaUrl
    ? `
      <div style="margin:24px 0 0;text-align:center;">
        <a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;padding:12px 28px;background:${EMAIL_THEME.cyan};color:${EMAIL_THEME.bg};font-size:12px;font-weight:700;letter-spacing:1px;text-decoration:none;text-transform:uppercase;">
          ${escapeHtml(options.ctaLabel)}
        </a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(options.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_THEME.bg};font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${EMAIL_THEME.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 20px;text-align:center;">
              <img src="${logoUrl}" alt="Yeva Trade" width="220" style="display:block;margin:0 auto 12px;max-width:220px;height:auto;border:0;" />
              <img src="${iconUrl}" alt="" width="40" height="40" style="display:inline-block;border:0;vertical-align:middle;" />
            </td>
          </tr>
          <tr>
            <td style="background:${EMAIL_THEME.card};border:1px solid ${EMAIL_THEME.border};padding:28px 24px;">
              <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${EMAIL_THEME.cyan};margin-bottom:8px;">Yeva Trade · Alerta</div>
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${EMAIL_THEME.text};">${escapeHtml(headline)}</h1>
              ${bodyToHtml(options.body)}
              ${metricsSection}
              ${ctaSection}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;color:${EMAIL_THEME.muted};">
                ${escapeHtml(options.footerNote ?? 'Recebeste este email porque tens conta activa na Yeva Trade.')}
              </p>
              <p style="margin:0;font-size:10px;color:${EMAIL_THEME.muted};">
                <a href="${PRODUCTION_ORIGIN}/settings" style="color:${EMAIL_THEME.gold};text-decoration:none;">Configurações</a>
                ·
                <a href="${PRODUCTION_ORIGIN}/dashboard" style="color:${EMAIL_THEME.gold};text-decoration:none;">Painel</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface TelegramAlertOptions {
  subject: string;
  body: string;
  metrics?: EmailAlertBlock[];
  updatedAt?: Date;
}

/** Formato didático para mensagens Telegram (plain text) */
export function buildTelegramAlertText(options: TelegramAlertOptions): string {
  const lines: string[] = [
    '🟢 *YEVA TRADE* · Alerta',
    '',
    `*${options.subject.trim()}*`,
    '',
    options.body.trim(),
  ];

  if (options.metrics?.length) {
    lines.push('', '📊 *Estado da tua conta*');
    for (const m of options.metrics) {
      lines.push(`• ${m.label}: \`${m.value}\``);
    }
  }

  if (options.updatedAt) {
    lines.push('', `🕐 Actualizado: ${options.updatedAt.toLocaleTimeString('pt-PT')}`);
  }

  lines.push('', '_Gerir alertas em Configurações → Notificações_');
  return lines.join('\n');
}
