/**
 * PriceHistoryStore.js - Real Tick Recorder & OHLC Candle Aggregator
 * 
 * Replaces synthetic sine-wave patterns with true transaction-driven price series.
 * Features:
 *  - Records real live ticks from local market simulation, player trades, and server feeds.
 *  - Real-time time-bucket aggregation into OHLCV candles (1h, 1d, 1w, 1m).
 *  - Deterministic backward backfill for historical initialization without sine waves.
 *  - Local persistence with storage pruning to preserve chart history across sessions.
 */

import marketClient from './MarketClient.js';

class PriceHistoryStore {
    constructor() {
        this.ticks = new Map(); // symbol -> Array<{ t: number, price: number, volume: number }>
        this.candleCache = new Map(); // `${symbol}_${timeframe}` -> Array<Candle>
        this.maxTicksPerSymbol = 1500;
        this.storagePrefix = 'aura_candles_v1_';
        this.loadPersistedCache();
    }

    /**
     * Timeframe configurations: interval in milliseconds and standard candle count.
     */
    getTimeframeConfig(timeframe = '1d') {
        switch (timeframe) {
            case '1h':
                return { intervalMs: 60 * 1000, count: 60, labelFormat: '1m' };
            case '1d':
                return { intervalMs: 5 * 60 * 1000, count: 120, labelFormat: '5m' };
            case '1w':
                return { intervalMs: 60 * 60 * 1000, count: 168, labelFormat: '1h' };
            case '1m':
                return { intervalMs: 24 * 60 * 60 * 1000, count: 30, labelFormat: '1d' };
            default:
                return { intervalMs: 5 * 60 * 1000, count: 120, labelFormat: '5m' };
        }
    }

    /**
     * Record a new price tick from any market source (simulation, trade, server).
     */
    recordTick(symbol, price, volume = 0, timestamp = Date.now()) {
        if (!symbol || typeof price !== 'number' || isNaN(price) || price <= 0) return;
        const sym = symbol.toUpperCase();

        if (!this.ticks.has(sym)) {
            this.ticks.set(sym, []);
        }

        const tickList = this.ticks.get(sym);
        const tick = {
            t: timestamp,
            price: Number(price),
            volume: Math.max(0, Number(volume) || 0)
        };

        tickList.push(tick);
        if (tickList.length > this.maxTicksPerSymbol) {
            tickList.shift();
        }

        // Invalidate active candle cache for this symbol so next read updates live bar
        this.updateLiveCandleInCache(sym, tick);
    }

    /**
     * Update only the latest live candle across cached timeframes for real-time responsiveness.
     */
    updateLiveCandleInCache(symbol, tick) {
        const timeframes = ['1h', '1d', '1w', '1m'];
        for (const tf of timeframes) {
            const cacheKey = `${symbol}_${tf}`;
            const cached = this.candleCache.get(cacheKey);
            if (!cached || cached.length === 0) continue;

            const config = this.getTimeframeConfig(tf);
            const latest = cached[cached.length - 1];
            const currentBucketStart = Math.floor(tick.t / config.intervalMs) * config.intervalMs;
            const latestBucketTime = new Date(latest.time).getTime();

            if (latestBucketTime === currentBucketStart) {
                // Update running candle
                latest.close = tick.price;
                latest.high = Math.max(latest.high, tick.price);
                latest.low = Math.min(latest.low, tick.price);
                latest.volume += tick.volume;
                latest.isLive = true;
            } else if (tick.t > latestBucketTime) {
                // Finalize previous candle
                latest.isLive = false;
                // Start new live candle
                cached.push({
                    time: new Date(currentBucketStart).toISOString(),
                    open: latest.close,
                    high: Math.max(latest.close, tick.price),
                    low: Math.min(latest.close, tick.price),
                    close: tick.price,
                    volume: tick.volume,
                    isLive: true
                });
                if (cached.length > config.count * 1.5) {
                    cached.shift();
                }
            }
        }
    }

