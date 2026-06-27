import { useState } from 'react';
import { YevaTradeLoader } from '../components/YevaTradeLoader';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getFriendlyError } from '../utils/errorHandler';

export default function DeleteAccountPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'ELIMINAR') {
      setError('Escreve ELIMINAR para confirmar.');
      return;
    }
    if (!password) {
      setError('Introduz a tua password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.delete('/auth/user', { data: { password } });
      await logout();
      navigate('/login', {
        replace: true,
        state: { message: 'Conta eliminada com sucesso.' },
      });
    } catch (err: unknown) {
      setError(getFriendlyError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-bg3 border border-border2 text-text1 font-mono text-sm px-3 py-2.5 outline-none focus:border-cyan/35 transition-colors placeholder:text-text2';

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Link to="/settings" className="font-mono text-[9px] text-text2 hover:text-cyan uppercase tracking-wider">
          ← Voltar às definições
        </Link>
        <h2 className="text-text1 font-bold text-lg mt-3">Eliminar conta</h2>
        <p className="font-mono text-[10px] text-text2 mt-1 leading-relaxed">
          Esta acção é permanente. Todos os bots serão parados, a exchange desconectada e os teus dados removidos.
        </p>
      </div>

      <div className="bg-red-dim border border-red-30 p-4 font-mono text-[10px] text-red leading-relaxed">
        ⚠ Não é possível recuperar a conta após a eliminação. Garante que retiraste fundos pendentes antes de continuar.
      </div>

      <form onSubmit={submit} className="bg-bg1 border border-border1 p-5 space-y-4">
        <div>
          <label className="block font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5">
            Password actual
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder="Confirma a tua password"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block font-mono text-[9px] uppercase tracking-wider text-text2 mb-1.5">
            Escreve <span className="text-red">ELIMINAR</span> para confirmar
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            autoComplete="off"
            placeholder="ELIMINAR"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="font-mono text-[10px] text-red bg-red-dim border border-red-30 p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || confirmText !== 'ELIMINAR' || !password}
          className="w-full py-3 border border-red-30 bg-red-dim text-red font-mono text-[10px] uppercase tracking-widest hover:bg-red/15 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <YevaTradeLoader size="xs" />
              A eliminar...
            </>
          ) : (
            'Eliminar conta permanentemente'
          )}
        </button>
      </form>
    </div>
  );
}
