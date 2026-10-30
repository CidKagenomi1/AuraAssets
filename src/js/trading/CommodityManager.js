/**
 * CommodityManager.js - Real-Time Digital Commodity Market Engine
 * 4 Clear Sectors: Logam Mulia, Energi, Logam Industri, Agrikultur
 * Supports fractional physical spot custody (Vault storage), live price drift, and Plotly charting.
 */

import gameState from '../core/GameState.js';
import timeManager from '../core/TimeManager.js';
import financeManager from '../finance/FinanceManager.js';

export const COMMODITY_SECTORS = {
    PRECIOUS_METALS: {
        id: 'precious_metals',
        name: 'Logam Mulia (Precious Metals)',
        icon: '🥇',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.35)',
        bg: 'rgba(245, 158, 11, 0.08)',
        desc: 'Aset lindung nilai (Safe-Haven) anti-inflasi dan instrumen proteksi modal saat krisis pasar.'
    },
    ENERGY: {
        id: 'energy',
        name: 'Energi & Bahan Bakar (Energy)',
        icon: '🛢️',
        color: '#ef4444',
        border: 'rgba(239, 68, 68, 0.35)',
        bg: 'rgba(239, 68, 68, 0.08)',
        desc: 'Komoditas penggerak industri global yang sangat sensitif terhadap tensi geopolitik & kuota OPEC.'
    },
    INDUSTRIAL_METALS: {
        id: 'industrial_metals',
        name: 'Logam Industri & EV (Industrial)',
        icon: '🔋',
        color: '#06b6d4',
        border: 'rgba(6, 182, 212, 0.35)',
        bg: 'rgba(6, 182, 212, 0.08)',
        desc: 'Bahan baku manufaktur berat, baterai kendaraan listrik, dan ekspansi infrastruktur komputasi.'
    },
    AGRICULTURE: {
        id: 'agriculture',
        name: 'Agrikultur & Pangan (Agriculture)',
        icon: '🌾',
        color: '#10b981',
        border: 'rgba(16, 185, 129, 0.35)',
        bg: 'rgba(16, 185, 129, 0.08)',
        desc: 'Komoditas pangan pokok dunia dan produk perkebunan dengan dinamika musim panen & cuaca.'
    }
};

