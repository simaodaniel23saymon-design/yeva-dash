import { buildEmailHtml, buildTelegramAlertText, type EmailAlertBlock } from '../../templates/emailLayout';

interface Props {
  subject: string;
  message: string;
  metrics?: EmailAlertBlock[];
  mode: 'email' | 'telegram';
}

export function NotificationPreview({ subject, message, metrics, mode }: Props) {
  if (!subject.trim() && !message.trim()) {
    return (
      <div className="bg-bg2 border border-border1 border-dashed p-8 text-center">
        <p className="font-mono text-[10px] text-text3">Preenche título e mensagem para ver a pré-visualização</p>
      </div>
    );
  }

  if (mode === 'telegram') {
    const text = buildTelegramAlertText({
      subject: subject || 'Título do alerta',
      body: message || 'Corpo da mensagem...',
      metrics,
      updatedAt: new Date(),
    });
    return (
      <div className="bg-bg2 border border-border1 overflow-hidden">
        <div className="px-3 py-2 border-b border-border1 bg-[#1a2332] flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-cyan-dim border border-cyan-20 flex items-center justify-center text-xs">🤖</span>
          <div>
            <p className="font-mono text-[10px] text-text1 font-bold">Yeva Trade Bot</p>
            <p className="font-mono text-[8px] text-text3">Pré-visualização Telegram</p>
          </div>
        </div>
        <pre className="p-4 font-mono text-[11px] text-text1 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto scroll-area">
          {text}
        </pre>
      </div>
    );
  }

  const html = buildEmailHtml({
    subject: subject || 'Assunto',
    headline: subject || 'Assunto',
    body: message || 'Mensagem...',
    metrics,
    ctaLabel: 'Abrir painel',
    ctaUrl: 'https://dashboard.yevatrade.com/dashboard',
  });

  return (
    <div className="bg-bg2 border border-border1 overflow-hidden">
      <div className="px-3 py-2 border-b border-border1 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-text2">Pré-visualização email</span>
        <span className="font-mono text-[8px] text-text3">Layout oficial · fundo transparente</span>
      </div>
      <iframe
        title="Pré-visualização email"
        srcDoc={html}
        className="w-full border-0 bg-bg0"
        style={{ height: 420 }}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

/** Métricas de exemplo para preview admin */
export function sampleNotifyMetrics(): EmailAlertBlock[] {
  return [
    { label: 'Gás interno', value: '$42.50 USDT', tone: 'gold' },
    { label: 'Saldo Binance', value: '$1,240.00', tone: 'cyan' },
    { label: 'P&L aberto', value: '+$18.32', tone: 'cyan' },
    { label: 'Bots activos', value: '2/3', tone: 'neutral' },
  ];
}
