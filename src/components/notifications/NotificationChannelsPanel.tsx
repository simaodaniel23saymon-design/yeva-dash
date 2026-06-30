import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getFriendlyError } from '../../utils/errorHandler';
import { YevaTradeLoader } from '../YevaTradeLoader';
import { sanitizeTelegramLink } from '../../utils/telegramLink';

interface TelegramLink {
  code: string;
  link: string;
}

export interface NotificationPreferences {
  gasLow: boolean;
  takeProfit: boolean;
  stopLoss: boolean;
  dailyReport: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  gasLow: true,
  takeProfit: true,
  stopLoss: true,
  dailyReport: true,
};

const PREF_ITEMS: Array<{
  key: keyof NotificationPreferences;
  icon: string;
  title: string;
  desc: string;
  channels: string[];
}> = [
  {
    key: 'gasLow',
    icon: '⛽',
    title: 'Gás baixo',
    desc: 'Aviso quando o saldo interno ficar abaixo do mínimo para operar bots.',
    channels: ['email', 'telegram'],
  },
  {
    key: 'takeProfit',
    icon: '🎯',
    title: 'TP atingido',
    desc: 'Alerta quando o bot atinge o take profit diário configurado.',
    channels: ['email', 'telegram'],
  },
  {
    key: 'stopLoss',
    icon: '🛑',
    title: 'SL atingido',
    desc: 'Alerta quando o limite de perda diária é activado.',
    channels: ['email', 'telegram'],
  },
  {
    key: 'dailyReport',
    icon: '📊',
    title: 'Relatório diário',
    desc: 'Resumo de P&L, posições e performance — uma vez por dia.',
    channels: ['telegram', 'email'],
  },
];

interface Props {
  email: string;
  telegramLinked: boolean;
  onTelegramLinkedChange?: () => void;
}

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
  onTelegramLinkedChange,
}: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationPreferences | null>(null);
  const [telegram, setTelegram] = useState<TelegramLink | null>(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const safeLink = telegram?.link ? sanitizeTelegramLink(telegram.link) : null;

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  };

  const loadPrefs = useCallback(async () => {
    setPrefsLoading(true);
    try {
      const res = await api.get<Partial<NotificationPreferences>>('/notifications/preferences');
      setPrefs({ ...DEFAULT_PREFS, ...res.data });
    } catch {
      /* endpoint pode não existir — mantém defaults */
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const togglePref = async (key: keyof NotificationPreferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSavingKey(key);
    try {
      await api.put('/notifications/preferences', next);
    } catch (err: unknown) {
      setPrefs(prefs);
      flash(getFriendlyError(err).message);
    } finally {
      setSavingKey(null);
    }
  };

  const generateTelegramLink = async () => {
    setTgLoading(true);
    try {
      try {
        const res = await api.get<TelegramLink>('/telegram/link-code');
        setTelegram(res.data);
      } catch {
        const res = await api.post<TelegramLink>('/telegram/link-code');
        setTelegram(res.data);
      }
    } catch (err: unknown) {
      flash(getFriendlyError(err).message);
    } finally {
      setTgLoading(false);
    }
  };

  const unlinkTelegram = async () => {
    setTgLoading(true);
    try {
      await api.post('/telegram/unlink');
      setTelegram(null);
      flash('Telegram desligado.');
      onTelegramLinkedChange?.();
    } catch (err: unknown) {
      flash(getFriendlyError(err).message);
    } finally {
      setTgLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className="p-3 border font-mono text-[10px] bg-red-dim border-red-30 text-red">{msg}</div>
      )}

      <div className="bg-bg1 border border-border1 p-5">
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1">Preferências de alertas</h3>
        <p className="font-mono text-[9px] text-text3 mb-4 leading-relaxed">
          Escolhe que eventos recebes por email e Telegram. Mensagens usam o layout oficial Yeva Trade.
        </p>
        {prefsLoading ? (
          <div className="py-6 flex justify-center"><YevaTradeLoader size="sm" /></div>
        ) : (
          <div className="space-y-2">
            {PREF_ITEMS.map(item => (
              <div key={item.key} className="bg-bg2 border border-border1 p-3 flex gap-3 items-start">
                <span className="text-lg leading-none">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] text-text1 font-bold">{item.title}</p>
                      <p className="font-mono text-[8px] text-text3 mt-1 leading-relaxed">{item.desc}</p>
                      <div className="flex gap-1 mt-2">
                        {item.channels.map(ch => (
                          <span key={ch} className={`font-mono text-[7px] px-1.5 py-0.5 border uppercase ${ch === 'email' ? 'text-gold border-gold-30' : 'text-cyan border-cyan-20'}`}>
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={savingKey === item.key}
                      onClick={() => togglePref(item.key)}
                      className={`shrink-0 font-mono text-[8px] uppercase px-2 py-1 border transition-all ${prefs[item.key] ? 'text-cyan bg-cyan-dim border-cyan-20' : 'text-text3 border-border2'}`}
                    >
                      {savingKey === item.key ? '...' : prefs[item.key] ? 'Activo' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg1 border border-border1 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2">Email</h3>
            <Badge on labelOn="Activo ✓" labelOff="Inactivo" />
          </div>
          <p className="font-mono text-[9px] text-text3 mb-3">
            Alertas activos vão para o email da conta com logo e estado da conta quando aplicável.
          </p>
          <div className="bg-bg2 border border-border1 p-3">
            <span className="font-mono text-[8px] uppercase tracking-wider text-text3 block mb-1">Destino</span>
            <p className="font-mono text-xs text-gold break-all">{email}</p>
          </div>
        </div>

        <div className="bg-bg1 border border-border1 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2">Telegram</h3>
            <Badge on={telegramLinked} labelOn="Ligado ✓" labelOff="Não ligado" />
          </div>

          {!telegramLinked ? (
            <>
              <ol className="space-y-2 mb-4 font-mono text-[9px] text-text2 list-decimal list-inside">
                <li>Clica em «Gerar código»</li>
                <li>Abre o bot no Telegram</li>
                <li>Envia <span className="text-cyan">/start CÓDIGO</span> ao bot</li>
              </ol>
              <Btn onClick={generateTelegramLink} loading={tgLoading}>Gerar código</Btn>
            </>
          ) : (
            <>
              <p className="font-mono text-[9px] text-text3 mb-3">
                Conta ligada — recebes alertas activos acima no Telegram.
              </p>
              <Btn onClick={unlinkTelegram} loading={tgLoading} variant="ghost">Desligar Telegram</Btn>
            </>
          )}

          {telegram && !telegramLinked && (
            <div className="mt-4 bg-bg2 border border-cyan-20 p-4 space-y-3">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1">Código</p>
                <p className="font-mono text-cyan text-lg font-bold tracking-[0.2em] select-all">{telegram.code}</p>
              </div>
              {safeLink && (
                <a href={safeLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex px-4 py-2 border border-gold-30 bg-gold-dim text-gold font-mono text-[9px] uppercase">
                  Abrir bot no Telegram →
                </a>
              )}
              <code className="block font-mono text-[10px] text-text1 select-all bg-bg3 border border-border1 p-2">
                /start {telegram.code}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
