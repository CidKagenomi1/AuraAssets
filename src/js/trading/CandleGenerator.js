/**
 * CandleGenerator.js - Mathematical OHLC Series & Candle Generation Utility
 * Handles:
 *  - Timeframe-adaptive OHLC candle generation (1h, 1d, 1w, 1m)
 *  - Structured technical pattern waypoints (Head & Shoulders, Triangles, Doji consolidation)
 *  - Realistic candlestick archetype shapes (Doji, hammer, marubozu)
 *  - 48-Hour pattern memory integration via PatternTrajectoryManager
 */

import patternTrajectoryManager from './PatternTrajectoryManager.js';

class CandleGenerator {
  /**
   * Synthesize realistic price history guided by 48-hour structured pattern waypoints.
   */
  generatePriceHistory(asset, needed = 300) {
    if (!asset.priceHistory) asset.priceHistory = [];
    if (asset.priceHistory.length >= needed) return;

    const currentPrice = asset.price;
    const vol = Math.min(0.04, (asset.volatility || 0.025) * 0.3);
    const symbol = asset?.symbol || 'ASSET';
    const activePattern = patternTrajectoryManager.getActivePattern(symbol, asset);
    const history = [];

    // Synthesize structured price history mapped along pattern trajectory waypoints
    for (let i = 0; i < needed; i++) {
      const progress = i / (needed - 1 || 1);
      const patternMul = patternTrajectoryManager.getTargetMultiplier(activePattern, progress);
      const baseTrend = (asset.basePrice || currentPrice) * patternMul;
      
      const cycleNoise = activePattern.isDoji 
        ? (Math.sin(i * 0.15) * 0.0008) 
        : (Math.sin(i * 0.09) * vol * 0.25 + Math.sin(i * 0.28) * vol * 0.15);
      
      const p = baseTrend * (1 + cycleNoise);
      history.push(Math.max(p, currentPrice * 0.05));
    }
    history[history.length - 1] = currentPrice;
    asset.priceHistory = history;
  }

