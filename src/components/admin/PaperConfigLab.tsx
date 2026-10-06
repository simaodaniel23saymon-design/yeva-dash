import { useCallback, useState } from 'react';
import { api } from '../../lib/api';
import BotConfigPanel from '../spot/BotConfigPanel';
import type { BotConfigError, BotConfigResponse, BotPreviewResponse } from '../../types/spot';

const LAB_CONTEXT = 'PAPER' as const;
const LAB_EXCHANGE = 'BINANCE';
const LAB_BOT = 'MOMENTUM_ROTATION';

/**
 * Configurações experimentais do laboratório (só admin; o backend confirma isAdmin pela BD).
 * Guardadas à parte das preferências REAL; o runtime Paper não as lê e nada aqui envia ordens.
 */
export default function PaperConfigLab() {
  const [input, setInput] = useState('');
  const [symbol, setSymbol] = useState<string | null>(null);
  const [saved, setSaved] = useState('');

  const loadConfig = useCallback(
    async (sym: string) =>
      (await api.get<BotConfigResponse>('/spot/bot-config', { params: { exchange: LAB_EXCHANGE, bot: LAB_BOT, symbol: sym, context: LAB_CONTEXT } })).data,
    []
  );
  const previewConfig = useCallback(
    async (config: Record<string, unknown>) => (await api.post<BotPreviewResponse>('/spot/bot-config/preview', { config, context: LAB_CONTEXT })).data,
    []
  );
  const activate = useCallback(
    async (sym: string, config: Record<string, unknown>): Promise<{ ok: true } | { ok: false; message: string; errors: BotConfigError[] }> => {
      try {
        await api.put('/spot/preferences', { exchange: LAB_EXCHANGE, bot: LAB_BOT, symbol: sym, enabled: true, config, context: LAB_CONTEXT });
        setSaved(`Configuração experimental guardada para ${sym}.`);
        return { ok: true };
      } catch (err) {
        const data = (err as { response?: { data?: { error?: string; errors?: BotConfigError[] } } })?.response?.data;
        return {
          ok: false,
          message: data?.error === 'PAPER_ADMIN_ONLY' ? 'Só administradores podem guardar configurações experimentais.' : 'Não foi possível guardar a configuração.',
          errors: Array.isArray(data?.errors) ? data.errors : [],
        };
      }
    },
    []
  );

  const base = symbol ? symbol.replace(/USDT$/, '') : '';

  return (
    <div className="bg-bg1 border border-border1 p-4 space-y-2" data-testid="lab-paper-config">
      <p className="font-mono text-[9px] uppercase tracking-wider text-text3">Configuração experimental</p>
      <p className="text-text2 text-[12px]">Testa parâmetros do bot numa moeda sem afetar contas reais. Stop loss opcional aqui.</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const s = input.trim().toUpperCase();
          if (!s) return;
          setSaved('');
          setSymbol(s.endsWith('USDT') ? s : `${s}USDT`);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Símbolo (ex.: ETH)"
          aria-label="Símbolo experimental"
          maxLength={24}
          className="flex-1 bg-bg2 border border-border2 text-text1 px-3 py-1.5 font-mono text-[12px] focus:outline-none focus:border-cyan-30"
        />
        <button type="submit" className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-cyan-30 text-cyan">
          Configurar
        </button>
      </form>
      {saved && <p className="text-text2 text-[12px]">{saved}</p>}
      {symbol && (
        <BotConfigPanel
          symbol={symbol}
          base={base}
          botName="Momentum Rotation"
          context={LAB_CONTEXT}
          loadConfig={loadConfig}
          previewConfig={previewConfig}
          activate={activate}
          onClose={() => setSymbol(null)}
        />
      )}
    </div>
  );
}
