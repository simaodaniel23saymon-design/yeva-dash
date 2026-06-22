import { LayoutDashboard, Bot, Activity, History, Wallet, Users, Settings, LogOut, Circle } from 'lucide-react';
import { useAuth, useLogout } from '../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ExchangeAccount { id: string; exchange: string; isActive: boolean; }

export default function Sidebar() {
  const { user } = useAuth();
  const handleLogout = useLogout();
  const location = useLocation();
  const [exchanges, setExchanges] = useState<ExchangeAccount[]>([]);

  useEffect(() => {
    api.get<ExchangeAccount[]>('/exchanges').then(r => setExchanges(r.data)).catch(() => {});
  }, []);

  const nav = [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/dashboard' },
    { icon: Bot,             label: 'Bots',            path: '/bots',     badge: true },
    { icon: Activity,        label: 'Operações',       path: '/positions', badge: true },
    { icon: History,         label: 'Histórico',       path: '/history' },
    { icon: Wallet,          label: 'Finanças',        path: '/wallet' },
    { icon: Users,           label: 'Afiliados',       path: '/affiliates' },
    { icon: Settings,        label: 'Configurações',   path: '/settings' },
  ];

  return (
    <aside className="w-56 bg-velora-card border-r border-velora-border flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-5 border-b border-velora-border">
        <h1 className="text-xl font-bold text-velora-accent tracking-widest">VELORA <span className="text-white">IA</span></h1>
        <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Trading Engine v2.1</p>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 py-3 scroll-area">
        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest px-5 mb-2">Principal</p>
        {nav.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors relative ${
                active ? 'text-velora-accent bg-velora-accent/10 border-r-2 border-velora-accent' : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              <Icon size={17} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Exchanges */}
        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest px-5 mt-4 mb-2">Exchanges</p>
        {exchanges.length === 0 ? (
          <Link to="/exchanges" className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-500 hover:text-white hover:bg-slate-700/30 transition-colors">
            <Circle size={8} className="text-slate-600" />
            <span>Conectar Exchange</span>
          </Link>
        ) : (
          exchanges.map(ex => (
            <div key={ex.id} className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-300">
              <Circle size={8} className={ex.isActive ? 'text-velora-success fill-velora-success' : 'text-slate-500'} />
              <span className="capitalize">{ex.exchange.charAt(0) + ex.exchange.slice(1).toLowerCase()}</span>
            </div>
          ))
        )}
        {exchanges.length > 0 && (
          <Link to="/exchanges" className="flex items-center gap-3 px-5 py-2 text-xs text-slate-500 hover:text-velora-accent transition-colors">
            + Gerir Exchanges
          </Link>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-velora-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-700/30 cursor-pointer mb-1">
          <div className="w-8 h-8 rounded-full bg-velora-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.email?.split('@')[0] ?? 'Utilizador'}</p>
            <p className="text-velora-warning text-[10px] font-medium">PRO PLAN ◆</p>
          </div>
        </div>
        <button
          onClick={() => { handleLogout(); }}
          className="flex items-center gap-2 text-slate-500 hover:text-velora-danger w-full px-2 py-1.5 transition-colors rounded-lg hover:bg-velora-danger/10 text-xs"
        >
          <LogOut size={14} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
