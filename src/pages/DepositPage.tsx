import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { getFriendlyError } from '../utils/errorHandler';
import { toWalletUnits } from '../utils/format';
import { MIN_DEPOSIT } from '../utils/constants';

const DISTRIBUTION_LEVELS = [
  { level: 1, pct: 15, label: 'Quem te convidou' },
  { level: 2, pct: 10 },
  { level: 3, pct: 8 },
  { level: 4, pct: 6 },
  { level: 5, pct: 4 },
  { level: 6, pct: 3 },
  { level: 7, pct: 2 },
  { level: 8, pct: 1 },
  { level: 9, pct: 0.5 },
  { level: 10, pct: 0.5 },
];

export default function DepositPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(String(MIN_DEPOSIT));
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null);

  const showFlash = (text: string, ok = true) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash(null), 5000);
  };

  const handleDeposit = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value < MIN_DEPOSIT) {
      showFlash(`Depósito mínimo: $${MIN_DEPOSIT} USDT`, false);
      return;
    }

    setLoading(true);
    try {
      const amountUnits = toWalletUnits(value, 17000000); // prefer micro se backend usar micro
      await api.post('/wallet/deposit', { amount: amountUnits });
      showFlash('Depósito realizado com sucesso!');
      setTimeout(() => navigate('/wallet'), 1500);
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message, false);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/40 transition-colors';

  return (
    <div className="space-y-4 max-w-lg">
      <QuickGuide title="Recarregar gás" steps={[
        `Mínimo de $${MIN_DEPOSIT} USDT para activar o sistema`,
        '50% fica no sistema · 50% distribuído a afiliados',
        'Performance fee de 30% sobre lucros desconta do gás',
      ]} />

      <div>
        <h2 className="text-text1 font-bold text-lg">Recarregar Gás</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">
          Saldo interno para operar os bots
        </p>
      </div>

      {flash && (
        <div className={`p-3 border font-mono text-[10px] ${flash.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>
          {flash.text}
        </div>
      )}

      <div className="bg-bg1 border border-border1 p-5 space-y-4">
        <div>
          <label className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5 block">
            Valor (USDT)
          </label>
          <input
            type="number"
            min={MIN_DEPOSIT}
            step={1}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className={inputClass}
          />
          <p className="font-mono text-[9px] text-text3 mt-1">Mínimo: ${MIN_DEPOSIT} USDT</p>
        </div>

        <div className="bg-bg2 border border-cyan-20 p-4 space-y-2">
          <h4 className="font-mono text-[9px] uppercase tracking-wider text-cyan font-bold">
            Distribuição do depósito
          </h4>
          <ul className="font-mono text-[10px] text-text2 space-y-1">
            <li>• <span className="text-text1">50%</span> fica no sistema (gás)</li>
            <li>• <span className="text-text1">50%</span> distribuído em 10 níveis de afiliados:</li>
          </ul>
          <div className="mt-2 space-y-1 max-h-40 scroll-area">
            {DISTRIBUTION_LEVELS.map(({ level, pct, label }) => (
              <div key={level} className="flex justify-between font-mono text-[9px] text-text2 border-b border-border1 py-1">
                <span>Nível {level}{label ? ` (${label})` : ''}</span>
                <span className="text-gold font-bold">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleDeposit}
          disabled={loading}
          className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-cyan/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="w-3 h-3 border border-cyan border-t-transparent rounded-full animate-spin" /> A processar...</>
          ) : (
            `Depositar $${amount || MIN_DEPOSIT} USDT`
          )}
        </button>

        <p className="font-mono text-[9px] text-text3 text-center">
          Preferes pagar via cripto (NOWPayments)?{' '}
          <Link to="/wallet" className="text-cyan hover:underline">Ir para Carteira → Depositar</Link>
        </p>
      </div>
    </div>
  );
}
