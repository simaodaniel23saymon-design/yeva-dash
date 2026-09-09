import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

type Msg = { role: 'user' | 'assistant'; content: string };

const DEFAULT_SUGGESTIONS = [
  'Como está o meu risco?',
  'Porque fechei em perda?',
  'Quanto ganhei este mês?',
];

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [disclaimer, setDisclaimer] = useState(
    'Aviso: isto não é aconselhamento financeiro. Não executo ordens nem garanto lucro.'
  );
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    api
      .get<{
        suggestions: string[];
        disclaimer: string;
        quota: { used: number; limit: number; remaining: number };
      }>('/assistant/meta')
      .then((r) => {
        if (r.data.suggestions?.length) setSuggestions(r.data.suggestions);
        if (r.data.disclaimer) setDisclaimer(r.data.disclaimer);
        if (r.data.quota) setQuota(r.data.quota);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, busy]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      setError(null);
      setInput('');
      const nextHistory = [...messages, { role: 'user' as const, content: message }];
      setMessages(nextHistory);
      setBusy(true);
      try {
        const { data } = await api.post<{
          reply: string;
          quota: { used: number; limit: number; remaining: number };
        }>(
          '/assistant/chat',
          {
            message,
            history: messages.slice(-6),
          },
          { timeout: 60000 }
        );
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.quota) setQuota(data.quota);
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          'Falha ao contactar o assistente';
        setError(String(msg));
        if (err?.response?.data?.quota) setQuota(err.response.data.quota);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages]
  );

  return (
    <>
      <button
        type="button"
        aria-label="Abrir Assistente Yeva"
        onClick={() => setOpen((v) => !v)}
        className={`fixed z-[280] right-3 sm:right-5 bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-6 w-12 h-12 border border-cyan-20 bg-bg1 text-cyan shadow-[0_0_20px_rgba(0,212,160,0.15)] flex items-center justify-center hover:border-cyan transition-all ${
          open ? 'opacity-0 pointer-events-none' : ''
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 6h16v10H8l-4 4V6Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed z-[290] inset-x-0 bottom-0 sm:inset-auto sm:right-5 sm:bottom-6 sm:w-[380px] sm:max-w-[calc(100vw-2rem)]
                     h-[min(72vh,560px)] sm:h-[520px] flex flex-col bg-bg1 border border-border1 shadow-2xl
                     max-sm:rounded-t-lg sm:rounded-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border1 bg-bg2">
            <div>
              <div className="text-[13px] font-semibold text-text1">Assistente Yeva</div>
              <div className="font-mono text-[8px] text-text3 tracking-wider uppercase">
                {quota
                  ? `${quota.remaining}/${quota.limit} msgs hoje`
                  : 'Conta · risco · PnL'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 text-text2 hover:text-text1"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scroll-area">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-[12px] text-text2 leading-relaxed">
                  Pergunta sobre o teu risco, posições, TP/SL ou resultados. Não executo ordens.
                </p>
                <p className="font-mono text-[9px] text-text3 leading-relaxed">{disclaimer}</p>
                <div className="flex flex-col gap-1.5 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="text-left text-[12px] px-2.5 py-2 border border-border2 text-cyan hover:border-cyan hover:bg-cyan-dim transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`text-[12px] leading-relaxed whitespace-pre-wrap px-2.5 py-2 max-w-[92%] ${
                  m.role === 'user'
                    ? 'ml-auto bg-cyan-dim border border-cyan-20 text-text1'
                    : 'mr-auto bg-bg2 border border-border1 text-text2'
                }`}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="text-[11px] font-mono text-text3 uppercase tracking-wider">
                A pensar…
              </div>
            )}
            {error && <div className="text-[12px] text-red border border-red-30 bg-red-dim px-2 py-1.5">{error}</div>}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t border-border1 p-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreve a tua pergunta…"
              maxLength={2000}
              disabled={busy}
              className="flex-1 bg-bg0 border border-border2 px-2.5 py-2 text-[13px] text-text1 outline-none focus:border-cyan disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-3 py-2 border border-cyan-20 bg-cyan-dim text-cyan font-mono text-[9px] tracking-wider uppercase hover:border-cyan disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
