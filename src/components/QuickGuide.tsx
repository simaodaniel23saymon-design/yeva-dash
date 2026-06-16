import { useState } from 'react';

interface QuickGuideProps {
  title: string;
  steps: string[];
  icon?: string;
  defaultOpen?: boolean;
}

export function QuickGuide({ title, steps, icon = '💡', defaultOpen = false }: QuickGuideProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-cyan-dim border border-cyan-20 p-3.5 mb-4">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-left">
        <span className="font-mono text-[10px] uppercase tracking-wider text-cyan font-bold">{icon} {title}</span>
        <span className="text-cyan font-mono text-sm leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ol className="mt-3 ml-4 list-decimal font-mono text-[10px] text-text2 leading-relaxed space-y-1">
          {steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      )}
    </div>
  );
}
