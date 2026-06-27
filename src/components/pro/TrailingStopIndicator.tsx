interface Props {
  active?: boolean;
  activationPct?: number;
  protectedProfit?: number;
  compact?: boolean;
}

export function TrailingStopIndicator({
  active = false,
  activationPct = 1,
  protectedProfit,
  compact = false,
}: Props) {
  return (
    <div className={`inline-flex items-center gap-2 ${compact ? '' : 'px-2.5 py-1.5 border border-border1 bg-bg2'}`}>
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-pro-blue animate-pulse' : 'bg-text3'}`} />
      <span className={`font-mono uppercase ${compact ? 'text-[8px]' : 'text-[9px]'} ${active ? 'text-pro-blue' : 'text-text3'}`}>
        Trailing {active ? 'ACTIVO' : 'INACTIVO'}
      </span>
      {!compact && (
        <span className="font-mono text-[8px] text-text3">
          · após {activationPct}% lucro
          {active && protectedProfit != null && protectedProfit > 0 && (
            <> · ${protectedProfit.toFixed(2)} protegido</>
          )}
        </span>
      )}
    </div>
  );
}
