/**
 * Espaço PRO INTELLIGENCE (preparação). Só conceitos: sem trading novo, sem dados, sem promessas de retorno.
 * Resultados serão medidos empiricamente antes de qualquer lançamento.
 */

export const PRO_INTELLIGENCE_CONCEPTS: ReadonlyArray<{ id: string; name: string; kind: string; text: string }> = [
  { id: 'EARLY_MOMENTUM', name: 'Early Momentum', kind: 'Momentum', text: 'Sinal de momentum numa fase inicial, com risco indicado.' },
  { id: 'LAUNCH_RADAR', name: 'Launch Radar', kind: 'Discovery', text: 'Descoberta de lançamentos recentes, com verificação de segurança.' },
  { id: 'VOLUME_SURGE', name: 'Volume Surge', kind: 'Signal', text: 'Sinal de aumento anormal de volume face ao histórico.' },
  { id: 'LIQUIDITY_CHANGE', name: 'Liquidity Change', kind: 'Risk', text: 'Alteração relevante de liquidez que muda o risco de entrada ou saída.' },
  { id: 'NEW_LISTING', name: 'New Listing', kind: 'Opportunity', text: 'Novas listagens nas exchanges suportadas.' },
  { id: 'SMART_WALLET', name: 'Smart Wallet Activity', kind: 'Signal', text: 'Atividade de carteiras acompanhadas, como sinal e não como recomendação.' },
  { id: 'SECURITY_ALERT', name: 'Security Alert', kind: 'Risk', text: 'Alerta de risco de contrato ou token antes de qualquer operação.' },
];

export default function ProIntelligencePreview() {
  return (
    <section className="w-full max-w-4xl space-y-4" data-testid="pro-intelligence">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text3">Em preparação</p>
        <h3 className="text-text1 font-bold text-lg">PRO Intelligence</h3>
        <p className="text-text2 text-[13px] mt-1">
          Camada futura de oportunidades, sinais, momentum, risco e descoberta. Nada disto executa ordens.
        </p>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRO_INTELLIGENCE_CONCEPTS.map((c) => (
          <li key={c.id} className="bg-bg1 border border-border1 p-4 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-text1 font-semibold text-sm">{c.name}</p>
              <span className="font-mono text-[9px] uppercase tracking-wider border border-border2 text-text3 px-1.5 py-0.5">Em breve</span>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-text3">{c.kind}</p>
            <p className="text-text2 text-[12px]">{c.text}</p>
          </li>
        ))}
      </ul>
      <p className="text-text3 text-[11px]">Os resultados serão medidos empiricamente e publicados. Sem garantias de retorno.</p>
    </section>
  );
}