    /**
     * Get aggregated candles for a specific asset and timeframe.
     * Guaranteed continuous time series with true ISO dates.
     */
    getCandles(symbol, timeframe = '1d', asset = null) {
        if (!symbol) return [];
        const sym = symbol.toUpperCase();
        const config = this.getTimeframeConfig(timeframe);
        const cacheKey = `${sym}_${timeframe}`;

        const cached = this.candleCache.get(cacheKey);
        if (cached && cached.length >= config.count) {
            return cached;
        }

        if (marketClient.isConnected && !this._serverFetchInProgress?.has(cacheKey)) {
            if (!this._serverFetchInProgress) this._serverFetchInProgress = new Set();
            this._serverFetchInProgress.add(cacheKey);
            this.fetchServerCandles(sym, timeframe).finally(() => {
                this._serverFetchInProgress.delete(cacheKey);
            });
        }

        // Aggregate from recorded ticks
        const currentPrice = asset?.price || 100;
        const ticks = this.ticks.get(sym) || [];
        const now = Date.now();
        const currentBucket = Math.floor(now / config.intervalMs) * config.intervalMs;

        // Generate target bucket timestamps
        const buckets = [];
        for (let i = config.count - 1; i >= 0; i--) {
            buckets.push(currentBucket - (i * config.intervalMs));
        }

        // Group available ticks by bucket
        const ticksByBucket = new Map();
        for (const t of ticks) {
            const b = Math.floor(t.t / config.intervalMs) * config.intervalMs;
            if (!ticksByBucket.has(b)) ticksByBucket.set(b, []);
            ticksByBucket.get(b).push(t);
        }

        // If we don't have enough real ticks yet, backfill realistically backwards
        const candles = [];
        let seed = this.hashString(sym + timeframe);
        const baseVol = asset?.volatility || 0.02;
        const tickStepVol = Math.max(0.002, baseVol * 0.15);

        // Compute backward starting trajectory
        const generatedPrices = this.generateRealisticBackfill(currentPrice, config.count, tickStepVol, seed, asset);

        for (let i = 0; i < buckets.length; i++) {
            const bucketTime = buckets[i];
            const bucketTicks = ticksByBucket.get(bucketTime);
            const isLive = (i === buckets.length - 1);

            if (bucketTicks && bucketTicks.length > 0) {
                // Real recorded data for this bucket
                let open = bucketTicks[0].price;
                let high = -Infinity;
                let low = Infinity;
                let close = bucketTicks[bucketTicks.length - 1].price;
                let vol = 0;

                for (const tk of bucketTicks) {
                    if (tk.price > high) high = tk.price;
                    if (tk.price < low) low = tk.price;
                    vol += tk.volume;
                }

                // If previous candle exists, align open to previous close
                if (candles.length > 0) {
                    open = candles[candles.length - 1].close;
                    high = Math.max(high, open);
                    low = Math.min(low, open);
                }

                candles.push({
                    time: new Date(bucketTime).toISOString(),
                    open,
                    high,
                    low,
                    close,
                    volume: vol || this.estimateVolume(asset, open),
                    isLive
                });
            } else {
                // Backfill candle with realistic micro-variations
                const gen = generatedPrices[i];
                candles.push({
                    time: new Date(bucketTime).toISOString(),
                    open: gen.open,
                    high: gen.high,
                    low: gen.low,
                    close: gen.close,
                    volume: gen.volume,
                    isLive
                });
            }
        }

        // Anchor the very last live candle directly to the asset's current live price
        if (candles.length > 0 && asset?.price) {
            const last = candles[candles.length - 1];
            last.close = asset.price;
            last.high = Math.max(last.high, asset.price);
            last.low = Math.min(last.low, asset.price);
            last.isLive = true;
        }

        this.candleCache.set(cacheKey, candles);
        this.persistCache(cacheKey, candles);

        return candles;
    }

