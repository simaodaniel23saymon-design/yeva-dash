import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: 'cyan' | 'gold' | 'default';
  sub?: ReactNode;
  delay?: number;
}

const accentStyles = {
  cyan: { border: 'border-cyan-20', icon: 'bg-cyan-dim border-cyan-20 text-cyan', value: 'text-cyan' },
  gold: { border: 'border-gold-30', icon: 'bg-gold-dim border-gold-30 text-gold', value: 'text-gold' },
  default: { border: 'border-border1', icon: 'bg-bg3 border-border2 text-text2', value: 'text-text1' },
};

export function StatCard({ label, value, icon, accent = 'default', sub, delay = 0 }: Props) {
  const s = accentStyles[accent];
  return (
    <div
      className={`bg-bg1 border ${s.border} p-4 animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 border flex items-center justify-center shrink-0 ${s.icon}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1">{label}</p>
          <p className={`text-xl sm:text-2xl font-bold truncate ${s.value}`}>{value}</p>
          {sub && <p className="font-mono text-[9px] text-text3 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
