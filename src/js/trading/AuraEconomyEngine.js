/**
 * AuraEconomyEngine.js - Authoritative Macro-Economic & Finite Supply Engine
 *
 * Implements a closed-loop macroeconomic simulation for all 202 assets (100 Stocks + 102 Cryptos):
 * - Finite Total Supply & Circulating Free Float (AuraAssets Treasury Reserve).
 * - Bonding Curve & Elastic Scarcity Pricing: Buying depletes available float, driving prices UP.
 *   Selling replenishes float, driving prices DOWN.
 * - Real-time Market Capitalization tracking (Price * Total Supply).
 * - Macro Circulation Metrics (M2 Money Supply, Bursa Cash Reserves, Top Controlled Assets).
 * - Instant sync to Supabase Realtime & Postgres state.
 */

import gameState from '../core/GameState.js';
import { supabase, isCloudConfigured } from '../core/SupabaseClient.js';

class AuraEconomyEngine {
    constructor() {
        this.assets = {}; // Symbol -> Asset Economic State
        this.isInitialized = false;
        this.saveDebounceTimer = null;
        this.syncCloudDebounceTimer = null;
    }

    /**
     * Initialize all 202 assets with deterministic total supplies, market caps, and circulating floats
     */
    init(stocksData = {}, cryptosData = {}) {
        // StockMarket and CryptoMarket each call init() with only their own assets,
        // so registration must be additive (skip symbols already registered) rather
        // than a one-shot guard that would drop the second caller's assets.
        const savedState = this._loadLocalState();

        // 1. Initialize 100 Stocks
        for (const [sym, stock] of Object.entries(stocksData)) {
            if (this.assets[sym]) continue;
            const basePrice = Number(stock.basePrice || stock.price || 100);
            const totalSupply = this._calculateStockSupply(sym, basePrice, stock.sector);
            const initialFloat = 0.40; // 40% free float available at AuraAssets Treasury
            const defaultAvailable = Math.round(totalSupply * initialFloat);

            const saved = savedState[sym] || {};
            const availableSupply = typeof saved.availableSupply === 'number' ? saved.availableSupply : defaultAvailable;
            const soldSupply = typeof saved.soldSupply === 'number' ? saved.soldSupply : (defaultAvailable - availableSupply);
            const currentPrice = Number(saved.price || stock.price || basePrice);

            this.assets[sym] = {
                symbol: sym,
                name: stock.name || sym,
                type: 'stock',
                sector: stock.sector || 'General',
                basePrice,
                price: currentPrice,
                totalSupply,
                availableSupply: Math.max(0, availableSupply),
                soldSupply: Math.max(0, soldSupply),
                reserveCash: Number(saved.reserveCash || 0),
                volume24h: Number(saved.volume24h || stock.volume24h || 100000),
                marketCap: Math.round(currentPrice * totalSupply)
            };
        }

        // 2. Initialize 102 Cryptos
        for (const [sym, crypto] of Object.entries(cryptosData)) {
            if (this.assets[sym]) continue;
            const basePrice = Number(crypto.basePrice || crypto.price || 1);
            const totalSupply = this._calculateCryptoSupply(sym, basePrice, crypto.sector);
            const initialFloat = 0.50; // 50% free float for crypto
            const defaultAvailable = Math.round(totalSupply * initialFloat);

            const saved = savedState[sym] || {};
            const availableSupply = typeof saved.availableSupply === 'number' ? saved.availableSupply : defaultAvailable;
            const soldSupply = typeof saved.soldSupply === 'number' ? saved.soldSupply : (defaultAvailable - availableSupply);
            const currentPrice = Number(saved.price || crypto.price || basePrice);

            this.assets[sym] = {
                symbol: sym,
                name: crypto.name || sym,
                type: 'crypto',
                sector: crypto.sector || 'Layer 1',
                category: crypto.category || '',
                icon: crypto.icon || '🪙',
                basePrice,
                price: currentPrice,
                totalSupply,
                availableSupply: Math.max(0, availableSupply),
                soldSupply: Math.max(0, soldSupply),
                reserveCash: Number(saved.reserveCash || 0),
                volume24h: Number(saved.volume24h || crypto.volume24h || 500000),
                marketCap: Math.round(currentPrice * totalSupply)
            };
        }

        this.isInitialized = true;
        this._recalculateMarketCaps();
    }

