"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradingEngine = exports.TradingEngine = void 0;
const prisma_1 = require("../../lib/prisma");
const binance_service_1 = require("../binance/binance.service");
const crypto_1 = require("../../utils/crypto");
const indicators_1 = require("./indicators");
const gas_service_1 = require("../wallet/gas.service");

var BotState;
(function (BotState) {
    BotState["IDLE"] = "IDLE";
    BotState["ANALYZING"] = "ANALYZING";
    BotState["BUILD_GRID"] = "BUILD_GRID";
    BotState["MANAGING"] = "MANAGING";
    BotState["CLOSING"] = "CLOSING";
    BotState["CONFIRMING"] = "CONFIRMING";
    BotState["WAITING"] = "WAITING";
})(BotState || (BotState = {}));

const BINANCE_TAKER_FEE = 0.0004;
const YEVA_PERFORMANCE_FEE = 0.30;
const MIN_LIQUIDITY_USDT = 500000;
const COOLDOWN_AFTER_CLOSE = 30000;
const CONFIRM_MAX_ATTEMPTS = 15;
const CONFIRM_DELAY_MS = 2000;

class TradingEngine {
    running = false;
    interval = null;
    botCycles = new Map();

    async start() {
        if (this.running) return;
        this.running = true;
        console.log('[Trading Engine V3] Yeva Trade — ciclo stricto, PnL líquido, grid ATR, MTF');
        this.interval = setInterval(() => this.tick(), 30000);
        await this.tick();
    }

