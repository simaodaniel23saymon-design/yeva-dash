import { IconActivity } from './ui/Icons';

interface Props {
  runningCount: number;
  totalCount: number;
  lastUpdate?: Date | null;
}

export function BotLiveStatusBar({ runningCount, totalCount, lastUpdate }: Props) {
  if (runningCount <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-bg1 border border-cyan-20 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-cyan-dim border border-cyan-20 flex items-center justify-center text-cyan relative">
          <IconActivity size={16} />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold text-cyan uppercase tracking-wider">
          Sistema activo
        </span>
      </div>
      <span className="font-mono text-[11px] text-text2">
        {runningCount}/{totalCount} bot{totalCount !== 1 ? 's' : ''} a operar
      </span>
      {lastUpdate && (
        <span className="font-mono text-[10px] text-text3 ml-auto">
          Sync · {lastUpdate.toLocaleTimeString('pt-PT')}
        </span>
      )}
    </div>
  );
}
