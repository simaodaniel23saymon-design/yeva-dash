import { Link } from 'react-router-dom';
import { useExchange } from '../hooks/useExchange';

const steps = [
  {
    title: '1. Criar chaves API na exchange',
    body: 'Na Binance ou Bybit, vai a Gestão de API e cria uma nova chave. Usa um nome reconhecível (ex: YevaTrade).',
  },
  {
    title: '2. Restringir por IP',
    body: 'Activa a whitelist de IP e adiciona o endereço do servidor YevaTrade abaixo. Isto impede uso das chaves noutros servidores.',
  },
  {
    title: '3. Permissões correctas',
    body: 'Activa apenas Leitura + Trading (Futures ou Spot conforme o bot). Nunca actives levantamentos (Withdrawals).',
  },
  {
    title: '4. Testar antes de guardar',
    body: 'Cola as chaves na página de Conexão, testa a ligação e confirma o saldo antes de guardar.',
  },
  {
    title: '5. Criar e iniciar o bot',
    body: 'Escolhe o par (ex: BTCUSDT, HYPEUSDT), define alavancagem e capital, e inicia o bot na página Robôs.',
  },
];

const permissions = [
  { ok: true, label: 'Enable Reading', note: 'Ler saldo e posições' },
  { ok: true, label: 'Enable Futures / Spot Trading', note: 'Executar ordens' },
  { ok: false, label: 'Enable Withdrawals', note: 'DEIXAR DESACTIVADO' },
];

export default function ApiGuidePage() {
  const { serverIp } = useExchange();

  const copyIp = () => {
    navigator.clipboard.writeText(serverIp);
  };

  return (
    <div className="space-y-4 max-w-2xl animate-fade-in">
      <div>
        <h2 className="text-text1 font-bold text-lg">Guia de API</h2>
        <p className="font-mono text-[10px] text-text2 mt-1 leading-relaxed">
          Passo a passo para conectar a Binance ou Bybit em segurança.
        </p>
      </div>

      <div className="bg-bg1 border border-gold-30 p-4 space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-wider text-gold font-bold">IP para whitelist</p>
        <div className="flex gap-2">
          <code className="flex-1 bg-bg3 border border-border2 px-3 py-2 font-mono text-sm text-gold">{serverIp}</code>
          <button type="button" onClick={copyIp}
            className="px-3 py-2 border border-border2 font-mono text-[9px] uppercase text-text2 hover:border-cyan hover:text-cyan">
            Copiar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="bg-bg1 border border-border1 p-4 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <h3 className="font-bold text-text1 text-sm mb-1">{step.title}</h3>
            <p className="font-mono text-[10px] text-text2 leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-bg1 border border-border1 p-4">
        <h3 className="font-mono text-[9px] uppercase tracking-wider text-text2 mb-3">Permissões</h3>
        <div className="space-y-2 font-mono text-[10px]">
          {permissions.map(p => (
            <div key={p.label} className="flex items-start gap-2">
              <span className={p.ok ? 'text-cyan' : 'text-red'}>{p.ok ? '✓' : '✗'}</span>
              <div>
                <span className="text-text1">{p.label}</span>
                <span className="text-text3 ml-2">— {p.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/exchanges"
          className="font-mono text-[9px] uppercase px-5 py-3 border border-cyan-30 bg-cyan-dim text-cyan">
          Conectar Exchange
        </Link>
        <Link to="/bots"
          className="font-mono text-[9px] uppercase px-5 py-3 border border-border2 text-text2 hover:border-cyan hover:text-cyan">
          Configurar Bot
        </Link>
      </div>
    </div>
  );
}
