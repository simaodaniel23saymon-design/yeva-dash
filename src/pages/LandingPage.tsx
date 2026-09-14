import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpDown, ShieldCheck, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const marketPairs = [
  { symbol: 'BTC', value: '+2.3%' },
  { symbol: 'ETH', value: '-1.1%' },
  { symbol: 'SOL', value: '+5.7%' },
  { symbol: 'BNB', value: '+1.4%' },
  { symbol: 'XRP', value: '+3.9%' },
  { symbol: 'ADA', value: '-0.7%' },
];

const steps = [
  { title: 'Conecta Binance', description: 'Sincroniza a conta e define a carteira alvo em minutos.' },
  { title: 'Escolhe estratégia', description: 'Ativa DCA bidirecional, momentum ou grid com risco controlado.' },
  { title: 'Bot opera 24/7', description: 'O sistema reequilibra posições e reage no mercado em tempo real.' },
];

const strategies = [
  {
    icon: ArrowUpDown,
    name: 'DCA Bidirecional',
    description: 'Compra em quedas e vende em subidas para aproveitar ciclos de tendência.',
  },
  {
    icon: TrendingUp,
    name: 'Momentum Gainers',
    description: 'Foca em ativos com força de tendência e volume acima da média.',
  },
  {
    icon: TrendingDown,
    name: 'Momentum Losers',
    description: 'Captura reversões em pares com pressão de venda e recuperação técnica.',
  },
  {
    icon: ShieldCheck,
    name: 'Estáveis',
    description: 'Estratégia defensiva para suavizar drawdown em mercados laterais.',
  },
];

const testimonials = [
  {
    name: 'Marta L.',
    role: 'Fundadora, hedge ops',
    quote: 'A automação reduziu o ruído de execução e a disciplina da estratégia ficou muito melhor.',
    initials: 'ML',
  },
  {
    name: 'Diogo P.',
    role: 'Trader de swing',
    quote: 'A plataforma deixou tudo centralizado: entradas, gestão e performance em um só painel.',
    initials: 'DP',
  },
  {
    name: 'Sofia R.',
    role: 'Operadora de capital',
    quote: 'O setup de grid + DCA me deu consistência em mercados imprevisíveis e ritmo 24/7.',
    initials: 'SR',
  },
];

const pricing = [
  { name: 'Free', price: '€0', description: 'Para começar e testar a base da automação.', tag: 'Acesso básico', featured: false },
  { name: 'Pro', price: '€29', description: 'Estratégias premium e execução mais rápida.', tag: 'Em breve', featured: false },
  { name: 'Pro+', price: '€79', description: 'Tudo em Pro + gestão avançada e relatórios completos.', tag: 'Em breve', featured: true },
];

