"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEMA = calculateEMA;
exports.calculateATR = calculateATR;
exports.calculateADX = calculateADX;
exports.calculateSlope = calculateSlope;
exports.isRanging = isRanging;
exports.analyzeTimeframe = analyzeTimeframe;
exports.generateSignal = generateSignal;

function calculateEMA(prices, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += prices[i];
    ema[period - 1] = sum / period;
    for (let i = period; i < prices.length; i++) {
        ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    return ema;
}

function calculateATR(highs, lows, closes, period = 14) {
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
        const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
        trueRanges.push(tr);
    }
    const atr = [];
    let sum = 0;
    for (let i = 0; i < period; i++) sum += trueRanges[i];
    atr[period - 1] = sum / period;
    for (let i = period; i < trueRanges.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + trueRanges[i]) / period;
    }
    return atr;
}

function calculateADX(highs, lows, closes, period = 14) {
    const plusDM = [];
    const minusDM = [];
    for (let i = 1; i < highs.length; i++) {
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];
        plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
        minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
    }
    const atr = calculateATR(highs, lows, closes, period);
    const plusDI = [];
    const minusDI = [];
    const dx = [];
    for (let i = period; i < highs.length; i++) {
        plusDI[i] = atr[i] > 0 ? (plusDM[i] / atr[i]) * 100 : 0;
        minusDI[i] = atr[i] > 0 ? (minusDM[i] / atr[i]) * 100 : 0;
        dx[i] = (plusDI[i] + minusDI[i] > 0)
            ? Math.abs((plusDI[i] - minusDI[i]) / (plusDI[i] + minusDI[i])) * 100
            : 0;
    }
    const adx = [];
    let sum = 0;
    for (let i = period; i < period * 2 && i < dx.length; i++) sum += dx[i] || 0;
    adx[Math.min(period * 2 - 1, dx.length - 1)] = sum / period;
    for (let i = period * 2; i < dx.length; i++) {
        adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
    }
    return adx;
}

function calculateSlope(values, periods = 5) {
    if (values.length < periods) return 0;
    const recent = values.slice(-periods);
    const first = recent[0];
    const last = recent[recent.length - 1];
    if (!first) return 0;
    return ((last - first) / first) * 100;
}

function volumeTrend(volumes) {
    if (!volumes || volumes.length < 40) return 0;
    const recent = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const prior = volumes.slice(-40, -20).reduce((a, b) => a + b, 0) / 20;
    if (prior <= 0) return 0;
    return ((recent - prior) / prior) * 100;
}

function isRanging(prices, highs, lows) {
    if (prices.length < 50) return true;
    const adx = calculateADX(highs, lows, prices, 14);
    const lastAdx = adx[adx.length - 1] || 0;
    if (lastAdx < 20) return true;
    const recentPrices = prices.slice(-20);
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const range = ((Math.max(...recentPrices) - Math.min(...recentPrices)) / avgPrice) * 100;
    return range < 1.5;
}

/** EMA50 / EMA200 + ADX + volume */
function analyzeTimeframe(closes, highs, lows, volumes) {
    if (closes.length < 200) {
        return { direction: 'NEUTRAL', strength: 0, adx: 0, volumeDelta: 0 };
    }
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const adxArr = calculateADX(highs, lows, closes, 14);
    const lastEma50 = ema50[ema50.length - 1];
    const lastEma200 = ema200[ema200.length - 1];
    const lastAdx = adxArr[adxArr.length - 1] || 0;
    const lastPrice = closes[closes.length - 1];
    const slope50 = calculateSlope(ema50, 5);
    const volDelta = volumeTrend(volumes);
    let direction = 'NEUTRAL';
    let strength = 0;
    if (lastPrice > lastEma50 && lastEma50 > lastEma200 && slope50 > 0.15 && lastAdx >= 22) {
        direction = 'UP';
        strength = Math.min((lastAdx / 45) * 100 + Math.max(volDelta, 0) * 0.2, 100);
    }
    else if (lastPrice < lastEma50 && lastEma50 < lastEma200 && slope50 < -0.15 && lastAdx >= 22) {
        direction = 'DOWN';
        strength = Math.min((lastAdx / 45) * 100 + Math.max(volDelta, 0) * 0.2, 100);
    }
    return { direction, strength, adx: lastAdx, volumeDelta: volDelta };
}

