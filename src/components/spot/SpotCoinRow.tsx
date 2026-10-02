import type { SpotCoin } from '../../types/spot';
import {
  EXECUTION_PHASE_LABEL,
  EXECUTION_STATE_LABEL,
  POSITION_STATE_LABEL,
  STRATEGY_STATE_LABEL,
  fmtPrice,
  fmtSignedPct,
  positionFacts,
  signTone,
  strategyTone,
} from '../../utils/spotView';

type Props = {
  coin: SpotCoin;
  pending: boolean;
  disabled: boolean;
  /** Score, rank e estado interno da ordem são diagnóstico de estratégia: só admin. */
  showDiagnostics: boolean;
  onToggle: (symbol: string, enabled: boolean) => void;
};

function Family({ label, value, tone, testId }: { label: string; value: string; tone: string; testId: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[9px] uppercase tracking-wider text-text3">{label}</dt>
      <dd className={`inline-block mt-1 font-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${tone}`} data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

/** Cartão por moeda (funciona em mobile sem scroll horizontal). */
export default function SpotCoinRow({ coin, pending, disabled, showDiagnostics, onToggle }: Props) {
  const facts = positionFacts(coin.position);
  return (
    <li className="bg-bg1 border border-border1 rounded-[18px] p-4 flex flex-col gap-3" data-testid={`spot-coin-${coin.symbol}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-text1 font-semibold">{coin.base}</p>
          <p className="text-text1 font-mono text-sm">{fmtPrice(coin.price) === '—' ? 'Preço indisponível' : fmtPrice(coin.price)}</p>
          <p className={`font-mono text-[11px] ${signTone(coin.change24hPct)}`}>
            {coin.change24hPct == null ? '24h —' : `${fmtSignedPct(coin.change24hPct)} 24h`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text3">Preferência</span>
          <button
            type="button"
            role="switch"
            aria-checked={coin.enabled}
            aria-label={`Ativar ${coin.base} para esta estratégia: ${coin.enabled ? 'ON' : 'OFF'}`}
            title="Ativar esta moeda para esta estratégia. Não compra nem vende."
            disabled={disabled || pending}
            onClick={() => onToggle(coin.symbol, !coin.enabled)}
            className={`font-mono text-[10px] uppercase tracking-wider border px-3 py-1 min-w-[52px] transition-colors disabled:opacity-40 ${
              coin.enabled ? 'border-cyan-30 text-cyan bg-cyan-dim' : 'border-border2 text-text3 hover:text-text1'
            }`}
          >
            {coin.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Family label="Estratégia" value={STRATEGY_STATE_LABEL[coin.strategyState]} tone={strategyTone(coin.strategyState)} testId={`spot-strategy-${coin.symbol}`} />
        <Family
          label="Posição"
          value={POSITION_STATE_LABEL[coin.positionState ?? (coin.position ? 'OPEN' : 'NO_POSITION')]}
          tone={coin.position ? 'text-cyan border-cyan-30' : 'text-text3 border-border1'}
          testId={`spot-position-${coin.symbol}`}
        />
        <Family
          label="Execução"
          value={EXECUTION_PHASE_LABEL[coin.executionPhase ?? 'DISABLED']}
          tone="text-text3 border-border1"
          testId={`spot-execution-${coin.symbol}`}
        />
      </dl>

      <div className="font-mono text-[11px]" data-testid={`spot-real-position-${coin.symbol}`}>
        {facts ? (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[9px] uppercase tracking-wider text-text3">{k}</dt>
                <dd className="text-text1">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-text3">Sem posição aberta</p>
        )}
      </div>

      {showDiagnostics && (
        <p className="text-text3 font-mono text-[10px] border-t border-border1 pt-2" data-testid={`spot-diagnostics-${coin.symbol}`}>
          Admin · {coin.score == null ? 'score —' : `score ${coin.score.toFixed(1)}`}
          {coin.rank != null && ` · #${coin.rank}`}
          {coin.executionState && ` · ordem: ${EXECUTION_STATE_LABEL[coin.executionState]}`}
        </p>
      )}
    </li>
  );
}
