/**
 * DeterministicMarket.js - Deterministic UTC-Seeded Pseudo-Random Market Engine
 * 
 * Generates identical, synchronized micro-tick price movements across all devices,
 * accounts, and browser tabs using real-world UTC time buckets without requiring
 * expensive 24/7 server ticker broadcasts.
 */

class DeterministicMarket {
    /**
     * Fast string hash (FNV-1a 32-bit)
     */
    hashString(str) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    /**
     * Mulberry32 PRNG - fast, high quality 32-bit generator
     */
    mulberry32(seed) {
        let t = (seed + 0x6D2B79F5) | 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Get synchronized Brownian Motion tick for an asset
     * 
     * @param {string} symbol - Asset symbol (e.g. 'DOGE', 'BTC', 'NVDA')
     * @param {number} intervalMs - Tick interval in milliseconds (e.g. 4000 for crypto, 6000 for stocks)
     * @param {number} scaledVol - Scaled volatility standard deviation
     * @param {number} [timestamp] - Optional timestamp (defaults to Date.now())
     * @returns {number} Deterministic price change fraction (e.g. +0.0012 or -0.0008)
     */
    getBrownianTick(symbol, intervalMs, scaledVol, timestamp = Date.now()) {
        const cleanSymbol = String(symbol || 'ASSET').trim().toUpperCase();
        const bucket = Math.floor(timestamp / intervalMs);
        const symHash = this.hashString(cleanSymbol);
        
        // Combine symbol hash with UTC bucket using prime multiplier
        const seed = (symHash ^ Math.imul(bucket, 2654435761)) >>> 0;
        const randFloat = this.mulberry32(seed);

        // Map [0, 1) to [-scaledVol, +scaledVol]
        return (randFloat - 0.5) * 2 * scaledVol;
    }

    /**
     * Get a secondary correlated noise value for secondary metrics (e.g. micro-volume variance)
     */
    getSecondaryTick(symbol, intervalMs, scale = 1.0, timestamp = Date.now()) {
        const cleanSymbol = String(symbol || 'ASSET').trim().toUpperCase();
        const bucket = Math.floor(timestamp / intervalMs);
        const symHash = this.hashString(cleanSymbol);
        
        // Offset seed for secondary uncorrelated random
        const seed = (symHash ^ Math.imul(bucket + 1013904223, 2246822519)) >>> 0;
        const randFloat = this.mulberry32(seed);
        return randFloat * scale;
    }
}

export const deterministicMarket = new DeterministicMarket();
export default deterministicMarket;
