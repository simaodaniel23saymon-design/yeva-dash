/**
 * Terminal de logs — exclusivo admin.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import {
  type DashLog,
  useDashboardLogs,
} from '../../hooks/useDashboardExtended';

type LogFilter = 'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'TRADE' | 'GRID' | 'RECONCILE';

export function DashboardLogsTerminal({ enabled }: { enabled: boolean }) {
  const { logs } = useDashboardLogs(enabled, 2000);
  const [filter, setFilter] = useState<LogFilter>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return logs;
    return logs.filter((l) => l.level === filter || l.module === filter);
  }, [logs, filter]);

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filtered, autoScroll]);

  const clear = async () => {
    try {
      await api.delete('/dashboard/logs');
    } catch {
      /* */
    }
  };

  const color = (l: DashLog) => {
    if (l.level === 'ERROR') return 'text-red';
    if (l.level === 'WARN') return 'text-gold';
    if (l.level === 'TRADE' || l.level === 'GRID') return 'text-cyan';
    if (l.level === 'RECONCILE') return 'text-pro-blue';
    return 'text-text2';
  };

  const filters: LogFilter[] = [
    'ALL',
    'INFO',
    'WARN',
    'ERROR',
    'TRADE',
    'GRID',
    'RECONCILE',
  ];

  return (
    <section className="dash-section">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <h3 className="dash-label text-text1">Terminal de logs · admin</h3>
        <div className="flex gap-1.5 flex-wrap items-center">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`font-mono text-[11px] uppercase px-2 py-1 border ${
                filter === f
                  ? 'border-cyan text-cyan'
                  : 'border-border2 text-text2'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            className="font-mono text-[11px] uppercase px-2 py-1 border border-border2 text-text2"
          >
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => void clear()}
            className="font-mono text-[11px] uppercase px-2 py-1 border border-border2 text-text2"
          >
            Limpar
          </button>
        </div>
      </div>
      <div className="bg-bg0 border border-border1 h-64 overflow-y-auto p-4 font-mono text-[12px] space-y-0.5 rounded-[16px]">
        {filtered.length === 0 && (
          <p className="text-text3">A aguardar logs do motor…</p>
        )}
        {filtered.map((l, i) => (
          <div key={`${l.timestamp}-${i}`} className={color(l)}>
            <span className="text-text3">
              [{new Date(l.timestamp).toLocaleTimeString('pt-PT')}]
            </span>{' '}
            <span className="text-text2">[{l.level}]</span>{' '}
            <span className="text-text2">[{l.module}]</span> {l.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
