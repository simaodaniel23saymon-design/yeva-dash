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

const LOGO_SVG = '/yeva-logo.svg';
const LOGO_PNG = '/yeva-logo-horizontal.png';

/**
 * Logo da marca — SVG primeiro (fiável em mobile/PWA), PNG como fallback.
 */
export function BrandLogo({ variant = 'header', subtitle, className = '' }: Props) {
  return (
    <div
      className={`flex flex-col ${variant === 'auth' ? 'items-center text-center' : 'items-start'} ${className}`}
    >
      <picture>
        <source srcSet={LOGO_SVG} type="image/svg+xml" />
        <img
          src={LOGO_SVG}
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
            el.src = LOGO_PNG;
          }}
        />
      </picture>
      {subtitle ? (
        <p className="font-mono text-[9px] text-text2 tracking-[0.22em] uppercase mt-1.5 alive-breath">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export const BRAND_LOGO_SOURCES = { svg: LOGO_SVG, png: LOGO_PNG } as const;