  /**
   * Convert raw price array into rich OHLC candles tailored for timeframes:
   * 1h (1 hour), 1d (24 hours), 1w (1 week), 1m (1 month).
   * Stable deterministic noise for historical bars + live tick update for the final bar.
   */
  convertToCandles(history, timeframe = '1d', asset = null) {
    const candles = [];
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const currentPrice = asset ? asset.price : (history[history.length - 1] || 100);
    const changePct = asset ? (asset.change || 0) : 0;
    const rawVol = asset ? (asset.volatility || 0.03) : 0.03;
    const volatility = Math.min(0.025, rawVol * 0.25);

    // Stable deterministic seed from asset symbol
    const symbol = asset?.symbol || 'ASSET';
    const activePattern = patternTrajectoryManager.getActivePattern(symbol, asset);

    let seed = 0;
    for (let c = 0; c < symbol.length; c++) {
      seed = (seed * 31 + symbol.charCodeAt(c)) % 100000;
    }

    const pseudoRandom = (step) => {
      const x = Math.sin(seed + step * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    let totalPoints = 24;
    let getLabel;
    let startPrice = currentPrice;

    if (timeframe === '1h') {
      totalPoints = 30;
      now.setUTCSeconds(0, 0);
      now.setUTCMinutes(Math.floor(now.getUTCMinutes() / 2) * 2);

      getLabel = (idx) => {
        const msBack = (totalPoints - 1 - idx) * 2 * 60 * 1000;
        const t = new Date(now.getTime() - msBack);
        return `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
      };

      startPrice = currentPrice / (1 + (changePct * 0.2) / 100);
    } else if (timeframe === '1d') {
      totalPoints = 24;
      now.setUTCSeconds(0, 0);
      now.setUTCMinutes(0, 0);

      getLabel = (idx) => {
        const msBack = (totalPoints - 1 - idx) * 60 * 60 * 1000;
        const t = new Date(now.getTime() - msBack);
        return `${pad(t.getUTCHours())}:00`;
      };

      startPrice = currentPrice / (1 + changePct / 100);
    } else if (timeframe === '1w') {
      totalPoints = 28;
      now.setUTCSeconds(0, 0);
      now.setUTCMinutes(0, 0);

      getLabel = (idx) => {
        const msBack = (totalPoints - 1 - idx) * 6 * 60 * 60 * 1000;
        const t = new Date(now.getTime() - msBack);
        return `${pad(t.getUTCDate())} ${monthNames[t.getUTCMonth()]} ${pad(t.getUTCHours())}:00`;
      };

      startPrice = currentPrice / (1 + (changePct * 1.8) / 100);
    } else if (timeframe === '1m') {
      totalPoints = 30;
      now.setUTCSeconds(0, 0);
      now.setUTCMinutes(0, 0);
      now.setUTCHours(0, 0);

      getLabel = (idx) => {
        const msBack = (totalPoints - 1 - idx) * 24 * 60 * 60 * 1000;
        const t = new Date(now.getTime() - msBack);
        return `${pad(t.getUTCDate())} ${monthNames[t.getUTCMonth()]}`;
      };

      startPrice = currentPrice / (1 + (changePct * 3.2) / 100);
    }

    let prevClose = startPrice;

    for (let i = 0; i < totalPoints; i++) {
      const progress = i / (totalPoints - 1 || 1);
      const isLive = i === totalPoints - 1;

      // Ambil target harga terstruktur dari koordinat waypoints pola (H&S, Triangles, Doji)
      let targetMultiplier = 1.0;
      if (timeframe === '1d' || timeframe === '1h') {
        targetMultiplier = patternTrajectoryManager.getTargetMultiplier(activePattern, progress);
      } else {
        // Multi-wave cycle dinamis untuk 1w dan 1m (mencegah garis lurus linear)
        const cycleCount = timeframe === '1w' ? 2 : 4;
        const subP = (progress * cycleCount) % 1;
        const subMul = patternTrajectoryManager.getTargetMultiplier(activePattern, subP);
        const macroTrend = 1.0 + (progress - 0.5) * (changePct / 100);
        targetMultiplier = subMul * macroTrend;
      }

      const patternPrice = (asset?.basePrice || startPrice) * targetMultiplier;
      const trendPrice = isLive ? currentPrice : patternPrice;

      // Variasi micro-market non-linear alami untuk garis close
      const rnd = isLive ? 0.5 : pseudoRandom(i);
      const rnd2 = isLive ? 0.5 : pseudoRandom(i + 50);
      const noiseAmp = activePattern.isDoji ? volatility * 0.12 : volatility * 0.45;
      const naturalNoise = ((rnd - 0.5) * 0.7 + (rnd2 - 0.5) * 0.3) * noiseAmp * trendPrice;

      let targetClose = isLive ? currentPrice : trendPrice + naturalNoise;
      targetClose = Math.max(targetClose, currentPrice * 0.1);

      let open = isLive ? (prevClose || targetClose) : prevClose;
      let close = targetClose;

      // KHUSUS POLA DOJI: Pasar sedang rata-rata saja -> body sangat tipis / datar (|close - open| tipis)
      if (activePattern.isDoji && !isLive) {
        const dojiBodyDelta = (pseudoRandom(i) - 0.5) * open * 0.0004;
        close = open + dojiBodyDelta;
      }

      const body = Math.abs(close - open);
      const mid = (open + close) / 2;

      // Sumbu candle realistis
      const wickRange = activePattern.isDoji 
        ? Math.max(0.01, mid * (volatility * 0.35))
        : Math.max(body * 0.85, mid * (volatility * 0.55));
      const wickRnd = isLive ? 0.5 : pseudoRandom(i + 100);
      const high = Math.max(open, close) + wickRnd * wickRange;
      const low = Math.max(0.01, Math.min(open, close) - (1 - wickRnd) * wickRange);

      // Volume calculation: saat doji volume lebih tenang
      const baseVol = (asset?.volume24h ? asset.volume24h / totalPoints : 25000);
      const dojiVolFactor = activePattern.isDoji ? 0.55 : 1.0;
      const volMultiplier = (0.6 + (isLive ? 0.4 : pseudoRandom(i + 200) * 0.8) + (body / (mid || 1)) * 5) * dojiVolFactor;
      const volume = Math.round(baseVol * volMultiplier);

      candles.push({
        time: isLive ? 'Live' : getLabel(i),
        open,
        high,
        low,
        close,
        volume
      });

      prevClose = close;
    }

    return candles;
  }

  /**
   * Mathematical pattern detection helper for Elliott Wave and Head & Shoulders
   */
  annotatePatterns(candles) {
    const n = candles.length;
    if (n < 30) return [];

    const pts = [];
    const elliotEnd = Math.min(Math.floor(n * 0.55), n - 25);
    const waveLabels = ['W1', 'W2', 'W3', 'W4', 'W5'];

    let prices = candles.slice(0, elliotEnd).map(c => (c.high + c.low) / 2);
    let peakIdx = -1, peakVal = -Infinity;
    for (let i = 0; i < prices.length; i++) {
      if (prices[i] > peakVal) {
        peakVal = prices[i];
        peakIdx = i;
      }
    }
    if (peakIdx >= 0) {
      pts.push({ idx: peakIdx, label: waveLabels[2] || 'W3', type: 'elliott' });
    }
    return pts;
  }
}

export default new CandleGenerator();
