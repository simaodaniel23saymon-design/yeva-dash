/**
 * Deploy Trading Engine V3 + schema + API patches
 */
const fs = require('fs');
const { execSync } = require('child_process');

const ENGINE_SRC = '/tmp/trading-engine-v3.js';
const IND_SRC = '/tmp/indicators-v3.js';
const ENGINE_DST = '/app/dist/modules/trading/trading-engine.js';
const IND_DST = '/app/dist/modules/trading/indicators.js';
const INDEX = '/app/dist/index.js';

console.log('=== Yeva Trade Engine V3 Deploy ===');

// 1. SQL migration
const sql = `
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "minProfitUsdt" DOUBLE PRECISION DEFAULT 2.0;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "dynamicSpacingEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "trailingStopActivationUsdt" DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "trailingStopCallbackUsdt" DOUBLE PRECISION DEFAULT 0.5;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "engineState" TEXT DEFAULT 'IDLE';
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "cycleAnchorPrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "cycleSpacingPct" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "cycleLongOrders" INTEGER DEFAULT 0;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "cycleShortOrders" INTEGER DEFAULT 0;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "peakNetPnlUsdt" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "peakNetPnlPercent" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "cycleStartedAt" TIMESTAMP;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "lastCloseReason" TEXT;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "lastGrossPnl" DOUBLE PRECISION;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "lastNetPnl" DOUBLE PRECISION;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "lastBinanceFees" DOUBLE PRECISION;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "lastFunding" DOUBLE PRECISION;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "lastYevaFee" DOUBLE PRECISION;
ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "lastCycleClosedAt" TIMESTAMP;

CREATE TABLE IF NOT EXISTS "CycleAuditLog" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "botId" TEXT NOT NULL,
  pair TEXT NOT NULL,
  "eventAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  state TEXT,
  "positionsCount" INTEGER,
  "ordersCount" INTEGER,
  "marginUsed" DOUBLE PRECISION,
  "grossPnl" DOUBLE PRECISION,
  "binanceFees" DOUBLE PRECISION,
  funding DOUBLE PRECISION,
  "yevaFee" DOUBLE PRECISION,
  "netPnl" DOUBLE PRECISION,
  "closeReason" TEXT,
  note TEXT
);
CREATE INDEX IF NOT EXISTS "CycleAuditLog_botId_idx" ON "CycleAuditLog"("botId");
`;

async function runMigration() {
  const prisma_1 = require('/app/dist/lib/prisma');
  const prisma = prisma_1.prisma;
  try {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const st of statements) {
      await prisma.$executeRawUnsafe(st);
    }
    console.log('Schema V3 OK');
  } catch (e) {
    throw e;
  }
}

runMigration().then(() => {
  fs.copyFileSync(ENGINE_SRC, ENGINE_DST);
  fs.copyFileSync(IND_SRC, IND_DST);
  console.log('Engine + indicators copiados');

  let idx = fs.readFileSync(INDEX, 'utf8');

  // PATCH POST /api/bots — novos campos
  if (!idx.includes('minProfitUsdt')) {
    idx = idx.replace(
      "const { exchangeId, pair, market, mode, leverage, capitalPerSide, ordersPerSide, spacing, tpDailyPct, maxLossPct } = req.body;",
      "const { exchangeId, pair, market, mode, leverage, capitalPerSide, ordersPerSide, spacing, tpDailyPct, maxLossPct, minProfitUsdt, dynamicSpacingEnabled, trailingStopEnabled, trailingStopActivation, trailingStopCallback, trailingStopActivationUsdt, trailingStopCallbackUsdt } = req.body;"
    );
    idx = idx.replace(
      "maxLossPct: maxLossPct ?? 3.0,\n            },\n        });\n        res.status(201).json(bot);",
      `maxLossPct: maxLossPct ?? 3.0,
                trailingStopEnabled: trailingStopEnabled ?? true,
                trailingStopActivation: trailingStopActivation ?? 1.0,
                trailingStopCallback: trailingStopCallback ?? 0.5,
            },
        });
        await prisma_1.prisma.$executeRawUnsafe(\`
            UPDATE "Bot" SET
              "minProfitUsdt" = $1,
              "dynamicSpacingEnabled" = $2,
              "trailingStopActivationUsdt" = $3,
              "trailingStopCallbackUsdt" = $4
            WHERE id = $5
        \`, minProfitUsdt ?? 2.0, dynamicSpacingEnabled !== false, trailingStopActivationUsdt ?? minProfitUsdt ?? 1.0, trailingStopCallbackUsdt ?? 0.5, bot.id);
        res.status(201).json(bot);`
    );
    console.log('index.js POST /bots patchado');
  }

  // GET cycle stats
  if (!idx.includes('/api/bots/:id/cycle')) {
    const route = `
app.get('/api/bots/:id/cycle', auth_1.authMiddleware, async (req, res) => {
    try {
        const id = String(req.params.id);
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id, userId: req.userId } });
        if (!bot) return res.status(404).json({ error: 'Bot não encontrado' });
        const rows = await prisma_1.prisma.$queryRawUnsafe(\`
            SELECT "engineState", "cycleAnchorPrice", "cycleSpacingPct", "cycleLongOrders", "cycleShortOrders",
                   "peakNetPnlUsdt", "peakNetPnlPercent", "cycleStartedAt",
                   "lastCloseReason", "lastGrossPnl", "lastNetPnl", "lastBinanceFees", "lastFunding", "lastYevaFee", "lastCycleClosedAt",
                   "minProfitUsdt", "dynamicSpacingEnabled", "trailingStopActivationUsdt", "trailingStopCallbackUsdt"
            FROM "Bot" WHERE id = $1
        \`, id);
        const row = rows[0] || {};
        const logs = await prisma_1.prisma.$queryRawUnsafe(\`
            SELECT state, "positionsCount", "ordersCount", "marginUsed", "grossPnl", "binanceFees", funding, "yevaFee", "netPnl", "closeReason", note, "eventAt"
            FROM "CycleAuditLog" WHERE "botId" = $1 ORDER BY "eventAt" DESC LIMIT 20
        \`, id);
        res.json({ bot: { id: bot.id, pair: bot.pair, status: bot.status, tpDailyPct: bot.tpDailyPct }, cycle: row, auditLog: logs });
    } catch (error) {
        logger_1.logger.error('Erro cycle stats', error);
        res.status(500).json({ error: 'Erro ao obter ciclo' });
    }
});
`;
    idx = idx.replace("app.patch('/api/bots/:id/status'", route + "\napp.patch('/api/bots/:id/status'");
    console.log('index.js GET /cycle adicionado');
  }

  fs.writeFileSync(INDEX, idx);
  console.log('Deploy V3 concluído');
}).catch(err => {
  console.error('Deploy falhou:', err);
  process.exit(1);
});
