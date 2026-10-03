import { Link } from 'react-router-dom';
import { useMomentumRanking } from '../../hooks/useMomentumRanking';
import { MomentumWinnersLosersSection } from '../dashboard/MomentumWinnersLosersSection';
import { DashboardLogsTerminal } from '../dashboard/DashboardLogsTerminal';
import PaperConfigLab from './PaperConfigLab';

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
        <div className="bg-bg1 border border-border1 p-4 space-y-2" data-testid="lab-rejects">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text3">Rejects</p>
          <p className="text-text2 text-[12px]">Moedas recusadas pelo motor e motivo interno (MAX_POSITIONS, STRUCTURE, EXTENSION_RISK…) no ranking abaixo.</p>
        </div>
        <div className="bg-bg1 border border-border1 p-4 space-y-2" data-testid="lab-scores">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text3">Scores</p>
          <p className="text-text2 text-[12px]">Score, rank e fatores de cada moeda. Só admin; o utilizador vê apenas o estado da oportunidade.</p>
        </div>
        <div className="bg-bg1 border border-border1 p-4 space-y-2" data-testid="lab-experiments">
          <p className="font-mono text-[9px] uppercase tracking-wider text-text3">Experiments</p>
          <p className="text-text2 text-[12px]">Experiência Spot Momentum Rotation em Paper (orderExecution=false), sem ligação às preferências dos utilizadores.</p>
          <Link to="/spot-paper" className="font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline">Ver experiência</Link>
        </div>
        <PaperConfigLab />
      </div>

      <MomentumWinnersLosersSection ranking={ranking} />
      <DashboardLogsTerminal enabled />
    </div>
  );
}
