interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  centered?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: 16,
  sm: 24,
  md: 36,
  lg: 52,
} as const;

export function YevaTradeLoader({ size = 'md', label, centered = false, className = '' }: Props) {
  const px = SIZE_MAP[size];
  const showLabel = label && size !== 'xs';

  const loader = (
    <div
      className={`inline-flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label ?? 'A processar'}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="yeva-loader-svg shrink-0"
      >
        <defs>
          <linearGradient id="yevaGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00d4a0" />
            <stop offset="1" stopColor="#d4a843" />
          </linearGradient>
          <filter id="yevaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Anel exterior */}
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="url(#yevaGrad)"
          strokeWidth="2"
          strokeLinecap="square"
          strokeDasharray="12 8"
          className="yeva-loader-ring"
          opacity="0.85"
        />

        {/* Orbita */}
        <g className="yeva-loader-orbit" style={{ transformOrigin: '32px 32px' }}>
          <circle cx="32" cy="6" r="2.5" fill="#00d4a0" />
          <circle cx="58" cy="32" r="2" fill="#d4a843" opacity="0.8" />
        </g>

        {/* Marca Y — estilo YevaTrade */}
        <g filter="url(#yevaGlow)">
          <path
            d="M32 14 L22 34 H27 L32 24 L37 34 H42 L32 14 Z"
            fill="#00d4a0"
            className="yeva-loader-mark"
          />
          <path
            d="M24 38 H40 V42 H24 V38 Z"
            fill="#d4a843"
            opacity="0.9"
          />
          <path
            d="M28 44 H36 V48 H28 V44 Z"
            fill="#00d4a0"
            opacity="0.6"
          />
        </g>

        {/* Pulso central */}
        <circle cx="32" cy="32" r="4" fill="#00d4a0" className="yeva-loader-pulse" opacity="0.35" />
      </svg>
      {showLabel && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-cyan animate-pulse">
          {label}
        </span>
      )}
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center py-32 w-full">
        {loader}
      </div>
    );
  }

  return loader;
}

/** Loader de página completa — substitui o círculo genérico */
export function PageLoader({ label = 'A processar...' }: { label?: string }) {
  return <YevaTradeLoader size="lg" label={label} centered />;
}

/** Inline em botões */
export function InlineLoader({ label }: { label?: string }) {
  return <YevaTradeLoader size="xs" label={label} className="inline-flex flex-row items-center gap-2" />;
}
