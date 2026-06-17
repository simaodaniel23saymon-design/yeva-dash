import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { buildReferralLink } from '../utils/referral';
import { formatMoney, toUSDT } from '../utils/format';

interface AffiliateStats {
  referralCode: string;
  affiliate?: {
    totalEarned?: number;
    pendingCommissions?: number;
    activeLevels?: number;
  };
  commissions?: Array<{ id: string; level: number; amount: number; paidAt: string; status?: string }>;
  directReferrals?: number;
}

interface AffiliateData {
  referralCode: string;
  totalEarned: number;
  directReferrals: number;
  commissions: Array<{ id: string; level: number; amount: number; paidAt: string }>;
}

const COMMISSION_LEVELS = [
  { level: 1, pct: '15%' },
  { level: 2, pct: '10%' },
  { level: 3, pct: '8%' },
  { level: 4, pct: '6%' },
  { level: 5, pct: '4%' },
  { level: 6, pct: '3%' },
  { level: 7, pct: '2%' },
  { level: 8, pct: '1%' },
  { level: 9, pct: '0.5%' },
  { level: 10, pct: '0.5%' },
];

export default function AffiliateHub() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<AffiliateStats>('/affiliate/stats');
        setStats(res.data);
      } catch {
        try {
          const res = await api.get<AffiliateData>('/affiliates/me');
          setStats({
            referralCode: res.data.referralCode,
            affiliate: {
              totalEarned: res.data.totalEarned,
              pendingCommissions: 0,
              activeLevels: new Set(res.data.commissions.map(c => c.level)).size,
            },
            commissions: res.data.commissions,
            directReferrals: res.data.directReferrals,
          });
        } catch {
          setStats(null);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const copyLink = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(buildReferralLink(stats.referralCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const commissions = stats?.commissions ?? [];
  const totalEarned = stats?.affiliate?.totalEarned ?? 0;
  const pending = stats?.affiliate?.pendingCommissions ?? 0;
  const activeLevels = stats?.affiliate?.activeLevels ?? new Set(commissions.map(c => c.level)).size;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-text1 font-bold text-lg">Programa de Afiliados</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">10 níveis · 50% do depósito</p>
      </div>

      <div className="bg-bg1 border border-gold-30 p-5">
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-gold font-bold mb-3">Link de indicação</h3>
        <div className="flex items-center gap-2 bg-bg2 border border-border1 p-3">
          <code className="text-cyan font-mono text-sm flex-1 truncate">
            {buildReferralLink(stats?.referralCode)}
          </code>
          <button onClick={copyLink}
            className={`font-mono text-[9px] uppercase tracking-wider px-3 py-1.5 border transition-all flex-shrink-0 ${copied ? 'border-cyan-30 bg-cyan-dim text-cyan' : 'border-border2 text-text2 hover:border-cyan hover:text-cyan'}`}>
            {copied ? '✓ COPIADO' : 'COPIAR'}
          </button>
        </div>
        <p className="font-mono text-[9px] text-text3 mt-2">
          Código: <span className="text-text1 font-bold">{stats?.referralCode ?? '—'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Total ganho', value: formatMoney(totalEarned), color: 'text-cyan' },
          { label: 'Comissões pendentes', value: `$${toUSDT(pending).toFixed(2)}`, color: 'text-gold' },
          { label: 'Níveis activos', value: activeLevels, color: 'text-text1' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg1 border border-border1 p-4">
            <div className="font-mono text-[8px] uppercase tracking-[2px] text-text2 mb-2">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {stats?.directReferrals != null && (
        <div className="bg-bg1 border border-border1 p-4">
          <span className="font-mono text-[8px] uppercase text-text3">Referências directas: </span>
          <span className="font-mono text-sm font-bold text-cyan">{stats.directReferrals}</span>
        </div>
      )}

      <div className="bg-bg1 border border-border1">
        <div className="px-4 py-3 border-b border-border1">
          <h3 className="text-sm font-bold text-text1">Distribuição de comissões</h3>
          <p className="font-mono text-[8px] uppercase tracking-widest text-text2 mt-0.5">
            Total: 50% do depósito entre 10 níveis
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border1">
              <tr>
                {['Nível', 'Comissão', 'Descrição'].map(h => (
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
                    {level === 1 ? 'Indicação directa (quem te convidou)' : `${level}º nível da rede`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-bg1 border border-border1">
        <div className="px-4 py-3 border-b border-border1">
          <h3 className="text-sm font-bold text-text1">Histórico de comissões</h3>
        </div>
        {commissions.length === 0 ? (
          <div className="p-8 text-center font-mono text-[11px] text-text2">
            Ainda sem comissões. Partilha o teu link para começar a ganhar!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-border1">
                <tr>
                  {['Data', 'Nível', 'Valor', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1">
                {commissions.map(c => (
                  <tr key={c.id} className="hover:bg-bg2 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-text2">
                      {new Date(c.paidAt).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-cyan font-bold">Nível {c.level}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-cyan font-bold">
                      +{formatMoney(c.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 border border-cyan-30 bg-cyan-dim text-cyan">
                        {c.status ?? 'Pago'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
