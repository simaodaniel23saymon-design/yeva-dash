/**
 * Sub-navegação Operações: Manual · Gainers · Losers · Estáveis
 */

import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/operations/manual', label: 'Manual' },
  { to: '/operations/gainers', label: 'Gainers' },
  { to: '/operations/losers', label: 'Losers' },
  { to: '/operations/estaveis', label: 'Estáveis' },
] as const;

export function OperationsSubNav() {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border1 pb-0">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `font-mono text-[10px] uppercase tracking-wider px-3 py-2 border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-cyan text-cyan'
                : 'border-transparent text-text3 hover:text-text1'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
