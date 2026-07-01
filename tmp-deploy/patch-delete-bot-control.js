/**
 * Corrige DELETE bot em bot-control.routes.js (rota activa em produção)
 * - Cascade: gridOrder, tradeCycle, round, performanceFee
 * - Rotas literais antes de /:id
 * - Alias /stopped e /:id/force
 */
const fs = require('fs');
const path = '/app/dist/modules/bots/bot-control.routes.js';

let s = fs.readFileSync(path, 'utf8');

if (s.includes('deleteBotWithRelations')) {
  console.log('bot-control.routes.js já patchado');
  process.exit(0);
}

const helper = `
const RUNNING_BOT_STATUSES = new Set(['running', 'RUNNING', 'active', 'ACTIVE', 'live', 'LIVE']);
async function deleteBotWithRelations(botId) {
    await prisma_1.prisma.gridOrder.deleteMany({ where: { botId } });
    await prisma_1.prisma.tradeCycle.deleteMany({ where: { botId } });
    await prisma_1.prisma.round.deleteMany({ where: { botId } });
    await prisma_1.prisma.performanceFee.deleteMany({ where: { botId } });
    await prisma_1.prisma.bot.delete({ where: { id: botId } });
}
function isRunningBotStatus(status) {
    return RUNNING_BOT_STATUSES.has(String(status ?? ''));
}
`;

s = s.replace(
  '    return {\n        apiKey,\n        apiSecret,\n        market: String(bot.market || \'FUTURES\'),\n        pair: String(bot.pair || \'\')\n    };\n}',
  `    return {\n        apiKey,\n        apiSecret,\n        market: String(bot.market || 'FUTURES'),\n        pair: String(bot.pair || '')\n    };\n}${helper}`,
);

const deleteBlock = `// DELETE /bots/purge-stopped - APAGAR TODOS OS BOTS PARADOS (antes de /:id)
router.delete('/purge-stopped', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = String(req.userId || '');
        if (!userId)
            return res.status(401).json({ error: 'Não autenticado' });
        const toDelete = await prisma_1.prisma.bot.findMany({
            where: {
                userId,
                status: { notIn: ['running', 'RUNNING', 'active', 'ACTIVE', 'live', 'LIVE'] }
            },
            select: { id: true }
        });
        for (const b of toDelete) {
            await deleteBotWithRelations(b.id);
        }
        console.log(\`✅ \${toDelete.length} bots parados apagados por usuário \${userId}\`);
        res.json({ message: \`\${toDelete.length} bots apagados\`, count: toDelete.length, deleted: toDelete.length });
    }
    catch (error) {
        console.error('Erro ao apagar bots:', error);
        res.status(500).json({ error: 'Erro ao apagar bots' });
    }
});
router.delete('/stopped', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = String(req.userId || '');
        if (!userId)
            return res.status(401).json({ error: 'Não autenticado' });
        const toDelete = await prisma_1.prisma.bot.findMany({
            where: {
                userId,
                status: { notIn: ['running', 'RUNNING', 'active', 'ACTIVE', 'live', 'LIVE'] }
            },
            select: { id: true }
        });
        for (const b of toDelete) {
            await deleteBotWithRelations(b.id);
        }
        res.json({ message: \`\${toDelete.length} bots apagados\`, count: toDelete.length, deleted: toDelete.length });
    }
    catch (error) {
        console.error('Erro ao apagar bots parados:', error);
        res.status(500).json({ error: 'Erro ao apagar bots' });
    }
});
router.delete('/:id/force', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = String(req.userId || '');
        const botId = req.params.id;
        if (!userId)
            return res.status(401).json({ error: 'Não autenticado' });
        const bot = await prisma_1.prisma.bot.findFirst({
            where: { id: botId, userId }
        });
        if (!bot) {
            return res.status(404).json({ error: 'Bot não encontrado' });
        }
        await prisma_1.prisma.bot.update({
            where: { id: botId },
            data: { status: 'stopped' }
        });
        await deleteBotWithRelations(botId);
        console.log(\`✅ Bot \${botId} forçado a apagar por usuário \${userId}\`);
        res.json({ message: 'Bot apagado com sucesso', botId });
    }
    catch (error) {
        console.error('Erro ao forçar apagar bot:', error);
        res.status(500).json({ error: 'Erro ao apagar bot' });
    }
});
// DELETE /bots/:id - APAGAR BOT
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = String(req.userId || '');
        const botId = req.params.id;
        if (!userId)
            return res.status(401).json({ error: 'Não autenticado' });
        const bot = await prisma_1.prisma.bot.findFirst({
            where: { id: botId, userId }
        });
        if (!bot) {
            return res.status(404).json({ error: 'Bot não encontrado' });
        }
        if (isRunningBotStatus(bot.status)) {
            return res.status(400).json({
                error: 'Não é possível apagar um bot em execução. Pare o bot primeiro.',
                code: 'BOT_RUNNING'
            });
        }
        await deleteBotWithRelations(botId);
        console.log(\`✅ Bot \${botId} apagado por usuário \${userId}\`);
        res.json({ message: 'Bot apagado com sucesso', botId });
    }
    catch (error) {
        console.error('Erro ao apagar bot:', error);
        res.status(500).json({ error: 'Erro ao apagar bot' });
    }
});`;

const oldDeleteStart = s.indexOf('// DELETE /bots/:id - APAGAR BOT');
const exportsIdx = s.indexOf('exports.default = router;');
if (oldDeleteStart === -1 || exportsIdx === -1) {
  console.error('Não encontrou bloco DELETE para substituir');
  process.exit(1);
}

s = s.slice(0, oldDeleteStart) + deleteBlock + '\n' + s.slice(exportsIdx);

fs.writeFileSync(path, s);
console.log('bot-control.routes.js delete cascade OK');
