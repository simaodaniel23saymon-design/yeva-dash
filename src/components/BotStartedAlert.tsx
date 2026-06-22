interface Props {
  pair: string;
  market?: string;
  onDismiss?: () => void;
}

const STEPS = [
  'Motor de trading activo',
  'Ligação à exchange OK',
  'A analisar o mercado',
  'Ordens em tempo real',
];

export function BotStartedAlert({ pair, market, onDismiss }: Props) {
  return (
    <div className="border border-cyan-30 bg-cyan-dim p-4 animate-fade-in live-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-1 w-3 h-3 rounded-full bg-cyan animate-pulse shrink-0" />
          <div>
            <p className="text-text1 font-bold text-base">Bot iniciado com sucesso</p>
            <p className="font-mono text-[12px] text-cyan mt-0.5">
              {pair}{market ? ` · ${market}` : ''}
            </p>
            <p className="font-mono text-[11px] text-text2 mt-2 leading-relaxed">
              O sistema está vivo e a monitorizar o mercado. Podes acompanhar ordens e posições abaixo em tempo real.
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-text3 hover:text-text1 text-sm shrink-0"
            aria-label="Fechar"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STEPS.map(step => (
          <div
            key={step}
            className="flex items-center gap-2 bg-bg1/80 border border-cyan-20 px-2.5 py-2 font-mono text-[10px] text-text1"
          >
            <span className="text-cyan">✓</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
