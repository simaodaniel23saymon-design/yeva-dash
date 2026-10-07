import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SpotBotConfig } from '../types/spot';
import { CONFIG_ERROR_LABEL, CONFIG_STATE_LABEL, PROTECTION_LABEL, draftSummaryRows } from './botConfigView';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

const cfg = (over: Partial<SpotBotConfig> = {}): SpotBotConfig => ({
  capitalTotalUsdt: 100,
  entryCapitalUsdt: 30,
  reserveUsdt: null,
  maxPerCoinUsdt: null,
  maxEntries: 5,
  stopLossPct: null,
  trailingStopPct: null,
  takeProfitPct: 10,
  trailingActivationPct: null,
  trailingGivebackPct: null,
  reentryEnabled: false,
  reentryCondition: null,
  reentryCooldownMin: null,
  ...over,
});

describe('pesquisa manual (frontend)', () => {
  it('10 não faz pedido por tecla: pesquisa só no submit do formulário', () => {
    const page = read('pages/SpotPage.tsx');
    expect(page).toMatch(/onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\);\s*void s\.search\(query\);/);
    expect(page).toMatch(/onChange=\{\(e\) => setQuery\(e\.target\.value\)\}/);
    expect(page).not.toMatch(/onChange=\{[^}]*search\(/);
    expect(read('hooks/useSpot.ts')).toMatch(/api\.get<SpotSearchResponse>\('\/spot\/search'/);
  });
  it('resultado mostra símbolo, mercado Spot e status do catálogo', () => {
    expect(read('components/spot/SpotCoinRow.tsx')).toMatch(/\{coin\.symbol\} · Spot · \{coin\.status\}/);
  });
  it('catálogo indisponível ⇒ mensagem própria, não "Nenhuma moeda encontrada."', () => {
    const hook = read('hooks/useSpot.ts');
    expect(hook).toContain("SYMBOL_CATALOG_UNAVAILABLE: 'Não foi possível atualizar a lista de moedas da exchange.'");
    expect(hook).toMatch(/catch \(err\) \{\s*setSearchResults\(null\);/);
  });
});

describe('rascunho vs. pronto para ativar (frontend)', () => {
  it('rótulos: Rascunho / Pronto para ativar; Proteção Incompleta / Completa', () => {
    expect(CONFIG_STATE_LABEL).toEqual({ DRAFT: 'Rascunho', READY_TO_ACTIVATE: 'Pronto para ativar' });
    expect(PROTECTION_LABEL).toEqual({ COMPLETE: 'Completa', INCOMPLETE: 'Incompleta' });
  });
  it('resumo do rascunho com os valores da config; em falta ⇒ "Não configurado" (nunca 0)', () => {
    expect(Object.fromEntries(draftSummaryRows(cfg(), 'DRAFT'))).toEqual({
      Status: 'Rascunho',
      Capital: '$100.00',
      Entrada: '$30.00',
      Stop: 'Não configurado',
      'Take Profit': '10%',
      Proteção: 'Incompleta',
    });
    expect(Object.fromEntries(draftSummaryRows(cfg({ capitalTotalUsdt: null, stopLossPct: 5 }), 'READY_TO_ACTIVATE'))).toMatchObject({
      Status: 'Pronto para ativar',
      Capital: 'Não configurado',
      Stop: '5%',
      Proteção: 'Completa',
    });
  });
  it('cartão: DRAFT ⇒ [Continuar configuração]; READY ⇒ [ATIVAR]; ambos abrem a configuração (preview + confirmação)', () => {
    const row = read('components/spot/SpotCoinRow.tsx');
    expect(row).toMatch(/draftState === 'DRAFT' \?/);
    expect(row).toMatch(/data-testid=\{`spot-continue-\$\{coin\.symbol\}`\}/);
    expect(row).toMatch(/data-testid=\{`spot-draft-\$\{coin\.symbol\}`\}/);
    expect(row.match(/onClick=\{\(\) => onConfigure\(coin\)\}/g)!.length).toBeGreaterThanOrEqual(3);
  });
  it('painel: [Guardar rascunho] grava com enabled=false; ativar continua a exigir preview + confirmação', () => {
    const panel = read('components/spot/BotConfigPanel.tsx');
    expect(panel).toMatch(/>\s*Guardar rascunho\s*</);
    expect(panel).toMatch(/data-testid="bot-config-state"/);
    expect(panel).toMatch(/if \(!form \|\| !review \|\| !confirming\) return;/);
    expect(read('hooks/useSpot.ts')).toMatch(/api\.put<\{ configState: BotConfigState \| null \}>\('\/spot\/preferences', \{ exchange, bot, symbol, enabled: false, config \}\)/);
  });
  it('16/17 bloqueios de ativação com mensagens próprias (stop e capital)', () => {
    expect(CONFIG_ERROR_LABEL.STOP_LOSS_REQUIRED).toBe('Configure uma proteção de perda antes de ativar.');
    expect(CONFIG_ERROR_LABEL.CAPITAL_REQUIRED).toBeTruthy();
    for (const k of ['ENTRY_REQUIRED', 'EXPOSURE_REQUIRED', 'MAX_ENTRIES_REQUIRED', 'EXIT_POLICY_REQUIRED']) expect(CONFIG_ERROR_LABEL[k], k).toBeTruthy();
  });
  it('12-15/19 rascunho e ativação não tocam em ordens, fills, posições ou intents', () => {
    for (const f of ['hooks/useSpot.ts', 'components/spot/BotConfigPanel.tsx', 'components/spot/SpotCoinRow.tsx', 'pages/SpotPage.tsx']) {
      expect(read(f), f).not.toMatch(/\/order|newOrder|createOrder|\/fills?\b|executionIntent|\/spot-bots|\/api\/v3|fapi/i);
    }
  });
});

describe('segurança (frontend)', () => {
  it('20 utilizador não vê Paper nas páginas/hook Spot', () => {
    for (const f of ['pages/SpotPage.tsx', 'hooks/useSpot.ts', 'components/spot/SpotCoinRow.tsx']) expect(read(f), f).not.toMatch(/'PAPER'|PaperConfigLab|spot-paper/);
  });
  it('21 laboratório PAPER continua só no Strategy Lab (admin)', () => {
    expect(read('components/admin/StrategyLabPanel.tsx')).toContain('<PaperConfigLab />');
    expect(read('components/admin/PaperConfigLab.tsx')).toMatch(/LAB_CONTEXT = 'PAPER'/);
  });
  it('22 não existe botão para ligar LIVE', () => {
    for (const f of ['pages/SpotPage.tsx', 'components/spot/SpotCoinRow.tsx', 'components/spot/BotConfigPanel.tsx']) expect(read(f), f).not.toMatch(/enable.?live|ativar live|ligar live/i);
  });
});
