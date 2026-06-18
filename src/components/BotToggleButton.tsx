import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';

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

  const toggle = async () => {
    setLoading(true);
    try {
      if (running) {
        await api.post('/bots/stop');
        setRunning(false);
        flash('Bots parados com sucesso.');
      } else {
        await api.post('/bots/start');
        setRunning(true);
        flash('Bots iniciados! Acompanha as operações em tempo real.');
      }
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

  // Estado desconhecido (endpoint indisponível) — não mostrar UI partida
  if (botsCount === null) return null;

  if (botsCount === 0) {
    return (
      <div className="bg-gold-dim border border-gold-30 p-4 font-mono text-[10px] text-gold leading-relaxed">
        ⚠ Configura pelo menos um bot antes de iniciar.{' '}
        <button onClick={() => navigate('/bots')} className="underline hover:text-text1 transition-colors">
          Criar bot agora →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={toggle} disabled={loading}
        className={`w-full py-3.5 font-mono text-[11px] uppercase tracking-widest border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          running
            ? 'border-red-30 bg-red-dim text-red hover:bg-red/15'
            : 'border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20'
        }`}>
        {loading ? 'A processar...' : running ? '⏹ Parar Bots' : '▶ Iniciar Operações'}
      </button>
      {msg && (
        <div className={`p-2.5 font-mono text-[10px] border ${msg.ok ? 'border-cyan-20 bg-cyan-dim text-cyan' : 'border-red-30 bg-red-dim text-red'}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
