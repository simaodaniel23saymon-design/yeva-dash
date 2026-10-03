/** Vista do readiness do Real Spot Pilot (admin, só leitura). Valores ausentes ficam "—"; nunca 0 inventado. */

export type PilotReadiness = {
  accountId: string;
  userIdMasked: string | null;
  exchange: 'BINANCE';
  market: 'SPOT';
  controlState: string;
  pilotAccount: { configured: boolean; matches: boolean };
  readiness: 'READY' | 'NOT_READY';
  blockers: string[];
  safety: { gates: string[]; realSpotPilotMaxNotional: number | null };
  executionContext: { executionContext: string; market: string; exchange: string; accountId: string; paperAllowed: boolean };
  reads?: Record<string, string>;
  spotBalance?: { state: string; usdtFree: number | null; usdtLocked: number | null; futuresBalanceUsed: boolean };
  capital?: { realSpotAvailableCapital: number | null } | null;
  externalOrders?: number | null;
  externalPositions?: number | null;
  symbols?: Array<{ symbol: string; eligible: boolean; reasons: string[] }>;
  bot?: { bot: string; symbol: string; configured: boolean; configState: string; activationErrors: string[] };
  limits?: { strategyLimitUsdt: number | null; pilotLimitUsdt: number | null; effectiveLimitUsdt: number | null };
  riskPreview?: {
    capitalUsdt: number | null;
    initialEntryUsdt: number | null;
    reserveUsdt: number | null;
    maxExposureUsdt: number | null;
    stopLossPct: number | null;
    takeProfitPct: number | null;
    trailingActivationPct: number | null;
    trailingGivebackPct: number | null;
    maxEntries: number | null;
  } | null;
  dryRun?: { evaluated: boolean; decision: string; reasons: string[] };
};

const NA = '—';
const usd = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? NA : `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`);
const pct = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? NA : `${n}%`);

export const SPOT_BALANCE_STATE_TEXT: Record<string, string> = {
  NOT_CONNECTED: 'Não conectada',
  DATA_UNAVAILABLE: 'Dados indisponíveis',
  DATA_STALE: 'Dados desatualizados',
  ZERO_BALANCE: 'Saldo zero',
  CONNECTED: 'Conectada',
};

export function readinessSummary(r: PilotReadiness): Array<[string, string]> {
  const trailing = r.riskPreview && r.riskPreview.trailingActivationPct != null ? `ativa ${pct(r.riskPreview.trailingActivationPct)} · devolve ${pct(r.riskPreview.trailingGivebackPct)}` : NA;
  return [
    ['Conta piloto', r.pilotAccount.matches ? 'Configurada (esta conta)' : r.pilotAccount.configured ? 'Outra conta configurada' : 'Não configurada'],
    ['Utilizador', r.userIdMasked ?? NA],
    ['Mercado', `${r.exchange} · ${r.market}`],
    ['Contexto', `${r.executionContext.executionContext} · Paper ${r.executionContext.paperAllowed ? 'permitido' : 'excluído'}`],
    ['Estado do piloto', r.controlState],
    ['Saldo Spot', r.spotBalance ? `${SPOT_BALANCE_STATE_TEXT[r.spotBalance.state] ?? r.spotBalance.state} · livre ${usd(r.spotBalance.usdtFree)} · bloqueado ${usd(r.spotBalance.usdtLocked)}` : NA],
    ['Capital Spot disponível', usd(r.capital?.realSpotAvailableCapital)],
    ['Ordens externas', r.externalOrders == null ? NA : String(r.externalOrders)],
    ['Posições externas', r.externalPositions == null ? NA : String(r.externalPositions)],
    ['Bot', r.bot ? `${r.bot.bot} · ${r.bot.symbol} · ${r.bot.configured ? r.bot.configState : 'sem configuração'}` : NA],
    ['Capital total', usd(r.riskPreview?.capitalUsdt)],
    ['Entrada inicial', usd(r.riskPreview?.initialEntryUsdt)],
    ['Reserva', usd(r.riskPreview?.reserveUsdt)],
    ['Exposição máxima', usd(r.riskPreview?.maxExposureUsdt)],
    ['Stop loss', pct(r.riskPreview?.stopLossPct)],
    ['Take profit', pct(r.riskPreview?.takeProfitPct)],
    ['Trailing', trailing],
    ['Máx. entradas', r.riskPreview?.maxEntries == null ? NA : String(r.riskPreview.maxEntries)],
    ['Limite da estratégia', usd(r.limits?.strategyLimitUsdt)],
    ['Limite do piloto', usd(r.limits?.pilotLimitUsdt)],
    ['Máximo efetivo', usd(r.limits?.effectiveLimitUsdt)],
    ['Risk Guard (dry-run)', r.dryRun ? `${r.dryRun.decision}${r.dryRun.evaluated ? '' : ' · não avaliado'}` : NA],
  ];
}