export const COMMODITY_DATABASE = [
    // =========================================================================
    // 1. LOGAM MULIA (PRECIOUS METALS)
    // =========================================================================
    {
        id: 'gold',
        ticker: 'XAU',
        name: 'Emas Murni 99.99% (Gold)',
        sector: 'precious_metals',
        icon: '🥇',
        unit: 'gram',
        unitLabel: 'Gram',
        price: 86.50,
        basePrice: 86.00,
        high24h: 87.20,
        low24h: 85.90,
        dailyChange: 0.58,
        minBuyUSD: 10,
        spread: 0.004, // 0.4%
        desc: 'Emas batangan bersertifikasi LBMA/Antam dengan kemurnian 99.99%. Aset safe-haven terbaik dunia.',
        volatility: 'Low',
        origin: 'Brankas Kustodian Terakreditasi Zurich & London'
    },
    {
        id: 'silver',
        ticker: 'XAG',
        name: 'Perak Murni 99.9% (Silver)',
        sector: 'precious_metals',
        icon: '🥈',
        unit: 'gram',
        unitLabel: 'Gram',
        price: 1.18,
        basePrice: 1.16,
        high24h: 1.22,
        low24h: 1.15,
        dailyChange: 1.72,
        minBuyUSD: 10,
        spread: 0.005,
        desc: 'Logam perak murni industri dan investasi. Memiliki dual-utility tinggi untuk panel surya & elektronik.',
        volatility: 'Medium',
        origin: 'London Metal Exchange (LME)'
    },
    {
        id: 'platinum',
        ticker: 'XPT',
        name: 'Platinum Murni (Platinum)',
        sector: 'precious_metals',
        icon: '⚪',
        unit: 'gram',
        unitLabel: 'Gram',
        price: 32.80,
        basePrice: 32.50,
        high24h: 33.40,
        low24h: 32.20,
        dailyChange: 0.92,
        minBuyUSD: 20,
        spread: 0.006,
        desc: 'Logam mulia ultra-langka penopang industri katalis hidrogen hijau dan perhiasan papan atas.',
        volatility: 'Medium',
        origin: 'Brankas Sentral Afrika Selatan & Inggris'
    },

    // =========================================================================
    // 2. ENERGI & BAHAN BAKAR (ENERGY)
    // =========================================================================
    {
        id: 'wti_oil',
        ticker: 'WTI',
        name: 'Minyak Mentah WTI (Crude Oil)',
        sector: 'energy',
        icon: '🛢️',
        unit: 'barrel',
        unitLabel: 'Barrel (~159L)',
        price: 72.85,
        basePrice: 72.00,
        high24h: 74.50,
        low24h: 71.90,
        dailyChange: 1.18,
        minBuyUSD: 15,
        spread: 0.005,
        desc: 'West Texas Intermediate, standar minyak mentah ringan dunia yang diperdagangkan di NYMEX.',
        volatility: 'High',
        origin: 'Permian Basin, Texas, USA'
    },
    {
        id: 'brent_oil',
        ticker: 'BRENT',
        name: 'Minyak Mentah Brent',
        sector: 'energy',
        icon: '⛽',
        unit: 'barrel',
        unitLabel: 'Barrel (~159L)',
        price: 76.90,
        basePrice: 76.20,
        high24h: 78.10,
        low24h: 75.80,
        dailyChange: 0.91,
        minBuyUSD: 15,
        spread: 0.005,
        desc: 'Standar harga 2/3 perdagangan minyak bumi internasional laut lepas ICE Futures Europe.',
        volatility: 'High',
        origin: 'Laut Utara Eropa (North Sea)'
    },
    {
        id: 'natural_gas',
        ticker: 'NATGAS',
        name: 'Gas Alam Henry Hub',
        sector: 'energy',
        icon: '🔥',
        unit: 'MMBtu',
        unitLabel: 'MMBtu',
        price: 2.88,
        basePrice: 2.80,
        high24h: 3.05,
        low24h: 2.75,
        dailyChange: 2.85,
        minBuyUSD: 10,
        spread: 0.008,
        desc: 'Bahan bakar pembangkit listrik bersih dan pemanas global dengan volatilitas tinggi musiman.',
        volatility: 'Extreme',
        origin: 'Henry Hub, Louisiana, USA'
    },

    // =========================================================================
    // 3. LOGAM INDUSTRI & EV (INDUSTRIAL METALS)
    // =========================================================================
    {
        id: 'copper',
        ticker: 'COPPER',
        name: 'Tembaga Industri (Doctor Copper)',
        sector: 'industrial_metals',
        icon: '🥉',
        unit: 'kg',
        unitLabel: 'Kg',
        price: 9.48,
        basePrice: 9.35,
        high24h: 9.65,
        low24h: 9.30,
        dailyChange: 1.39,
        minBuyUSD: 20,
        spread: 0.004,
        desc: 'Urat nadi jaringan kabel listrik, kecerdasan buatan, dan motor traksi kendaraan ramah lingkungan.',
        volatility: 'Medium',
        origin: 'London Metal Exchange (Grade A)'
    },
    {
        id: 'nickel',
        ticker: 'NICKEL',
        name: 'Nikel Murni Baterai EV Kelas 1',
        sector: 'industrial_metals',
        icon: '🔋',
        unit: 'ton',
        unitLabel: 'Ton',
        price: 16820.00,
        basePrice: 16500.00,
        high24h: 17200.00,
        low24h: 16400.00,
        dailyChange: 1.93,
        minBuyUSD: 50,
        spread: 0.006,
        desc: 'Bahan baku katoda baterai NMC kendaraan listrik berdensitas energi tinggi. Komoditas strategis Indonesia.',
        volatility: 'High',
        origin: 'Sulawesi & Maluku Smelter Hub'
    },
    {
        id: 'lithium',
        ticker: 'LITHIUM',
        name: 'Litium Karbonat Battery-Grade',
        sector: 'industrial_metals',
        icon: '⚡',
        unit: 'ton',
        unitLabel: 'Ton',
        price: 12450.00,
        basePrice: 12200.00,
        high24h: 12800.00,
        low24h: 12100.00,
        dailyChange: 2.05,
        minBuyUSD: 50,
        spread: 0.007,
        desc: 'Garam litium murni 99.5% penentu masa depan revolusi penyimpanan energi dan kendaraan listrik global.',
        volatility: 'High',
        origin: 'Atacama Salar, Chile & Western Australia'
    },
    {
        id: 'aluminum',
        ticker: 'ALU',
        name: 'Aluminium Primer Industri',
        sector: 'industrial_metals',
        icon: '🔩',
        unit: 'ton',
        unitLabel: 'Ton',
        price: 2545.00,
        basePrice: 2500.00,
        high24h: 2580.00,
        low24h: 2490.00,
        dailyChange: 0.88,
        minBuyUSD: 25,
        spread: 0.004,
        desc: 'Logam ringan berkekuatan tinggi untuk badan pesawat terbang, otomotif, dan konstruksi modern.',
        volatility: 'Medium',
        origin: 'LME Primary Aluminum Contracts'
    },

    // =========================================================================
    // 4. AGRIKULTUR & KOMODITAS PANGAN (AGRICULTURE)
    // =========================================================================
    {
        id: 'cpo',
        ticker: 'CPO',
        name: 'Minyak Sawit Mentah (Crude Palm Oil)',
        sector: 'agriculture',
        icon: '🌴',
        unit: 'ton',
        unitLabel: 'Ton',
        price: 988.00,
        basePrice: 975.00,
        high24h: 1005.00,
        low24h: 970.00,
        dailyChange: 1.33,
        minBuyUSD: 25,
        spread: 0.005,
        desc: 'Minyak nabati paling produktif di dunia untuk industri makanan, kosmetik, dan biodiesel terbarukan.',
        volatility: 'Medium',
        origin: 'Bursa ICDX & BMD Malaysia'
    },
    {
        id: 'coffee',
        ticker: 'COFFEE',
        name: 'Kopi Arabika Komoditas C',
        sector: 'agriculture',
        icon: '☕',
        unit: 'kg',
        unitLabel: 'Kg',
        price: 5.68,
        basePrice: 5.55,
        high24h: 5.85,
        low24h: 5.50,
        dailyChange: 2.34,
        minBuyUSD: 10,
        spread: 0.006,
        desc: 'Biji kopi arabika standar kontrak internasional ICE Futures dengan dinamika iklim panen Amerika Latin.',
        volatility: 'High',
        origin: 'ICE Arabica Coffee Benchmark'
    },
    {
        id: 'wheat',
        ticker: 'WHEAT',
        name: 'Gandum Pangan (Chicago Wheat)',
        sector: 'agriculture',
        icon: '🌾',
        unit: 'ton',
        unitLabel: 'Ton',
        price: 238.50,
        basePrice: 235.00,
        high24h: 244.00,
        low24h: 232.00,
        dailyChange: 1.48,
        minBuyUSD: 15,
        spread: 0.005,
        desc: 'Bahan baku tepung terigu dan pangan pokok global yang diperdagangkan di Chicago Board of Trade (CBOT).',
        volatility: 'Medium',
        origin: 'CBOT, Chicago, USA'
    }
];

