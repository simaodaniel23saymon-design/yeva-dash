import { Link } from 'react-router-dom';
import { useMomentumRanking } from '../../hooks/useMomentumRanking';
import { MomentumWinnersLosersSection } from '../dashboard/MomentumWinnersLosersSection';
import { DashboardLogsTerminal } from '../dashboard/DashboardLogsTerminal';

/**
 * Strategy Lab (só admin; a rota /admin exige isAdmin da BD). Diagnóstico técnico:
 * Momentum (winners, losers, rejected, approved, risco, fatores, scores) e Paper Lab.
 * Dados Paper nunca aparecem no Dashboard nem no Spot do utilizador.
 */
export default function StrategyLabPanel({ onOpenExecution }: { onOpenExecution: () => void }) {
  const ranking = useMomentumRanking(60_000, true);
  return (
    <div className="space-y-6" data-testid="admin-strategy-lab">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-bg1 border border-border1 p-4 space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text3">Paper Lab</p>
          <p className="text-text2 text-[12px]">Ciclos abertos e fechados, PnL Paper, MFE/MAE e checkpoints. Separado do PnL REAL.</p>
          <Link to="/spot-paper" className="font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">Abrir Paper Lab</Link>
        </div>
        <div className="bg-bg1 border border-border1 p-4 space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text3">Execution diagnostics</p>
          <p className="text-text2 text-[12px]">Piloto Spot REAL: intents, Risk Guard, reconciliação a pedido. LIVE desligado.</p>
          <button type="button" onClick={onOpenExecution} className="font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">
            Abrir Real Spot Pilot
          </button>
        </div>
        <div className="bg-bg1 border border-border1 p-4 space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text3">Risk diagnostics</p>
          <p className="text-text2 text-[12px]">Logs do motor e decisões de risco em tempo real (abaixo).</p>
        </div>
      </div>

      <MomentumWinnersLosersSection ranking={ranking} />
      <DashboardLogsTerminal enabled />
    </div>
  );
}
