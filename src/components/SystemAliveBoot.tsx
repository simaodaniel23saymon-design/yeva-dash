import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandLogo } from './BrandLogo';

const BOOT_MS_DESKTOP = 6000;
const BOOT_MS_MOBILE = 2800;
const STORAGE_KEY = 'yeva_boot_v1';

function isMobileBoot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

function bootDuration(): number {
  return isMobileBoot() ? BOOT_MS_MOBILE : BOOT_MS_DESKTOP;
}

const PHASES = [
  { at: 0, label: 'A despertar o motor…' },
  { at: 0.18, label: 'A sincronizar exchange…' },
  { at: 0.36, label: 'A carregar pares e filtros…' },
  { at: 0.56, label: 'Hard SL e protecções activas…' },
  { at: 0.76, label: 'Sistema vivo · a entrar…' },
] as const;

function AliveCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];

    const resize = () => {
      const mobile = isMobileBoot();
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!nodes.length) {
        const count = mobile
          ? Math.min(14, Math.floor((w * h) / 90000))
          : Math.min(42, Math.floor((w * h) / 28000));
        for (let i = 0; i < count; i++) {
          nodes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.22,
            vy: (Math.random() - 0.5) * 0.22,
            r: 1 + Math.random() * 1.4,
          });
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const pulse = 0.5 + 0.5 * Math.sin(t / 900);

      // grelha subtil
      ctx.strokeStyle = `rgba(0, 212, 160, ${0.035 + pulse * 0.02})`;
      ctx.lineWidth = 1;
      const step = 56;
      ctx.beginPath();
      for (let x = 0; x < w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        const linkLimit = isMobileBoot() ? Math.min(nodes.length, i + 4) : nodes.length;
        for (let j = i + 1; j < linkLimit; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < (isMobileBoot() ? 80 : 120)) {
            ctx.strokeStyle = `rgba(0, 212, 160, ${0.08 * (1 - d / 120)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = `rgba(0, 212, 160, ${0.35 + pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // heartbeat central suave
      const cx = w / 2;
      const cy = h * 0.42;
      const beat = 0.55 + 0.45 * Math.sin(t / 420);
      ctx.strokeStyle = `rgba(0, 212, 160, ${0.12 + beat * 0.1})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 54 + beat * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(212, 168, 67, ${0.08 + beat * 0.06})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 78 + beat * 14, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

export function shouldShowSystemBoot(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markSystemBootDone(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* */
  }
}

/** Splash de entrada — curto em mobile para poupar memória/GPU. */
export function SystemAliveBoot({ onDone }: { onDone: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);
  const bootMs = useMemo(() => bootDuration(), []);
  const skipCanvas = isMobileBoot();

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const e = Math.min(bootMs, now - start);
      setElapsed(e);
      if (e >= bootMs) {
        if (!doneRef.current) {
          doneRef.current = true;
          markSystemBootDone();
          onDone();
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onDone, bootMs]);

  const progress = elapsed / bootMs;
  const phase = useMemo(() => {
    let cur: (typeof PHASES)[number] = PHASES[0];
    for (const p of PHASES) {
      if (elapsed >= p.at * bootMs) cur = p;
    }
    return cur;
  }, [elapsed, bootMs]);

  return (
    <div
      className="fixed inset-0 z-[9000] bg-bg0 flex flex-col items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="A iniciar YevaTrade"
    >
      {!skipCanvas && <AliveCanvas />}

      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-md animate-fade-in">
        <BrandLogo variant="auth" subtitle="Trading Engine" />

        <div className="mt-8 flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-cyan">
          <span className="relative flex h-2 w-2">
            <span className="alive-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
          </span>
          Sistema vivo
        </div>

        <p className="mt-4 display-title text-text1 text-[22px] sm:text-[26px] leading-tight">
          YevaTrade a entrar em operação
        </p>
        <p className="mt-2 font-mono text-[11px] text-text2 tracking-wide leading-relaxed">
          {phase.label}
        </p>

        <div className="mt-8 w-full max-w-[280px]">
          <div className="h-[2px] w-full bg-bg3 overflow-hidden">
            <div
              className="h-full bg-cyan transition-[width] duration-100 ease-linear"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9px] text-text3 tracking-wider uppercase">
            <span>Boot</span>
            <span>{Math.ceil((bootMs - elapsed) / 1000)}s</span>
          </div>
        </div>

        <ul className="mt-8 space-y-1.5 text-left w-full max-w-[280px]">
          {PHASES.map((p) => {
            const done = elapsed >= p.at * bootMs + 200;
            const active = phase.label === p.label;
            return (
              <li
                key={p.label}
                className={`font-mono text-[10px] tracking-wide transition-colors ${
                  done ? 'text-cyan' : active ? 'text-text1' : 'text-text3'
                }`}
              >
                <span className="inline-block w-3">{done ? '▸' : '·'}</span>
                {p.label.replace('…', '')}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Canvas ambient subtíl para o painel (sem mudar cores). */
export function AmbientAliveCanvas({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, Math.min(220, rect.height || 160));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const wave = Math.sin(t / 1400);
      ctx.strokeStyle = `rgba(0, 212, 160, ${0.06 + wave * 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y =
          h * 0.55 +
          Math.sin(x / 48 + t / 700) * 10 +
          Math.sin(x / 18 + t / 500) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = `rgba(212, 168, 67, ${0.05 + Math.abs(wave) * 0.03})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y =
          h * 0.62 +
          Math.sin(x / 62 + t / 900 + 1.2) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={`pointer-events-none absolute inset-x-0 top-0 opacity-80 ${className}`}
      aria-hidden
    />
  );
}