    /**
     * Realistic backward random walk backfill with volatility clustering and market regimes.
     * Completely eliminates artificial sine waves while guaranteeing clean transition to currentPrice.
     */
    generateRealisticBackfill(targetEndPrice, count, stepVol, seed, asset) {
        const prices = [];
        let rng = this.createPrng(seed);

        // Determine macro regime: trending_up, trending_down, or sideways
        const changePct = asset?.change || 0;
        const driftDirection = changePct > 1 ? 0.0008 : (changePct < -1 ? -0.0008 : 0);

        let currentP = targetEndPrice;
        const backwardSeries = [currentP];

        let volCluster = stepVol;

        // Walk backwards from targetEndPrice
        for (let i = 1; i < count; i++) {
            // Volatility clustering
            const shock = (rng() - 0.5) * 2;
            volCluster = 0.92 * volCluster + 0.08 * Math.abs(shock) * stepVol * 1.5;

            // Step with gentle momentum and regime drift
            const stepReturn = (shock * volCluster) - driftDirection;
            currentP = Math.max(currentP * 0.2, currentP / (1 + stepReturn));
            backwardSeries.push(currentP);
        }

        // Reverse to forward order (past -> present)
        const forwardPrices = backwardSeries.reverse();

        for (let i = 0; i < forwardPrices.length; i++) {
            const p = forwardPrices[i];
            const prevClose = i > 0 ? prices[i - 1].close : p * (1 - (rng() - 0.5) * stepVol);
            const open = prevClose;
            const close = (i === forwardPrices.length - 1) ? targetEndPrice : p;

            const spread = Math.abs(close - open);
            const wickUpper = rng() * (spread * 0.8 + close * stepVol * 0.4);
            const wickLower = rng() * (spread * 0.8 + close * stepVol * 0.4);

            const high = Math.max(open, close) + wickUpper;
            const low = Math.max(0.01, Math.min(open, close) - wickLower);
            const volume = this.estimateVolume(asset, close, rng);

            prices.push({
                open: Number(open.toFixed(2)),
                high: Number(high.toFixed(2)),
                low: Number(low.toFixed(2)),
                close: Number(close.toFixed(2)),
                volume
            });
        }

        return prices;
    }

    /**
     * Realistic volume estimation derived from price and asset scale
     */
    estimateVolume(asset, price, rng = Math.random) {
        const baseShares = asset?.volume24h ? (asset.volume24h / 120) : (100000 / (price || 1));
        const variance = 0.6 + rng() * 0.8;
        return Math.round(baseShares * variance);
    }

    /**
     * Fast string hash for deterministic seeding
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    /**
     * Pseudo-random number generator (Mulberry32)
     */
    createPrng(seed) {
        let s = seed | 0;
        return function() {
            s |= 0; s = s + 0x6D2B79F5 | 0;
            let t = Math.imul(s ^ s >>> 15, 1 | s);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    /**
     * Cache persistence in localStorage
     */
    persistCache(key, candles) {
        try {
            if (!candles || candles.length === 0) return;
            const summary = candles.slice(-120); // Keep compact
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(summary));
        } catch {
            // Ignore quota errors gracefully
        }
    }

    loadPersistedCache() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(this.storagePrefix)) {
                    const cacheKey = k.replace(this.storagePrefix, '');
                    const data = JSON.parse(localStorage.getItem(k));
                    if (Array.isArray(data) && data.length > 0) {
                        this.candleCache.set(cacheKey, data);
                    }
                }
            }
        } catch {
            // Graceful fallback
        }
    }

    /**
     * Fetch authoritative server candles when running in server mode
     */
    async fetchServerCandles(symbol, timeframe = '1d') {
        if (!symbol || !marketClient.isConnected) return [];
        const sym = symbol.toUpperCase();
        const config = this.getTimeframeConfig(timeframe);
        try {
            const serverCandles = await marketClient.fetchCandles(sym, config.labelFormat || '1m', config.count);
            if (Array.isArray(serverCandles) && serverCandles.length > 0) {
                const cacheKey = `${sym}_${timeframe}`;
                this.candleCache.set(cacheKey, serverCandles);
                this.persistCache(cacheKey, serverCandles);
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('marketCandlesRefreshed', { detail: { symbol: sym, timeframe } }));
                }
                return serverCandles;
            }
        } catch {
            // Silently fall back to local aggregated candles
        }
        return [];
    }
}

const priceHistoryStore = new PriceHistoryStore();

// Wire authoritative server client events to PriceHistoryStore
try {
    // Ticks from server trades/tickers are already recorded (with correct minor-unit
    // conversion) by StockMarket.applyServerTrade / applyServerTicker. Recording them
    // again here duplicated ticks and used a fragile ">10000" price heuristic that
    // mis-scaled stocks priced below $100. Candle history comes from fetchServerCandles.
    void marketClient;
} catch {
    // Non-blocking in standalone environment
}

export default priceHistoryStore;