class CommodityManager {
    constructor() {
        this.commodities = COMMODITY_DATABASE;
        this.sectors = COMMODITY_SECTORS;
        this.loadState();

        // Daily price drift
        timeManager.onDay(() => {
            this.updateDailyPrices();
        });
    }

    loadState() {
        const savedPrices = gameState.get('commodityPrices');
        if (savedPrices) {
            this.commodities.forEach(c => {
                if (savedPrices[c.id]) {
                    c.price = Number(savedPrices[c.id].price) || c.basePrice;
                    c.dailyChange = Number(savedPrices[c.id].dailyChange) || 0;
                    c.high24h = Number(savedPrices[c.id].high24h) || c.price * 1.02;
                    c.low24h = Number(savedPrices[c.id].low24h) || c.price * 0.98;
                }
            });
        }
    }

    saveState() {
        const priceMap = {};
        this.commodities.forEach(c => {
            priceMap[c.id] = {
                price: c.price,
                dailyChange: c.dailyChange,
                high24h: c.high24h,
                low24h: c.low24h
            };
        });
        gameState.set('commodityPrices', priceMap);
    }

    updateDailyPrices() {
        this.commodities.forEach(c => {
            const prevPrice = c.price;
            let driftPercent = 0;

            if (c.sector === 'precious_metals') {
                // Low-medium volatility, inflation hedge drift
                driftPercent = ((Math.random() - 0.47) * 1.6);
            } else if (c.sector === 'energy') {
                // Higher geopolitical volatility
                driftPercent = ((Math.random() - 0.49) * 3.2);
            } else if (c.sector === 'industrial_metals') {
                // Correlated with manufacturing expansion
                driftPercent = ((Math.random() - 0.48) * 2.4);
            } else if (c.sector === 'agriculture') {
                // Weather & seasonal cycles
                driftPercent = ((Math.random() - 0.48) * 2.8);
            }

            const newPrice = +(c.price * (1 + (driftPercent / 100))).toFixed(c.price < 10 ? 2 : (c.price < 100 ? 2 : 2));
            c.price = Math.max(c.basePrice * 0.4, newPrice);
            c.dailyChange = +(((c.price - prevPrice) / prevPrice) * 100).toFixed(2);
            c.high24h = Math.max(c.high24h, c.price);
            c.low24h = Math.min(c.low24h, c.price);
        });

        this.saveState();
        gameState.emit('commodityUpdate');
    }

