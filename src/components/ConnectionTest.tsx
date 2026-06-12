import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ConnectionTest() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/health')
      .then(res => {
        setStatus('success');
        setMessage(`✅ Conectado! DB: ${res.data.database}, Redis: ${res.data.redis}`);
      })
      .catch(err => {
        setStatus('error');
        setMessage(`❌ Erro: ${err.message}`);
      });
  }, []);

  return (
    <div className="bg-velora-card border border-velora-border rounded-xl p-4 mb-6">
      <h3 className="font-semibold text-white mb-2">Status da Conexão Backend</h3>
      <div className={`p-3 rounded-lg ${
        status === 'loading' ? 'bg-slate-700 text-slate-300' :
        status === 'success' ? 'bg-velora-success/10 text-velora-success' :
        'bg-velora-danger/10 text-velora-danger'
      }`}>
        <p className="text-sm font-mono">{message || 'A verificar...'}</p>
      </div>
    </div>
  );
}
