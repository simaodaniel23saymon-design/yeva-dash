import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker não suportado neste browser');
  }
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

export function EnablePushButton({ compact }: { compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'on' | 'denied' | 'unsupported'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') setStatus('denied');
    else if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setStatus(sub ? 'on' : 'idle'))
        .catch(() => setStatus('idle'));
    }
  }, []);

  const enable = useCallback(async () => {
    setStatus('loading');
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus('denied');
        setMsg('Permissão negada. Activa nas definições do browser.');
        return;
      }
      const reg = await ensureServiceWorker();
      const { data } = await api.get<{ publicKey: string }>('/notify/vapid-public-key');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      });
      const json = sub.toJSON();
      await api.post('/notify/subscribe', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      });
      setStatus('on');
      setMsg('Notificações activadas.');
    } catch (err) {
      setStatus('idle');
      setMsg(err instanceof Error ? err.message : 'Falha ao activar');
    }
  }, []);

  const sendTest = useCallback(async () => {
    setMsg(null);
    try {
      const { data } = await api.post<{ body: string }>('/notify/test');
      setMsg(`Teste enviado: ${data.body}`);
    } catch {
      setMsg('Falha no teste — confirma login e subscrição.');
    }
  }, []);

  if (status === 'unsupported') {
    return (
      <p className="font-mono text-[10px] text-text2">
        Web Push não suportado neste browser. Usa Chrome (desktop ou Android).
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'p-3 border border-border2 bg-bg2'}`}>
      {status !== 'on' ? (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={status === 'loading' || status === 'denied'}
          className="font-mono text-[9px] uppercase px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 disabled:opacity-50"
        >
          {status === 'loading' ? 'A activar…' : 'Ativar notificações'}
        </button>
      ) : (
        <span className="font-mono text-[9px] uppercase tracking-wider text-cyan border border-cyan-20 bg-cyan-dim px-3 py-2">
          Push activo
        </span>
      )}
      <button
        type="button"
        onClick={() => void sendTest()}
        className="font-mono text-[9px] uppercase px-4 py-2 border border-border2 text-text2 hover:border-cyan hover:text-cyan"
      >
        Testar push
      </button>
      {msg && <span className="font-mono text-[10px] text-text2">{msg}</span>}
      {status === 'denied' && (
        <span className="font-mono text-[10px] text-red">Bloqueado pelo browser</span>
      )}
    </div>
  );
}
