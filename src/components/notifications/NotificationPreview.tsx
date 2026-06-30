import { buildEmailHtml, buildTelegramAlertText, type EmailAlertBlock } from '../../templates/emailLayout';
import { buildTelegramStatusText, type AccountLiveStatus } from '../../utils/accountSnapshot';

interface Props {
  subject: string;
  message: string;
  metrics?: EmailAlertBlock[];
  mode: 'email' | 'telegram';
  /** Pré-visualiza o comando /status do bot Telegram */
  statusPreview?: boolean;
  /** Estado real da conta (GET /account/live-status) */
  liveStatus?: AccountLiveStatus | null;
}

export function NotificationPreview({
  subject,
  message,
  metrics,
  mode,
  statusPreview,
  liveStatus,
}: Props) {
  if (mode === 'telegram' && statusPreview) {
    if (!liveStatus) {
      return (
        <div className="bg-bg2 border border-border1 border-dashed p-8 text-center">
          <p className="font-mono text-[10px] text-text3">A carregar estado da conta...</p>
        </div>
      );
    }

    const text = buildTelegramStatusText(
      liveStatus,
      liveStatus.activeBots > 0
        ? `• ${liveStatus.activeBots} bot(s) activo(s)`
        : undefined,
    );
    return (
      <div className="bg-bg2 border border-border1 overflow-hidden">
        <div className="px-3 py-2 border-b border-border1 bg-[#1a2332] flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-cyan-dim border border-cyan-20 flex items-center justify-center text-xs">🤖</span>
          <div>
            <p className="font-mono text-[10px] text-text1 font-bold">Yeva Trade Bot · /status</p>
            <p className="font-mono text-[8px] text-text3">Dados reais · Binance</p>
          </div>
        </div>
        <pre className="p-4 font-mono text-[11px] text-text1 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto scroll-area">
          {text}
        </pre>
      </div>
    );
  }

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
