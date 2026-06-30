import type { BotConfig } from '../../types/trading';
import { DEFAULT_PRO_CONFIG } from '../../types/trading';

interface Props {
  config: BotConfig;
  onChange: (patch: Partial<BotConfig>) => void;
  inputClass: string;
  compact?: boolean;
}

export function ProBotConfigFields({ config, onChange, inputClass, compact = false }: Props) {
  const c = { ...DEFAULT_PRO_CONFIG, ...config };
  const label = compact
    ? 'font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block'
    : 'font-mono text-[12px] uppercase tracking-wider text-text2 mb-2 block';
  const section = compact ? 'space-y-3 pt-2 border-t border-border1' : 'space-y-4 pt-3 border-t border-border1';

  const toggle = (name: keyof BotConfig, checked: boolean) => onChange({ [name]: checked });
  const setTf = (tf: string, checked: boolean) => {
    const set = new Set(c.timeframes);
    if (checked) set.add(tf);
    else set.delete(tf);
    onChange({ timeframes: Array.from(set) });
  };

  return (
    <div className={section}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-cyan font-bold">
        Configuração PRO
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={label}>Máx Posições Long</label>
          <input type="number" min={1} max={30} value={c.maxLongPositions}
            onChange={e => onChange({ maxLongPositions: Number(e.target.value) })}
            className={inputClass} />
        </div>
        <div>
          <label className={label}>Máx Posições Short</label>
          <input type="number" min={1} max={30} value={c.maxShortPositions}
            onChange={e => onChange({ maxShortPositions: Number(e.target.value) })}
            className={inputClass} />
        </div>
        <div>
          <label className={label}>Grid Spacing (%)</label>
          <input type="number" min={0.1} max={5} step={0.1} value={c.gridSpacing}
            onChange={e => onChange({ gridSpacing: Number(e.target.value) })}
            className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Take Profit global (%)</label>
          <input type="number" min={0.1} max={100} step={0.1} value={c.tpDailyPct}
            onChange={e => onChange({ tpDailyPct: Number(e.target.value) })}
            className={inputClass} />
        </div>
        <div>
          <label className={label}>Stop Loss global (%)</label>
          <input type="number" min={0.1} max={100} step={0.1} value={c.maxLossPct}
            onChange={e => onChange({ maxLossPct: Number(e.target.value) })}
            className={inputClass} />
        </div>
      </div>

      <div className="bg-bg2 border border-border1 p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={c.trailingStopEnabled} className="accent-cyan"
            onChange={e => toggle('trailingStopEnabled', e.target.checked)} />
          <span className={`${compact ? 'text-[10px]' : 'text-[12px]'} text-text1`}>Activar Trailing Stop</span>
        </label>
        <div>
          <label className={label}>Activar após lucro (%)</label>
          <input type="number" min={0.1} max={10} step={0.1} value={c.trailingStopActivation}
            disabled={!c.trailingStopEnabled}
            onChange={e => onChange({ trailingStopActivation: Number(e.target.value) })}
            className={`${inputClass} disabled:opacity-50`} />
        </div>
        <div>
          <label className={label}>Recuo para fechar (%)</label>
          <input type="number" min={0.1} max={10} step={0.1} value={c.trailingStopCallback}
            disabled={!c.trailingStopEnabled}
            onChange={e => onChange({ trailingStopCallback: Number(e.target.value) })}
            className={`${inputClass} disabled:opacity-50`} />
          <p className="font-mono text-[9px] text-text3 mt-1">Fecha o ciclo se o lucro recuar este % desde o pico</p>
        </div>
      </div>

      <div className="bg-bg2 border border-border1 p-3 space-y-2">
        <p className={label.replace(' mb-2 block', ' mb-1 block').replace(' mb-1.5 block', ' mb-1 block')}>
          Análise Multi-Timeframe
        </p>
        {(['1h', '4h', '1d'] as const).map(tf => (
          <label key={tf} className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-text2">
            <input type="checkbox" checked={c.timeframes.includes(tf)} className="accent-cyan"
              onChange={e => setTf(tf, e.target.checked)} />
            Timeframe {tf}
          </label>
        ))}
        <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-text1 mt-2">
          <input type="checkbox" checked={c.requireAllTimeframes} className="accent-cyan"
            onChange={e => toggle('requireAllTimeframes', e.target.checked)} />
          Exigir confirmação de todos
        </label>
      </div>

      <div>
        <label className={label}>Volume mínimo 24h (USDT)</label>
        <input type="number" min={10000} step={100000} value={c.minLiquidity}
          onChange={e => onChange({ minLiquidity: Number(e.target.value) })}
          className={inputClass} />
        <p className="font-mono text-[9px] text-text3 mt-1">Pares abaixo deste volume são ignorados</p>
      </div>
    </div>
  );
}
