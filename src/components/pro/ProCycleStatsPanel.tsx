import { useEffect, useState } from 'react';
import { fetchBotCycleStats } from '../../utils/proTrading';
import type { LiveBot } from '../../utils/liveData';
import { resolveBotId } from '../../utils/liveData';
import { YevaTradeLoader } from '../YevaTradeLoader';

const CLOSE_LABELS: Record<string, string> = {
  CLOSED_TP: 'Take Profit',
  CLOSED_TRAILING: 'Trailing Stop',
  CLOSED_MANUAL: 'Manual',
};

function fmtUsd(v?: number | null) {
  if (v == null || !Number.isFinite(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}$${v.toFixed(2)}`;
}

interface Props {
  bot?: LiveBot | null;
  pollMs?: number;
}

export function ProCycleStatsPanel({ bot, pollMs = 20000 }: Props) {
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const id = resolveBotId(bot);
    if (!id) {
      setCycle(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const data = await fetchBotCycleStats(id);
      if (!cancelled) {
        setCycle((data?.cycle as Record<string, unknown>) ?? null);
        setLoading(false);
      }
    };
    load();
    if (pollMs <= 0) return;
    const t = setInterval(load, pollMs);
    return () => { cancelled = true; clearInterval(t); };
  }, [bot, pollMs]);

  if (!bot) {
    return (
      <div className="bg-bg1 border border-border1 p-4 font-mono text-[11px] text-text2">
        Sem bot activo — estatísticas de ciclo aparecem quando houver bot a operar.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <YevaTradeLoader size="sm" label="A carregar ciclo..." />
      </div>
    );
  }

  const c = cycle ?? {};
  const reason = String(c.lastCloseReason ?? bot.lastCloseReason ?? '');
  const reasonLabel = CLOSE_LABELS[reason] ?? (reason || '—');

  const rows = [
    { label: 'Estado do ciclo', value: String(c.engineState ?? bot.engineState ?? '—') },
    { label: 'Lucro bruto (último)', value: fmtUsd(Number(c.lastGrossPnl ?? bot.lastGrossPnl)) },
    { label: 'Taxas Binance', value: fmtUsd(-Math.abs(Number(c.lastBinanceFees ?? bot.lastBinanceFees ?? 0))) },
    { label: 'Funding', value: fmtUsd(Number(c.lastFunding ?? bot.lastFunding)) },
    { label: 'Taxa Yeva (30%)', value: fmtUsd(-Math.abs(Number(c.lastYevaFee ?? bot.lastYevaFee ?? 0))) },
    { label: 'Lucro líquido (último)', value: fmtUsd(Number(c.lastNetPnl ?? bot.lastNetPnl)), highlight: true },
    { label: 'Motivo encerramento', value: reasonLabel },
    { label: 'Pico líquido actual', value: fmtUsd(Number(c.peakNetPnlUsdt ?? bot.peakNetPnlUsdt)) },
    { label: 'Spacing activo', value: c.cycleSpacingPct ? `${Number(c.cycleSpacingPct).toFixed(3)}%` : (bot.dynamicSpacingEnabled !== false ? 'Dinâmico' : `${bot.spacing ?? '—'}%`) },
    { label: 'Grade L/S', value: c.cycleLongOrders ? `${c.cycleLongOrders} / ${c.cycleShortOrders}` : '—' },
  ];

  return (
    <div className="bg-bg1 border border-border1 p-4 space-y-3">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-cyan font-bold">
        Ciclo & PnL Líquido
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(row => (
          <div key={row.label} className="border border-border1 bg-bg2 px-3 py-2">
            <p className="font-mono text-[9px] uppercase text-text3">{row.label}</p>
            <p className={`font-mono text-sm ${row.highlight ? 'text-cyan font-bold' : 'text-text1'}`}>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