function mapCandles(raw) {
    if (!raw || !raw.length) return null;
    return {
        closes: raw.map(c => parseFloat(c[4])),
        highs: raw.map(c => parseFloat(c[2])),
        lows: raw.map(c => parseFloat(c[3])),
        volumes: raw.map(c => parseFloat(c[5])),
    };
}

function generateSignal(prices, highs, lows, volumes, candles4h, candles1d, options) {
    const requireAll = options?.requireAllTimeframes !== false;
    if (prices.length < 200) {
        return { action: 'HOLD', confidence: 0, reason: 'Dados insuficientes', trendStrength: 0, isRanging: true, multiTimeframeConfirmed: false, adx: 0 };
    }
    const ranging = isRanging(prices, highs, lows);
    if (ranging) {
        return { action: 'HOLD', confidence: 0, reason: 'Mercado lateralizado', trendStrength: 0, isRanging: true, multiTimeframeConfirmed: false, adx: 0 };
    }
    const analysis1h = analyzeTimeframe(prices, highs, lows, volumes);
    let multiTimeframeConfirmed = false;
    let totalStrength = analysis1h.strength;
    let tf4hMatch = false;
    let tf1dMatch = false;
    const tf4 = mapCandles(candles4h);
    const tf1 = mapCandles(candles1d);
    if (tf4 && tf4.closes.length >= 200) {
        const a4 = analyzeTimeframe(tf4.closes, tf4.highs, tf4.lows, tf4.volumes);
        tf4hMatch = a4.direction === analysis1h.direction && analysis1h.direction !== 'NEUTRAL';
        if (tf4hMatch) totalStrength += a4.strength * 0.45;
    }
    if (tf1 && tf1.closes.length >= 200) {
        const a1 = analyzeTimeframe(tf1.closes, tf1.highs, tf1.lows, tf1.volumes);
        tf1dMatch = a1.direction === analysis1h.direction && analysis1h.direction !== 'NEUTRAL';
        if (tf1dMatch) totalStrength += a1.strength * 0.35;
    }
    multiTimeframeConfirmed = tf4hMatch && tf1dMatch;
    if (requireAll && analysis1h.direction !== 'NEUTRAL' && !multiTimeframeConfirmed) {
        return {
            action: 'HOLD',
            confidence: Math.min(totalStrength * 0.5, 45),
            reason: 'Aguardando confirmação 4H+1D',
            trendStrength: totalStrength,
            isRanging: false,
            multiTimeframeConfirmed: false,
            adx: analysis1h.adx,
        };
    }
    if (multiTimeframeConfirmed) totalStrength *= 1.15;
    if (analysis1h.direction === 'UP') {
        return {
            action: 'BUY',
            confidence: Math.min(totalStrength, 100),
            reason: `Tendência ALTA EMA50/200 | MTF: ${multiTimeframeConfirmed ? 'SIM' : 'PARCIAL'} | ADX ${analysis1h.adx.toFixed(1)}`,
            trendStrength: totalStrength,
            isRanging: false,
            multiTimeframeConfirmed,
            adx: analysis1h.adx,
        };
    }
    if (analysis1h.direction === 'DOWN') {
        return {
            action: 'SELL',
            confidence: Math.min(totalStrength, 100),
            reason: `Tendência BAIXA EMA50/200 | MTF: ${multiTimeframeConfirmed ? 'SIM' : 'PARCIAL'} | ADX ${analysis1h.adx.toFixed(1)}`,
            trendStrength: totalStrength,
            isRanging: false,
            multiTimeframeConfirmed,
            adx: analysis1h.adx,
        };
    }
    return {
        action: 'HOLD',
        confidence: 0,
        reason: 'Tendência fraca',
        trendStrength: totalStrength,
        isRanging: false,
        multiTimeframeConfirmed,
        adx: analysis1h.adx,
    };
}
