interface Props {
  runningCount: number;
  totalCount: number;
  lastUpdate?: Date | null;
}

export function BotLiveStatusBar({ runningCount, totalCount, lastUpdate }: Props) {
  if (runningCount <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-bg1 border border-cyan-20 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan" />
        </span>
        <span className="font-mono text-[12px] font-bold text-cyan uppercase tracking-wider">
          Sistema activo
        </span>
      </div>
      <span className="font-mono text-[11px] text-text2">
        {runningCount}/{totalCount} bot{totalCount !== 1 ? 's' : ''} a operar
      </span>
      {lastUpdate && (
        <span className="font-mono text-[10px] text-text3 ml-auto">
          Sync: {lastUpdate.toLocaleTimeString('pt-PT')}
        </span>
      )}
    </div>
  );
}
