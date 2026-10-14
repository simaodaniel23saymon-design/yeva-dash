import { useState, useRef, useEffect } from 'react';
import { YevaTradeLoader } from '../components/YevaTradeLoader';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriendlyError } from '../utils/errorHandler';
import { ErrorMessage } from '../components/ErrorMessage';
import { BrandLogo } from '../components/BrandLogo';
import OtpCodeInput from '../components/ui/OtpCodeInput';
import { TOTP_LENGTH } from '../utils/totpCode';
import { loginTotpError } from '../utils/loginTotp';
import { SESSION_ENDED_MESSAGE } from '../lib/sessionPolicy';

export default function LoginPage() {
  const { login, register, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired') === 'true';
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Captura ?ref=CODE (vindo de /ref/:code) → pré-preenche o registo
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setTab('register');
    }
  }, [searchParams]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [success, setSuccess] = useState(
    (location.state as { message?: string } | null)?.message ?? ''
  );

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 6000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // 2FA step
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const submittingTotp = useRef(false);

  /** Um único pedido por código; o código fica só no estado do formulário e é limpo se for recusado. */
  const submitTotp = async (code: string) => {
    if (submittingTotp.current) return;
    if (code.length !== TOTP_LENGTH) {
      setError('Introduz os 6 dígitos do autenticador.');
      return;
    }
    submittingTotp.current = true;
    setError('');
    setRateLimited(false);
    setLoading(true);
    try {
      const result = await login(email, password, code);
      if (!result.requires2FA) navigate('/dashboard');
    } catch (err: unknown) {
      const failure = loginTotpError(err);
      setTotpCode('');
      setError(failure.message);
      setRateLimited(failure.code === 'RATE_LIMITED');
    } finally {
      submittingTotp.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requires2FA) {
      await submitTotp(totpCode);
      return;
    }
    setError('');
    setRateLimited(false);
    setLoading(true);
    try {
      if (tab === 'register') {
        await register(email, password, referralCode || undefined);
        navigate('/dashboard');
        return;
      }

      const result = await login(email, password);
      if (result.requires2FA) {
        setRequires2FA(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const friendly = getFriendlyError(err);
      setError(friendly.message);
      setRateLimited(friendly.code === 'RATE_LIMITED');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setRateLimited(false);
    setLoading(true);
    try {
      await loginDemo();
      navigate('/dashboard');
    } catch (err: unknown) {
      const friendly = getFriendlyError(err);
      setError(friendly.message);
      setRateLimited(friendly.code === 'RATE_LIMITED');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2";

  return (
    <div className="auth-scroll bg-bg0 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <BrandLogo variant="auth" subtitle="Alpha Trend Engine" className="mb-2" />
        </div>

        <div className="bg-bg1 border border-border1">
          {expired && (
            <div className="bg-gold-dim border-b border-gold-30 p-4">
              <p className="font-mono text-[10px] text-gold leading-relaxed">
                {SESSION_ENDED_MESSAGE}
              </p>
            </div>
          )}

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

              <form onSubmit={handleSubmit} className="flex justify-center mb-5">
                <OtpCodeInput
                  id="login-totp"
                  value={totpCode}
                  onChange={setTotpCode}
                  onComplete={(code) => void submitTotp(code)}
                  busy={loading}
                  autoFocus
                />
              </form>

              {rateLimited && (
                <div className="mb-4 bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
                  Muitas tentativas. Aguarda alguns minutos e tenta novamente.
                </div>
              )}

              {error && !rateLimited && (
                <div className="mb-4">
                  <ErrorMessage message={error} onClose={() => setError('')} />
                </div>
              )}

              <button onClick={() => void submitTotp(totpCode)} disabled={loading || totpCode.length !== TOTP_LENGTH}
                className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] tracking-widest uppercase hover:bg-cyan/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading
                  ? <><YevaTradeLoader size="xs" /> A verificar...</>
                  : 'Verificar Código'
                }
              </button>

              <button onClick={() => { setRequires2FA(false); setTotpCode(''); setError(''); }}
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
                  {referralCode && (
                    <p className="mt-1.5 font-mono text-[9px] text-cyan">
                      ✓ Convite aplicado: <span className="font-bold">{referralCode}</span>
                    </p>
                  )}
                </div>
              )}

              {success && (
                <div className="bg-cyan-dim border border-cyan-20 p-3 font-mono text-[10px] text-cyan">{success}</div>
              )}

              {rateLimited && (
                <div className="bg-red-dim border border-red-30 p-3 font-mono text-[10px] text-red">
                  Muitas tentativas. Aguarda alguns minutos e tenta novamente.
                </div>
              )}

              {error && !rateLimited && <ErrorMessage message={error} onClose={() => setError('')} />}

              <button type="submit" disabled={loading}
                className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] tracking-widest uppercase hover:bg-cyan/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                {loading
                  ? <><YevaTradeLoader size="xs" /> A processar...</>
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
