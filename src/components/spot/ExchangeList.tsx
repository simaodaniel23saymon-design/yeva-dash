import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SpotVenue } from '../../types/spot';
import { VENUE_STATUS_LABEL, venueAction, venueStatusTone } from '../../utils/spotView';

export default function ExchangeList({ venues }: { venues: SpotVenue[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="bg-bg1 border border-border1 rounded-[22px] overflow-hidden" data-testid="spot-exchange-list">
      <div className="px-5 py-4 border-b border-border1 flex items-center justify-between">
        <h3 className="text-text1 font-semibold">Ligar exchange</h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text3">CEX · DEX</span>
      </div>
      <ul>
        {venues.map((v) => {
          const action = venueAction(v);
          return (
            <li key={v.exchange} className="border-b border-border1 last:border-b-0">
              <div className="px-5 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-text1 text-sm font-semibold">{v.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text3">
                    {v.type}{v.markets.includes('PERP') ? ' · PERP' : ''}
                  </p>
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 ${venueStatusTone(v.status)}`}>
                  {VENUE_STATUS_LABEL[v.status]}
                </span>
                {action.to ? (
                  <Link to={action.to} className="font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline w-12 text-right">
                    {action.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpen(open === v.exchange ? null : v.exchange)}
                    className="font-mono text-[10px] uppercase tracking-wider text-text2 hover:text-text1 w-12 text-right"
                  >
                    {action.label}
                  </button>
                )}
              </div>
              {open === v.exchange && <p className="px-5 pb-3 text-text3 text-[12px]">{v.note}</p>}
            </li>
          );
        })}
      </ul>
      <p className="px-5 py-3 border-t border-border1 text-text3 text-[11px]">
        DEX usam a tua carteira: a seed e a chave privada nunca vão para o servidor. Antes de assinares, a NZoChain verifica a operação.
      </p>
    </section>
  );
}
