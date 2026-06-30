import { useState } from 'react';
import { YevaTradeLoader } from '../YevaTradeLoader';
import { sanitizeTelegramLink } from '../../utils/telegramLink';

interface TelegramLink {
  code: string;
  link: string;
}

interface Props {
  email: string;
  telegramLinked: boolean;
  telegram: TelegramLink | null;
  onGenerateTelegram: () => Promise<void>;
  onUnlinkTelegram: () => Promise<void>;
}

const ALERT_TYPES = [
  {
    icon: '⛽',
    title: 'Gás baixo',
    desc: 'Aviso quando o saldo interno ficar abaixo do mínimo para operar bots.',
    channels: ['email', 'telegram'],
  },
  {
    icon: '🤖',
    title: 'Bots e operações',
    desc: 'Início/paragem de bots, erros de API e alertas de risco.',
    channels: ['telegram', 'email'],
  },
  {
    icon: '📊',
    title: 'Relatório diário',
    desc: 'Resumo de P&L, posições e performance — enviado uma vez por dia.',
    channels: ['telegram'],
  },
  {
    icon: '🔐',
    title: 'Segurança',
    desc: 'Login suspeito, alteração de password, códigos de saque.',
    channels: ['email'],
  },
] as const;

const Badge = ({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) => (
  <span className={`font-mono text-[9px] px-2 py-0.5 border tracking-wider uppercase ${on ? 'text-cyan bg-cyan-dim border-cyan-20' : 'text-gold border-gold-30 bg-gold-dim'}`}>
    {on ? labelOn : labelOff}
  </span>
);

const Btn = ({
  onClick, loading, variant = 'primary', children, disabled,
}: { onClick?: () => void; loading?: boolean; variant?: 'primary' | 'ghost'; children: React.ReactNode; disabled?: boolean }) => {
  const cls = variant === 'primary'
    ? 'border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20'
    : 'border-border2 bg-transparent text-text2 hover:text-text1';
  return (
    <button type="button" onClick={onClick} disabled={loading || disabled}
      className={`px-4 py-2 border font-mono text-[9px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 ${cls}`}>
      {loading && <YevaTradeLoader size="xs" />}
      {children}
    </button>
  );
};

export function NotificationChannelsPanel({
  email,
  telegramLinked,
  telegram,
  onGenerateTelegram,
  onUnlinkTelegram,
}: Props) {
  const [tgLoading, setTgLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const safeLink = telegram?.link ? sanitizeTelegramLink(telegram.link) : null;

  const handleGenerate = async () => {
    setTgLoading(true);
    try {
      await onGenerateTelegram();
      setStep(2);
    } finally {
      setTgLoading(false);
    }
  };

  const handleUnlink = async () => {
    setTgLoading(true);
    try {
      await onUnlinkTelegram();
      setStep(1);
    } finally {
      setTgLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tipos de alerta */}
      <div className="bg-bg1 border border-border1 p-5">
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1">O que recebes</h3>
        <p className="font-mono text-[9px] text-text3 mb-4 leading-relaxed">
          Os alertas chegam por <span className="text-cyan">email</span> (conta registada) e/ou <span className="text-gold">Telegram</span> (se ligares o bot).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALERT_TYPES.map(a => (
            <div key={a.title} className="bg-bg2 border border-border1 p-3 flex gap-3">
              <span className="text-lg leading-none">{a.icon}</span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] text-text1 font-bold">{a.title}</p>
                <p className="font-mono text-[8px] text-text3 mt-1 leading-relaxed">{a.desc}</p>
                <div className="flex gap-1 mt-2">
                  {a.channels.map(ch => (
                    <span key={ch} className={`font-mono text-[7px] px-1.5 py-0.5 border uppercase ${ch === 'email' ? 'text-gold border-gold-30' : 'text-cyan border-cyan-20'}`}>
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div className="bg-bg1 border border-border1 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2">Email</h3>
            <Badge on labelOn="Activo ✓" labelOff="Inactivo" />
          </div>
          <p className="font-mono text-[9px] text-text3 mb-3 leading-relaxed">
            Alertas transacionais e de segurança vão para o email da tua conta.
          </p>
          <div className="bg-bg2 border border-border1 p-3">
            <span className="font-mono text-[8px] uppercase tracking-wider text-text3 block mb-1">Destino</span>
            <p className="font-mono text-xs text-gold break-all">{email}</p>
          </div>
          <ul className="mt-3 space-y-1.5 font-mono text-[8px] text-text3">
            <li>✓ Códigos de saque e confirmações</li>
            <li>✓ Avisos de gás e manutenção</li>
            <li>✓ Layout oficial Yeva Trade nos emails</li>
          </ul>
        </div>

        {/* Telegram */}
        <div className="bg-bg1 border border-border1 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2">Telegram</h3>
            <Badge on={telegramLinked} labelOn="Ligado ✓" labelOff="Não ligado" />
          </div>

          {!telegramLinked ? (
            <>
              <div className="space-y-2 mb-4">
                {[
                  { n: 1, text: 'Clica em «Gerar código» abaixo' },
                  { n: 2, text: 'Abre o bot no Telegram' },
                  { n: 3, text: 'Envia /start + código ao bot' },
                ].map(s => (
                  <div key={s.n} className={`flex gap-2 items-start ${step >= s.n ? 'opacity-100' : 'opacity-50'}`}>
                    <span className="w-5 h-5 shrink-0 bg-bg3 border border-border2 flex items-center justify-center font-mono text-[9px] text-cyan">{s.n}</span>
                    <p className="font-mono text-[9px] text-text2 pt-0.5">{s.text}</p>
                  </div>
                ))}
              </div>
              <Btn onClick={handleGenerate} loading={tgLoading}>Gerar código</Btn>
            </>
          ) : (
            <>
              <p className="font-mono text-[9px] text-text3 mb-3 leading-relaxed">
                Recebes alertas de bots, P&L e relatórios diários no Telegram.
              </p>
              <Btn onClick={handleUnlink} loading={tgLoading} variant="ghost">Desligar Telegram</Btn>
            </>
          )}

          {telegram && !telegramLinked && (
            <div className="mt-4 bg-bg2 border border-cyan-20 p-4 space-y-3">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1">Passo 2 — Código único</p>
                <p className="font-mono text-cyan text-lg font-bold tracking-[0.2em] select-all">{telegram.code}</p>
              </div>
              {safeLink ? (
                <a href={safeLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gold-30 bg-gold-dim text-gold font-mono text-[9px] uppercase tracking-wider hover:bg-gold/15">
                  Abrir bot no Telegram →
                </a>
              ) : null}
              <div className="bg-bg3 border border-border1 p-2">
                <p className="font-mono text-[8px] text-text3 mb-1">Passo 3 — Comando a enviar</p>
                <code className="font-mono text-[10px] text-text1 select-all">/start {telegram.code}</code>
              </div>
              <p className="font-mono text-[8px] text-text3">
                O código expira em breve. Após ligar, o estado muda para «Ligado ✓» acima.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