    /**
     * Deterministic Total Supply calculation for Stocks based on real-world market capitalization tiers
     */
    _calculateStockSupply(symbol, price, sector) {
        // Known mega-caps with exact real-world shares outstanding
        const exactShares = {
            AAPL: 15500000000,
            MSFT: 7430000000,
            NVDA: 24600000000,
            GOOGL: 12300000000,
            AMZN: 10400000000,
            META: 2540000000,
            TSLA: 3180000000,
            'BRK.B': 2180000000,
            LLY: 949000000,
            AVGO: 468000000,
            JPM: 2870000000,
            V: 2040000000,
            WMT: 8050000000,
            PG: 2360000000,
            JNJ: 2410000000,
            COST: 443000000,
            KO: 4310000000,
            PEP: 1370000000,
            AMD: 1620000000,
            NFLX: 433000000,
            BABA: 2450000000,
            ASML: 393000000
        };

        if (exactShares[symbol]) return exactShares[symbol];

        // Default tier estimation based on base price: target typical market cap ($50B - $300B)
        const targetMarketCap = (price > 500 ? 150000000000 : (price > 100 ? 80000000000 : 35000000000));
        return Math.max(50000000, Math.round(targetMarketCap / (price || 1)));
    }

    /**
     * Deterministic Total Supply calculation for Cryptos based on tokenomics
     */
    _calculateCryptoSupply(symbol, price, sector) {
        const exactCryptoSupply = {
            BTC: 21000000,          // 21 Juta
            ETH: 120400000,         // 120.4 Juta
            USDT: 120000000000,     // 120 Miliar
            BNB: 145000000,         // 145 Juta
            SOL: 460000000,         // 460 Juta
            XRP: 56000000000,       // 56 Miliar
            USDC: 35000000000,      // 35 Miliar
            ADA: 35000000000,       // 35 Miliar
            DOGE: 146000000000,     // 146 Miliar
            TRX: 86000000000,       // 86 Miliar
            SHIB: 589000000000000,  // 589 Triliun
            PEPE: 420690000000000,  // 420.69 Triliun
            AVAX: 400000000,        // 400 Juta
            LINK: 1000000000,       // 1 Miliar
            SUI: 10000000000,       // 10 Miliar
            NEAR: 1200000000,       // 1.2 Miliar
            DOT: 1400000000,        // 1.4 Miliar
            UNI: 1000000000,        // 1 Miliar
            LTC: 84000000           // 84 Juta
        };

        if (exactCryptoSupply[symbol]) return exactCryptoSupply[symbol];

        // Derive based on token unit price
        if (price >= 100) return 50000000;           // High price -> low supply (50M)
        if (price >= 1) return 1000000000;           // Mid price -> 1 Billion
        if (price >= 0.01) return 10000000000;       // Low price -> 10 Billion
        return 1000000000000;                        // Micro-price meme tokens -> 1 Trillion
    }

    /**
     * Get single asset macroeconomic profile
     */
    getAsset(symbol) {
        if (!symbol) return null;
        const clean = String(symbol).toUpperCase();
        return this.assets[clean] || null;
    }

    /**
     * Execute BUY against AuraAssets Treasury:
     * - Verifies that AuraAssets has enough remaining float.
     * - Depletes available supply.
     * - Increases price organically using Supply-Demand Elasticity.
     * - Locks paid cash into AuraAssets Reserve.
     */
    executeBuy(symbol, quantity, currentPrice, assetType = 'stock') {
        const asset = this.getAsset(symbol);
        if (!asset) {
            return { success: false, error: 'Aset tidak ditemukan di bursa.' };
        }

        const qty = Number(quantity);
        if (qty <= 0) {
            return { success: false, error: 'Jumlah pembelian harus lebih dari 0.' };
        }

        // 1. Check supply availability in AuraAssets Treasury
        if (qty > asset.availableSupply) {
            const availableFmt = asset.availableSupply.toLocaleString();
            return {
                success: false,
                error: `Persediaan ${symbol} di AuraAssets tidak mencukupi! Hanya tersisa ${availableFmt} unit.`
            };
        }

        // 2. Elastic Scarcity Price Impact
        // The closer availableSupply gets to 0, the higher the price spikes (Short Squeeze dynamic)
        const currentFloat = asset.availableSupply;
        const buyFraction = qty / Math.max(1, currentFloat);

        // Impact multiplier: Stocks max 20% per trade, Cryptos max 35%
        const sensitivity = assetType === 'crypto' ? 0.65 : 0.40;
        const rawImpact = buyFraction * sensitivity;
        const impact = Math.min(assetType === 'crypto' ? 0.35 : 0.20, Math.max(0.0002, rawImpact));

        // 3. New Price Calculation
        const priceBefore = Number(currentPrice) > 0 ? Number(currentPrice) : asset.price;
        const newPrice = Number((priceBefore * (1 + impact)).toFixed(assetType === 'crypto' && priceBefore < 1 ? 6 : 2));

        // 4. Update Economic State
        asset.availableSupply = Math.max(0, asset.availableSupply - qty);
        asset.soldSupply = (asset.soldSupply || 0) + qty;
        asset.price = newPrice;
        asset.marketCap = Math.round(newPrice * asset.totalSupply);
        const totalTradeCost = qty * currentPrice;
        asset.reserveCash = (asset.reserveCash || 0) + totalTradeCost;
        asset.volume24h = (asset.volume24h || 0) + totalTradeCost;

        this._scheduleLocalSave();
        this._scheduleCloudSync(asset);

        return {
            success: true,
            symbol: asset.symbol,
            newPrice,
            impactPercent: Number((impact * 100).toFixed(3)),
            availableSupply: asset.availableSupply,
            soldSupply: asset.soldSupply,
            marketCap: asset.marketCap,
            circulatingPercent: Number(((asset.soldSupply / asset.totalSupply) * 100).toFixed(2))
        };
    }

