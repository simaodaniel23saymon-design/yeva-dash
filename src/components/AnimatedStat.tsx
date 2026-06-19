import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: 'cyan' | 'gold' | 'red' | 'default';
  delay?: number;
  pulse?: boolean;
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

export function AnimatedStat({ label, value, sub, accent = 'default', delay = 0, pulse }: Props) {
  return (
    <div
      className={`bg-bg1 border p-4 animate-fade-in-up ${accentMap[accent]} ${pulse ? 'live-glow' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-mono text-[8px] uppercase tracking-wider text-text2 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueMap[accent]} stat-value`}>{value}</p>
      {sub && <p className="font-mono text-[9px] text-text3 mt-1">{sub}</p>}
    </div>
  );
}
