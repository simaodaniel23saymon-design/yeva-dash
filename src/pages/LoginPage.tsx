import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function getLoginErrorMessage(err: unknown) {
  const error = err as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { error?: string } };
  };

  if (error.response?.status === 401) return 'Credenciais inválidas.';
  if (error.response?.status === 400) return error.response.data?.error ?? 'Preenche o email e a password.';
  if (error.response?.status === 409) return error.response.data?.error ?? 'Este email já está registado.';
  if (error.response?.status === 429) return 'Muitas tentativas. Aguarda um pouco e tenta novamente.';
  if (error.code === 'ECONNABORTED') return 'O servidor demorou a responder. Tenta novamente.';
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return 'Backend offline. Inicia o backend em http://localhost:3001 e tenta novamente.';
  }
  return error.response?.data?.error ?? 'Não foi possível concluir o pedido.';
}

export default function LoginPage() {
  const { login, register, loginDemo } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA step
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpDigits, setTotpDigits] = useState(['', '', '', '', '', '']);
  const totpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (requires2FA) totpRefs.current[0]?.focus();
  }, [requires2FA]);

  const handleTotpInput = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...totpDigits];
    next[idx] = val;
    setTotpDigits(next);
    if (val && idx < 5) totpRefs.current[idx + 1]?.focus();
  };

  const handleTotpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !totpDigits[idx] && idx > 0) {
      totpRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'Enter') handleSubmit(e as any);
  };

  const totpCode = totpDigits.join('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'register') {
        await register(email, password, referralCode || undefined);
        navigate('/dashboard');
        return;
      }

      if (requires2FA) {
        if (totpCode.length < 6) {
          setError('Introduz os 6 dígitos do autenticador.');
          setLoading(false);
          return;
        }
        const result = await login(email, password, totpCode);
        if (!result.requires2FA) navigate('/dashboard');
        return;
      }

      const result = await login(email, password);
      if (result.requires2FA) {
        setRequires2FA(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setLoading(true);
    try {
      await loginDemo();
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2";

  return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="YevaTrade" className="w-12 h-12 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="text-left">
              <h1 className="text-2xl font-bold text-text1">YEVA <span className="text-cyan">TRADE</span></h1>
              <p className="font-mono text-[9px] text-text2 tracking-[2px] uppercase">Alpha Trend Engine</p>
            </div>
          </div>
        </div>

        <div className="bg-bg1 border border-border1">
          {/* Tabs — só mostra quando não está no step 2FA */}
          {!requires2FA && (
            <div className="flex border-b border-border1">
              {(['login', 'register'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); }}
                  className={`flex-1 py-3 font-mono text-[10px] tracking-wider uppercase transition-all ${tab === t ? 'text-cyan border-b-2 border-cyan -mb-px' : 'text-text2 hover:text-text1'}`}>
                  {t === 'login' ? 'Entrar' : 'Criar Conta'}
                </button>
              ))}
            </div>
          )}

          {/* ─── STEP 2FA ─── */}
          {requires2FA ? (
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 border border-gold-30 bg-bg2 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="1" stroke="#d4a843" strokeWidth="1.5"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#d4a843" strokeWidth="1.5" strokeLinecap="square"/>
                    <circle cx="12" cy="16.5" r="1.5" fill="#d4a843"/>
                  </svg>
                </div>
                <p className="text-text1 font-semibold text-sm mb-1">Verificação em 2 Passos</p>
                <p className="font-mono text-[10px] text-text2 tracking-wide">
                  Introduz o código de 6 dígitos do<br />
                  Google Authenticator ou Authy
                </p>
              </div>

              {/* 6 inputs individuais */}
              <div className="flex gap-2 justify-center mb-5">
                {totpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { totpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleTotpInput(i, e.target.value)}
                    onKeyDown={e => handleTotpKeyDown(i, e)}
                    className="w-10 h-12 text-center text-xl font-bold text-cyan bg-bg3 border border-border2 outline-none focus:border-cyan transition-colors"
                  />
                ))}
              </div>

              {error && (
                <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red mb-4">
                  {error}
                </div>
              )}

              <button onClick={handleSubmit as any} disabled={loading || totpCode.length < 6}
                className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] tracking-widest uppercase hover:bg-cyan/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border border-cyan border-t-transparent rounded-full animate-spin" /> A verificar...</>
                  : 'Verificar Código'
                }
              </button>

              <button onClick={() => { setRequires2FA(false); setTotpDigits(['', '', '', '', '', '']); setError(''); }}
                className="w-full mt-3 py-2 font-mono text-[9px] text-text2 hover:text-text1 tracking-wider uppercase transition-colors">
                ← Voltar ao Login
              </button>
            </div>

          ) : (
            /* ─── FORMULÁRIO NORMAL ─── */
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com" required className={inputClass} />
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    required className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text2 hover:text-text1 transition-colors font-mono text-xs">
                    {showPass ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {tab === 'register' && (
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5">
                    Código de Indicação <span className="text-text3">(opcional)</span>
                  </label>
                  <input type="text" value={referralCode}
                    onChange={e => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="YVT-XXXXXX" className={inputClass} />
                </div>
              )}

              {error && (
                <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] tracking-widest uppercase hover:bg-cyan/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                {loading
                  ? <><span className="w-4 h-4 border border-cyan border-t-transparent rounded-full animate-spin" /> A processar...</>
                  : tab === 'login' ? 'Entrar na Plataforma' : 'Criar Conta Grátis'
                }
              </button>

              {tab === 'login' && (
                <div className="text-center">
                  <button type="button" onClick={() => navigate('/forgot-password')}
                    className="font-mono text-[9px] text-text3 hover:text-cyan transition-colors uppercase tracking-wider">
                    Esqueci a password
                  </button>
                </div>
              )}

              <button type="button" onClick={handleDemo} disabled={loading}
                className="w-full py-3 border border-gold-30 bg-gold-dim text-gold font-mono text-[10px] tracking-widest uppercase hover:bg-gold/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Entrar em Demo com $10.000
              </button>
            </form>
          )}
        </div>

        <p className="text-center font-mono text-[9px] text-text3 mt-4 tracking-wider">
          API Keys encriptadas com AES-256-GCM
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 font-mono text-[9px] uppercase tracking-wider text-text3">
          <Link to="/legal/terms" className="hover:text-cyan">Termos</Link>
          <Link to="/legal/privacy" className="hover:text-cyan">Privacidade</Link>
        </div>
      </div>
    </div>
  );
}
