import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setDone(true);
    } catch {
      setError('Erro ao processar pedido. Tenta novamente.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-text1">YEVA <span className="text-cyan">TRADE</span></h1>
          <p className="font-mono text-[9px] text-text2 mt-1 tracking-widest uppercase">Recuperar Password</p>
        </div>

        <div className="bg-bg1 border border-border1 p-6">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border border-cyan-20 bg-cyan-dim flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#00d4a0" strokeWidth="2" strokeLinecap="square"/>
                </svg>
              </div>
              <p className="text-text1 font-semibold text-sm">Email enviado</p>
              <p className="font-mono text-[10px] text-text2">
                Se o email existir na plataforma, receberás um link para redefinir a password. Verifica também a caixa de spam.
              </p>
              <Link to="/login" className="block w-full py-2.5 border border-border2 text-text2 font-mono text-[9px] uppercase hover:text-text1 transition-all text-center">
                ← Voltar ao Login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="font-mono text-[10px] text-text2">
                Introduz o teu email e enviaremos um link para redefines a password.
              </p>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="email@exemplo.com"
                  className="w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2" />
              </div>
              {error && <p className="font-mono text-[10px] text-red bg-red-dim border border-red-30 p-3">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-cyan/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border border-cyan border-t-transparent rounded-full animate-spin" />A enviar...</> : 'Enviar Link de Recuperação'}
              </button>
              <Link to="/login" className="block text-center font-mono text-[9px] text-text3 hover:text-cyan transition-colors uppercase tracking-wider">
                ← Voltar ao Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
