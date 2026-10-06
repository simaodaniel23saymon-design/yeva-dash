import { Link } from 'react-router-dom';

export default function AccessDenied({ area }: { area: string }) {
  return (
    <div className="max-w-xl mx-auto mt-16 bg-bg1 border border-red-30 rounded-[22px] p-8 text-center" data-testid="access-denied">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red mb-2">403 · Acesso restrito</p>
      <h2 className="text-text1 font-bold text-[24px] leading-tight">Sem acesso a {area}</h2>
      <p className="text-text2 mt-3">Esta área é só para administradores.</p>
      <Link to="/spot" className="inline-block mt-6 font-mono text-[11px] uppercase tracking-wider border border-border2 px-4 py-2 text-text2 hover:border-cyan hover:text-cyan">
        Ir para Spot
      </Link>
    </div>
  );
}
