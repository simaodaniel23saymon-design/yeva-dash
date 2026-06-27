import { useEffect, useState } from 'react';
import { YevaTradeLoader } from './YevaTradeLoader';
import { api } from '../lib/api';
import { buildReferralLink } from '../utils/referral';
import { formatMoney, toUSDT } from '../utils/format';
import { StatCard } from './ui/StatCard';
import {
  IconNetwork,
  IconLink,
  IconCopy,
  IconCheck,
  IconWallet,
  IconClock,
  IconLayers,
  IconUsers,
  IconShare,
  IconEmptyInbox,
} from './ui/Icons';

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
  { level: 1, pct: '15%', pctNum: 15 },
  { level: 2, pct: '10%', pctNum: 10 },
  { level: 3, pct: '8%', pctNum: 8 },
  { level: 4, pct: '6%', pctNum: 6 },
  { level: 5, pct: '4%', pctNum: 4 },
  { level: 6, pct: '3%', pctNum: 3 },
  { level: 7, pct: '2%', pctNum: 2 },
  { level: 8, pct: '1%', pctNum: 1 },
  { level: 9, pct: '0.5%', pctNum: 0.5 },
  { level: 10, pct: '0.5%', pctNum: 0.5 },
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
  const earnedLevels = new Set(commissions.map(c => c.level));
  const referralLink = stats?.referralCode ? buildReferralLink(stats.referralCode) : '';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <YevaTradeLoader size="md" label="A carregar rede..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden bg-bg1 border border-border1 p-5 sm:p-6">
        <div className="absolute -top-6 -right-6 w-28 h-28 text-gold/10 pointer-events-none">
          <IconNetwork size={112} />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 bg-gold-dim border border-gold-30 flex items-center justify-center text-gold shrink-0">
            <IconNetwork size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-text1 font-bold text-lg sm:text-xl">Programa de Indicações</h2>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text2 mt-1">
              10 níveis · até 50% do depósito distribuído na rede
            </p>
          </div>
          {stats?.directReferrals != null && (
            <div className="flex items-center gap-2 bg-bg2 border border-cyan-20 px-3 py-2 shrink-0">
              <span className="text-cyan"><IconUsers size={16} /></span>
              <div>
                <p className="font-mono text-[8px] uppercase text-text3">Directos</p>
                <p className="font-bold text-cyan text-lg leading-none">{stats.directReferrals}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Link de indicação */}
      <div className="bg-bg1 border border-gold-30 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-gold"><IconLink size={16} /></span>
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-gold font-bold">
            O teu link de indicação
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-bg2 border border-border1 p-3">
          <code className="text-cyan font-mono text-sm flex-1 truncate min-w-0">
            {referralLink || '—'}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className={`inline-flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider px-4 py-2.5 border transition-all shrink-0 ${
              copied
                ? 'border-cyan-30 bg-cyan-dim text-cyan'
                : 'border-border2 text-text2 hover:border-gold-30 hover:text-gold'
            }`}
          >
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
        </div>
        <p className="font-mono text-[10px] text-text3 mt-3 flex items-center gap-2">
          <IconShare size={12} className="text-text3 shrink-0" />
          Código:
          <span className="text-text1 font-bold tracking-widest">{stats?.referralCode ?? '—'}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Total ganho"
          value={formatMoney(totalEarned)}
          icon={<IconWallet size={18} />}
          accent="cyan"
          delay={0}
        />
        <StatCard
          label="Comissões pendentes"
          value={`$${toUSDT(pending).toFixed(2)}`}
          icon={<IconClock size={18} />}
          accent="gold"
          delay={60}
        />
        <StatCard
          label="Níveis activos"
          value={activeLevels}
          sub="de 10 níveis disponíveis"
          icon={<IconLayers size={18} />}
          accent="default"
          delay={120}
        />
      </div>

      {/* Níveis — grid visual */}
      <div className="bg-bg1 border border-border1">
        <div className="px-4 py-3 border-b border-border1 flex items-center gap-2">
          <span className="text-cyan"><IconLayers size={16} /></span>
          <div>
            <h3 className="text-sm font-bold text-text1">Estrutura de comissões</h3>
            <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">
              50% do depósito repartido por nível
            </p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {COMMISSION_LEVELS.map(({ level, pct, pctNum }) => {
            const active = earnedLevels.has(level);
            return (
              <div
                key={level}
                className={`relative border p-3 transition-colors ${
                  active
                    ? 'bg-cyan-dim border-cyan-30'
                    : 'bg-bg2 border-border1 hover:border-border2'
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
                )}
                <p className="font-mono text-[8px] uppercase text-text3">Nível {level}</p>
                <p className={`font-bold text-lg mt-0.5 ${active ? 'text-cyan' : 'text-gold'}`}>{pct}</p>
                <div className="mt-2 h-1 bg-bg3 overflow-hidden">
                  <div
                    className={`h-full ${active ? 'bg-cyan' : 'bg-gold/40'}`}
                    style={{ width: `${Math.min(pctNum * 6, 100)}%` }}
                  />
                </div>
                <p className="font-mono text-[8px] text-text3 mt-1.5 leading-tight">
                  {level === 1 ? 'Indicação directa' : `${level}º grau`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-bg1 border border-border1">
        <div className="px-4 py-3 border-b border-border1 flex items-center gap-2">
          <span className="text-text2"><IconWallet size={16} /></span>
          <h3 className="text-sm font-bold text-text1">Histórico de comissões</h3>
        </div>
        {commissions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="inline-flex w-14 h-14 items-center justify-center bg-bg2 border border-border1 text-text3 mb-4">
              <IconEmptyInbox size={28} />
            </div>
            <p className="font-mono text-[12px] text-text2 max-w-xs mx-auto leading-relaxed">
              Ainda sem comissões registadas. Partilha o teu link para começar a construir a rede.
            </p>
            {stats?.referralCode && (
              <button
                type="button"
                onClick={copyLink}
                className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:border-cyan transition-colors"
              >
                <IconShare size={14} />
                Partilhar link
              </button>
            )}
          </div>
        ) : (
          <div className="scroll-area-x">
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-border1 bg-bg2/50">
                <tr>
                  {['Data', 'Nível', 'Valor', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[8px] uppercase tracking-widest text-text2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border1">
                {commissions.map(c => (
                  <tr key={c.id} className="hover:bg-bg2/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-text2">
                      {new Date(c.paidAt).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-cyan font-bold">
                        <IconLayers size={12} />
                        Nível {c.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-cyan font-bold">
                      +{formatMoney(c.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[8px] uppercase px-2 py-1 border border-cyan-30 bg-cyan-dim text-cyan">
                        <IconCheck size={10} />
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
