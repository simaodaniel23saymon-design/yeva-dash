import { buildEmailHtml, buildTelegramAlertText, type EmailAlertBlock } from '../../templates/emailLayout';
import { buildTelegramStatusText, type AccountLiveStatus } from '../../utils/accountSnapshot';

interface Props {
  subject: string;
  message: string;
  metrics?: EmailAlertBlock[];
  mode: 'email' | 'telegram';
  /** Pré-visualiza o comando /status do bot Telegram */
  statusPreview?: boolean;
}

const SAMPLE_STATUS: AccountLiveStatus = {
  binanceBalance: 1240,
  binanceAvailableBalance: 1240,
  binanceWalletBalance: 1258.32,
  liquidBalance: 1258.32,
  openPnl: 18.32,
  openPositionsCount: 1,
  todayResult: 4.5,
  dailyProfit: 12.8,
  dailyLoss: 8.3,
  exchangeConnected: true,
  activeBots: 2,
  gasBalance: 0,
  margin: 10.45,
  updatedAt: new Date().toISOString(),
};

export function NotificationPreview({ subject, message, metrics, mode, statusPreview }: Props) {
  if (mode === 'telegram' && statusPreview) {
    const text = buildTelegramStatusText(
      SAMPLE_STATUS,
      '• BTCUSDT — 🟢 ACTIVO\n  P&L acumulado: +$18.32',
    );
    return (
      <div className="bg-bg2 border border-border1 overflow-hidden">
        <div className="px-3 py-2 border-b border-border1 bg-[#1a2332] flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-cyan-dim border border-cyan-20 flex items-center justify-center text-xs">🤖</span>
          <div>
            <p className="font-mono text-[10px] text-text1 font-bold">Yeva Trade Bot · /status</p>
            <p className="font-mono text-[8px] text-text3">Pré-visualização Telegram</p>
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

/** Métricas de exemplo para preview admin */
export function sampleNotifyMetrics(): EmailAlertBlock[] {
  return [
    { label: 'Saldo Binance', value: '$1,240.00', tone: 'cyan' },
    { label: 'P&L aberto', value: '+$18.32', tone: 'cyan' },
    { label: 'Ganhos hoje', value: '+$12.80', tone: 'cyan' },
    { label: 'Perdas hoje', value: '$8.30', tone: 'red' },
    { label: 'Resultado hoje', value: '+$4.50', tone: 'cyan' },
  ];
}
