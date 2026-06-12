import { Bell, XCircle, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dayNames = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
  const dateStr = `${dayNames[now.getDay()]}, ${now.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} · ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} UTC`;

  return (
    <header className="h-14 bg-velora-card border-b border-velora-border flex items-center justify-between px-5 ml-56 sticky top-0 z-30">
      <div>
        <h2 className="text-white font-bold text-base leading-tight">Dashboard <span className="text-velora-accent">Overview</span></h2>
        <p className="text-[10px] text-slate-500 font-mono">{dateStr}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Alpha Trend badge */}
        <div className="flex items-center gap-1.5 bg-velora-success/10 border border-velora-success/30 text-velora-success text-xs px-3 py-1.5 rounded-full font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-velora-success animate-pulse inline-block"></span>
          ALPHA TREND ATIVO
        </div>

        {/* Fechar Tudo */}
        <button className="flex items-center gap-2 bg-velora-danger/90 hover:bg-velora-danger text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors">
          <XCircle size={14} />
          FECHAR TUDO
        </button>

        {/* Zap / Flash */}
        <button className="p-2 text-velora-warning hover:text-yellow-300 transition-colors">
          <Zap size={18} />
        </button>

        {/* Bell */}
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-velora-danger rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