function CountUpStat({ value, suffix = '', decimals = 0, prefix = '', duration = 1600 }: { value: number; suffix?: string; decimals?: number; prefix?: string; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame = 0;

    const tick = (time: number) => {
      if (startTime === null) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(value * eased);
      if (progress < 1) animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [duration, value]);

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(current);

  return (
    <span className="tabular-nums text-[24px] font-bold text-text1">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

function Reveal({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add('is-visible');
            observer.unobserve(node);
          }
        });
      },
      { threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id={id} className={`reveal ${className}`}>
      {children}
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page-shell bg-bg0 text-text1">
      <header className="sticky top-0 z-30 border-b border-border1/80 bg-bg0/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-30 bg-cyan-dim text-base font-bold text-cyan">Y</div>
            <div>
              <div className="font-semibold text-white">YevaTrade</div>
              <div className="font-mono text-[9px] tracking-[0.2em] text-text2 uppercase">Alpha Trend Engine</div>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-text1 md:flex">
            <a href="#como-funciona" className="transition hover:text-cyan">Como funciona</a>
            <a href="#estrategias" className="transition hover:text-cyan">Estratégias</a>
            <a href="#performance" className="transition hover:text-cyan">Performance</a>
            <a href="#precos" className="transition hover:text-cyan">Preços</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden rounded-full border border-border2 px-4 py-2 text-sm font-medium text-text1 transition hover:border-cyan-30 hover:text-cyan sm:inline-flex">
              Entrar
            </Link>
            <Link to="/login?tab=register" className="inline-flex items-center gap-2 rounded-full border border-cyan-30 bg-cyan-dim px-5 py-2.5 text-sm font-semibold text-cyan transition hover:shadow-[0_0_24px_rgba(0,212,160,0.35)]">
              Começar grátis
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,212,160,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(212,168,67,0.12),_transparent_25%)]" />

        <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="absolute inset-x-0 top-0 hidden h-[420px] md:block">
            <div className="hero-candle-scene absolute inset-0 opacity-80">
              <svg viewBox="0 0 1600 500" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="chartGlow" x1="0" x2="1">
                    <stop offset="0%" stopColor="rgba(0,212,160,0.08)" />
                    <stop offset="100%" stopColor="rgba(0,212,160,0.0)" />
                  </linearGradient>
                </defs>
                {[...Array(18)].map((_, index) => {
                  const x = index * 90;
                  const open = 140 + (index % 5) * 18;
                  const close = 120 + ((index + 3) % 6) * 16;
                  const y = 120 + (index % 4) * 30;
                  const height = 34 + (index % 5) * 10;
                  return (
                    <g key={x} opacity={0.7}>
                      <rect x={x} y={y} width="32" height={height} rx="4" fill={index % 2 === 0 ? 'rgba(0,212,160,0.22)' : 'rgba(212,168,67,0.15)'} />
                      <line x1={x + 16} y1={open} x2={x + 16} y2={close} stroke={index % 2 === 0 ? '#00d4a0' : '#d4a843'} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                    </g>
                  );
                })}
                <path d="M0,260 L120,240 L220,260 L360,220 L470,250 L610,200 L720,230 L860,180 L980,210 L1090,170 L1210,150 L1320,190 L1440,135 L1600,160 L1600,500 L0,500 Z" fill="url(#chartGlow)" />
              </svg>
            </div>
          </div>

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
            <div className="max-w-2xl pt-6 lg:pt-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border2 bg-bg1/80 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-text2 uppercase">
                <Sparkles size={12} className="text-cyan" />
                Automação para mercados globais
              </div>

              <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl lg:text-[72px]">
                Trading automatizado 24/7
              </h1>

              <p className="mt-6 max-w-xl text-xl leading-relaxed text-text1 lg:text-[24px]">
                DCA bidirecional · Momentum · Grid · Tudo numa única plataforma.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {['24/7 monitoring', 'Binance sync', 'Risk controls'].map((item) => (
                  <span key={item} className="rounded-full border border-border2 bg-bg1/80 px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-text2 uppercase">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/login?tab=register" className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-30 bg-cyan-dim px-7 py-4 text-base font-semibold text-cyan transition hover:shadow-[0_0_28px_rgba(0,212,160,0.35)]">
                  Começar grátis
                  <ArrowRight size={18} />
                </Link>
                <a href="#performance" className="inline-flex items-center justify-center rounded-full border border-border2 bg-bg1 px-7 py-4 text-base font-medium text-text1 transition hover:border-cyan-30 hover:text-cyan">
                  Ver performance
                </a>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-4 text-sm text-text1 sm:gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_14px_rgba(0,212,160,0.8)]" />
                  <span>Bot ativo em 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_14px_rgba(212,168,67,0.7)]" />
                  <span>Execução em tempo real</span>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <div className="rounded-2xl border border-border1 bg-bg1/80 px-4 py-3 backdrop-blur-sm">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-text2 uppercase">Trades</div>
                  <CountUpStat value={1200} suffix=" trades" />
                </div>
                <div className="rounded-2xl border border-border1 bg-bg1/80 px-4 py-3 backdrop-blur-sm">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-text2 uppercase">Win rate</div>
                  <CountUpStat value={68} suffix="%" />
                </div>
                <div className="rounded-2xl border border-border1 bg-bg1/80 px-4 py-3 backdrop-blur-sm">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-text2 uppercase">Lucro</div>
                  <CountUpStat value={47832} prefix="+$" duration={2000} />
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:pt-8">
              <div className="rounded-[28px] border border-border1 bg-bg1/75 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-border1 pb-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.18em] text-text2 uppercase">Bot status</div>
                    <div className="mt-1 flex items-center gap-2 text-base font-semibold text-white">
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_12px_rgba(0,212,160,0.8)]" />
                      Online
                    </div>
                  </div>
                  <div className="rounded-full border border-cyan-30 bg-cyan-dim px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] text-cyan uppercase">
                    24/7 Live
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border2 bg-bg2 p-4">
                  <div className="flex items-center justify-between text-sm text-text2">
                    <span>Portfolio</span>
                    <span className="font-mono text-[11px] tracking-[0.18em] uppercase">USD</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="text-3xl font-bold text-white">$84.2k</div>
                    <div className="rounded-full border border-cyan-30 bg-cyan-dim px-2 py-1 text-xs font-medium text-cyan">+12.4%</div>
                  </div>

                  <div className="mt-5 h-24 overflow-hidden rounded-xl border border-border1 bg-[linear-gradient(180deg,rgba(0,212,160,0.08),rgba(0,212,160,0.02))] p-2">
                    <svg viewBox="0 0 300 100" className="h-full w-full" preserveAspectRatio="none">
                      <path d="M0,70 C40,65,60,50,90,52 S150,42,190,35 S250,15,300,10" fill="none" stroke="#00d4a0" strokeWidth="3" strokeLinecap="round" />
                      <path d="M0,70 C40,65,60,50,90,52 S150,42,190,35 S250,15,300,10 L300,100 L0,100 Z" fill="rgba(0,212,160,0.10)" />
                    </svg>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl border border-border2 bg-bg3 p-3">
                      <div className="font-mono text-[9px] tracking-[0.16em] text-text2 uppercase">P/L</div>
                      <div className="mt-2 text-lg font-semibold text-cyan">+$4.8k</div>
                    </div>
                    <div className="rounded-xl border border-border2 bg-bg3 p-3">
                      <div className="font-mono text-[9px] tracking-[0.16em] text-text2 uppercase">Risk</div>
                      <div className="mt-2 text-lg font-semibold text-gold">1.8%</div>
                    </div>
                    <div className="rounded-xl border border-border2 bg-bg3 p-3">
                      <div className="font-mono text-[9px] tracking-[0.16em] text-text2 uppercase">Win</div>
                      <div className="mt-2 text-lg font-semibold text-white">68%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 mt-12 hidden overflow-hidden rounded-full border border-border1 bg-bg1/70 md:block">
            <div className="market-ticker-track flex w-max items-center gap-8 whitespace-nowrap px-4 py-3 text-sm text-text1">
              {[...marketPairs, ...marketPairs].map((pair, index) => (
                <div key={`${pair.symbol}-${index}`} className="flex items-center gap-3">
                  <span className="font-semibold text-white">{pair.symbol}</span>
                  <span className={pair.value.startsWith('+') ? 'text-cyan' : 'text-red'}>{pair.value}</span>
                  <span className="text-text2">•</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Reveal className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" id="como-funciona">
          <div className="mb-8 text-center">
            <div className="font-mono text-[11px] tracking-[0.22em] text-text2 uppercase">Como funciona</div>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">Automação que funciona sem dor de cabeça</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="surface-card group rounded-[26px] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,212,160,0.12)]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-30 bg-cyan-dim text-lg font-bold text-cyan">
                  {index + 1}
                </div>
                <h3 className="mb-3 text-2xl font-semibold text-white">{step.title}</h3>
                <p className="text-lg text-text1">{step.description}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" id="estrategias">
          <div className="mb-8 text-center">
            <div className="font-mono text-[11px] tracking-[0.22em] text-text2 uppercase">Estratégias</div>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">Escolha o motor certo para cada mercado</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {strategies.map(({ icon: Icon, name, description }) => (
              <div key={name} className="surface-card group rounded-[26px] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,212,160,0.12)]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border2 bg-bg2 text-cyan">
                  <Icon size={22} />
                </div>
                <h3 className="mb-3 text-2xl font-semibold text-white">{name}</h3>
                <p className="text-lg text-text1">{description}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" id="performance">
          <div className="mb-8 text-center">
            <div className="font-mono text-[11px] tracking-[0.22em] text-text2 uppercase">Performance real</div>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">Desempenho consistente em ciclos reais</h2>
          </div>

          <div className="rounded-[30px] border border-border1 bg-bg1 p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] tracking-[0.18em] text-text2 uppercase">Portfolio</div>
                <div className="mt-2 text-3xl font-bold text-white">+$38,420</div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl border border-border2 bg-bg2 px-3 py-2">
                  <div className="font-mono text-[9px] tracking-[0.16em] text-text2 uppercase">Win rate</div>
                  <div className="mt-1 text-xl font-semibold text-white">68%</div>
                </div>
                <div className="rounded-xl border border-border2 bg-bg2 px-3 py-2">
                  <div className="font-mono text-[9px] tracking-[0.16em] text-text2 uppercase">Profit factor</div>
                  <div className="mt-1 text-xl font-semibold text-white">2.16</div>
                </div>
                <div className="rounded-xl border border-border2 bg-bg2 px-3 py-2">
                  <div className="font-mono text-[9px] tracking-[0.16em] text-text2 uppercase">Drawdown</div>
                  <div className="mt-1 text-xl font-semibold text-white">14.2%</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border2 bg-bg2 p-3 sm:p-5">
              <svg viewBox="0 0 900 260" className="h-[250px] w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(0,212,160,0.35)" />
                    <stop offset="100%" stopColor="rgba(0,212,160,0.02)" />
                  </linearGradient>
                </defs>
                {[...Array(5)].map((_, idx) => (
                  <line key={idx} x1="0" x2="900" y1={30 + idx * 50} y2={30 + idx * 50} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}
                <path d="M0,180 C80,168,130,120,220,132 S360,90,430,110 S560,70,640,84 S790,40,900,22 L900,260 L0,260 Z" fill="url(#equityFill)" />
                <path d="M0,180 C80,168,130,120,220,132 S360,90,430,110 S560,70,640,84 S790,40,900,22" fill="none" stroke="#00d4a0" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" id="precos">
          <div className="mb-8 text-center">
            <div className="font-mono text-[11px] tracking-[0.22em] text-text2 uppercase">Preços</div>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">Acesso simples e pensado em crescimento</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pricing.map(({ name, price, description, tag, featured }) => (
              <div key={name} className={`rounded-[28px] border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,212,160,0.12)] ${featured ? 'border-cyan-30 bg-cyan-dim' : 'border-border1 bg-bg1'}`}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-2xl font-semibold text-white">{name}</h3>
                  <span className="rounded-full border border-border2 bg-bg2 px-2 py-1 font-mono text-[9px] tracking-[0.18em] text-text2 uppercase">
                    {tag}
                  </span>
                </div>

                <div className="mb-4 flex items-end gap-2">
                  <span className="text-[42px] font-bold tracking-[-0.05em] text-white">{price}</span>
                  <span className="pb-2 text-base text-text2">/mês</span>
                </div>

                <p className="mb-6 text-lg text-text1">{description}</p>

                <button className={`w-full rounded-full px-5 py-3 text-base font-semibold transition ${featured ? 'bg-white text-bg0 hover:brightness-110' : 'border border-border2 bg-bg2 text-text1 hover:border-cyan-30 hover:text-cyan'}`}>
                  {featured ? 'Próximo lançamento' : 'Começar'}
                </button>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <div className="font-mono text-[11px] tracking-[0.22em] text-text2 uppercase">Testemunhos</div>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">Operadores que apostam no sistema</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((person) => (
              <div key={person.name} className="surface-card rounded-[26px] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,212,160,0.12)]">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00d4a0,#1e2b1f)] font-semibold text-white">
                    {person.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{person.name}</div>
                    <div className="font-mono text-[9px] tracking-[0.18em] text-text2 uppercase">{person.role}</div>
                  </div>
                </div>
                <p className="text-lg leading-relaxed text-text1">“{person.quote}”</p>
              </div>
            ))}
          </div>
        </Reveal>

        <section className="relative mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-cyan-30 bg-[linear-gradient(135deg,rgba(0,212,160,0.22),rgba(12,18,14,0.9),rgba(23,32,25,0.88))] p-8 text-center shadow-[0_25px_60px_rgba(0,212,160,0.18)] sm:p-10">
            <div className="font-mono text-[11px] tracking-[0.22em] text-cyan uppercase">Pronto para começar?</div>
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">Automatize sua estratégia e fique um passo à frente do mercado.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-text1">
              Rodando com disciplina de risco, execução 24/7 e gestão automatizada para cada ciclo de mercado.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/login?tab=register" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-bg0 transition hover:brightness-110">
                Começar grátis
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-full border border-white/25 bg-transparent px-7 py-4 text-base font-semibold text-white transition hover:border-cyan-30 hover:text-cyan">
                Entrar
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
