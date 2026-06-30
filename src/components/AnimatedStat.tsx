import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: 'cyan' | 'gold' | 'red' | 'default';
  delay?: number;
  pulse?: boolean;
  icon?: ReactNode;
}

const accentMap = {
  cyan: 'border-cyan-20',
  gold: 'border-gold-30',
  red: 'border-red-30',
  default: 'border-border1',
};

const valueMap = {
  cyan: 'text-cyan',
  gold: 'text-gold',
  red: 'text-red',
  default: 'text-text1',
};

const iconBgMap = {
  cyan: 'bg-cyan-dim border-cyan-20 text-cyan',
  gold: 'bg-gold-dim border-gold-30 text-gold',
  red: 'bg-red-dim border-red-30 text-red',
  default: 'bg-bg3 border-border2 text-text2',
};

export function AnimatedStat({ label, value, sub, accent = 'default', delay = 0, pulse, icon }: Props) {
  return (
    <div
      className={`bg-bg1 border p-4 animate-fade-in-up ${accentMap[accent]} ${pulse ? 'live-glow' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`w-8 h-8 border flex items-center justify-center shrink-0 ${iconBgMap[accent]}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1">{label}</p>
          <p className={`text-xl sm:text-2xl font-bold ${valueMap[accent]} stat-value`}>{value}</p>
          {sub && <p className="font-mono text-[9px] text-text3 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