    /**
     * Execute SELL back to AuraAssets Treasury:
     * - Returns shares/tokens to AuraAssets Treasury available supply.
     * - Decreases price due to increased supply.
     * - Deducts cash from AuraAssets Reserve.
     */
    executeSell(symbol, quantity, currentPrice, assetType = 'stock') {
        const asset = this.getAsset(symbol);
        if (!asset) {
            return { success: false, error: 'Aset tidak ditemukan di bursa.' };
        }

        const qty = Number(quantity);
        if (qty <= 0) {
            return { success: false, error: 'Jumlah penjualan harus lebih dari 0.' };
        }

        // 1. Elastic Supply Overflow Price Impact
        const baseFloat = asset.totalSupply * (assetType === 'crypto' ? 0.50 : 0.40);
        const sellFraction = qty / Math.max(1, baseFloat);

        const sensitivity = assetType === 'crypto' ? 0.55 : 0.35;
        const rawImpact = sellFraction * sensitivity;
        const impact = Math.min(assetType === 'crypto' ? 0.30 : 0.18, Math.max(0.0002, rawImpact));

        // 2. Minimum Circuit Breaker Floor (prevent crashing below 10% of base price)
        const minFloor = Number((asset.basePrice * 0.10).toFixed(assetType === 'crypto' && asset.basePrice < 1 ? 6 : 2));
        const priceBefore = Number(currentPrice) > 0 ? Number(currentPrice) : asset.price;
        const calculatedPrice = priceBefore * (1 - impact);
        const newPrice = Math.max(minFloor, Number(calculatedPrice.toFixed(assetType === 'crypto' && priceBefore < 1 ? 6 : 2)));

        // 3. Update Economic State
        asset.availableSupply = asset.availableSupply + qty;
        asset.soldSupply = Math.max(0, (asset.soldSupply || 0) - qty);
        asset.price = newPrice;
        asset.marketCap = Math.round(newPrice * asset.totalSupply);
        const totalTradeValue = qty * currentPrice;
        asset.reserveCash = Math.max(0, (asset.reserveCash || 0) - totalTradeValue);
        asset.volume24h = (asset.volume24h || 0) + totalTradeValue;

        this._scheduleLocalSave();
        this._scheduleCloudSync(asset);

        return {
            success: true,
            symbol: asset.symbol,
            newPrice,
            impactPercent: Number((-impact * 100).toFixed(3)),
            availableSupply: asset.availableSupply,
            soldSupply: asset.soldSupply,
            marketCap: asset.marketCap,
            circulatingPercent: Number(((asset.soldSupply / asset.totalSupply) * 100).toFixed(2))
        };
    }

    /**
     * Mint and distribute new tokens from Launchdrop / Launchpool / Launchpad events.
     * Expands the circulating and total token supply dynamically for crypto assets.
     */
    mintLaunchdropTokens(symbol, quantity) {
        const asset = this.getAsset(symbol);
        if (!asset || asset.type !== 'crypto') return false;

        const qty = Number(quantity);
        if (qty <= 0) return false;

        asset.totalSupply += qty;
        asset.soldSupply = (asset.soldSupply || 0) + qty;
        asset.marketCap = Math.round(asset.price * asset.totalSupply);

        this._scheduleLocalSave();
        this._scheduleCloudSync(asset);
        return true;
    }

