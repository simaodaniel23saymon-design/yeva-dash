type Variant = 'sidebar' | 'header' | 'auth';

interface Props {
  variant?: Variant;
  subtitle?: string;
  className?: string;
}

const imgClass: Record<Variant, string> = {
  sidebar: 'h-9 w-auto max-w-[190px] object-contain object-left',
  header: 'h-7 w-auto max-w-[150px] object-contain',
  auth: 'h-16 w-auto max-w-[min(100%,320px)] object-contain mx-auto',
};

export function BrandLogo({ variant = 'header', subtitle, className = '' }: Props) {
  return (
    <div className={`flex flex-col ${variant === 'auth' ? 'items-center text-center' : 'items-start'} ${className}`}>
      <img
        src="/yeva-logo-horizontal.png"
        alt="Yeva Trade"
        className={imgClass[variant]}
        draggable={false}
      />
      {subtitle ? (
        <p className="font-mono text-[9px] text-text2 tracking-[0.22em] uppercase mt-1.5 alive-breath">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
