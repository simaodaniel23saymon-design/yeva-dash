interface Props {
  longUsed?: number;
  longMax?: number;
  shortUsed?: number;
  shortMax?: number;
  spacing?: number;
  compact?: boolean;
}

export function GridVisual({
  longUsed = 0,
  longMax = 15,
  shortUsed = 0,
  shortMax = 15,
  spacing = 0.8,
  compact = false,
}: Props) {
  const cell = compact ? 'w-2 h-2' : 'w-2.5 h-2.5';

  const renderRow = (used: number, max: number, color: string, label: string) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[9px] uppercase text-text3">{label}</span>
        <span className="font-mono text-[9px] text-text2">{used}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`${cell} border ${i < used ? `${color} border-current opacity-100` : 'border-border2 bg-bg3 opacity-40'}`}
            title={`Entrada ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className={`bg-bg2 border border-border1 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text2">Grid Trading</p>
        <span className="font-mono text-[9px] text-pro-blue">Spacing {spacing}%</span>
      </div>
      {renderRow(longUsed, longMax, 'bg-pro-green text-pro-green', 'Long')}
      {renderRow(shortUsed, shortMax, 'bg-pro-red text-pro-red', 'Short')}
    </div>
  );
}
