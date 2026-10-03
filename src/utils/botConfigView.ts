/**
 * Formulário de configuração do bot por moeda e resumo de risco. A validação que conta é a do
 * backend (POST /spot/bot-config/preview e PUT /spot/preferences); aqui só conversão e rótulos.
 */

import type { BotCatalogEntry, BotCatalogStatus, BotConfigState, BotRiskPreview, SpotBotConfig, SpotStrategyDefaults } from '../types/spot';
import { fmtUsd } from './spotView';

export const NOT_CONFIGURED = 'não configurado';

export type NumericConfigField = Exclude<keyof SpotBotConfig, 'reentryEnabled' | 'reentryCondition'>;

export type ConfigFieldDef = { field: NumericConfigField; label: string; unit: 'USDT' | '%' | 'min' | '' ; step: string };

export const CONFIG_GROUPS: Array<{ id: string; title: string; fields: ConfigFieldDef[] }> = [
  {
    id: 'base',
    title: 'Base',
    fields: [
      { field: 'capitalTotalUsdt', label: 'Capital total', unit: 'USDT', step: '1' },
      { field: 'entryCapitalUsdt', label: 'Capital por entrada', unit: 'USDT', step: '1' },
      { field: 'reserveUsdt', label: 'Reserva', unit: 'USDT', step: '1' },
      { field: 'maxPerCoinUsdt', label: 'Máximo por moeda', unit: 'USDT', step: '1' },
      { field: 'maxEntries', label: 'Máximo de entradas', unit: '', step: '1' },
    ],
  },
  {
    id: 'protection',
    title: 'Proteção',
    fields: [
      { field: 'stopLossPct', label: 'Stop Loss', unit: '%', step: '0.1' },
      { field: 'trailingStopPct', label: 'Trailing Stop', unit: '%', step: '0.1' },
    ],
  },
  {
    id: 'exit',
    title: 'Saída',
    fields: [
      { field: 'takeProfitPct', label: 'Take Profit', unit: '%', step: '0.1' },
      { field: 'trailingActivationPct', label: 'Ativação do trailing', unit: '%', step: '0.1' },
      { field: 'trailingGivebackPct', label: 'Recuo do trailing', unit: '%', step: '0.1' },
    ],
  },
];

export const REENTRY_CONDITION_LABEL: Record<'NEW_SIGNAL' | 'PULLBACK', string> = {
  NEW_SIGNAL: 'Novo sinal da estratégia',
  PULLBACK: 'Recuo do preço',
};

export const CONFIG_ERROR_LABEL: Record<string, string> = {
  REQUIRED: 'Obrigatório para ativar.',
  NOT_A_NUMBER: 'Tem de ser um número.',
  MUST_BE_POSITIVE: 'Tem de ser maior que zero.',
  OUT_OF_RANGE: 'Valor fora do intervalo permitido.',
  NOT_AN_INTEGER: 'Tem de ser um número inteiro.',
  ENTRY_EXCEEDS_CAPITAL: 'Não pode ser maior que o capital total.',
  ENTRY_PLUS_RESERVE_EXCEEDS_CAPITAL: 'Entrada + reserva não pode passar o capital total.',
  MAX_PER_COIN_EXCEEDS_CAPITAL: 'Não pode ser maior que o capital total.',
  MAX_PER_COIN_BELOW_ENTRY: 'Não pode ser menor que o capital por entrada.',
  BELOW_MIN_ENTRY: 'Abaixo do mínimo por entrada.',
  GIVEBACK_NOT_BELOW_ACTIVATION: 'Tem de ser menor que a ativação do trailing.',
  INVALID_OPTION: 'Opção inválida.',
  STOP_LOSS_REQUIRED: 'Configure uma proteção de perda antes de ativar.',
  CAPITAL_REQUIRED: 'Defina o capital total antes de ativar.',
  ENTRY_REQUIRED: 'Defina o capital por entrada antes de ativar.',
  EXPOSURE_REQUIRED: 'Defina a exposição máxima por moeda antes de ativar.',
  MAX_ENTRIES_REQUIRED: 'Defina o máximo de entradas antes de ativar.',
  EXIT_POLICY_REQUIRED: 'Defina uma política de saída (Take Profit ou trailing).',
};

