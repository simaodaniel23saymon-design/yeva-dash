/**
 * Smoke tests — logo assets, boot 12s, PRO banner page.
 * Run: node scripts/test-quick-fixes.mjs
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

// 1) Logo oficial + PWA icons (Y dourado — sem placeholder A)
ok(fs.existsSync(path.join(root, 'public/favicon.png')), 'favicon oficial existe');
ok(fs.existsSync(path.join(root, 'public/yeva-logo-horizontal.png')), 'PNG horizontal existe');
ok(fs.existsSync(path.join(root, 'public/icon-192-maskable.png')), 'icon-192-maskable existe');
ok(fs.existsSync(path.join(root, 'public/icon-512-maskable.png')), 'icon-512-maskable existe');

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8')
);
ok(
  manifest.icons?.some((i) => i.purpose === 'maskable' && i.sizes === '192x192'),
  'manifest tem maskable 192'
);
ok(
  manifest.icons?.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'),
  'manifest tem maskable 512'
);

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
ok(indexHtml.includes('favicon.png'), 'index.html favicon oficial PNG');
ok(!indexHtml.includes('yeva-logo.svg'), 'index sem SVG placeholder');
ok(indexHtml.includes('og:image'), 'og:image partilha');

const brand = fs.readFileSync(path.join(root, 'src/components/BrandLogo.tsx'), 'utf8');
ok(brand.includes('yeva-logo-horizontal.png'), 'BrandLogo PNG oficial');
ok(!brand.includes('yeva-logo.svg'), 'BrandLogo sem placeholder SVG A');

// 2) Boot 12s
const boot = fs.readFileSync(path.join(root, 'src/utils/bootTiming.ts'), 'utf8');
ok(boot.includes('12_000') || boot.includes('12000'), 'MIN_BOOT_MS = 12000');

function shouldCompleteBoot({ elapsedMs, minMs = 12000, dataReady }) {
  return elapsedMs >= minMs && dataReady;
}
ok(!shouldCompleteBoot({ elapsedMs: 6000, dataReady: true }), 'não completa aos 6s');
ok(!shouldCompleteBoot({ elapsedMs: 15000, dataReady: false }), 'espera dados após 12s');
ok(shouldCompleteBoot({ elapsedMs: 12000, dataReady: true }), 'completa aos 12s com dados');

const layout = fs.readFileSync(path.join(root, 'src/components/Layout.tsx'), 'utf8');
ok(layout.includes('dataReady={!authLoading}'), 'Layout passa dataReady do auth');

// 3) PRO bloqueado
const pro = fs.readFileSync(path.join(root, 'src/pages/ProPage.tsx'), 'utf8');
ok(pro.includes('Em breve'), 'ProPage tem banner Em breve');
ok(!pro.includes('Assinar com crypto'), 'ProPage sem checkout');
ok(!pro.includes('Pro Signals'), 'ProPage sem sinais');

const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
ok(app.includes('path="/pro/signals"') && app.includes('Navigate to="/pro"'), 'signals → /pro');
ok(app.includes('path="/market-analysis"') && app.includes('Navigate to="/pro"'), 'análise → /pro');

// 4) Operações
const ops = fs.readFileSync(path.join(root, 'src/pages/OperationsPage.tsx'), 'utf8');
ok(ops.includes('OperationsSubNav'), 'OperationsPage inclui navegação de operações');
ok(ops.includes('OpenPositionCards'), 'OperationsPage mantém operações manuais/live');

const operationsRoutes = [
  ['gainers', 'OperationsGainersPage.tsx', 'AutoOpsMomentumPage'],
  ['losers', 'OperationsLosersPage.tsx', 'AutoOpsMomentumPage'],
  ['estaveis', 'OperationsEstaveisPage.tsx', 'AutoOpsStablePage'],
];
for (const [route, page, component] of operationsRoutes) {
  ok(app.includes(`path="/operations/${route}"`), `rota de operações ${route}`);
  const pagePath = path.join(root, 'src/pages', page);
  ok(fs.existsSync(pagePath), `página de operações ${page} existe`);
  if (fs.existsSync(pagePath)) {
    const pageSource = fs.readFileSync(pagePath, 'utf8');
    ok(pageSource.includes(component), `${page} usa ${component}`);
  }
}

const botsPage = fs.readFileSync(path.join(root, 'src/pages/BotsPage.tsx'), 'utf8');
ok(botsPage.includes('SpotAutoBotsPanel'), 'BotsPage inclui Spot Auto');
const spotUi = fs.readFileSync(
  path.join(root, 'src/components/SpotAutoBotsPanel.tsx'),
  'utf8'
);
ok(spotUi.includes('Manter posição'), 'OFF pergunta manter posição');
ok(spotUi.includes('Vender tudo'), 'OFF pergunta vender tudo');
ok(spotUi.includes('/spot-bots/'), 'API spot-bots');
ok(spotUi.includes('BotEditModal') || spotUi.includes('✏️'), 'Spot UI tem editar');
ok(botsPage.includes('BotEditModal'), 'BotsPage modal editar');
ok(botsPage.includes('/bots/') && botsPage.includes('/power'), 'BotsPage ON/OFF power');

const editModal = fs.readFileSync(
  path.join(root, 'src/components/BotEditModal.tsx'),
  'utf8'
);
ok(editModal.includes('takeProfitPct'), 'modal TP');
ok(editModal.includes('stopLossPct'), 'modal SL');
ok(editModal.includes('ciclos novos') || editModal.includes('ciclo aberto'), 'nota ciclos novos');
ok(editModal.includes('Histórico de edições'), 'histórico edições');
ok(editModal.includes('capacity-check'), 'aviso capacidade no edit');

ok(botsPage.includes('BotAllocateModal') || botsPage.includes('Alocado:'), 'BotsPage alocação');
ok(spotUi.includes('BotAllocateModal') || spotUi.includes('Alocado:'), 'Spot UI alocação');
ok(spotUi.includes('Em uso:'), 'Spot UI em uso');

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nTodos os quick-fixes OK');
