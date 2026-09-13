type Variant = 'sidebar' | 'header' | 'auth';

interface Props {
  variant?: Variant;
  subtitle?: string;
  className?: string;
}

const imgClass: Record<Variant, string> = {
  sidebar: 'h-9 w-auto max-w-[190px] object-contain object-left',
  header: 'h-7 w-auto max-w-[150px] object-contain',
  auth: 'h-14 sm:h-16 w-auto max-w-[min(100%,320px)] object-contain mx-auto',
};

/** Logo oficial YevaTrade (Y dourado) — PNG do branding, sem placeholder SVG. */
const LOGO_PNG = '/yeva-logo-horizontal.png';
const LOGO_ICON = '/favicon.png';

/**
 * Logo da marca — asset oficial horizontal (commit branding).
 */
export function BrandLogo({ variant = 'header', subtitle, className = '' }: Props) {
  return (
    <div
      className={`flex flex-col ${variant === 'auth' ? 'items-center text-center' : 'items-start'} ${className}`}
    >
      <img
        src={LOGO_PNG}
        alt="Yeva Trade"
        width={variant === 'auth' ? 280 : variant === 'sidebar' ? 190 : 150}
        height={variant === 'auth' ? 48 : variant === 'sidebar' ? 36 : 28}
        className={imgClass[variant]}
        draggable={false}
        decoding="async"
        fetchPriority={variant === 'auth' ? 'high' : 'auto'}
        onError={(e) => {
          const el = e.currentTarget;
          if (el.dataset.fallback === '1') return;
          el.dataset.fallback = '1';
          el.src = LOGO_ICON;
        }}
      />
      {subtitle ? (
        <p className="font-mono text-[9px] text-text2 tracking-[0.22em] uppercase mt-1.5 alive-breath">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export const BRAND_LOGO_SOURCES = {
  svg: LOGO_PNG,
  png: LOGO_PNG,
  icon: LOGO_ICON,
} as const;
