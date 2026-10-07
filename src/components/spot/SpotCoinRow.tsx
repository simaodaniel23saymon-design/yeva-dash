import type { SpotCoin } from '../../types/spot';
import { PROTECTION_LABEL, draftSummaryRows } from '../../utils/botConfigView';
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
  botName: string;
  pending: boolean;
  disabled: boolean;
  /** Score, rank e estado interno da ordem são diagnóstico de estratégia: só admin. */
  showDiagnostics: boolean;
  /** Abre a configuração (ATIVAR passa sempre pela configuração e pelo resumo de risco). */
  onConfigure: (coin: SpotCoin) => void;
  /** Desliga a preferência; não fecha a posição. */
  onDeactivate: (symbol: string) => void;
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
export default function SpotCoinRow({ coin, botName, pending, disabled, showDiagnostics, onConfigure, onDeactivate }: Props) {
  const facts = positionFacts(coin.position);
  const configured = coin.config != null;
  const draftState = !coin.enabled && coin.config && coin.configState ? coin.configState : null;
  return (
    <li className="bg-bg1 border border-border1 rounded-[18px] p-4 flex flex-col gap-3" data-testid={`spot-coin-${coin.symbol}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-text1 font-semibold">{coin.base}</p>
          {coin.market && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-text3" data-testid={`spot-catalog-${coin.symbol}`}>
              {coin.symbol} · Spot · {coin.status}
            </p>
          )}
          <p className="text-text1 font-mono text-sm">{fmtPrice(coin.price) === '—' ? 'Preço indisponível' : fmtPrice(coin.price)}</p>
          <p className={`font-mono text-[11px] ${signTone(coin.change24hPct)}`}>
            {coin.change24hPct == null ? '24h —' : `${fmtSignedPct(coin.change24hPct)} 24h`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text3">Preferência</span>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 ${coin.enabled ? 'border-cyan-30 text-cyan bg-cyan-dim' : 'border-border1 text-text3'}`}
            data-testid={`spot-pref-${coin.symbol}`}
          >
            {coin.enabled ? 'ON' : configured ? 'OFF · configurada' : 'OFF'}
          </span>
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
          <p className="text-text3">Sem posição aberta.</p>
        )}
      </div>

      {draftState && coin.config && (
        <section className="border border-border1 rounded-[12px] p-3 space-y-2" data-testid={`spot-draft-${coin.symbol}`} data-state={draftState}>
          <p className="text-text1 text-[12px] font-semibold">{coin.base} · {botName}</p>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 font-mono text-[11px]">
            {draftSummaryRows(coin.config, draftState).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[9px] uppercase tracking-wider text-text3">{k}</dt>
                <dd className={v === 'Não configurado' || v === PROTECTION_LABEL.INCOMPLETE ? 'text-text2' : 'text-text1'}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {coin.enabled ? (
          <>
            <button
              type="button"
              disabled={disabled || pending}
              onClick={() => onConfigure(coin)}
              className="font-mono text-[10px] uppercase tracking-wider border border-border2 text-text2 px-3 py-1.5 disabled:opacity-40 hover:text-text1"
              data-testid={`spot-configure-${coin.symbol}`}
            >
              Configurar
            </button>
            <button
              type="button"
              disabled={disabled || pending}
              onClick={() => onDeactivate(coin.symbol)}
              title="Desliga a moeda para este bot. Não vende nem fecha a posição."
              className="font-mono text-[10px] uppercase tracking-wider border border-border2 text-text3 px-3 py-1.5 disabled:opacity-40 hover:text-text1"
              data-testid={`spot-deactivate-${coin.symbol}`}
            >
              DESATIVAR
            </button>
          </>
        ) : draftState === 'DRAFT' ? (
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => onConfigure(coin)}
            title="Completa a configuração. Não compra nem vende."
            className="font-mono text-[11px] uppercase tracking-wider border border-border2 text-text1 px-4 py-1.5 disabled:opacity-40"
            data-testid={`spot-continue-${coin.symbol}`}
          >
            Continuar configuração
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => onConfigure(coin)}
            title={draftState ? 'Rever risco e confirmar a ativação. Não compra nem vende.' : 'Configura esta moeda para o bot. Não compra nem vende.'}
            className="font-mono text-[11px] uppercase tracking-wider border border-cyan-30 bg-cyan-dim text-cyan px-4 py-1.5 disabled:opacity-40"
            data-testid={`spot-activate-${coin.symbol}`}
          >
            {draftState ? 'ATIVAR' : 'Configurar'}
          </button>
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
