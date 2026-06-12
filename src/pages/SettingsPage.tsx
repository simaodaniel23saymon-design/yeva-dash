import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Settings {
  email: string;
  name?: string;
  referralCode: string;
  plan: string;
  twoFAEnabled: boolean;
  telegramLinked: boolean;
  createdAt: string;
}

interface TelegramLink {
  code: string;
  link: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [telegram, setTelegram] = useState<TelegramLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await api.get<Settings>('/settings');
    setSettings(res.data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const generateTelegram = async () => {
    setError('');
    try {
      const res = await api.post<TelegramLink>('/telegram/link-code');
      setTelegram(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao gerar ligação Telegram');
    }
  };

  const unlinkTelegram = async () => {
    setError('');
    try {
      await api.post('/telegram/unlink');
      setTelegram(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao desligar Telegram');
    }
  };

  if (loading) return <div className="py-32 flex justify-center"><div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-text1 font-bold text-lg">Configurações</h2>
        <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">Conta, segurança e notificações</p>
      </div>

      {error && <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">{error}</div>}

      <div className="bg-bg1 border border-border1 p-5">
        <h3 className="text-sm font-bold text-text1 mb-4">Conta</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[10px]">
          <div className="bg-bg2 border border-border1 p-3"><span className="text-text2">Email</span><div className="text-text1 mt-1">{settings?.email}</div></div>
          <div className="bg-bg2 border border-border1 p-3"><span className="text-text2">Plano</span><div className="text-gold mt-1">{settings?.plan}</div></div>
          <div className="bg-bg2 border border-border1 p-3"><span className="text-text2">Código afiliado</span><div className="text-cyan mt-1">{settings?.referralCode}</div></div>
          <div className="bg-bg2 border border-border1 p-3"><span className="text-text2">Criada em</span><div className="text-text1 mt-1">{settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString('pt-PT') : '-'}</div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg1 border border-border1 p-5">
          <h3 className="text-sm font-bold text-text1 mb-2">2FA</h3>
          <p className="font-mono text-[10px] text-text2 mb-4">Estado: <span className={settings?.twoFAEnabled ? 'text-cyan' : 'text-gold'}>{settings?.twoFAEnabled ? 'Activo' : 'Inactivo'}</span></p>
          <p className="font-mono text-[10px] text-text3">A API de 2FA está pronta. A interface de activação completa pode ser adicionada como modal dedicado.</p>
        </div>

        <div className="bg-bg1 border border-border1 p-5">
          <h3 className="text-sm font-bold text-text1 mb-2">Telegram</h3>
          <p className="font-mono text-[10px] text-text2 mb-4">Estado: <span className={settings?.telegramLinked ? 'text-cyan' : 'text-gold'}>{settings?.telegramLinked ? 'Ligado' : 'Não ligado'}</span></p>
          <div className="flex gap-2">
            <button onClick={generateTelegram}
              className="py-2 px-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase tracking-wider">
              Gerar link
            </button>
            {settings?.telegramLinked && (
              <button onClick={unlinkTelegram}
                className="py-2 px-3 border border-red-30 bg-red-dim text-red font-mono text-[9px] uppercase tracking-wider">
                Desligar
              </button>
            )}
          </div>
          {telegram && (
            <div className="mt-4 bg-bg2 border border-border1 p-3">
              <p className="font-mono text-[9px] text-text2 uppercase mb-1">Código</p>
              <p className="font-mono text-cyan text-xs break-all">{telegram.code}</p>
              <a href={telegram.link} target="_blank" rel="noreferrer" className="inline-block mt-2 font-mono text-[10px] text-gold underline">Abrir Telegram</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
