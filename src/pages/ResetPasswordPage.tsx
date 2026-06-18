import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getFriendlyError } from '../utils/errorHandler';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('As passwords não coincidem');
    if (password.length < 8) return setError('Password deve ter pelo menos 8 caracteres');
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { state: { message: 'Password alterada com sucesso! Podes fazer login.' } });
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red font-mono text-sm">Link inválido.</p>
        <Link to="/login" className="mt-4 block font-mono text-[9px] text-cyan">← Voltar ao Login</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-text1">YEVA <span className="text-cyan">TRADE</span></h1>
          <p className="font-mono text-[9px] text-text2 mt-1 tracking-widest uppercase">Nova Password</p>
        </div>
        <div className="bg-bg1 border border-border1 p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5">Nova Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={8} placeholder="Mínimo 8 caracteres"
                className="w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2" />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5">Confirmar Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required placeholder="Repete a password"
                className="w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2" />
            </div>
            {error && <p className="font-mono text-[10px] text-red bg-red-dim border border-red-30 p-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 border border-cyan-30 bg-cyan-dim text-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-cyan/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border border-cyan border-t-transparent rounded-full animate-spin" />A guardar...</> : 'Guardar Nova Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
