import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon?: ReactNode;
}

export default function StatsCard({ title, value, change, isPositive, icon }: StatsCardProps) {
  return (
    <div className="bg-velora-card border border-velora-border rounded-xl p-5">
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-400 text-sm font-medium">{title}</span>
        {icon && <div className="text-velora-accent">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {change && (
        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-velora-success' : 'text-velora-danger'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {change}
        </div>
      )}
    </div>
  );
}
