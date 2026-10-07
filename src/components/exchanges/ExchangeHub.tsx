import { useEffect, useState, type ReactNode } from 'react';
import type { SecurityLayerInfo, SpotVenue } from '../../types/spot';
import {
  ACTION_LABEL,
  AUTH_LABEL,
  CEX_DETAIL_ITEMS,
  DEX_DETAIL_ITEMS,
  HUB_STATUS_LABEL,
  MARKET_LABEL,
  findVenue,
  hubStatusTone,
  marketStateLabel,
  venuesByType,
} from '../../utils/exchangeCatalog';

type Props = {
  venues: SpotVenue[];
  securityLayer: SecurityLayerInfo | null;
  loading: boolean;
  error: string;
  /** Formulário de ligação Binance (única integração com formulário). Só aparece depois de "Conectar". */
  binanceConnect: ReactNode;
};

function StatusBadge({ status }: { status: SpotVenue['status'] }) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 whitespace-nowrap ${hubStatusTone(status)}`}>
      {HUB_STATUS_LABEL[status]}
    </span>
  );
}

function Logo({ v }: { v: SpotVenue }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-bold ${
        v.type === 'CEX' ? 'border-cyan-30 text-cyan bg-cyan-dim' : 'border-border2 text-text2 bg-bg2'
      }`}
    >
      {v.name.slice(0, 1)}
    </span>
  );
}

