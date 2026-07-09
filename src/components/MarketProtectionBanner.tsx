/** Aviso sobre filtro de mercado explosivo / tendência (backend). */
export function MarketProtectionBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bg-gold-dim border border-gold-30 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="font-mono text-[9px] uppercase tracking-widest text-gold font-bold mb-1.5">
        Protecção de mercado activa
      </p>
      <ul className={`font-mono text-gold/90 space-y-1 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        <li>· +50% em 24h → só LONG (nunca SHORT contra o pump)</li>
        <li>· −30% em 24h → só SHORT (nunca LONG contra o dump)</li>
        <li>· Volume 10x / pump 6h → menos ordens, alav ≤5x, SL alargado</li>
        <li>· Tendências 1h/4h em conflito → o bot não abre posição</li>
      </ul>
    </div>
  );
}
