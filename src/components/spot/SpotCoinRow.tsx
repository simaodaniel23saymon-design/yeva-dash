import type { SpotCoin } from '../../types/spot';
import { COIN_STATE_LABEL, coinStateTone, fmtPrice, fmtSignedPct, positionFacts, signTone } from '../../utils/spotView';

type Props = {
  coin: SpotCoin;
  pending: boolean;
  disabled: boolean;
  onToggle: (symbol: string, enabled: boolean) => void;
};

export default function SpotCoinRow({ coin, pending, disabled, onToggle }: Props) {
  const facts = positionFacts(coin.position);
  return (
    <li className="px-4 md:px-5 py-3 border-b border-border1 last:border-b-0" data-testid={`spot-coin-${coin.symbol}`}>
      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(90px,1fr)_minmax(120px,1fr)_minmax(110px,1fr)_minmax(220px,1.8fr)_auto] gap-x-4 gap-y-2 items-center">
        <div className="min-w-0">
          <p className="text-text1 font-semibold">{coin.base}</p>
          <p className="font-mono text-[10px] text-text3">{coin.symbol}</p>
        </div>

        <div className="md:order-none order-3">
          <p className="text-text1 font-mono text-sm">{fmtPrice(coin.price)}</p>
          <p className={`font-mono text-[11px] ${signTone(coin.change24hPct)}`}>{fmtSignedPct(coin.change24hPct)} <span className="text-text3">24h</span></p>
        </div>

        <div className="order-4 md:order-none">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3">Estratégia</p>
          <p className="text-text1 font-mono text-sm">
            {coin.score == null ? '—' : `Score ${coin.score.toFixed(1)}`}
            {coin.rank != null && <span className="text-text3"> · #{coin.rank}</span>}
          </p>
          <span className={`inline-block mt-1 font-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${coinStateTone(coin.displayState)}`}>
            {COIN_STATE_LABEL[coin.displayState]}
          </span>
        </div>

        <div className="col-span-2 md:col-span-1 order-5 md:order-none font-mono text-[11px]" data-testid={`spot-real-position-${coin.symbol}`}>
          <p className="text-[10px] uppercase tracking-wider text-text3 mb-1">Posição REAL</p>
          {facts ? (
            <dl className="grid grid-cols-3 gap-x-2 gap-y-1">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[9px] uppercase tracking-wider text-text3">{k}</dt>
                  <dd className="text-text1">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-text2">No active position</p>
          )}
          <p className="mt-1 text-[10px] text-text3">Execução: {coin.execution === 'LIVE' ? 'LIVE' : 'DISABLED'}</p>
        </div>

        <div className="order-2 md:order-none flex items-center gap-3 justify-end">
          <button
            type="button"
            role="switch"
            aria-checked={coin.enabled}
            aria-label={`Preferência ${coin.base}: ${coin.enabled ? 'ON' : 'OFF'}`}
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
    </li>
  );
}