export const STOP_REQUIRED_TEXT = CONFIG_ERROR_LABEL.STOP_LOSS_REQUIRED;

export const CONFIG_STATE_LABEL: Record<BotConfigState, string> = {
  DRAFT: 'Rascunho',
  READY_TO_ACTIVATE: 'Pronto para ativar',
};

export const PROTECTION_LABEL = { COMPLETE: 'Completa', INCOMPLETE: 'Incompleta' } as const;

/** Resumo do rascunho no cartão da moeda. Valores da config guardada; em falta ⇒ "Não configurado". */
export function draftSummaryRows(c: SpotBotConfig, state: BotConfigState): Array<[string, string]> {
  const missing = 'Não configurado';
  const money = (v: number | null) => (v == null ? missing : fmtUsd(v));
  const percent = (v: number | null) => (v == null ? missing : `${v}%`);
  return [
    ['Status', CONFIG_STATE_LABEL[state]],
    ['Capital', money(c.capitalTotalUsdt)],
    ['Entrada', money(c.entryCapitalUsdt)],
    ['Stop', percent(c.stopLossPct)],
    ['Take Profit', percent(c.takeProfitPct)],
    ['Proteção', state === 'READY_TO_ACTIVATE' ? PROTECTION_LABEL.COMPLETE : PROTECTION_LABEL.INCOMPLETE],
  ];
}

export type ConfigForm = Record<NumericConfigField, string> & {
  reentryEnabled: boolean;
  reentryCondition: '' | 'NEW_SIGNAL' | 'PULLBACK';
};

const NUMERIC: NumericConfigField[] = [
  'capitalTotalUsdt',
  'entryCapitalUsdt',
  'reserveUsdt',
  'maxPerCoinUsdt',
  'maxEntries',
  'stopLossPct',
  'trailingStopPct',
  'takeProfitPct',
  'trailingActivationPct',
  'trailingGivebackPct',
  'reentryCooldownMin',
];

export function formFromConfig(c: SpotBotConfig): ConfigForm {
  const f = {} as ConfigForm;
  for (const k of NUMERIC) f[k] = c[k] == null ? '' : String(c[k]);
  f.reentryEnabled = c.reentryEnabled === true;
  f.reentryCondition = c.reentryCondition ?? '';
  return f;
}

/** Campos vazios ⇒ null (não configurado). Texto inválido segue como está para o backend o recusar. */
export function configFromForm(f: ConfigForm): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of NUMERIC) {
    const v = f[k].trim().replace(',', '.');
    out[k] = v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : v;
  }
  out.reentryEnabled = f.reentryEnabled;
  out.reentryCondition = f.reentryCondition || null;
  return out;
}

const usd = (n: number | null) => (n == null ? NOT_CONFIGURED : `${fmtUsd(n)} USDT`);
const pct = (n: number | null) => (n == null ? NOT_CONFIGURED : `${n}%`);

export function trailingText(p: Pick<BotRiskPreview, 'trailingStopPct' | 'trailingActivationPct' | 'trailingGivebackPct'>): string {
  const parts: string[] = [];
  if (p.trailingActivationPct != null && p.trailingGivebackPct != null) parts.push(`ativa a ${p.trailingActivationPct}% · recuo ${p.trailingGivebackPct}%`);
  if (p.trailingStopPct != null) parts.push(`stop móvel ${p.trailingStopPct}%`);
  return parts.length ? parts.join(' · ') : NOT_CONFIGURED;
}