    getCommodities(sector = null) {
        const holdings = gameState.get('commodities.holdings') || {};
        const list = sector && sector !== 'ALL' 
            ? this.commodities.filter(c => c.sector === sector)
            : this.commodities;

        return list.map(c => {
            const h = holdings[c.id] || { units: 0, invested: 0, avgPrice: c.price };
            const units = Number(h.units) || 0;
            const invested = Number(h.invested) || 0;
            const currentValue = +(units * c.price).toFixed(2);
            const pnl = +(currentValue - invested).toFixed(2);
            const pnlPercent = invested > 0 ? +((pnl / invested) * 100).toFixed(2) : 0;

            return {
                ...c,
                ownedUnits: units,
                invested,
                currentValue,
                pnl,
                pnlPercent
            };
        });
    }

    getCommodity(id) {
        return this.getCommodities().find(c => c.id === id);
    }

    getTotalVaultValue() {
        const all = this.getCommodities();
        return all.reduce((sum, c) => sum + c.currentValue, 0);
    }

    getTotalInvested() {
        const all = this.getCommodities();
        return all.reduce((sum, c) => sum + c.invested, 0);
    }

    getOwnedCount() {
        return this.getCommodities().filter(c => c.ownedUnits > 0).length;
    }

    /**
     * Buy Commodity (Cash -> Physical Digital Vault)
     */
    buy(commodityId, amountUSD) {
        amountUSD = Number(amountUSD);
        if (!amountUSD || isNaN(amountUSD) || amountUSD <= 0) {
            throw new Error('Nominal pembelian tidak valid');
        }

        const item = this.getCommodity(commodityId);
        if (!item) throw new Error('Komoditas tidak ditemukan');

        if (amountUSD < item.minBuyUSD) {
            throw new Error(`Minimal pembelian untuk ${item.name} adalah $ ${financeManager.formatCurrency(item.minBuyUSD)}`);
        }

        const balance = gameState.getBalance();
        if (amountUSD > balance) {
            throw new Error('Saldo kas utama Anda tidak mencukupi untuk order ini');
        }

        // Deduct player balance
        gameState.update('player', p => ({
            ...p,
            balance: Math.max(0, p.balance - amountUSD)
        }));

        // Calculate physical units acquired (net of minimal spread)
        const effectivePrice = item.price * (1 + item.spread);
        const unitsBought = +(amountUSD / effectivePrice).toFixed(4);

        // Update custody holdings in GameState
        const holdings = gameState.get('commodities.holdings') || {};
        const curr = holdings[commodityId] || { units: 0, invested: 0 };
        const newUnits = +(curr.units + unitsBought).toFixed(4);
        const newInvested = Math.round(curr.invested + amountUSD);

        holdings[commodityId] = {
            units: newUnits,
            invested: newInvested,
            avgPrice: +(newInvested / newUnits).toFixed(2),
            lastBuyPrice: item.price,
            updatedAt: Date.now()
        };

        gameState.set('commodities.holdings', holdings);

        // Record transaction
        financeManager.recordTransaction({
            type: 'expense',
            amount: -amountUSD,
            category: 'Komoditas',
            description: `Beli ${item.name} (${unitsBought.toLocaleString()} ${item.unitLabel} @ $${item.price.toFixed(2)})`
        });

        try {
            import('../ui/AuraSound.js').then(m => m.default.playPurchase());
        } catch (e) {}

        gameState.emit('commodityUpdate');
        return { unitsBought, item };
    }