function VenueCard({ v, onOpen }: { v: SpotVenue; onOpen: (id: string) => void }) {
  return (
    <article className="bg-bg1 border border-border1 p-4 flex flex-col gap-3" data-testid={`hub-card-${v.exchange}`}>
      <div className="flex items-center gap-3">
        <Logo v={v} />
        <div className="flex-1 min-w-0">
          <p className="text-text1 font-semibold truncate">{v.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3">{v.type}</p>
        </div>
        <StatusBadge status={v.status} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <dt className="text-text3">Spot</dt>
          <dd className="text-text1">{marketStateLabel(v.spot)}</dd>
        </div>
        <div>
          <dt className="text-text3">Futures</dt>
          <dd className="text-text1">{v.futures ? marketStateLabel(v.futures) : v.markets.includes('PERP') ? 'Perpétuos · em breve' : 'Não suportado'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text3">Ligação</dt>
          <dd className="text-text1">{AUTH_LABEL[v.auth]}</dd>
        </div>
      </dl>
      <button
        type="button"
        disabled={v.action === 'DISABLED'}
        onClick={() => onOpen(v.exchange)}
        data-testid={`hub-action-${v.exchange}`}
        className={`mt-auto py-2 font-mono text-[10px] uppercase tracking-wider border disabled:opacity-50 ${
          v.action === 'MANAGE' || v.action === 'CONNECT' ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text2'
        }`}
      >
        {ACTION_LABEL[v.action]}
      </button>
    </article>
  );
}

function Flow({ title, steps, testId }: { title: string; steps: string[]; testId: string }) {
  if (steps.length === 0) return null;
  return (
    <div data-testid={testId}>
      <p className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-2">{title}</p>
      <ol className="flex flex-wrap gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="font-mono text-[10px] border border-border2 bg-bg2 px-2 py-1 text-text1">
            {i + 1}. {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Details({ v, binanceConnect, onBack }: { v: SpotVenue; binanceConnect: ReactNode; onBack: () => void }) {
  const [step, setStep] = useState<'details' | 'connect'>('details');
  const hasForm = v.type === 'CEX' && v.connection.fields.length > 0 && v.action !== 'LEARN';
  const items = v.type === 'CEX' ? CEX_DETAIL_ITEMS : DEX_DETAIL_ITEMS;
  const roadmap = v.flow.includes('Security Provider');

  return (
    <section className="bg-bg1 border border-border1 p-4 sm:p-5 space-y-5" data-testid={`hub-details-${v.exchange}`}>
      <button type="button" onClick={onBack} className="font-mono text-[10px] uppercase tracking-wider text-text2 hover:text-cyan">
        ← Todas as exchanges
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <Logo v={v} />
        <h3 className="text-text1 font-bold text-lg">{v.name}</h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text3">{v.type}</span>
        <StatusBadge status={v.status} />
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
        <div><dt className="text-text3">Mercados</dt><dd className="text-text1">{v.markets.map((m) => MARKET_LABEL[m] ?? m).join(' · ')}</dd></div>
        <div><dt className="text-text3">Ligação</dt><dd className="text-text1">{AUTH_LABEL[v.auth]}</dd></div>
        <div><dt className="text-text3">Spot</dt><dd className="text-text1">{marketStateLabel(v.spot)}</dd></div>
        <div><dt className="text-text3">Futures</dt><dd className="text-text1">{v.futures ? marketStateLabel(v.futures) : 'Não suportado'}</dd></div>
        <div className="sm:col-span-2"><dt className="text-text3">Disponibilidade</dt><dd className="text-text1">{v.availability}</dd></div>
      </dl>

      {step === 'details' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-1">Como conectar</p>
              <ol className="list-decimal list-inside text-text2 space-y-0.5">
                {v.connection.steps.map((x) => <li key={x}>{x}</li>)}
              </ol>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-1">Requisitos</p>
              <ul className="text-text2 space-y-0.5">
                {v.connection.requirements.map((x) => <li key={x}>· {x}</li>)}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5" data-testid="hub-detail-items">
            {items.map((x) => (
              <span key={x} className="font-mono text-[10px] uppercase tracking-wider border border-border2 px-2 py-0.5 text-text2">{x}</span>
            ))}
          </div>

          {v.type === 'DEX' && (
            <div className="border border-border2 bg-bg2 p-3 text-[13px] text-text2 space-y-3" data-testid="hub-dex-flow">
              <Flow title={roadmap ? 'Fluxo previsto (roadmap)' : 'Fluxo DEX'} steps={v.flow} testId="hub-flow-steps" />
              <p>A YevaTrade nunca pede seed phrase, chave privada, API Key ou API Secret para uma DEX. Cada operação passa por verificação de segurança e simulação antes de a assinares na tua carteira.</p>
              {roadmap && <p className="text-text3 text-[12px]">Fornecedor de segurança ainda por definir. Sem execução nesta fase.</p>}
              <button type="button" disabled className="font-mono text-[10px] uppercase border border-border2 text-text3 px-3 py-1.5 opacity-60">
                Ligar carteira · em breve
              </button>
            </div>
          )}

          {v.type === 'CEX' && v.action === 'LEARN' && (
            <p className="border border-border2 bg-bg2 p-3 text-[13px] text-text2" data-testid="hub-coming-soon">
              Ainda não é possível ligar a {v.name}. Não pedimos credenciais enquanto a integração não existir.
            </p>
          )}

          {hasForm && (
            <button
              type="button"
              onClick={() => setStep('connect')}
              data-testid="hub-connect-open"
              className="w-full sm:w-auto px-5 py-2.5 font-mono text-[10px] uppercase tracking-wider border border-cyan-30 bg-cyan-dim text-cyan"
            >
              {v.action === 'MANAGE' ? 'Gerir ligação' : 'Conectar'}
            </button>
          )}
        </>
      )}

      {step === 'connect' && hasForm && (
        <div className="space-y-3">
          <button type="button" onClick={() => setStep('details')} className="font-mono text-[10px] uppercase tracking-wider text-text2 hover:text-cyan">
            ← Detalhes
          </button>
          {binanceConnect}
        </div>
      )}
    </section>
  );
}

function ConnectSelector({ venues, onPick, onClose }: { venues: SpotVenue[]; onPick: (id: string) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Conectar exchange" data-testid="hub-connect-selector" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-bg1 border border-border1 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-text1 font-bold">Conectar exchange</h3>
          <button type="button" onClick={onClose} className="font-mono text-[10px] uppercase text-text2 hover:text-cyan">Fechar</button>
        </div>
        {(['CEX', 'DEX'] as const).map((type) => (
          <div key={type}>
            <p className="font-mono text-[9px] uppercase tracking-wider text-text3 mb-2">{type}</p>
            <ul className="space-y-2">
              {venuesByType(venues, type).map((v) => (
                <li key={v.exchange}>
                  <button
                    type="button"
                    disabled={v.action === 'DISABLED'}
                    onClick={() => onPick(v.exchange)}
                    className="w-full flex items-center gap-3 border border-border2 px-3 py-2.5 text-left hover:border-cyan-30 disabled:opacity-50"
                  >
                    <Logo v={v} />
                    <span className="flex-1 text-text1 text-sm font-semibold">{v.name}</span>
                    <StatusBadge status={v.status} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExchangeHub({ venues, securityLayer, loading, error, binanceConnect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const current = selected ? findVenue(venues, selected) : null;
  const noneConnected = venues.length > 0 && !venues.some((v) => v.status === 'CONNECTED');

  if (loading) return <p className="text-text2" data-testid="hub-loading">A carregar exchanges…</p>;
  if (error && venues.length === 0) return <p className="text-text2" data-testid="hub-error">Exchanges indisponíveis de momento.</p>;

  return (
    <div className="space-y-6" data-testid="exchange-hub">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {noneConnected ? <p className="text-text2" data-testid="hub-empty">Conecte uma exchange para continuar.</p> : <span />}
        <button
          type="button"
          onClick={() => setSelectorOpen(true)}
          data-testid="hub-connect-button"
          className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-wider border border-cyan-30 bg-cyan-dim text-cyan"
        >
          Conectar exchange
        </button>
      </div>

      {current ? (
        <Details key={current.exchange} v={current} binanceConnect={binanceConnect} onBack={() => setSelected(null)} />
      ) : (
        (['CEX', 'DEX'] as const).map((type) => (
          <section key={type} data-testid={`hub-group-${type}`}>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-text3 mb-3">{type === 'CEX' ? 'CEX · exchanges centralizadas' : 'DEX · protocolos descentralizados'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {venuesByType(venues, type).map((v) => <VenueCard key={v.exchange} v={v} onOpen={setSelected} />)}
            </div>
          </section>
        ))
      )}

      {securityLayer && (
        <section className="bg-bg1 border border-border1 p-4 text-[13px] text-text2 space-y-3" data-testid="hub-security-layer">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-text1 font-semibold">{securityLayer.name}</p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-text3">Camada de segurança · não é uma exchange</span>
            <StatusBadge status={securityLayer.status} />
          </div>
          <Flow title="CEX" steps={securityLayer.cexFlow} testId="hub-security-cex" />
          <Flow title="DEX" steps={securityLayer.dexFlow} testId="hub-security-dex" />
        </section>
      )}

      {selectorOpen && (
        <ConnectSelector
          venues={venues}
          onClose={() => setSelectorOpen(false)}
          onPick={(id) => {
            setSelected(id);
            setSelectorOpen(false);
          }}
        />
      )}
    </div>
  );
}
