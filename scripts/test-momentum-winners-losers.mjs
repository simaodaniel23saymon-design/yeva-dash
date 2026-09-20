/**
 * Testes Winners/Losers dashboard: loading, empty, error, stale, cortes.
 * Run: node scripts/test-momentum-winners-losers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function ok(cond, msg) {
  if (cond) console.log(`✓ ${msg}`);
  else {
    console.error(`✗ ${msg}`);
    failed += 1;
  }
}

const RANKING_STALE_MS = 15 * 60_000;

function isRankingScanStale(scannedAt, nowMs = Date.now()) {
  if (!scannedAt) return true;
  const t = Date.parse(scannedAt);
  if (!Number.isFinite(t)) return true;
  return nowMs - t > RANKING_STALE_MS;
}

function splitWinnersLosers(items) {
  const winners = [];
  const losers = [];
  for (const row of items || []) {
    if (row.side === 'WINNER') winners.push(row);
    else if (row.side === 'LOSER') losers.push(row);
  }
  return { winners, losers };
}

function rankingViewState(input) {
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  if (input.winnerCount === 0 && input.loserCount === 0) return 'empty';
  if (input.stale) return 'stale';
  return 'ready';
}

ok(rankingViewState({ loading: true, error: null, winnerCount: 0, loserCount: 0, stale: false }) === 'loading', 'estado loading');
ok(rankingViewState({ loading: false, error: 'fail', winnerCount: 1, loserCount: 0, stale: false }) === 'error', 'estado API error');
ok(rankingViewState({ loading: false, error: null, winnerCount: 0, loserCount: 0, stale: false }) === 'empty', 'estado empty');
ok(rankingViewState({ loading: false, error: null, winnerCount: 1, loserCount: 0, stale: true }) === 'stale', 'estado stale com dados');
ok(rankingViewState({ loading: false, error: null, winnerCount: 2, loserCount: 1, stale: false }) === 'ready', 'estado ready');

const now = Date.parse('2026-09-20T12:00:00.000Z');
ok(isRankingScanStale('2026-09-20T11:40:00.000Z', now) === true, 'scan >15m é stale');
ok(isRankingScanStale('2026-09-20T11:50:00.000Z', now) === false, 'scan fresco não é stale');
ok(isRankingScanStale(null, now) === true, 'sem scannedAt é stale');

const split = splitWinnersLosers([
  { side: 'WINNER', symbol: 'ETHUSDT', score: 70 },
  { side: 'LOSER', symbol: 'ADAUSDT', score: 61 },
  { side: 'NONE', symbol: 'BTCUSDT', score: 20 },
]);
ok(split.winners.length === 1 && split.winners[0].symbol === 'ETHUSDT', 'corta Winners');
ok(split.losers.length === 1 && split.losers[0].symbol === 'ADAUSDT', 'corta Losers');
ok(!split.winners.some((r) => r.side === 'NONE') && !split.losers.some((r) => r.side === 'NONE'), 'NONE fora das duas áreas');

const view = fs.readFileSync(path.join(root, 'src/utils/momentumRankingView.ts'), 'utf8');
ok(view.includes("return 'loading'"), 'view helper loading');
ok(view.includes("return 'empty'"), 'view helper empty');
ok(view.includes("return 'error'"), 'view helper error');
ok(view.includes("return 'stale'"), 'view helper stale');
ok(view.includes("row.side === 'WINNER'"), 'split winners');
ok(view.includes("row.side === 'LOSER'"), 'split losers');

const section = fs.readFileSync(
  path.join(root, 'src/components/dashboard/MomentumWinnersLosersSection.tsx'),
  'utf8'
);
ok(section.includes('momentum-ranking-loading'), 'UI loading testid');
ok(section.includes('momentum-ranking-empty'), 'UI empty testid');
ok(section.includes('momentum-ranking-error'), 'UI error testid');
ok(section.includes('momentum-ranking-stale'), 'UI stale testid');
ok(section.includes('WINNERS'), 'área WINNERS');
ok(section.includes('LOSERS'), 'área LOSERS');
ok(view.includes("'WATCH'") && view.includes("'VALIDATING'") && view.includes("'APPROVED'") && view.includes("'REJECTED'"), 'estados visuais WATCH/VALIDATING/APPROVED/REJECTED');
ok(section.includes('4H') && section.includes('1H') && section.includes('15M') && section.includes('5M'), 'MTF 4H/1H/15M/5M');
ok(section.includes('Fatores positivos') && section.includes('Fatores negativos'), 'fatores');
ok(section.includes('Motivo') && section.includes('R:R'), 'motivo e R:R');
ok(section.includes('MFE') && section.includes('MAE'), 'MFE/MAE');
ok(!/comprar|vender|createOrder|placeOrder/i.test(section), 'sem compra/venda/ordens');
ok(section.includes('só análise') || section.includes('Análise only'), 'copy análise only');

const dash = fs.readFileSync(path.join(root, 'src/pages/DashboardPage.tsx'), 'utf8');
ok(dash.includes('MomentumWinnersLosersSection'), 'Dashboard inclui Winners/Losers');

const hook = fs.readFileSync(path.join(root, 'src/hooks/useMomentumRanking.ts'), 'utf8');
ok(hook.includes('/auto-ops/momentum/ranking'), 'hook ranking API');
ok(hook.includes('/auto-ops/momentum/metrics'), 'hook metrics API para MFE/MAE');
ok(!hook.includes('createOrder'), 'hook sem execução');

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nWinners/Losers dashboard tests OK');
