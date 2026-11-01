/**
 * CandleGenerator.js - Unified OHLC Candle Provider
 * 
 * Delegates candlestick generation and tick accumulation directly to PriceHistoryStore.
 * Completely eliminates fake sine waves, hardcoded static trajectories, and temporal distortion.
 */

import priceHistoryStore from './PriceHistoryStore.js';

class CandleGenerator {
  /**
   * Ensure priceHistory is seeded with realistic historical data points.
   */
  generatePriceHistory(asset, needed = 300) {
    if (!asset) return;
    if (!asset.priceHistory) asset.priceHistory = [];
    if (asset.priceHistory.length >= needed) return;

    const candles = priceHistoryStore.getCandles(asset.symbol, '1d', asset);
    if (candles && candles.length > 0) {
      asset.priceHistory = candles.map(c => c.close);
    }
  }

  /**
   * Convert price data into true OHLC candles using real recorded ticks
   * and continuous timestamp buckets across 1h, 1d, 1w, 1m timeframes.
   */
  convertToCandles(history, timeframe = '1d', asset = null) {
    const symbol = asset?.symbol || (typeof history === 'string' ? history : 'ASSET');
    return priceHistoryStore.getCandles(symbol, timeframe, asset);
  }

  /**
   * Analytical pattern detection helper on true candles for Elliott Wave and pivots.
   */
  annotatePatterns(candles) {
    if (!Array.isArray(candles) || candles.length < 20) return [];

    const pts = [];
    const n = candles.length;
    const elliotEnd = Math.min(Math.floor(n * 0.7), n - 10);
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
