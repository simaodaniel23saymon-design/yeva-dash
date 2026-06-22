interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number, className?: string) =>
  ({ width: size, height: size, viewBox: '0 0 20 20', fill: 'none', className: className ?? 'text-current' });

export function IconNetwork({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4" cy="15" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="16" cy="15" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 6v5M10 11L4 13M10 11l6 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconLink({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8.5 11.5l3-3M7 13l-1.5 1.5a2.5 2.5 0 1 0 3.5 3.5L11 16M13 7l1.5-1.5a2.5 2.5 0 1 0-3.5-3.5L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconCopy({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="7" y="7" width="9" height="9" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 13V5.5A1.5 1.5 0 0 1 6.5 4H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconCheck({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function IconWallet({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2" y="5" width="16" height="12" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 9h16M6 5V3h8v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconClock({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconLayers({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 3L3 7l7 4 7-4-7-4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="bevel" />
      <path d="M3 11l7 4 7-4M3 15l7 4 7-4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="bevel" />
    </svg>
  );
}

export function IconUsers({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="14" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 16c0-2.5 2.2-4 5-4s5 1.5 5 4M12 16c0-1.8 1.3-3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconTrendUp({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 14l5-5 3 3 6-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
      <path d="M13 5h4v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconTrendDown({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 6l5 5 3-3 6 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
      <path d="M13 15h4v-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconActivity({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 10h2l2-5 3 10 2-5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" strokeLinejoin="bevel" />
    </svg>
  );
}

export function IconLightbulb({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 2a5 5 0 0 0-2 9.5V14h4v-2.5A5 5 0 0 0 10 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="bevel" />
      <path d="M8 16h4M9 18h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconShare({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 9l6-2M7 11l6 2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function IconChevron({ size = 20, className, open }: IconProps & { open?: boolean }) {
  return (
    <svg {...base(size, className)} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }}>
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}

export function IconEmptyInbox({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="5" width="14" height="11" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 8h14" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 8V5h4v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  );
}
