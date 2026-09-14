/** Aviso sobre filtro de mercado / risco (backend). */
export function MarketProtectionBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bg-gold-dim border border-gold-30 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="font-mono text-[9px] uppercase tracking-widest text-gold font-bold mb-1.5">
        Protecção de mercado activa
      </p>
      <ul className={`font-mono text-gold/90 space-y-1 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        <li>· +50% em 24h → preferência LONG (não SHORT contra o pump)</li>
        <li>· −30% em 24h → preferência SHORT (não LONG contra o dump)</li>
        <li>· Volume alto / pump → menos ordens, alav ≤5x, SL alargado</li>
        <li>· 1h/4h mistos → segue 4h (o bot continua a operar)</li>
      </ul>
    </div>
  );
}
