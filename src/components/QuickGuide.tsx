import { useState } from 'react';
import { IconLightbulb, IconChevron } from './ui/Icons';

interface QuickGuideProps {
  title: string;
  steps: string[];
  defaultOpen?: boolean;
}

export function QuickGuide({ title, steps, defaultOpen = false }: QuickGuideProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-cyan-dim border border-cyan-20 p-3.5 mb-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-left gap-3"
      >
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-cyan font-bold min-w-0">
          <span className="w-7 h-7 flex items-center justify-center bg-bg1/60 border border-cyan-20 shrink-0">
            <IconLightbulb size={14} />
          </span>
          <span className="truncate">{title}</span>
        </span>
        <IconChevron size={16} className="text-cyan shrink-0" open={open} />
      </button>
      {open && (
        <ol className="mt-3 ml-1 space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 font-mono text-[10px] text-text2 leading-relaxed">
              <span className="w-5 h-5 flex items-center justify-center bg-bg1/50 border border-cyan-20 text-cyan text-[9px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