    /**
     * Sell Commodity (Physical Digital Vault -> Cash)
     */
    sell(commodityId, unitsToSell) {
        unitsToSell = Number(unitsToSell);
        if (!unitsToSell || isNaN(unitsToSell) || unitsToSell <= 0) {
            throw new Error('Jumlah unit penjualan tidak valid');
        }

        const item = this.getCommodity(commodityId);
        if (!item) throw new Error('Komoditas tidak ditemukan');

        if (unitsToSell > (item.ownedUnits + 0.0001)) {
            throw new Error(`Jumlah melebihi simpanan brankas Anda (Maksimal: ${item.ownedUnits.toLocaleString()} ${item.unitLabel})`);
        }

        const actualUnits = Math.min(unitsToSell, item.ownedUnits);
        const effectiveSellPrice = item.price * (1 - item.spread);
        const payoutUSD = Math.floor(actualUnits * effectiveSellPrice);

        // Add cash to player balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + payoutUSD
        }));

        // Update custody holdings
        const holdings = gameState.get('commodities.holdings') || {};
        const curr = holdings[commodityId] || { units: 0, invested: 0 };
        const remainingUnits = Math.max(0, +(curr.units - actualUnits).toFixed(4));
        const fractionSold = curr.units > 0 ? (actualUnits / curr.units) : 1;
        const reducedInvested = Math.max(0, Math.round(curr.invested * (1 - fractionSold)));

        if (remainingUnits <= 0.0001) {
            delete holdings[commodityId];
        } else {
            holdings[commodityId] = {
                units: remainingUnits,
                invested: reducedInvested,
                avgPrice: curr.avgPrice,
                lastBuyPrice: curr.lastBuyPrice,
                updatedAt: Date.now()
            };
        }

        gameState.set('commodities.holdings', holdings);

        // Record transaction
        financeManager.recordTransaction({
            type: 'income',
            amount: payoutUSD,
            category: 'Komoditas',
            description: `Jual ${item.name} (${actualUnits.toLocaleString()} ${item.unitLabel} @ $${item.price.toFixed(2)})`
        });

        try {
            import('../ui/AuraSound.js').then(m => m.default.playSell());
        } catch (e) {}

        gameState.emit('commodityUpdate');
        return { payoutUSD, remainingUnits };
    }

    /**
     * Generate deterministic historical candles for Plotly charting
     */
    generateCandles(commodityId, count = 30) {
        const item = this.getCommodity(commodityId);
        if (!item) return [];

        const candles = [];
        let cur = item.price * 0.95;
        const now = Date.now();
        const interval = 24 * 60 * 60 * 1000;

        for (let i = count; i >= 0; i--) {
            const time = new Date(now - (i * interval)).toISOString();
            const change = ((Math.sin(i * 1.3) + (Math.random() - 0.48)) * 0.02) * cur;
            const open = cur;
            const close = +(open + change).toFixed(2);
            const high = +(Math.max(open, close) + (Math.random() * 0.01 * cur)).toFixed(2);
            const low = +(Math.min(open, close) - (Math.random() * 0.01 * cur)).toFixed(2);

            candles.push({ time, open, high, low, close });
            cur = close;
        }

        // Set last candle to current spot price
        if (candles.length > 0) {
            candles[candles.length - 1].close = item.price;
        }

        return candles;
    }
}

export const commodityManager = new CommodityManager();
export default commodityManager;

