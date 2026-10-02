import type { SpotCoin } from '../../types/spot';
import {
  COIN_STATE_LABEL,
  coinStateTone,
  fmtPrice,
  fmtSignedPct,
  fmtSignedUsd,
  fmtUsd,
  signTone,
} from '../../utils/spotView';

type Props = {
  coin: SpotCoin;
  pending: boolean;
  disabled: boolean;
  onToggle: (symbol: string, enabled: boolean) => void;
};

export default function SpotCoinRow({ coin, pending, disabled, onToggle }: Props) {
  const p = coin.position;
  return (
    <li className="px-4 md:px-5 py-3 border-b border-border1 last:border-b-0" data-testid={`spot-coin-${coin.symbol}`}>
      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(90px,1fr)_minmax(120px,1fr)_minmax(110px,1fr)_minmax(200px,1.6fr)_auto] gap-x-4 gap-y-2 items-center">
        <div className="min-w-0">
          <p className="text-text1 font-semibold">{coin.base}</p>
          <p className="font-mono text-[10px] text-text3">{coin.symbol}</p>
        </div>

        <div className="md:order-none order-3">
          <p className="text-text1 font-mono text-sm">{fmtPrice(coin.price)}</p>
          <p className={`font-mono text-[11px] ${signTone(coin.change24hPct)}`}>{fmtSignedPct(coin.change24hPct)} <span className="text-text3">24h</span></p>
        </div>

        <div className="order-4 md:order-none">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text3">Momentum</p>
          <p className="text-text1 font-mono text-sm">
            {coin.score == null ? '—' : `Score ${coin.score.toFixed(1)}`}
            {coin.rank != null && <span className="text-text3"> · #{coin.rank}</span>}
          </p>
        </div>

        <div className="col-span-2 md:col-span-1 order-5 md:order-none grid grid-cols-3 gap-2 font-mono text-[11px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text3">Posição</p>
            <p className="text-text1">{p ? fmtUsd(p.capitalUsed) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text3">PnL paper</p>
            <p className={p ? signTone(p.paperPnl) : 'text-text1'}>{p ? fmtSignedUsd(p.paperPnl) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text3">Retorno</p>
            <p className={p ? signTone(p.returnPct) : 'text-text1'}>{p ? fmtSignedPct(p.returnPct) : '—'}</p>
          </div>
        </div>

        <div className="order-2 md:order-none flex items-center gap-3 justify-end">
          <span className={`hidden sm:inline font-mono text-[10px] uppercase tracking-wider border px-2 py-0.5 ${coinStateTone(coin.displayState)}`}>
            {COIN_STATE_LABEL[coin.displayState]}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={coin.enabled}
            aria-label={`${coin.base} ${coin.enabled ? 'ligada' : 'desligada'} para este bot`}
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
      {!p && coin.lastExit && (
        <p className="mt-2 font-mono text-[10px] text-text3">
          Última saída paper: <span className={signTone(coin.lastExit.paperPnl)}>{fmtSignedUsd(coin.lastExit.paperPnl)}</span>
          {coin.lastExit.reason ? ` · ${coin.lastExit.reason}` : ''}
        </p>
      )}
      {p && !coin.enabled && (
        <p className="mt-2 font-mono text-[10px] text-text3">Posição paper aberta pelo bot. OFF não a fecha.</p>
      )}
    </li>
  );
}