    /**
     * Calculate global macroeconomic circulation metrics (M2 money supply, market caps, bursa reserves)
     */
    getMacroStats() {
        let totalStockCap = 0;
        let totalCryptoCap = 0;
        let totalReserveCash = 0;
        let totalVolume24h = 0;

        const assetList = Object.values(this.assets);

        assetList.forEach(a => {
            const cap = a.price * a.totalSupply;
            if (a.type === 'stock') {
                totalStockCap += cap;
            } else {
                totalCryptoCap += cap;
            }
            totalReserveCash += (a.reserveCash || 0);
            totalVolume24h += (a.volume24h || 0);
        });

        const playerBalance = Number(gameState.getBalance?.() || 0);
        const netWorth = Number(gameState.getNetWorth?.() || playerBalance);

        // Assets ranked by highest ownership percentage by players (Scarcity Leaderboard)
        const topControlled = assetList
            .filter(a => a.soldSupply > 0)
            .map(a => ({
                symbol: a.symbol,
                name: a.name,
                type: a.type,
                price: a.price,
                marketCap: a.marketCap,
                soldSupply: a.soldSupply,
                totalSupply: a.totalSupply,
                controlledPercent: Number(((a.soldSupply / a.totalSupply) * 100).toFixed(2))
            }))
            .sort((a, b) => b.controlledPercent - a.controlledPercent)
            .slice(0, 5);

        return {
            totalStockCap: Math.round(totalStockCap),
            totalCryptoCap: Math.round(totalCryptoCap),
            totalGlobalCap: Math.round(totalStockCap + totalCryptoCap),
            totalReserveCash: Math.round(totalReserveCash),
            playerBalance: Math.round(playerBalance),
            playerNetWorth: Math.round(netWorth),
            totalMoneyInCirculation: Math.round(playerBalance + totalReserveCash),
            totalVolume24h: Math.round(totalVolume24h),
            topControlledAssets: topControlled
        };
    }

    /**
     * Recalculate market caps for all assets
     */
    _recalculateMarketCaps() {
        for (const asset of Object.values(this.assets)) {
            asset.marketCap = Math.round(asset.price * asset.totalSupply);
        }
    }

    /**
     * Save economic state to localStorage
     */
    _scheduleLocalSave() {
        clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = setTimeout(() => {
            try {
                const compact = {};
                for (const [sym, a] of Object.entries(this.assets)) {
                    compact[sym] = {
                        price: a.price,
                        availableSupply: a.availableSupply,
                        soldSupply: a.soldSupply,
                        reserveCash: a.reserveCash,
                        volume24h: a.volume24h
                    };
                }
                localStorage.setItem('aura_assets_economy_state', JSON.stringify(compact));
            } catch (e) {
                console.warn('[AuraEconomyEngine] Local save error:', e.message);
            }
        }, 1000);
    }

    _loadLocalState() {
        try {
            const raw = localStorage.getItem('aura_assets_economy_state');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    /**
     * Sync single asset price and volume to Supabase cloud (rate-limited / debounced)
     */
    _scheduleCloudSync(asset) {
        if (!isCloudConfigured || !supabase) return;

        // Track pending assets per symbol so syncing one asset doesn't cancel another's
        if (!this._pendingCloudSync) this._pendingCloudSync = new Map();
        this._pendingCloudSync.set(asset.symbol, asset);

        clearTimeout(this.syncCloudDebounceTimer);
        this.syncCloudDebounceTimer = setTimeout(async () => {
            const batch = Array.from(this._pendingCloudSync.values());
            this._pendingCloudSync.clear();
            for (const asset of batch) {
            try {
                if (asset.type === 'stock') {
                    // Update market_state (stored in minor units / cents)
                    const minorPrice = Math.round(asset.price * 100);
                    await supabase
                        .from('market_state')
                        .update({
                            last_price: minorPrice,
                            volume_24h: Math.round(asset.volume24h),
                            updated_at: new Date().toISOString()
                        })
                        .eq('symbol', asset.symbol);
                } else {
                    // Update crypto_market_state
                    await supabase
                        .from('crypto_market_state')
                        .update({
                            last_price: asset.price,
                            volume_24h: Math.round(asset.volume24h),
                            updated_at: new Date().toISOString()
                        })
                        .eq('symbol', asset.symbol);
                }
            } catch (e) {
                // Fail-silent on network errors
            }
            }
        }, 2000);
    }
}

export const auraEconomy = new AuraEconomyEngine();
export default auraEconomy;

