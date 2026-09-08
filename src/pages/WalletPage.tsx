import { useEffect, useState, useRef } from 'react';
import { YevaTradeLoader } from '../components/YevaTradeLoader';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { QuickGuide } from '../components/QuickGuide';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';
import { formatMoney, formatUSDT, toUSDT } from '../utils/format';
import { getFriendlyError } from '../utils/errorHandler';
import { MIN_DEPOSIT } from '../utils/constants';
import { listDepositNetworks } from '../utils/depositNetworks';

interface Tx {
  id: string; type: string; amount: number; status: string;
  createdAt: string; network?: string; note?: string;
}
interface Deposit {
  paymentId: string; payAddress: string; payCurrency: string;
  payAmount: number; expiresAt?: string;
}

const dt = (s: string) => new Date(s).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function WalletPage() {
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useWallet(30000);
  const { gasBalance, binanceUSDT, loading: balancesLoading, refresh: refreshBalances } = useBalances(30000);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Depósito
  const [currency, setCurrency] = useState('usdtbsc');
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const depositNetworks = listDepositNetworks(MIN_DEPOSIT);
  const selectedNet = depositNetworks.find((n) => n.id === currency) ?? depositNetworks[0];

  // Saque
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const WITHDRAW_NETWORK = 'BEP20'; // Rede fixa — BEP20 BSC
  const [withdrawCode, setWithdrawCode] = useState('');
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'code'>('form');

  const showFlash = (text: string, ok = true) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash(null), 4000);
  };

  const loadWallet = async () => {
    const txRes = await api.get<Tx[]>('/payments/transactions');
    setTxs(txRes.data);
    await Promise.all([refreshWallet(), refreshBalances()]);
  };

  useEffect(() => {
    loadWallet().finally(() => setLoading(false));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Polling automático do status do pagamento a cada 20s
  const startPolling = (paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<{ status: string; actuallyPaid: number }>(`/payments/deposit/${paymentId}/status`);
        setPayStatus(res.data.status);
        if (res.data.status === 'finished' || res.data.status === 'confirmed') {
          clearInterval(pollRef.current!);
          showFlash(`Pagamento confirmado! $${res.data.actuallyPaid} creditado na tua conta.`);
          await loadWallet();
          setDeposit(null);
        }
      } catch { /* ignora erros de polling */ }
    }, 20000);
  };

  const startDeposit = async () => {
    setBusy(true);
    try {
      const res = await api.post<Deposit>('/payments/deposit', { currency });
      setDeposit(res.data);
      setPayStatus('waiting');
      startPolling(res.data.paymentId);
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message, false);
    } finally { setBusy(false); }
  };

  const copyAddress = async () => {
    if (!deposit?.payAddress) return;
    await navigator.clipboard.writeText(deposit.payAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendWithdrawCode = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 10) return showFlash('Valor mínimo de saque: $10', false);
    if (!withdrawAddress) return showFlash('Introduz o endereço de destino', false);
    setBusy(true);
    try {
      await api.post('/payments/withdraw/send-code', {
        amount, address: withdrawAddress, network: WITHDRAW_NETWORK
      });
      setWithdrawStep('code');
      showFlash('Código enviado para o teu email. Verifica a caixa de entrada.');
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message, false);
    } finally { setBusy(false); }
  };

  const confirmWithdraw = async () => {
    if (!withdrawCode) return showFlash('Introduz o código de confirmação', false);
    setBusy(true);
    try {
      await api.post('/payments/withdraw', {
        amount: parseFloat(withdrawAmount),
        address: withdrawAddress,
        network: WITHDRAW_NETWORK,
        code: withdrawCode,
      });
      showFlash('Saque solicitado com sucesso! Processamento em 1-24h.');
      setWithdrawStep('form');
      setWithdrawAmount(''); setWithdrawAddress(''); setWithdrawCode('');
      await loadWallet();
    } catch (err: unknown) {
      showFlash(getFriendlyError(err).message, false);
    } finally { setBusy(false); }
  };

  const statusLabel: Record<string, string> = {
    waiting: 'A aguardar pagamento…',
    confirming: 'A confirmar na blockchain…',
    confirmed: 'Confirmado ✓',
    finished: 'Concluído ✓',
    partially_paid: 'Parcialmente pago',
    failed: 'Falhou',
    expired: 'Expirou',
  };

  if (loading || walletLoading || balancesLoading) return (
    <div className="py-32 flex justify-center">
      <YevaTradeLoader size="md" />
    </div>
  );

  const inputClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/40 transition-colors placeholder:text-text3";
  const selectClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/40 transition-colors";

  return (
    <div className="space-y-4 max-w-2xl">
      <QuickGuide title="Sobre a tua carteira" steps={[
        `Gás do sistema: mínimo $${MIN_DEPOSIT} USDT para usar os bots`,
        'Saldo Binance: dinheiro real na exchange para operar',
        'Performance fee de 30% sobre lucros desconta do gás',
        'Recebes alertas por email e Telegram quando o gás acabar',
      ]} />

      <div>
        <h2 className="text-text1 font-bold text-lg">Carteira</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-text2 mt-0.5">Gás interno + saldo Binance</p>
      </div>

      {/* Dois saldos principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-bg1 border border-cyan-20 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-cyan font-bold">Gás do Sistema</h3>
            <span className="font-mono text-[8px] px-1.5 py-0.5 border border-cyan-30 text-cyan">Interno</span>
          </div>
          <p className="text-2xl font-bold text-cyan">${formatUSDT(wallet?.balance ?? gasBalance)} USDT</p>
          <p className="font-mono text-[10px] text-text2 mt-2">{`Usado para operar os bots. Mínimo: $${MIN_DEPOSIT} USDT`}</p>
          <Link to="/deposit"
            className="inline-block mt-4 font-mono text-[9px] uppercase tracking-wider px-4 py-2 border border-cyan-30 bg-cyan-dim text-cyan hover:bg-cyan/20 transition-all">
            + Recarregar Gás
          </Link>
        </div>

        <div className="bg-bg1 border border-gold-30 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-[9px] uppercase tracking-wider text-gold font-bold">Saldo Binance</h3>
            <span className="font-mono text-[8px] px-1.5 py-0.5 border border-gold-30 text-gold">Exchange</span>
          </div>
          <p className="text-2xl font-bold text-gold">${binanceUSDT.toFixed(2)} USDT</p>
          <p className="font-mono text-[10px] text-text2 mt-2">Dinheiro real para operar na Binance</p>
          <a href="https://www.binance.com/pt/my/wallet" target="_blank" rel="noreferrer"
            className="inline-block mt-4 font-mono text-[9px] uppercase tracking-wider px-4 py-2 border border-gold-30 bg-gold-dim text-gold hover:bg-gold/15 transition-all">
            Ver na Binance →
          </a>
        </div>
      </div>

      <div className="bg-gold-dim border border-gold-30 p-4">
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-gold font-bold mb-2">Como funciona</h3>
        <ul className="font-mono text-[10px] text-text2 space-y-1">
          <li>• <strong className="text-text1">Gás do sistema</strong>: {`depósito mínimo $${MIN_DEPOSIT} USDT para usar os bots`}</li>
          <li>• <strong className="text-text1">Saldo Binance</strong>: capital real na exchange</li>
          <li>• <strong className="text-text1">Performance fee</strong>: 30% sobre lucros descontado do gás</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Bloqueado',   formatMoney(wallet?.lockedBalance),    'text-gold'],
          ['Depositado',  formatMoney(wallet?.totalDeposited),   'text-text1'],
          ['Levantado',   formatMoney(wallet?.totalWithdrawn),   'text-text1'],
          ['Taxas pagas', formatMoney(wallet?.totalFeesPaid ?? 0), 'text-text2'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-bg1 border border-border1 p-4">
            <div className="font-mono text-[8px] uppercase tracking-[2px] text-text3 mb-2">{label}</div>
            <div className={`text-lg font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Flash */}
      {flash && (
        <div className={`p-3 border font-mono text-[10px] ${flash.ok ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-red-dim border-red-30 text-red'}`}>
          {flash.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['deposit', 'withdraw'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-[9px] uppercase tracking-wider border transition-all ${tab === t ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'border-border2 text-text2 hover:border-border1 hover:text-text1'}`}>
            {t === 'deposit' ? 'Depositar' : 'Levantar'}
          </button>
        ))}
      </div>

      {/* ── DEPÓSITO ── */}
      {tab === 'deposit' && (
        <div className="bg-bg1 border border-border1 p-5 space-y-4">
          <div>
            <h3 className="font-bold text-text1">Adicionar Fundos</h3>
            <p className="font-mono text-[10px] text-text2 mt-1">
              Escolhe a rede e gera um endereço de pagamento único. O saldo é creditado automaticamente após confirmação na blockchain.
            </p>
          </div>

          {!deposit ? (
            <div className="space-y-3">
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1.5 block">
                  Rede de pagamento (baratas primeiro)
                </label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectClass}>
                  {depositNetworks.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.label} · fee {n.feeLabel}{n.warning ? ' ⚠' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedNet && (
                <div className="bg-bg2 border border-border1 p-3 font-mono text-[10px] space-y-1">
                  <p className="text-cyan">fee estimada da rede: {selectedNet.feeLabel}</p>
                  {selectedNet.warning && <p className="text-gold">{selectedNet.warning}</p>}
                  {selectedNet.feeTooHigh && (
                    <p className="text-gold">
                      Fee &gt; 5% do mínimo — preferir BEP20 ou Polygon (~$0.01).
                    </p>
                  )}
                </div>
              )}
              <div className="bg-bg2 border border-border1 p-3 font-mono text-[10px] text-text2">
                Mínimo: <span className="text-cyan">${MIN_DEPOSIT}</span> · Confirmação automática após 1-3 blocos
              </div>
              <button onClick={startDeposit} disabled={busy}
                className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-cyan/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {busy ? <><YevaTradeLoader size="xs" />A gerar...</> : '⬇ Gerar Endereço de Pagamento'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status badge */}
              <div className={`flex items-center gap-2 font-mono text-[10px] px-3 py-2 border ${payStatus === 'finished' || payStatus === 'confirmed' ? 'bg-cyan-dim border-cyan-20 text-cyan' : 'bg-gold-dim border-gold-30 text-gold'}`}>
                {payStatus !== 'finished' && payStatus !== 'confirmed' && (
                  <span className="w-2 h-2 rounded-full bg-gold animate-pulse flex-shrink-0" />
                )}
                {statusLabel[payStatus ?? 'waiting'] ?? payStatus}
                {payStatus !== 'finished' && payStatus !== 'confirmed' && (
                  <span className="ml-auto text-text3">Verificando automaticamente…</span>
                )}
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <p className="font-mono text-[8px] uppercase tracking-wider text-text3">Endereço de destino</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-bg2 border border-border1 px-3 py-2.5 text-cyan font-mono text-xs break-all leading-relaxed">
                    {deposit.payAddress}
                  </code>
                  <button onClick={copyAddress}
                    className={`px-3 border font-mono text-[9px] uppercase flex-shrink-0 transition-all ${copied ? 'border-cyan-20 bg-cyan-dim text-cyan' : 'border-border2 text-text2 hover:border-border1 hover:text-text1'}`}>
                    {copied ? '✓' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div className="bg-bg2 border border-border1 p-3">
                  <span className="text-text3 block mb-1">Rede</span>
                  <span className="text-text1">{deposit.payCurrency?.toUpperCase()}</span>
                </div>
                <div className="bg-bg2 border border-border1 p-3">
                  <span className="text-text3 block mb-1">Valor mínimo</span>
                  <span className="text-cyan">{deposit.payAmount} {deposit.payCurrency?.toUpperCase()}</span>
                </div>
              </div>

              {deposit.expiresAt && (
                <p className="font-mono text-[9px] text-text3">
                  Expira: {new Date(deposit.expiresAt).toLocaleString('pt-PT')}
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setDeposit(null); setPayStatus(null); if (pollRef.current) clearInterval(pollRef.current); }}
                  className="flex-1 py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase hover:text-text1 transition-all">
                  Cancelar
                </button>
                <button onClick={() => startPolling(deposit.paymentId)}
                  className="flex-1 py-2.5 border border-cyan-30 text-cyan font-mono text-[9px] uppercase hover:bg-cyan-dim transition-all">
                  Verificar agora
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SAQUE ── */}
      {tab === 'withdraw' && (
        <div className="bg-bg1 border border-border1 p-5 space-y-4">
          <div>
            <h3 className="font-bold text-text1">Levantar Fundos</h3>
            <p className="font-mono text-[10px] text-text2 mt-1">
              Saque mínimo: <span className="text-cyan">$10</span> · Um código de confirmação será enviado para o teu email.
            </p>
          </div>

          {withdrawStep === 'form' ? (
            <div className="space-y-3">
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1.5 block">Valor (USD)</label>
                <input type="number" min="10" value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="Ex: 50" className={inputClass} />
                {wallet && withdrawAmount && parseFloat(withdrawAmount) > toUSDT(wallet.balance) && (
                  <p className="font-mono text-[9px] text-red mt-1">Saldo insuficiente (disponível: {formatMoney(wallet.balance)})</p>
                )}
              </div>
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1.5 block">
                  Endereço BEP20 (BSC) de destino
                </label>
                <input type="text" value={withdrawAddress}
                  onChange={e => setWithdrawAddress(e.target.value)}
                  placeholder="0x... (carteira BEP20)"
                  className={inputClass} />
              </div>
              <div className="bg-bg2 border border-border1 p-3 font-mono text-[10px] text-text2">
                Rede: <span className="text-gold">BEP20 — Binance Smart Chain</span> · Mínimo: <span className="text-cyan">$10</span>
              </div>
              <div className="bg-gold-dim border border-gold-30 p-3 font-mono text-[10px] text-gold">
                ⚠ Verifica o endereço antes de continuar. Transacções cripto são irreversíveis.
              </div>
              <button onClick={sendWithdrawCode} disabled={busy || !withdrawAmount || !withdrawAddress}
                className="w-full py-3 border border-gold-30 bg-gold-dim text-gold font-mono text-[10px] uppercase tracking-widest hover:bg-gold/15 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                {busy ? <><YevaTradeLoader size="xs" />A processar...</> : '⬆ Solicitar Saque'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] text-cyan">
                Código enviado para o teu email. Válido por 10 minutos.
              </div>
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider text-text3 mb-1.5 block">Código de confirmação (6 dígitos)</label>
                <input type="text" maxLength={6} value={withdrawCode}
                  onChange={e => setWithdrawCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456" className={`${inputClass} tracking-[0.5em] text-center text-lg`} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setWithdrawStep('form'); setWithdrawCode(''); }}
                  className="flex-1 py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase hover:text-text1 transition-all">
                  Voltar
                </button>
                <button onClick={confirmWithdraw} disabled={busy || withdrawCode.length < 6}
                  className="flex-1 py-2.5 border border-gold-30 bg-gold-dim text-gold font-mono text-[9px] uppercase hover:bg-gold/15 disabled:opacity-40 transition-all">
                  {busy ? 'A processar...' : 'Confirmar Saque'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {txs.length > 0 && (
        <div className="bg-bg1 border border-border1">
          <div className="px-4 py-3 border-b border-border1">
            <h3 className="text-sm font-bold text-text1">Histórico</h3>
          </div>
          <div className="divide-y divide-border1">
            {txs.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`font-mono text-[8px] px-1.5 py-0.5 border flex-shrink-0 ${tx.type === 'DEPOSIT' ? 'text-cyan border-cyan-20' : tx.type === 'WITHDRAWAL' ? 'text-gold border-gold-30' : 'text-text2 border-border2'}`}>
                  {tx.type === 'DEPOSIT' ? 'DEP' : tx.type === 'WITHDRAWAL' ? 'SAQ' : 'FEE'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-sm font-bold ${tx.type === 'DEPOSIT' ? 'text-cyan' : 'text-gold'}`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{formatMoney(tx.amount)}
                  </p>
                  {tx.note && <p className="font-mono text-[9px] text-text3 truncate">{tx.note}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`font-mono text-[8px] block ${tx.status === 'CONFIRMED' ? 'text-cyan' : tx.status === 'PENDING' ? 'text-gold' : 'text-red'}`}>
                    {tx.status}
                  </span>
                  <span className="font-mono text-[9px] text-text3">{dt(tx.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