    async stop() {
        this.running = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    async tick() {
        try {
            const bots = await prisma_1.prisma.bot.findMany({
                where: { status: 'running' },
                include: { user: { include: { exchangeAccounts: true, wallet: true } } },
            });
            for (const bot of bots) await this.processBot(bot);
        } catch (error) {
            console.error('[Trading Engine V3] Erro tick:', error);
        }
    }

    async processBot(bot) {
        try {
            const cycle = await this.getOrCreateCycle(bot);
            switch (cycle.state) {
                case BotState.IDLE: await this.stateIdle(bot, cycle); break;
                case BotState.ANALYZING: await this.stateAnalyzing(bot, cycle); break;
                case BotState.BUILD_GRID: await this.stateBuildGrid(bot, cycle); break;
                case BotState.MANAGING: await this.stateManaging(bot, cycle); break;
                case BotState.CLOSING: await this.stateClosing(bot, cycle); break;
                case BotState.CONFIRMING: await this.stateConfirming(bot, cycle); break;
                case BotState.WAITING: await this.stateWaiting(bot, cycle); break;
            }
        } catch (error) {
            console.error(`[Engine V3] Erro bot ${bot.id}:`, error);
        }
    }

    async stateIdle(_bot, cycle) {
        await this.changeState(cycle.botId, BotState.ANALYZING);
    }

    async stateAnalyzing(bot, cycle) {
        const binance = await this.getBinanceService(bot);
        if (!binance) return;
        const pair = bot.pair.trim().toUpperCase();
        const positions = await this.getOpenPositions(binance, pair);
        const openOrders = await binance.getOpenOrders(pair);
        if (positions.length > 0 || openOrders.length > 0) {
            console.log(`[Bot ${pair}] Posições/ordens activas — retomar MANAGING`);
            await this.changeState(bot.id, BotState.MANAGING);
            return;
        }
        const [candles1h, candles4h, candles1d] = await Promise.all([
            binance.getCandles(pair, '1h', 250),
            binance.getCandles(pair, '4h', 250),
            binance.getCandles(pair, '1d', 250),
        ]);
        if (!candles1h || candles1h.length < 200) return;
        const volume24h = candles1h.slice(-24).reduce((s, c) => s + parseFloat(c[5]) * parseFloat(c[4]), 0);
        if (volume24h < MIN_LIQUIDITY_USDT) {
            console.log(`[Bot ${pair}] Liquidez insuficiente: $${volume24h.toFixed(0)}`);
            return;
        }
        const closes = candles1h.map(c => parseFloat(c[4]));
        const highs = candles1h.map(c => parseFloat(c[2]));
        const lows = candles1h.map(c => parseFloat(c[3]));
        const volumes = candles1h.map(c => parseFloat(c[5]));
        const signal = (0, indicators_1.generateSignal)(closes, highs, lows, volumes, candles4h, candles1d, { requireAllTimeframes: true });
        cycle.trendSignal = signal;
        cycle.peakNetPnlUsdt = 0;
        cycle.peakNetPnlPercent = 0;
        cycle.cycleStartedAt = new Date();
        cycle.closeReason = null;
        console.log(`[Bot ${pair}] Análise MTF: ${signal.action} ${signal.confidence.toFixed(0)}% — ${signal.reason}`);
        if (signal.isRanging || signal.action === 'HOLD') return;
        if (signal.confidence >= 50 && (signal.action === 'BUY' || signal.action === 'SELL')) {
            await this.changeState(bot.id, BotState.BUILD_GRID);
        }
    }

    async stateBuildGrid(bot, cycle) {
        const binance = await this.getBinanceService(bot);
        if (!binance) return;
        const pair = bot.pair.trim().toUpperCase();
        const positions = await this.getOpenPositions(binance, pair);
        const openOrders = await binance.getOpenOrders(pair);
        if (positions.length > 0 || openOrders.length > 0) {
            await this.changeState(bot.id, BotState.MANAGING);
            return;
        }
        const ticker = await binance.getPrice(pair);
        const anchorPrice = parseFloat(ticker.price);
        const candles1h = await binance.getCandles(pair, '1h', 250);
        const highs = candles1h.map(c => parseFloat(c[2]));
        const lows = candles1h.map(c => parseFloat(c[3]));
        const closes = candles1h.map(c => parseFloat(c[4]));
        const spacingPct = this.computeSpacingPct(bot, anchorPrice, highs, lows, closes);
        const alloc = this.computeGridAllocation(Number(bot.ordersPerSide) || 15, cycle.trendSignal);
        cycle.anchorPrice = anchorPrice;
        cycle.spacingPct = spacingPct;
        cycle.longOrders = alloc.longOrders;
        cycle.shortOrders = alloc.shortOrders;
        const leverage = Number(bot.leverage) || 1;
        const minEntryUsd = Math.max(5.5 / leverage, 0.5);
        const capitalPerLong = Math.max(Number(bot.capitalPerSide) / alloc.longOrders, minEntryUsd);
        const capitalPerShort = Math.max(Number(bot.capitalPerSide) / alloc.shortOrders, minEntryUsd);
        if (capitalPerLong < minEntryUsd || capitalPerShort < minEntryUsd) {
            console.log(`[Bot ${pair}] Capital insuficiente por entrada`);
            return;
        }
        console.log(`[Bot ${pair}] Grade @ $${anchorPrice} | spacing ${spacingPct.toFixed(3)}% | L${alloc.longOrders}/S${alloc.shortOrders} | bias ${alloc.trendBias}`);
        try {
            const signal = cycle.trendSignal;
            if (signal?.action === 'BUY' && signal.confidence >= 60) {
                await this.placeGridEntry(binance, bot, pair, 'LONG', anchorPrice, capitalPerLong, leverage);
            } else if (signal?.action === 'SELL' && signal.confidence >= 60) {
                await this.placeGridEntry(binance, bot, pair, 'SHORT', anchorPrice, capitalPerShort, leverage);
            }
            for (let level = 1; level <= alloc.longOrders; level++) {
                const price = anchorPrice * (1 - (spacingPct * level) / 100);
                await this.placeGridLimit(binance, bot, pair, 'LONG', price, capitalPerLong, leverage, level);
            }
            for (let level = 1; level <= alloc.shortOrders; level++) {
                const price = anchorPrice * (1 + (spacingPct * level) / 100);
                await this.placeGridLimit(binance, bot, pair, 'SHORT', price, capitalPerShort, leverage, level);
            }
            const existing = await prisma_1.prisma.tradeCycle.findFirst({ where: { botId: bot.id, status: 'OPEN' } });
            if (!existing) {
                await prisma_1.prisma.tradeCycle.create({
                    data: { botId: bot.id, entryPrice: anchorPrice, side: 'HEDGE', status: 'OPEN', openedAt: new Date() },
                });
            }
            await this.logAudit(bot, pair, cycle, { state: 'BUILD_GRID', note: `Grade L${alloc.longOrders} S${alloc.shortOrders} spacing ${spacingPct.toFixed(3)}%` });
            await this.changeState(bot.id, BotState.MANAGING);
        } catch (error) {
            console.error(`[Bot ${pair}] Erro build grid:`, error);
        }
    }

    async stateManaging(bot, cycle) {
        const binance = await this.getBinanceService(bot);
        if (!binance) return;
        const pair = bot.pair.trim().toUpperCase();
        let positions = await this.getOpenPositions(binance, pair);
        let openOrders = await binance.getOpenOrders(pair);
        if (positions.length === 0 && openOrders.length === 0) {
            console.log(`[Bot ${pair}] Sem posições/ordens em MANAGING — aguardar análise (sem rebuild directo)`);
            await this.changeState(bot.id, BotState.WAITING);
            return;
        }
        await this.replenishGrid(binance, bot, cycle, pair, openOrders);
        positions = await this.getOpenPositions(binance, pair);
        openOrders = await binance.getOpenOrders(pair);
        if (positions.length === 0) return;
        const net = await this.calculateNetPnl(binance, bot, cycle, positions, pair);
        if (net.netUsdt > cycle.peakNetPnlUsdt) cycle.peakNetPnlUsdt = net.netUsdt;
        if (net.netPercent > cycle.peakNetPnlPercent) cycle.peakNetPnlPercent = net.netPercent;
        await this.persistCycle(bot.id, cycle);
        console.log(`[Bot ${pair}] Líquido: $${net.netUsdt.toFixed(2)} (${net.netPercent.toFixed(2)}%) | Bruto: $${net.grossUsdt.toFixed(2)} | Pos:${positions.length} Ord:${openOrders.length}`);
        const tpPct = Number(bot.tpDailyPct) || 1.5;
        const minProfitUsdt = Number(bot.minProfitUsdt ?? 2);
        if (net.netUsdt >= minProfitUsdt && net.netPercent >= tpPct) {
            cycle.closeReason = 'CLOSED_TP';
            cycle.lastNetSnapshot = net;
            await this.changeState(bot.id, BotState.CLOSING);
            return;
        }
        const trailingEnabled = bot.trailingStopEnabled !== false;
        const trailingActivationUsdt = Number(bot.trailingStopActivationUsdt ?? bot.minProfitUsdt ?? 1);
        const trailingCallbackUsdt = Number(bot.trailingStopCallbackUsdt ?? 0.5);
        if (trailingEnabled && cycle.peakNetPnlUsdt >= trailingActivationUsdt && net.netUsdt > 0) {
            const drop = cycle.peakNetPnlUsdt - net.netUsdt;
            if (drop >= trailingCallbackUsdt) {
                cycle.closeReason = 'CLOSED_TRAILING';
                cycle.lastNetSnapshot = net;
                await this.changeState(bot.id, BotState.CLOSING);
            }
        }
    }

    async stateClosing(bot, cycle) {
        const binance = await this.getBinanceService(bot);
        if (!binance) return;
        const pair = bot.pair.trim().toUpperCase();
        const closeReason = cycle.closeReason || 'CLOSED_MANUAL';
        try {
            const openOrders = await binance.getOpenOrders(pair);
            for (const order of openOrders) {
                await binance.cancelOrder(pair, order.orderId);
            }
            await this.cancelBotGridOrders(bot);
            const positions = await this.getOpenPositions(binance, pair);
            for (const pos of positions) {
                const positionAmt = parseFloat(pos.positionAmt);
                const isLong = positionAmt > 0;
                const posSide = String(pos.positionSide || (isLong ? 'LONG' : 'SHORT')).toUpperCase();
                await binance.closePosition(pair, Math.abs(positionAmt), isLong ? 'SELL' : 'BUY', posSide);
            }
            cycle.confirmAttempts = 0;
            await this.changeState(bot.id, BotState.CONFIRMING);
            cycle.closeReason = closeReason;
        } catch (error) {
            console.error(`[Bot ${pair}] Erro fecho:`, error);
        }
    }

    async stateConfirming(bot, cycle) {
        const binance = await this.getBinanceService(bot);
        if (!binance) return;
        const pair = bot.pair.trim().toUpperCase();
        cycle.confirmAttempts = (cycle.confirmAttempts || 0) + 1;
        let positions = await this.getOpenPositions(binance, pair);
        let openOrders = await binance.getOpenOrders(pair);
        if (positions.length > 0 || openOrders.length > 0) {
            for (const order of openOrders) await binance.cancelOrder(pair, order.orderId);
            for (const pos of positions) {
                const amt = parseFloat(pos.positionAmt);
                const isLong = amt > 0;
                const posSide = String(pos.positionSide || (isLong ? 'LONG' : 'SHORT')).toUpperCase();
                await binance.closePosition(pair, Math.abs(amt), isLong ? 'SELL' : 'BUY', posSide);
            }
            if (cycle.confirmAttempts >= CONFIRM_MAX_ATTEMPTS) {
                console.error(`[Bot ${pair}] Falha confirmar encerramento após ${CONFIRM_MAX_ATTEMPTS} tentativas`);
                return;
            }
            await this.sleep(CONFIRM_DELAY_MS);
            return;
        }
        const net = cycle.lastNetSnapshot || await this.calculateNetPnl(binance, bot, cycle, [], pair);
        const openCycles = await prisma_1.prisma.tradeCycle.findMany({ where: { botId: bot.id, status: 'OPEN' } });
        for (const tc of openCycles) {
            await prisma_1.prisma.tradeCycle.update({
                where: { id: tc.id },
                data: {
                    status: cycle.closeReason || 'CLOSED_TP',
                    pnl: net.netUsdt,
                    closedAt: new Date(),
                },
            });
        }
        let yevaFee = 0;
        if (net.grossUsdt > 0) {
            yevaFee = await gas_service_1.GasService.deductPerformanceFee(bot.userId, net.grossUsdt);
        }
        await this.saveLastCloseStats(bot.id, {
            closeReason: cycle.closeReason,
            grossPnl: net.grossUsdt,
            netPnl: net.netUsdt - (typeof yevaFee === 'number' ? yevaFee : net.yevaFeeEst),
            binanceFees: net.entryFees + net.estimatedCloseFees,
            funding: net.funding,
            yevaFee: typeof yevaFee === 'number' ? yevaFee : net.yevaFeeEst,
        });
        await this.logAudit(bot, pair, cycle, {
            state: 'CONFIRMING',
            positionsCount: 0,
            ordersCount: 0,
            marginUsed: net.totalMargin,
            grossPnl: net.grossUsdt,
            binanceFees: net.entryFees + net.estimatedCloseFees,
            funding: net.funding,
            yevaFee: typeof yevaFee === 'number' ? yevaFee : net.yevaFeeEst,
            netPnl: net.netUsdt,
            closeReason: cycle.closeReason,
            note: 'Ciclo encerrado e confirmado',
        });
        console.log(`[Bot ${pair}] FECHAMENTO GLOBAL confirmado | ${cycle.closeReason} | Líquido $${net.netUsdt.toFixed(2)}`);
        cycle.peakNetPnlUsdt = 0;
        cycle.peakNetPnlPercent = 0;
        cycle.trendSignal = null;
        cycle.anchorPrice = 0;
        await this.changeState(bot.id, BotState.WAITING);
    }

    async stateWaiting(bot, cycle) {
        const elapsed = Date.now() - cycle.lastStateChange;
        if (elapsed < COOLDOWN_AFTER_CLOSE) {
            const remaining = Math.ceil((COOLDOWN_AFTER_CLOSE - elapsed) / 1000);
            console.log(`[Bot ${bot.pair}] Cooldown ${remaining}s`);
            return;
        }
        const binance = await this.getBinanceService(bot);
        if (binance) {
            const pair = bot.pair.trim().toUpperCase();
            const positions = await this.getOpenPositions(binance, pair);
            const orders = await binance.getOpenOrders(pair);
            if (positions.length > 0 || orders.length > 0) {
                await this.changeState(bot.id, BotState.CONFIRMING);
                return;
            }
        }
        await this.changeState(bot.id, BotState.ANALYZING);
    }

    computeSpacingPct(bot, anchorPrice, highs, lows, closes) {
        const base = Number(bot.spacing) || 0.3;
        const dynamicOn = bot.dynamicSpacingEnabled !== false;
        if (!dynamicOn) return base;
        const atr = (0, indicators_1.calculateATR)(highs, lows, closes, 14);
        const lastAtr = atr[atr.length - 1] || 0;
        const atrPct = anchorPrice > 0 ? (lastAtr / anchorPrice) * 100 : base;
        const dynamic = atrPct * 0.42;
        return Math.min(Math.max(dynamic, 0.06), Math.max(base * 1.5, 0.9));
    }

    computeGridAllocation(ordersPerSide, signal) {
        const total = Math.max(1, ordersPerSide);
        if (!signal || signal.isRanging || signal.action === 'HOLD') {
            return { longOrders: total, shortOrders: total, trendBias: 'NEUTRAL' };
        }
        const strong = signal.confidence >= 60 && signal.multiTimeframeConfirmed;
        const ratio = strong ? 0.8 : 0.65;
        const trendOrders = Math.max(1, Math.round(total * ratio));
        const hedgeOrders = Math.max(1, total - trendOrders);
        if (signal.action === 'BUY') return { longOrders: trendOrders, shortOrders: hedgeOrders, trendBias: 'LONG' };
        if (signal.action === 'SELL') return { longOrders: hedgeOrders, shortOrders: trendOrders, trendBias: 'SHORT' };
        return { longOrders: total, shortOrders: total, trendBias: 'NEUTRAL' };
    }

    async replenishGrid(binance, bot, cycle, pair, openOrders) {
        if (!cycle.anchorPrice || !cycle.spacingPct) return;
        const anchor = cycle.anchorPrice;
        const spacingPct = cycle.spacingPct;
        const leverage = Number(bot.leverage) || 1;
        const minEntryUsd = Math.max(5.5 / leverage, 0.5);
        const longOrders = cycle.longOrders || Number(bot.ordersPerSide) || 15;
        const shortOrders = cycle.shortOrders || Number(bot.ordersPerSide) || 15;
        const capitalPerLong = Math.max(Number(bot.capitalPerSide) / longOrders, minEntryUsd);
        const capitalPerShort = Math.max(Number(bot.capitalPerSide) / shortOrders, minEntryUsd);
        const longLimits = openOrders.filter(o => String(o.positionSide || '').toUpperCase().includes('LONG')).length;
        const shortLimits = openOrders.filter(o => String(o.positionSide || '').toUpperCase().includes('SHORT')).length;
        for (let level = longLimits + 1; level <= longOrders; level++) {
            const price = anchor * (1 - (spacingPct * level) / 100);
            await this.placeGridLimit(binance, bot, pair, 'LONG', price, capitalPerLong, leverage, level);
        }
        for (let level = shortLimits + 1; level <= shortOrders; level++) {
            const price = anchor * (1 + (spacingPct * level) / 100);
            await this.placeGridLimit(binance, bot, pair, 'SHORT', price, capitalPerShort, leverage, level);
        }
    }

    async calculateNetPnl(binance, bot, cycle, positions, pair) {
        const gross = this.calculateGrossPnl(positions);
        const since = cycle.cycleStartedAt ? new Date(cycle.cycleStartedAt).getTime() : Date.now() - 86400000;
        let entryFees = 0;
        let funding = 0;
        try {
            const income = await binance.getIncomeHistory(undefined, since, Date.now(), 1000);
            for (const row of income || []) {
                if (row.symbol && row.symbol !== pair) continue;
                const amt = parseFloat(row.income || 0);
                if (row.incomeType === 'COMMISSION') entryFees += Math.abs(amt);
                if (row.incomeType === 'FUNDING_FEE') funding += amt;
            }
        } catch { /* estimativa abaixo */ }
        const estimatedCloseFees = positions.reduce((s, p) => {
            const notional = Math.abs(parseFloat(p.positionAmt)) * parseFloat(p.markPrice);
            return s + notional * BINANCE_TAKER_FEE;
        }, 0);
        const yevaFeeEst = gross.usdt > 0 ? gross.usdt * YEVA_PERFORMANCE_FEE : 0;
        const netUsdt = gross.usdt - entryFees - estimatedCloseFees - funding - yevaFeeEst;
        return {
            grossUsdt: gross.usdt,
            grossPercent: gross.percent,
            entryFees,
            estimatedCloseFees,
            funding,
            yevaFeeEst,
            netUsdt,
            netPercent: gross.totalMargin > 0 ? (netUsdt / gross.totalMargin) * 100 : 0,
            totalMargin: gross.totalMargin,
        };
    }

    calculateGrossPnl(positions) {
        let totalPnlUsdt = 0;
        let totalMargin = 0;
        for (const pos of positions) {
            const positionAmt = parseFloat(pos.positionAmt);
            const isLong = positionAmt > 0;
            const entryPrice = parseFloat(pos.entryPrice);
            const markPrice = parseFloat(pos.markPrice);
            const notional = Math.abs(positionAmt) * markPrice;
            const leverage = parseFloat(pos.leverage) || 1;
            totalMargin += notional / leverage;
            totalPnlUsdt += Math.abs(positionAmt) * (markPrice - entryPrice) * (isLong ? 1 : -1);
        }
        return {
            usdt: totalPnlUsdt,
            percent: totalMargin > 0 ? (totalPnlUsdt / totalMargin) * 100 : 0,
            totalMargin,
        };
    }

    async placeGridLimit(binance, bot, pair, side, price, capitalUsd, leverage, level) {
        const qty = (capitalUsd * leverage) / price;
        if (qty <= 0 || capitalUsd * leverage < 5) return;
        await binance.createOrder({
            symbol: pair, side: side === 'LONG' ? 'BUY' : 'SELL', type: 'LIMIT',
            quantity: qty, price, positionSide: side, timeInForce: 'GTC',
        });
        await prisma_1.prisma.gridOrder.create({
            data: { botId: bot.id, side, price, size: qty, status: 'PENDING' },
        }).catch(() => undefined);
        console.log(`[Bot ${pair}] Limite ${side} L${level} @ $${price.toFixed(4)}`);
    }

    async placeGridEntry(binance, bot, pair, side, price, capitalUsd, leverage) {
        const qty = (capitalUsd * leverage) / price;
        if (qty <= 0 || capitalUsd * leverage < 5) return;
        await binance.createOrder({
            symbol: pair, side: side === 'LONG' ? 'BUY' : 'SELL', type: 'MARKET',
            quantity: qty, positionSide: side,
        });
        await prisma_1.prisma.gridOrder.create({
            data: { botId: bot.id, side, price, size: qty, status: 'FILLED' },
        }).catch(() => undefined);
    }

    async cancelBotGridOrders(bot) {
        await prisma_1.prisma.gridOrder.updateMany({
            where: { botId: bot.id, status: 'PENDING' },
            data: { status: 'CANCELLED' },
        }).catch(() => undefined);
    }

    async getOrCreateCycle(botOrId) {
        const botId = typeof botOrId === 'string' ? botOrId : botOrId.id;
        if (!this.botCycles.has(botId)) {
            const persisted = await this.loadCycleFromDb(botId);
            this.botCycles.set(botId, persisted || this.defaultCycle(botId));
        }
        return this.botCycles.get(botId);
    }

    defaultCycle(botId) {
        return {
            botId,
            state: BotState.IDLE,
            peakNetPnlUsdt: 0,
            peakNetPnlPercent: 0,
            anchorPrice: 0,
            spacingPct: 0,
            longOrders: 0,
            shortOrders: 0,
            cycleStartedAt: null,
            lastStateChange: Date.now(),
            closeReason: null,
            trendSignal: null,
            confirmAttempts: 0,
        };
    }

    async changeState(botId, newState) {
        const cycle = await this.getOrCreateCycle(botId);
        const old = cycle.state;
        cycle.state = newState;
        cycle.lastStateChange = Date.now();
        console.log(`[Bot ${String(botId).substring(0, 8)}] ${old} -> ${newState}`);
        await this.persistCycle(botId, cycle);
    }

    async persistCycle(botId, cycle) {
        try {
            await prisma_1.prisma.$executeRawUnsafe(`
                UPDATE "Bot" SET
                  "engineState" = $1,
                  "cycleAnchorPrice" = $2,
                  "cycleSpacingPct" = $3,
                  "cycleLongOrders" = $4,
                  "cycleShortOrders" = $5,
                  "peakNetPnlUsdt" = $6,
                  "peakNetPnlPercent" = $7,
                  "cycleStartedAt" = $8,
                  "updatedAt" = NOW()
                WHERE id = $9
            `, cycle.state, cycle.anchorPrice || 0, cycle.spacingPct || 0,
                cycle.longOrders || 0, cycle.shortOrders || 0,
                cycle.peakNetPnlUsdt || 0, cycle.peakNetPnlPercent || 0,
                cycle.cycleStartedAt || new Date(), botId);
        } catch (e) {
            console.error('[Engine V3] persistCycle:', e.message);
        }
    }

    async loadCycleFromDb(botId) {
        try {
            const rows = await prisma_1.prisma.$queryRawUnsafe(`
                SELECT "engineState", "cycleAnchorPrice", "cycleSpacingPct", "cycleLongOrders", "cycleShortOrders",
                       "peakNetPnlUsdt", "peakNetPnlPercent", "cycleStartedAt"
                FROM "Bot" WHERE id = $1 LIMIT 1
            `, botId);
            const row = rows?.[0];
            if (!row) return null;
            return {
                botId,
                state: row.engineState || BotState.IDLE,
                anchorPrice: Number(row.cycleAnchorPrice) || 0,
                spacingPct: Number(row.cycleSpacingPct) || 0,
                longOrders: Number(row.cycleLongOrders) || 0,
                shortOrders: Number(row.cycleShortOrders) || 0,
                peakNetPnlUsdt: Number(row.peakNetPnlUsdt) || 0,
                peakNetPnlPercent: Number(row.peakNetPnlPercent) || 0,
                cycleStartedAt: row.cycleStartedAt ? new Date(row.cycleStartedAt) : null,
                lastStateChange: Date.now(),
                closeReason: null,
                trendSignal: null,
                confirmAttempts: 0,
            };
        } catch {
            return null;
        }
    }

    async saveLastCloseStats(botId, stats) {
        try {
            await prisma_1.prisma.$executeRawUnsafe(`
                UPDATE "Bot" SET
                  "lastCloseReason" = $1,
                  "lastGrossPnl" = $2,
                  "lastNetPnl" = $3,
                  "lastBinanceFees" = $4,
                  "lastFunding" = $5,
                  "lastYevaFee" = $6,
                  "lastCycleClosedAt" = NOW(),
                  "engineState" = 'WAITING',
                  "updatedAt" = NOW()
                WHERE id = $7
            `, stats.closeReason, stats.grossPnl, stats.netPnl, stats.binanceFees, stats.funding, stats.yevaFee, botId);
        } catch (e) {
            console.error('[Engine V3] saveLastCloseStats:', e.message);
        }
    }

    async logAudit(bot, pair, cycle, data) {
        try {
            await prisma_1.prisma.$executeRawUnsafe(`
                INSERT INTO "CycleAuditLog" ("botId", pair, state, "positionsCount", "ordersCount", "marginUsed",
                  "grossPnl", "binanceFees", funding, "yevaFee", "netPnl", "closeReason", note)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            `, bot.id, pair, data.state || cycle.state,
                data.positionsCount ?? null, data.ordersCount ?? null, data.marginUsed ?? null,
                data.grossPnl ?? null, data.binanceFees ?? null, data.funding ?? null,
                data.yevaFee ?? null, data.netPnl ?? null, data.closeReason ?? null, data.note ?? null);
        } catch (e) {
            console.error('[Engine V3] logAudit:', e.message);
        }
    }

    async getBinanceService(bot) {
        try {
            const accounts = bot.user?.exchangeAccounts || [];
            const exchangeAccount = accounts.find(a => a.id === bot.exchangeId) || accounts[0];
            if (!exchangeAccount) return null;
            const apiKey = (0, crypto_1.decryptApiKey)(exchangeAccount.apiKeyEncrypted, exchangeAccount.iv, exchangeAccount.authTag);
            const apiSecret = (0, crypto_1.decryptApiKey)(exchangeAccount.secretKeyEncrypted, exchangeAccount.ivSecret, exchangeAccount.authTagSecret);
            return new binance_service_1.BinanceService(apiKey, apiSecret, bot.market);
        } catch {
            return null;
        }
    }

    async getOpenPositions(binance, pair) {
        try {
            const positions = await binance.getOpenPositions();
            return positions.filter(p => p.symbol === pair && parseFloat(p.positionAmt) !== 0);
        } catch {
            return [];
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

exports.TradingEngine = TradingEngine;
exports.tradingEngine = new TradingEngine();
