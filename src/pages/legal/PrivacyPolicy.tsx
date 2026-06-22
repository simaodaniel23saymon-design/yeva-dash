import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Dados coletados',
    body: 'Coletamos email, identificadores de conta, historico de trading, configuracoes de bots, dados de afiliados, dados de pagamento e API Keys de exchanges. API Keys e segredos sao armazenados encriptados com AES-256-GCM e nunca devem ser guardados em texto simples.',
  },
  {
    title: '2. Como usamos os dados',
    body: 'Usamos os dados para autenticar utilizadores, executar bots via API, apresentar dashboard e historico, processar depositos e saques, enviar notificacoes por email ou Telegram, gerir afiliados, calcular comissoes e proteger a plataforma contra fraude.',
  },
  {
    title: '3. Compartilhamento',
    body: 'Compartilhamos dados apenas quando necessario para operar a plataforma: NOWPayments para processamento de pagamentos e saques, Resend para envio de emails transacionais, e fornecedores de infraestrutura essenciais. Nao vendemos dados pessoais.',
  },
  {
    title: '4. Retencao',
    body: 'Logs operacionais sao mantidos por ate 90 dias, salvo necessidade de investigacao de seguranca. Dados financeiros, transacoes, comissoes e registros fiscais podem ser mantidos por ate 5 anos para cumprimento de obrigacoes legais e contabilisticas.',
  },
  {
    title: '5. Direitos do utilizador',
    body: 'Conforme GDPR, LGPD e leis aplicaveis, o utilizador pode solicitar acesso, retificacao, portabilidade, limitacao de tratamento ou eliminacao dos seus dados, quando legalmente permitido. Pedidos podem exigir verificacao de identidade.',
  },
  {
    title: '6. Cookies',
    body: 'Usamos apenas cookies e armazenamento local essenciais para sessao, seguranca, preferencias e funcionamento da aplicacao. Nao usamos cookies de publicidade comportamental por padrao.',
  },
  {
    title: '7. Seguranca',
    body: 'Aplicamos encriptacao de segredos, tokens com expiracao, rate limiting, headers HTTP seguros, validacao de webhooks e controlos de acesso. Nenhum sistema e imune a risco, por isso o utilizador deve proteger email, password, 2FA e permissoes das API Keys.',
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="auth-scroll bg-bg0 text-text1">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <Link to="/login" className="font-mono text-[10px] uppercase tracking-widest text-cyan hover:text-text1">
          YevaTrade
        </Link>
        <header className="mt-6 border-b border-border1 pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text2">Documento legal</p>
          <h1 className="mt-3 text-3xl font-bold text-text1">Politica de Privacidade</h1>
          <p className="mt-3 text-sm leading-6 text-text2">Ultima atualizacao: 12 de junho de 2026</p>
        </header>

        <div className="mt-8 space-y-7">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-text1">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-text2">{section.body}</p>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-border1 pt-5 text-sm text-text2">
          Para pedidos de privacidade, configure e publique um canal oficial de suporte antes do lancamento.
        </footer>
      </div>
    </main>
  );
}
