import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AffiliateData {
  referralCode: string;
  referralLink: string;
  totalEarned: number;
  directReferrals: number;
  commissions: Array<{ id: string; level: number; amount: number; paidAt: string; }>;
}

const COMMISSION_LEVELS = [
  { level: 1, pct: '12%' }, { level: 2, pct: '6%' }, { level: 3, pct: '4%' },
  { level: 4, pct: '3%' }, { level: 5, pct: '3%' }, { level: 6, pct: '2%' },
  { level: 7, pct: '2%' }, { level: 8, pct: '1%' }, { level: 9, pct: '1%' }, { level: 10, pct: '1%' },
];

export default function AffiliateHub() {
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<AffiliateData>('/affiliates/me').then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Referral Link */}
      <div className="bg-bg1 border border-border1">
        <div className="px-4 py-3 border-b border-border1">
          <h3 className="text-sm font-bold text-text1">Hub de Indicações</h3>
          <p className="font-mono text-[8px] uppercase tracking-widest text-text2 mt-0.5">Programa de Afiliados · 10 Níveis</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 bg-bg2 border border-border1 p-3">
            <code className="text-cyan font-mono text-sm flex-1 truncate">{data?.referralLink ?? '—'}</code>
            <button onClick={copyLink}
              className={`font-mono text-[9px] uppercase tracking-wider px-3 py-1.5 border transition-all flex-shrink-0 ${copied ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text2 hover:border-cyan hover:text-cyan'}`}>
              {copied ? '✓ COPIADO' : '⧉ COPIAR'}
            </button>
          </div>
          <p className="font-mono text-[9px] text-text2">
            Código: <span className="text-text1 font-bold">{data?.referralCode}</span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Referências Directas', value: data?.directReferrals ?? 0, color: 'text-cyan' },
          { label: 'Total Ganho',           value: `$${(data?.totalEarned ?? 0).toFixed(2)}`, color: 'text-cyan' },
          { label: 'Comissões Registadas',  value: data?.commissions.length ?? 0, color: 'text-gold' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg1 border border-border1 p-4 hover:bg-bg2 transition-colors">
            <div className="font-mono text-[8px] uppercase tracking-[2px] text-text2 mb-2">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Estrutura de Comissões */}
      <div className="bg-bg1 border border-border1">
        <div className="px-4 py-3 border-b border-border1">
          <h3 className="text-sm font-bold text-text1">Estrutura de Comissões</h3>
          <p className="font-mono text-[8px] uppercase tracking-widest text-text2 mt-0.5">10 Níveis de Rede</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border1">
              <tr>
                {['Nível','Comissão','Descrição'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border1">
              {COMMISSION_LEVELS.map(({ level, pct }) => (
                <tr key={level} className="hover:bg-bg2 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-cyan font-bold">Nível {level}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gold font-bold">{pct}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-text2">
                    {level === 1 ? 'Indicação directa' : `${level}º nível da rede`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-bg1 border border-border1">
        <div className="px-4 py-3 border-b border-border1">
          <h3 className="text-sm font-bold text-text1">Histórico de Comissões</h3>
        </div>
        {!data?.commissions.length ? (
          <div className="p-8 text-center font-mono text-[11px] text-text2">
            Ainda sem comissões. Partilha o teu link para começar a ganhar!
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border1">
              <tr>
                {['Nível','Montante','Data'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border1">
              {data.commissions.map(c => (
                <tr key={c.id} className="hover:bg-bg2 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-cyan font-bold">N{c.level}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-cyan font-bold">+${c.amount.toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-text2">{new Date(c.paidAt).toLocaleDateString('pt-PT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
