import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';
import { stopAllBots } from '../utils/liveData';
import { IconActivity } from './ui/Icons';

interface BotsStatus {
  anyRunning?: boolean;
  botsCount?: number;
}

export function BotToggleButton() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [botsCount, setBotsCount] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const checkStatus = async () => {
    try {
      const res = await api.get<BotsStatus>('/bots/status');
      setRunning(!!res.data.anyRunning);
      setBotsCount(res.data.botsCount ?? 0);
    } catch {
      // endpoint indisponível — mantém estado desconhecido
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const startAll = async () => {
    setLoading(true);
    try {
      await api.post('/bots/start');
      setRunning(true);
      flash('Todos os bots iniciados — sistema activo e a monitorizar mercados.');
    } catch (error) {
      const err = error as { response?: { data?: { code?: string; error?: string } } };
      if (err.response?.data?.code === 'INSUFFICIENT_BALANCE') {
        flash('Saldo insuficiente. A levar-te para a carteira...', false);
        setTimeout(() => navigate('/wallet'), 1200);
      } else {
        flash(getFriendlyError(error).message, false);
      }
    } finally {
      setLoading(false);
    }
  };

  const stopAll = async () => {
    if (!window.confirm('Parar TODOS os bots?')) return;
    setLoading(true);
    try {
      await stopAllBots();
      setRunning(false);
      flash('Todos os bots parados.');
    } catch (error) {
      flash(getFriendlyError(error).message, false);
    } finally {
      setLoading(false);
    }
  };

  if (botsCount === null) return null;

  if (botsCount === 0) {
    return (
      <div className="flex items-start gap-3 bg-gold-dim border border-gold-30 p-4 font-mono text-[10px] text-gold leading-relaxed">
        <span className="w-8 h-8 bg-bg1/50 border border-gold-30 flex items-center justify-center shrink-0 text-gold">
          !
        </span>
        <p>
          Configura pelo menos um bot antes de iniciar.{' '}
          <button type="button" onClick={() => navigate('/bots')} className="underline hover:text-text1 transition-colors">
            Criar bot agora →
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {running && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-cyan-dim border border-cyan-20 font-mono text-[11px] text-cyan">
          <span className="w-7 h-7 bg-bg1/50 border border-cyan-20 flex items-center justify-center shrink-0 relative">
            <IconActivity size={14} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          </span>
          Sistema vivo · bots a operar
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={startAll}
          disabled={loading || running}
          className="py-3 font-mono text-[11px] uppercase tracking-widest border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && !running ? 'A processar...' : '▶ Iniciar Todos'}
        </button>
        <button
          type="button"
          onClick={stopAll}
          disabled={loading || !running}
          className="py-3 font-mono text-[11px] uppercase tracking-widest border border-red-30 bg-red-dim text-red hover:bg-red/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && running ? 'A processar...' : '⏹ Parar Todos'}
        </button>
      </div>
      {msg && (
        <div className={`p-2.5 font-mono text-[10px] border ${msg.ok ? 'border-cyan-20 bg-cyan-dim text-cyan' : 'border-red-30 bg-red-dim text-red'}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
