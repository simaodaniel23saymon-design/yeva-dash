import { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface ExchangeAccount { id: string; exchange: string; isActive: boolean; }

// ── SVG Icons ───────────────────────────────────────────────────────────────
const IconGrid = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="12" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="2" y="12" width="6" height="6" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="12" y="12" width="6" height="6" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const IconBot = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M10 7v5M7.5 10.5l2.5 1.5 2.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square"/>
  </svg>
);
const IconApi = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 3l8 4.5V13L10 17.5L2 13V7.5L10 3Z" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square"/>
  </svg>
);
const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M2 15L6.5 9.5l3.5 3.5L18 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square"/>
  </svg>
);
const IconNetwork = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="4" cy="15" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="16" cy="15" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M10 6.5V11.5M10 11.5L4 13M10 11.5L16 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square"/>
  </svg>
);
const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="5" width="16" height="12" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 9h16M6 5V3h8v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square"/>
  </svg>
);

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium border transition-all mb-0.5 no-underline ${
    isActive ? 'text-cyan bg-cyan-dim border-cyan-20' : 'text-text2 border-transparent hover:bg-bg3 hover:text-text1'
  }`;

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [exchanges, setExchanges] = useState<ExchangeAccount[]>([]);

  useEffect(() => {
    api.get<ExchangeAccount[]>('/exchanges').then(r => setExchanges(r.data)).catch(() => {});
  }, []);

  const close = () => onClose();

  return (
    <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-bg1 border-r border-border1 z-[300] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Header */}
      <div className="p-5 border-b border-border1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="YevaTrade" className="w-8 h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div className="font-bold text-base text-text1">YEVA <span className="text-cyan">TRADE</span></div>
            <div className="font-mono text-[8px] text-text2 tracking-[2px] uppercase mt-0.5">Trading Engine</div>
          </div>
        </div>
        <button onClick={close} className="text-text2 hover:text-text1 transition-colors text-lg leading-none">✕</button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <span className="font-mono text-[8px] tracking-[2.5px] uppercase text-text3 px-2 mb-2 block">Principal</span>
        <NavLink to="/dashboard" className={navLinkClass} onClick={close}><IconGrid /><span>Dashboard</span></NavLink>
        <NavLink to="/bots"      className={navLinkClass} onClick={close}><IconBot /><span>Bots</span></NavLink>
        <NavLink to="/positions" className={navLinkClass} onClick={close}><IconChart /><span>Operações</span></NavLink>
        <NavLink to="/history"   className={navLinkClass} onClick={close}><IconChart /><span>Histórico</span></NavLink>

        <span className="font-mono text-[8px] tracking-[2.5px] uppercase text-text3 px-2 mb-2 mt-5 block">Exchanges</span>
        <NavLink to="/exchanges" className={navLinkClass} onClick={close}><IconApi /><span>Conectar Exchange</span></NavLink>
        {exchanges.map(ex => (
          <div key={ex.id} className="flex items-center gap-2.5 px-2.5 py-1.5 text-[12px] text-text2">
            <span className={`w-[5px] h-[5px] rounded-full ${ex.isActive ? 'bg-cyan shadow-[0_0_6px_#00d4a0]' : 'bg-text3'}`} />
            {ex.exchange.charAt(0) + ex.exchange.slice(1).toLowerCase()}
          </div>
        ))}

        <span className="font-mono text-[8px] tracking-[2.5px] uppercase text-text3 px-2 mb-2 mt-5 block">Finanças</span>
        <NavLink to="/wallet"    className={navLinkClass} onClick={close}><IconWallet /><span>Carteira</span></NavLink>
        <NavLink to="/affiliates"className={navLinkClass} onClick={close}><IconNetwork /><span>Afiliados</span></NavLink>

        <span className="font-mono text-[8px] tracking-[2.5px] uppercase text-text3 px-2 mb-2 mt-5 block">Sistema</span>
        <NavLink to="/settings"  className={navLinkClass} onClick={close}><IconGrid /><span>Configurações</span></NavLink>
        {user?.isAdmin && (
          <NavLink to="/admin" className={navLinkClass} onClick={close}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.5l-4.8 2.4.9-5.4L2.2 7.7l5.4-.8L10 2Z" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            <span className="text-red">Admin</span>
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border1">
        <div className="mb-3 flex items-center gap-3 px-2.5 font-mono text-[8px] uppercase tracking-wider text-text3">
          <Link to="/legal/terms" onClick={close} className="hover:text-cyan">Termos</Link>
          <Link to="/legal/privacy" onClick={close} className="hover:text-cyan">Privacidade</Link>
        </div>
        <div className="flex items-center gap-2.5 p-2.5 bg-bg2 cursor-pointer mb-2">
          <div className="w-[30px] h-[30px] bg-bg4 border border-gold-30 flex items-center justify-center font-bold text-xs text-gold flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-text1 truncate">{user?.email?.split('@')[0]}</div>
            <div className="font-mono text-[8px] text-gold tracking-wider uppercase">PRO PLAN ◆</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login'); close(); }}
          className="w-full text-left font-mono text-[9px] tracking-wider uppercase text-text2 hover:text-red px-2.5 py-1.5 transition-colors">
          ⏻ Sair do Sistema
        </button>
      </div>
    </aside>
  );
}

// ── Layout Principal ─────────────────────────────────────────────────────────
export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const bottomNav = [
    { label: 'Painel',    path: '/dashboard', icon: <IconGrid /> },
    { label: 'Robô',      path: '/bots',      icon: <IconBot /> },
    { label: 'API',       path: '/exchanges', icon: <IconApi /> },
    { label: 'Histórico', path: '/history',   icon: <IconChart /> },
    { label: 'Network',   path: '/affiliates',icon: <IconNetwork /> },
    { label: 'Carteira',  path: '/wallet',    icon: <IconWallet /> },
  ];

  return (
    <div className="min-h-screen bg-bg0 text-text1">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/75 z-[299] backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Topbar */}
      <header className="h-[52px] bg-bg0/95 border-b border-border1 sticky top-0 z-[100] flex items-center px-4 gap-3 backdrop-blur-xl">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-[34px] h-[34px] border border-border2 flex items-center justify-center text-text2 hover:border-cyan hover:text-cyan transition-all flex-shrink-0">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M0 1h16M0 6h16M0 11h16" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="YevaTrade" className="w-6 h-6 object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          <span className="font-bold text-sm text-text1">YEVA <span className="text-cyan">TRADE</span></span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-cyan bg-cyan-dim border border-cyan-20 px-2.5 py-1 font-mono text-[9px] tracking-widest uppercase">
            <span className="w-[5px] h-[5px] rounded-full bg-cyan animate-pulse" />
            ALPHA TREND
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-red-30 bg-red-dim text-red font-mono text-[9px] tracking-widest uppercase hover:bg-red/15 transition-all">
            ✕ <span className="hidden sm:inline">Fechar Tudo</span>
          </button>
          <button className="relative w-[34px] h-[34px] border border-border2 flex items-center justify-center text-text2 hover:border-cyan hover:text-cyan transition-all">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a4.5 4.5 0 0 1 4.5 4.5c0 3 1.5 4 1.5 4H2S3.5 8.5 3.5 5.5A4.5 4.5 0 0 1 8 1ZM6 13a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            <span className="absolute top-[8px] right-[8px] w-[5px] h-[5px] rounded-full bg-red border border-bg0" />
          </button>
        </div>
      </header>

      {/* Conteúdo — scroll nativo do browser, sem contentor interno */}
      <main className="pb-[72px] lg:pb-6 p-3 sm:p-4 md:p-5">
        {children}
      </main>

      {/* Bottom Nav — mobile e tablet (hidden só em desktop lg+) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg1 border-t border-border1 flex lg:hidden z-[200]"
           style={{ height: 'calc(56px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {bottomNav.map(({ label, path, icon }) => {
          const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
          return (
            <button key={path} onClick={() => navigate(path)}
              className={`flex-1 flex flex-col items-center justify-center gap-[3px] relative transition-all select-none active:scale-95 ${
                active ? 'text-cyan' : 'text-text2 hover:text-text1'
              }`}>
              {/* Indicador topo */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-cyan rounded-b" />
              )}
              <span className={`transition-transform duration-150 ${active ? 'scale-110' : ''}`}>
                {icon}
              </span>
              <span className={`font-mono text-[7px] tracking-[0.12em] uppercase transition-colors ${active ? 'text-cyan' : 'text-text2'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
