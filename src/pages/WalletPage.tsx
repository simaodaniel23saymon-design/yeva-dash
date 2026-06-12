import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Wallet {
  balance: number;
  lockedBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalFeesPaid: number;
}

interface Settings {
  plan: string;
}

interface Deposit {
  paymentId: string;
  payAddress: string;
  payCurrency: string;
  payAmount: number;
  expiresAt?: string;
}

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [currency, setCurrency] = useState('USDTTRC20');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [walletRes, settingsRes] = await Promise.all([
      api.get<Wallet>('/wallet'),
      api.get<Settings>('/settings'),
    ]);
    setWallet(walletRes.data);
    setSettings(settingsRes.data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const startDeposit = async () => {
    setBusy(true); setError('');
    try {
      const res = await api.post<Deposit>('/payments/deposit', { currency });
      setDeposit(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao iniciar depósito');
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    setBusy(true); setError('');
    try {
      await api.post('/wallet/demo/reset');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao reiniciar demo');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-32 flex justify-center"><div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" /></div>;

  const isDemo = settings?.plan === 'DEMO';

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-text1 font-bold text-lg">Carteira</h2>
        <p className="font-mono text-[9px] text-text2 uppercase tracking-wider mt-0.5">{isDemo ? 'Conta demo virtual' : 'Saldo real e pagamentos'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Disponível', money(wallet?.balance ?? 0), 'text-cyan'],
          ['Bloqueado', money(wallet?.lockedBalance ?? 0), 'text-gold'],
          ['Depositado', money(wallet?.totalDeposited ?? 0), 'text-text1'],
          ['Levantado', money(wallet?.totalWithdrawn ?? 0), 'text-text1'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-bg1 border border-border1 p-4">
            <div className="font-mono text-[8px] uppercase tracking-[2px] text-text2 mb-2">{label}</div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">{error}</div>}

      {isDemo ? (
        <div className="bg-bg1 border border-border1 p-5">
          <h3 className="text-sm font-bold text-text1 mb-2">Conta Demo</h3>
          <p className="font-mono text-[10px] text-text2 mb-4">Saldo virtual para testar bots sem conectar exchange real nem fazer depósito.</p>
          <button onClick={resetDemo} disabled={busy}
            className="py-2.5 px-4 border border-gold-30 bg-gold-dim text-gold font-mono text-[9px] uppercase tracking-wider disabled:opacity-50">
            Repor para $10.000
          </button>
        </div>
      ) : (
        <div className="bg-bg1 border border-border1 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-text1">Depositar USDT</h3>
            <p className="font-mono text-[10px] text-text2 mt-1">NOWPayments gera o endereço quando as chaves estiverem activas.</p>
          </div>
          <div className="flex gap-2">
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2 outline-none">
              <option value="USDTTRC20">USDT TRC20</option>
              <option value="USDTBEP20">USDT BEP20</option>
              <option value="USDTERC20">USDT ERC20</option>
            </select>
            <button onClick={startDeposit} disabled={busy}
              className="py-2.5 px-4 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[9px] uppercase tracking-wider disabled:opacity-50">
              Gerar endereço
            </button>
          </div>

          {deposit && (
            <div className="bg-bg2 border border-border1 p-4 space-y-2">
              <p className="font-mono text-[9px] text-text2 uppercase">Endereço de pagamento</p>
              <code className="block text-cyan font-mono text-xs break-all">{deposit.payAddress}</code>
              <p className="font-mono text-[10px] text-text2">Montante: <span className="text-text1">{deposit.payAmount} {deposit.payCurrency}</span></p>
              {deposit.expiresAt && <p className="font-mono text-[10px] text-text2">Expira: {new Date(deposit.expiresAt).toLocaleString('pt-PT')}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
