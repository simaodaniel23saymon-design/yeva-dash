import { useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Aba PRO bloqueada — só banner "Em breve".
 * Waitlist interna (API) mantida; sem sinais, produtos ou navegação extra.
 */
export default function ProPage() {
  const [waitlistNote, setWaitlistNote] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ waitlistNote?: string | null; billingReady?: boolean }>(
        '/pro/products'
      )
      .then((r) => {
        if (r.data.billingReady) {
          setWaitlistNote(null);
          return;
        }
        setWaitlistNote(
          r.data.waitlistNote ||
            'Waitlist activa — lançamento em preparação.'
        );
      })
      .catch(() => {
        setWaitlistNote('Waitlist activa — lançamento em preparação.');
      });
  }, []);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-4 border border-border1 bg-bg1 px-6 py-10">
        <p className="display-title text-text1 text-xl sm:text-2xl leading-snug">
          Em breve 🚧 lançamento em preparação
        </p>
        {waitlistNote && (
          <p className="font-mono text-[11px] text-text2 tracking-wide leading-relaxed">
            {waitlistNote}
          </p>
        )}
      </div>
    </div>
  );
}
