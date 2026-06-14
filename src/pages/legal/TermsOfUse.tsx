import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Natureza da plataforma',
    body: 'A YevaTrade e uma plataforma de automacao que executa ordens de trading atraves de APIs autorizadas pelo utilizador. Os fundos permanecem na exchange conectada ou no processador de pagamento aplicavel; a YevaTrade nao atua como banco, corretora custodiante ou consultora financeira.',
  },
  {
    title: '2. Risco financeiro',
    body: 'Trading envolve riscos elevados, incluindo perda parcial ou total do capital. Resultados passados, demonstracoes, backtests ou contas demo nao garantem resultados futuros. O utilizador e responsavel pelas suas decisoes, parametros de risco, exchanges conectadas e capital alocado.',
  },
  {
    title: '3. Uso aceitavel',
    body: 'E proibido usar a plataforma para manipulacao de mercado, fraude, abuso de sistemas de afiliados, contornacao de limites, criacao de contas multiplas para obter vantagens indevidas, lavagem de dinheiro ou qualquer atividade ilegal.',
  },
  {
    title: '4. Taxas',
    body: 'A YevaTrade pode cobrar taxa de performance de 30% sobre lucros realizados conforme a configuracao do produto. Saques possuem minimo de 10 USDT e taxa operacional de 2%, descontada do valor solicitado antes do envio.',
  },
  {
    title: '5. Suspensao e encerramento',
    body: 'A YevaTrade pode suspender, limitar ou encerrar contas quando houver violacao destes termos, suspeita de fraude, abuso, risco operacional, ordem legal ou tentativa de comprometer a seguranca da plataforma.',
  },
  {
    title: '6. Disponibilidade e integracoes',
    body: 'A plataforma depende de servicos de terceiros, incluindo exchanges, NOWPayments, fornecedores de email, infraestrutura cloud e redes blockchain. Indisponibilidades, atrasos, taxas de rede e falhas externas podem afetar operacoes, depositos, saques e notificacoes.',
  },
  {
    title: '7. Jurisdicao',
    body: 'Estes termos devem ser adaptados ao pais de registro final da YevaTrade. Ate definicao societaria formal, recomenda-se revisao juridica para escolher a jurisdicao aplicavel entre Portugal ou Angola e ajustar idioma, foro, dados da entidade e obrigacoes regulatorias.',
  },
];

export default function TermsOfUse() {
  return (
    <main className="min-h-screen bg-bg0 text-text1">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <Link to="/login" className="font-mono text-[10px] uppercase tracking-widest text-cyan hover:text-text1">
          YevaTrade
        </Link>
        <header className="mt-6 border-b border-border1 pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text2">Documento legal</p>
          <h1 className="mt-3 text-3xl font-bold text-text1">Termos de Uso</h1>
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
          Ao continuar a usar a YevaTrade, o utilizador declara que leu, compreendeu e aceita estes termos.
        </footer>
      </div>
    </main>
  );
}