export function reentryText(p: Pick<BotRiskPreview, 'reentryEnabled' | 'reentryCondition' | 'reentryCooldownMin'>): string {
  if (!p.reentryEnabled) return 'Desativada';
  const cond = p.reentryCondition ? REENTRY_CONDITION_LABEL[p.reentryCondition] : NOT_CONFIGURED;
  return p.reentryCooldownMin == null ? cond : `${cond} · cooldown ${p.reentryCooldownMin} min`;
}

/** Resumo de risco antes de ativar. Valores vêm do backend (config atual); null ⇒ "não configurado". */
export function riskPreviewRows(p: BotRiskPreview): Array<[string, string]> {
  return [
    ['Capital', usd(p.capitalUsdt)],
    ['Entrada inicial', usd(p.initialEntryUsdt)],
    ['Reserva', usd(p.reserveUsdt)],
    ['Exposição máxima', usd(p.maxExposureUsdt)],
    ['Stop', pct(p.stopLossPct)],
    ['Take Profit', pct(p.takeProfitPct)],
    ['Trailing', trailingText(p)],
    ['Máximo de entradas', p.maxEntries == null ? NOT_CONFIGURED : `${p.maxEntries} ${p.maxEntries === 1 ? 'entrada' : 'entradas'}`],
    ['Reentrada', reentryText(p)],
    ['Perda máxima no stop', p.maxLossAtStopUsdt == null ? (p.stopLossPct == null ? 'sem stop configurado' : NOT_CONFIGURED) : `${fmtUsd(p.maxLossAtStopUsdt)} USDT`],
  ];
}

export const CONFIRM_INTRO = 'Você está configurando este bot para esta moeda.';
export const CONFIRM_NOT_A_BUY = 'Ativar esta configuração não significa comprar imediatamente.';

/** Texto da confirmação final. Números da configuração atual (preview do backend). */
export function confirmationLines(p: BotRiskPreview): string[] {
  return [
    CONFIRM_INTRO,
    `Capital máximo: ${p.maxExposureUsdt == null ? NOT_CONFIGURED : fmtUsd(p.maxExposureUsdt)}`,
    `Entrada inicial: ${p.initialEntryUsdt == null ? NOT_CONFIGURED : fmtUsd(p.initialEntryUsdt)}`,
    `Stop: ${pct(p.stopLossPct)}`,
    `Take Profit: ${pct(p.takeProfitPct)}`,
    CONFIRM_NOT_A_BUY,
  ];
}

/** Sugestão de valores a partir do config da estratégia (só quando o utilizador definiu o capital). */
export function suggestedSplit(capital: number | null, d: SpotStrategyDefaults): { entry: number; reserve: number } | null {
  if (capital == null || !(capital > 0)) return null;
  const round = (n: number) => Math.floor(n * 100) / 100;
  return { entry: round((capital * d.initialAllocationPct) / 100), reserve: round((capital * d.reservePct) / 100) };
}

export const BOT_STATUS_LABEL: Record<BotCatalogStatus, string> = {
  AVAILABLE: 'Disponível',
  COMING_SOON: 'Em breve',
  NOT_SUPPORTED: 'Não suportado',
  DISABLED: 'Desativado',
};

export function botStatusTone(s: BotCatalogStatus): string {
  if (s === 'AVAILABLE') return 'text-cyan border-cyan-30';
  if (s === 'COMING_SOON') return 'text-text2 border-border2';
  return 'text-text3 border-border1';
}

/** Só bots AVAILABLE configuráveis nesta página podem ser escolhidos. */
export function isSelectableHere(b: BotCatalogEntry): boolean {
  return b.status === 'AVAILABLE' && b.configurable === 'HERE';
}

export function botOptionLabel(b: BotCatalogEntry): string {
  if (b.status === 'AVAILABLE' && b.configurable === 'BOTS_PAGE') return `${b.name} · gerido em Bots`;
  if (b.status !== 'AVAILABLE') return `${b.name} · ${BOT_STATUS_LABEL[b.status]}`;
  return b.name;
}
