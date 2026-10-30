/**
 * StockMarket.js - Enhanced Stock Trading System
 * Market/Limit Orders, TP/SL, Real Price Integration
 */

import gameState from '../core/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import marketClient from './MarketClient.js';
import newsManager from '../core/NewsManager.js';
import { initMarketStateRealtime } from '../core/SupabaseClient.js';
import patternTrajectoryManager from './PatternTrajectoryManager.js';


class StockMarket {
    constructor() {
        this.stocks = this.initializeStocks();
        this.pendingOrders = []; // Limit orders
        this.orderBooks = {};    // Authoritative L2 order books per symbol
        this.recentTrades = {};  // Authoritative recent trades per symbol
        this.authoritativeMode = false;
        this.updateInterval = null;
        this.pricesLoaded = false;

        // Connect to Supabase Realtime for live multi-device market state synchronization
        try {
            initMarketStateRealtime((serverState) => {
                if (serverState?.symbol && this.stocks[serverState.symbol]) {
                    const s = this.stocks[serverState.symbol];
                    if (serverState.last_price) {
                        s.previousPrice = s.price;
                        // Minor unit / 100 conversion if integer
                        const p = serverState.last_price > 10000 && !s.price > 5000 
                            ? serverState.last_price / 100 
                            : serverState.last_price;
                        s.price = Number(p.toFixed(2));
                        if (serverState.previous_close) {
                            const pc = serverState.previous_close > 10000 && !s.price > 5000
                                ? serverState.previous_close / 100
                                : serverState.previous_close;
                            s.basePrice = Number(pc.toFixed(2));
                        }
                        if (serverState.high_24h) s.high24h = serverState.high_24h > 10000 ? serverState.high_24h / 100 : serverState.high_24h;
                        if (serverState.low_24h) s.low24h = serverState.low_24h > 10000 ? serverState.low_24h / 100 : serverState.low_24h;
                        if (serverState.volume_24h) s.volume24h = Number(serverState.volume_24h);
                        s.change = parseFloat((((s.price - s.basePrice) / (s.basePrice || 1)) * 100).toFixed(2));
                        if (!s.priceHistory) s.priceHistory = [];
                        s.priceHistory.push(s.price);
                        if (s.priceHistory.length > 300) s.priceHistory.shift();
                        gameState.emit('stocksUpdate', this.stocks);
                    }
                }
            }, null);
        } catch (e) {
            console.warn('[StockMarket] Supabase Realtime init note:', e.message);
        }
    }

    initializeStocks() {
        const stocks = {
            AAPL: { name: 'Apple Inc.', price: 180.50, basePrice: 180.50, volatility: 0.015, sector: 'Technology' },
            MSFT: { name: 'Microsoft Corporation', price: 420.25, basePrice: 420.25, volatility: 0.015, sector: 'Technology' },
            AMZN: { name: 'Amazon.com Inc.', price: 175.80, basePrice: 175.80, volatility: 0.02, sector: 'Consumer Cyclical' },
            NVDA: { name: 'NVIDIA Corporation', price: 850.00, basePrice: 850.00, volatility: 0.04, sector: 'Technology' },
            GOOGL: { name: 'Alphabet Inc. (Class A)', price: 150.30, basePrice: 150.30, volatility: 0.018, sector: 'Technology' },
            META: { name: 'Meta Platforms Inc.', price: 495.10, basePrice: 495.10, volatility: 0.025, sector: 'Technology' },
            TSLA: { name: 'Tesla Inc.', price: 175.20, basePrice: 175.20, volatility: 0.045, sector: 'Consumer Cyclical' },
            'BRK.B': { name: 'Berkshire Hathaway Inc.', price: 405.60, basePrice: 405.60, volatility: 0.01, sector: 'Financial Services' },
            LLY: { name: 'Eli Lilly and Company', price: 760.40, basePrice: 760.40, volatility: 0.02, sector: 'Healthcare' },
            AVGO: { name: 'Broadcom Inc.', price: 1300.00, basePrice: 1300.00, volatility: 0.02, sector: 'Technology' },
            JPM: { name: 'JPMorgan Chase & Co.', price: 195.30, basePrice: 195.30, volatility: 0.018, sector: 'Financial Services' },
            V: { name: 'Visa Inc.', price: 275.15, basePrice: 275.15, volatility: 0.012, sector: 'Financial Services' },
            UNH: { name: 'UnitedHealth Group Incorporated', price: 490.80, basePrice: 490.80, volatility: 0.015, sector: 'Healthcare' },
            XOM: { name: 'Exxon Mobil Corporation', price: 118.50, basePrice: 118.50, volatility: 0.02, sector: 'Energy' },
            MA: { name: 'Mastercard Incorporated', price: 460.20, basePrice: 460.20, volatility: 0.012, sector: 'Financial Services' },
            JNJ: { name: 'Johnson & Johnson', price: 155.40, basePrice: 155.40, volatility: 0.01, sector: 'Healthcare' },
            PG: { name: 'Procter & Gamble Company', price: 162.30, basePrice: 162.30, volatility: 0.008, sector: 'Consumer Defensive' },
            HD: { name: 'The Home Depot Inc.', price: 362.10, basePrice: 362.10, volatility: 0.015, sector: 'Consumer Cyclical' },
            MRK: { name: 'Merck & Co. Inc.', price: 125.60, basePrice: 125.60, volatility: 0.01, sector: 'Healthcare' },
            COST: { name: 'Costco Wholesale Corporation', price: 725.90, basePrice: 725.90, volatility: 0.012, sector: 'Consumer Defensive' },
            AMD: { name: 'Advanced Micro Devices Inc.', price: 170.40, basePrice: 170.40, volatility: 0.035, sector: 'Technology' },
            ABBV: { name: 'AbbVie Inc.', price: 168.20, basePrice: 168.20, volatility: 0.015, sector: 'Healthcare' },
            CVX: { name: 'Chevron Corporation', price: 160.50, basePrice: 160.50, volatility: 0.018, sector: 'Energy' },
            CRM: { name: 'Salesforce Inc.', price: 295.10, basePrice: 295.10, volatility: 0.025, sector: 'Technology' },
            NFLX: { name: 'Netflix Inc.', price: 610.30, basePrice: 610.30, volatility: 0.03, sector: 'Consumer Cyclical' },
            PEP: { name: 'PepsiCo Inc.', price: 170.80, basePrice: 170.80, volatility: 0.008, sector: 'Consumer Defensive' },
            KO: { name: 'The Coca-Cola Company', price: 60.20, basePrice: 60.20, volatility: 0.008, sector: 'Consumer Defensive' },
            WMT: { name: 'Walmart Inc.', price: 60.45, basePrice: 60.45, volatility: 0.01, sector: 'Consumer Defensive' },
            BAC: { name: 'Bank of America Corporation', price: 37.20, basePrice: 37.20, volatility: 0.02, sector: 'Financial Services' },
            ADBE: { name: 'Adobe Inc.', price: 505.60, basePrice: 505.60, volatility: 0.02, sector: 'Technology' },
            QCOM: { name: 'QUALCOMM Incorporated', price: 172.30, basePrice: 172.30, volatility: 0.025, sector: 'Technology' },
            CSCO: { name: 'Cisco Systems Inc.', price: 48.50, basePrice: 48.50, volatility: 0.01, sector: 'Technology' },
            TMO: { name: 'Thermo Fisher Scientific Inc.', price: 565.10, basePrice: 565.10, volatility: 0.015, sector: 'Healthcare' },
            MCD: { name: "McDonald's Corporation", price: 282.40, basePrice: 282.40, volatility: 0.012, sector: 'Consumer Cyclical' },
            INTC: { name: 'Intel Corporation', price: 35.60, basePrice: 35.60, volatility: 0.03, sector: 'Technology' },
            INTU: { name: 'Intuit Inc.', price: 625.30, basePrice: 625.30, volatility: 0.02, sector: 'Technology' },
            ABT: { name: 'Abbott Laboratories', price: 110.20, basePrice: 110.20, volatility: 0.01, sector: 'Healthcare' },
            CAT: { name: 'Caterpillar Inc.', price: 355.80, basePrice: 355.80, volatility: 0.02, sector: 'Industrials' },
            VZ: { name: 'Verizon Communications Inc.', price: 40.10, basePrice: 40.10, volatility: 0.01, sector: 'Communication Services' },
            CMCSA: { name: 'Comcast Corporation', price: 41.30, basePrice: 41.30, volatility: 0.012, sector: 'Communication Services' },
            TXN: { name: 'Texas Instruments Incorporated', price: 168.90, basePrice: 168.90, volatility: 0.015, sector: 'Technology' },
            DHR: { name: 'Danaher Corporation', price: 245.50, basePrice: 245.50, volatility: 0.015, sector: 'Healthcare' },
            PFE: { name: 'Pfizer Inc.', price: 27.40, basePrice: 27.40, volatility: 0.015, sector: 'Healthcare' },
            NKE: { name: 'NIKE Inc.', price: 92.50, basePrice: 92.50, volatility: 0.025, sector: 'Consumer Cyclical' },
            AMGN: { name: 'Amgen Inc.', price: 272.10, basePrice: 272.10, volatility: 0.015, sector: 'Healthcare' },
            PM: { name: 'Philip Morris International Inc.', price: 94.30, basePrice: 94.30, volatility: 0.01, sector: 'Consumer Defensive' },
            DIS: { name: 'The Walt Disney Company', price: 112.60, basePrice: 112.60, volatility: 0.02, sector: 'Consumer Cyclical' },
            LOW: { name: "Lowe's Companies Inc.", price: 230.40, basePrice: 230.40, volatility: 0.015, sector: 'Consumer Cyclical' },
            SPGI: { name: 'S&P Global Inc.', price: 425.80, basePrice: 425.80, volatility: 0.015, sector: 'Financial Services' },
            IBM: { name: 'International Business Machines Corp.', price: 182.40, basePrice: 182.40, volatility: 0.012, sector: 'Technology' },
            UNP: { name: 'Union Pacific Corporation', price: 235.10, basePrice: 235.10, volatility: 0.015, sector: 'Industrials' },
            GE: { name: 'General Electric Company', price: 156.30, basePrice: 156.30, volatility: 0.02, sector: 'Industrials' },
            HON: { name: 'Honeywell International Inc.', price: 198.50, basePrice: 198.50, volatility: 0.015, sector: 'Industrials' },
            RTX: { name: 'RTX Corporation', price: 101.20, basePrice: 101.20, volatility: 0.018, sector: 'Industrials' },
            AXP: { name: 'American Express Company', price: 220.40, basePrice: 220.40, volatility: 0.02, sector: 'Financial Services' },
            LMT: { name: 'Lockheed Martin Corporation', price: 460.70, basePrice: 460.70, volatility: 0.01, sector: 'Industrials' },
            SYK: { name: 'Stryker Corporation', price: 345.20, basePrice: 345.20, volatility: 0.015, sector: 'Healthcare' },
            ELV: { name: 'Elevance Health Inc.', price: 510.60, basePrice: 510.60, volatility: 0.015, sector: 'Healthcare' },
            GS: { name: 'The Goldman Sachs Group Inc.', price: 410.30, basePrice: 410.30, volatility: 0.02, sector: 'Financial Services' },
            BLK: { name: 'BlackRock Inc.', price: 785.40, basePrice: 785.40, volatility: 0.012, sector: 'Financial Services' },
            BA: { name: 'The Boeing Company', price: 175.20, basePrice: 175.20, volatility: 0.03, sector: 'Industrials' },
            TJX: { name: 'The TJX Companies Inc.', price: 98.40, basePrice: 98.40, volatility: 0.012, sector: 'Consumer Cyclical' },
            MDLZ: { name: 'Mondelez International Inc.', price: 70.10, basePrice: 70.10, volatility: 0.01, sector: 'Consumer Defensive' },
            ADP: { name: 'Automatic Data Processing Inc.', price: 245.30, basePrice: 245.30, volatility: 0.01, sector: 'Technology' },
            C: { name: 'Citigroup Inc.', price: 60.80, basePrice: 60.80, volatility: 0.02, sector: 'Financial Services' },
            BMY: { name: 'Bristol-Myers Squibb Company', price: 48.20, basePrice: 48.20, volatility: 0.015, sector: 'Healthcare' },
            VRTX: { name: 'Vertex Pharmaceuticals Inc.', price: 415.60, basePrice: 415.60, volatility: 0.02, sector: 'Healthcare' },
            CI: { name: 'The Cigna Group', price: 355.40, basePrice: 355.40, volatility: 0.015, sector: 'Healthcare' },
            MMC: { name: 'Marsh & McLennan Companies Inc.', price: 202.10, basePrice: 202.10, volatility: 0.01, sector: 'Financial Services' },
            REGN: { name: 'Regeneron Pharmaceuticals Inc.', price: 930.50, basePrice: 930.50, volatility: 0.02, sector: 'Healthcare' },
            ADI: { name: 'Analog Devices Inc.', price: 192.30, basePrice: 192.30, volatility: 0.02, sector: 'Technology' },
            AMT: { name: 'American Tower Corporation', price: 185.60, basePrice: 185.60, volatility: 0.015, sector: 'Real Estate' },
            CVS: { name: 'CVS Health Corporation', price: 72.40, basePrice: 72.40, volatility: 0.015, sector: 'Healthcare' },
            PLD: { name: 'Prologis Inc.', price: 115.30, basePrice: 115.30, volatility: 0.015, sector: 'Real Estate' },
            ISRG: { name: 'Intuitive Surgical Inc.', price: 385.90, basePrice: 385.90, volatility: 0.02, sector: 'Healthcare' },
            EQIX: { name: 'Equinix Inc.', price: 780.20, basePrice: 780.20, volatility: 0.015, sector: 'Real Estate' },
            LRCX: { name: 'Lam Research Corporation', price: 920.40, basePrice: 920.40, volatility: 0.03, sector: 'Technology' },
            SO: { name: 'The Southern Company', price: 72.10, basePrice: 72.10, volatility: 0.008, sector: 'Utilities' },
            DUK: { name: 'Duke Energy Corporation', price: 96.40, basePrice: 96.40, volatility: 0.008, sector: 'Utilities' },
            MO: { name: 'Altria Group Inc.', price: 43.20, basePrice: 43.20, volatility: 0.01, sector: 'Consumer Defensive' },
            T: { name: 'AT&T Inc.', price: 16.80, basePrice: 16.80, volatility: 0.012, sector: 'Communication Services' },
            MU: { name: 'Micron Technology Inc.', price: 118.50, basePrice: 118.50, volatility: 0.035, sector: 'Technology' },
            BDX: { name: 'Becton Dickinson and Company', price: 235.60, basePrice: 235.60, volatility: 0.015, sector: 'Healthcare' },
            ITW: { name: 'Illinois Tool Works Inc.', price: 255.30, basePrice: 255.30, volatility: 0.015, sector: 'Industrials' },
            SLB: { name: 'Schlumberger Limited', price: 54.20, basePrice: 54.20, volatility: 0.025, sector: 'Energy' },
            EOG: { name: 'EOG Resources Inc.', price: 128.40, basePrice: 128.40, volatility: 0.025, sector: 'Energy' },
            CL: { name: 'Colgate-Palmolive Company', price: 88.10, basePrice: 88.10, volatility: 0.01, sector: 'Consumer Defensive' },
            BSX: { name: 'Boston Scientific Corporation', price: 66.40, basePrice: 66.40, volatility: 0.02, sector: 'Healthcare' },
            HCA: { name: 'HCA Healthcare Inc.', price: 315.20, basePrice: 315.20, volatility: 0.018, sector: 'Healthcare' },
            WFC: { name: 'Wells Fargo & Company', price: 58.30, basePrice: 58.30, volatility: 0.02, sector: 'Financial Services' },
            PANW: { name: 'Palo Alto Networks Inc.', price: 290.60, basePrice: 290.60, volatility: 0.03, sector: 'Technology' },
            SNPS: { name: 'Synopsys Inc.', price: 550.40, basePrice: 550.40, volatility: 0.02, sector: 'Technology' },
            CDNS: { name: 'Cadence Design Systems Inc.', price: 295.20, basePrice: 295.20, volatility: 0.02, sector: 'Technology' },
            KLAC: { name: 'KLA Corporation', price: 680.10, basePrice: 680.10, volatility: 0.025, sector: 'Technology' },
            APH: { name: 'Amphenol Corporation', price: 112.40, basePrice: 112.40, volatility: 0.015, sector: 'Technology' },
            MCO: { name: "Moody's Corporation", price: 390.50, basePrice: 390.50, volatility: 0.015, sector: 'Financial Services' },
            AON: { name: 'Aon plc', price: 310.20, basePrice: 310.20, volatility: 0.015, sector: 'Financial Services' },
            ROP: { name: 'Roper Technologies Inc.', price: 535.60, basePrice: 535.60, volatility: 0.015, sector: 'Technology' },
            CTAS: { name: 'Cintas Corporation', price: 640.20, basePrice: 640.20, volatility: 0.015, sector: 'Industrials' },
            NOC: { name: 'Northrop Grumman Corporation', price: 465.30, basePrice: 465.30, volatility: 0.012, sector: 'Industrials' }
        };

        const generateSharesOutstanding = (ticker, price) => {
            const custom = {
                AAPL: 15500000000,
                MSFT: 7450000000,
                AMZN: 10500000000,
                NVDA: 24500000000,
                GOOGL: 12200000000,
                META: 2550000000,
                TSLA: 3200000000,
                'BRK.B': 2200000000,
                JPM: 2900000000,
                V: 1700000000,
                XOM: 4100000000,
                BAC: 7900000000,
                PFE: 5600000000,
                INTC: 4200000000,
                AMD: 1620000000,
                NFLX: 430000000,
                AVGO: 500000000,
                LLY: 900000000,
                MA: 980000000,
                UNH: 920000000
            };

            if (custom[ticker]) return custom[ticker];
            const marketCap = 50000000000 + Math.random() * 250000000000;
            return Math.round(marketCap / price);
        };

        Object.keys(stocks).forEach(symbol => {
            stocks[symbol].symbol = symbol;
            stocks[symbol].priceHistory = [stocks[symbol].price];
            stocks[symbol].previousPrice = stocks[symbol].price;
            stocks[symbol].change = 0;
            stocks[symbol].sharesOutstanding = generateSharesOutstanding(symbol, stocks[symbol].price);
        });

        return stocks;
    }

    /**
     * Register a new IPO dynamic stock
     */
    registerIPO(symbol, name, price, sector, volatility) {
        if (this.stocks[symbol]) return;
        this.stocks[symbol] = {
            name,
            price,
            basePrice: price,
            volatility: volatility || 0.02,
            sector,
            priceHistory: [price],
            previousPrice: price,
            change: 0
        };
        console.log(`📈 Registered IPO for ticker: ${symbol} (${name}) at $${price}`);
    }

    /**
     * Fetch real prices from API (called once at game start)
     */
    async fetchRealPrices() {
        try {
            // Approximate real prices for Wall Street stocks (Jan 2024)
            const realPrices = {
                AAPL: 185.92,
                GOOGL: 142.65,
                MSFT: 378.91,
                AMZN: 178.35,
                TSLA: 248.42,
                NVDA: 495.22,
                META: 505.95,
                JPM: 195.71,
                V: 280.12,
                JNJ: 158.27,
                WMT: 165.78,
                XOM: 105.45
            };

            // Apply real prices
            Object.keys(realPrices).forEach(symbol => {
                if (this.stocks[symbol]) {
                    this.stocks[symbol].price = realPrices[symbol];
                    this.stocks[symbol].basePrice = realPrices[symbol];
                    this.stocks[symbol].previousPrice = realPrices[symbol];
                }
            });

            this.pricesLoaded = true;
            console.log('📈 Wall Street stock prices loaded');
            gameState.emit('stockPricesLoaded', this.stocks);

            return true;
        } catch (error) {
            console.error('Failed to fetch real prices:', error);
            return false;
        }
    }

    /**
     * Update all stock prices
     */
    updatePrices() {
        // When connected to authoritative multiplayer backend, prices are strictly driven by real trades
        if (this.authoritativeMode) {
            return;
        }

        const economyIndex = gameState.get('economy.index') || 1000;
        const marketFactor = economyIndex / 1000;

        // Fetch active trading signals from gameState to apply market biases
        const activeSignals = gameState.get('tradingSignals') || [];

        Object.keys(this.stocks).forEach(symbol => {
            const stock = this.stocks[symbol];

            // 1. Check if this asset has a trading signal active
            let signalBulls = 0;
            let signalVolAdd = 0;
            const activeSignal = activeSignals.find(s => s.id === symbol);
            if (activeSignal) {
                if (activeSignal.label === 'MOON 🚀') {
                    signalBulls = 0.20; // Bullish momentum impulse
                    signalVolAdd = 0.02;
                } else if (activeSignal.label === 'HOT 🔥') {
                    signalBulls = 0.08;
                    signalVolAdd = 0.01;
                } else if (activeSignal.label === 'HEAT ⚡') {
                    signalBulls = 0.04;
                } else if (activeSignal.label === 'COOL ❄️') {
                    signalVolAdd = -stock.volatility * 0.4; // Dampen volatility
                }
            }

            // 2. Structured technical pattern trajectory & waypoints (H&S, Triangles, Doji consolidation)
            const patternInfo = patternTrajectoryManager.getPatternDrift(symbol, stock, stock.price);
            const patternDrift = patternInfo.drift;
            stock.activePattern = patternInfo.pattern;

            // 3. Scaled micro-tick volatility (~0.02% to ~0.08% per 6-second tick, dampened during Doji consolidation)
            const tickScale = 0.02; // 2% of daily volatility per tick
            const volDampener = patternInfo.volatilityScale || 1.0;
            const scaledVol = Math.max(0.0003, (stock.volatility + signalVolAdd) * tickScale * volDampener);
            const brownianMotion = (Math.random() - 0.5) * 2 * scaledVol;

            // 4. Controlled signal drift
            const signalDrift = signalBulls * 0.004;

            // 5. Directional drift from active breaking news events (accelerated 2.5x pacing)
            const newsDrift = newsManager.getPriceBias(symbol, stock.sector);

            // 6. Gentle mean reversion towards basePrice to maintain authentic institutional trading bands
            const meanReversion = ((stock.basePrice - stock.price) / (stock.basePrice || 1)) * 0.002;

            // 7. Macro economy & luck drift
            const luckActive = (gameState.get('donations.luckTicksRemaining') || 0) > 0;
            const luckDrift = luckActive ? 0.0006 : 0;
            const marketInfluence = (marketFactor - 1) * 0.0003;

            // 8. Recent order flow imbalance (from player and simulated institutional block trades)
            const orderImbalance = (stock.recentBuyVolume || 0) - (stock.recentSellVolume || 0);
            const orderFlowDrift = Math.max(-0.003, Math.min(0.003, orderImbalance / 20000000));
            // Decay recent order volumes
            stock.recentBuyVolume = (stock.recentBuyVolume || 0) * 0.88;
            stock.recentSellVolume = (stock.recentSellVolume || 0) * 0.88;

            const totalChange = brownianMotion + signalDrift + newsDrift + meanReversion + marketInfluence + luckDrift + orderFlowDrift + patternDrift;
            const newPrice = Math.max(0.01, parseFloat((stock.price * (1 + totalChange)).toFixed(2)));

            stock.previousPrice = stock.price;
            stock.price = newPrice;

            // Real 24h Change based on basePrice
            stock.change = parseFloat((((stock.price - stock.basePrice) / (stock.basePrice || 1)) * 100).toFixed(2));

            // Track history
            if (!stock.priceHistory) stock.priceHistory = [stock.price];
            stock.priceHistory.push(stock.price);
            if (stock.priceHistory.length > 300) stock.priceHistory.shift();

            // Track high/low
            if (!stock.high24h || stock.price > stock.high24h) stock.high24h = stock.price;
            if (!stock.low24h || stock.price < stock.low24h) stock.low24h = stock.price;

            // Track 24h Volume baseline
            if (!stock.volume24h) {
                stock.volume24h = Math.round((stock.sharesOutstanding || 10000000) * 0.015);
            }
        });

        // Check pending orders
        this.checkPendingOrders();

        // Check TP/SL
        this.checkTakeProfitStopLoss();

        gameState.emit('stocksUpdate', this.stocks);
    }

    /**
     * Daily rollover reset (resets 24h High, Low, and anchors basePrice to today's open)
     */
    onDayPass() {
        Object.keys(this.stocks).forEach(sym => {
            const s = this.stocks[sym];
            s.basePrice = s.price;
            s.high24h = s.price;
            s.low24h = s.price;
            s.change = 0;
            s.volume24h = Math.round((s.sharesOutstanding || 10000000) * 0.015 * (0.8 + Math.random() * 0.4));
        });
    }

    // ========================================
    // MARKET ORDER (Real volume & price impact)
    // ========================================

    marketBuy(symbol, shares) {
        if (!symbol) throw new Error('Stock not found');
        const sKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const stock = this.stocks[sKey] || this.stocks[symbol];
        if (!stock) throw new Error('Stock not found');
        if (shares <= 0) throw new Error('Invalid shares');

        const totalCost = stock.price * shares;
        const balance = gameState.getBalance();

        if (totalCost > balance) throw new Error('Saldo tidak cukup');

        // Immediate price impact from buy volume
        const liquidityShares = (stock.sharesOutstanding || 10000000) * 0.005;
        const impact = Math.min(0.025, (shares / liquidityShares) * 0.1);
        if (impact > 0.00001) {
            stock.previousPrice = stock.price;
            stock.price = parseFloat((stock.price * (1 + impact)).toFixed(2));
            stock.change = parseFloat((((stock.price - stock.basePrice) / (stock.basePrice || 1)) * 100).toFixed(2));
            if (stock.price > (stock.high24h || stock.price)) stock.high24h = stock.price;
            if (!stock.priceHistory) stock.priceHistory = [];
            stock.priceHistory.push(stock.price);
            if (stock.priceHistory.length > 300) stock.priceHistory.shift();
        }

        gameState.update('player', p => ({
            ...p,
            balance: p.balance - totalCost
        }));

        const actualSymbol = stock.symbol || sKey;
        this.addToPortfolio(actualSymbol, shares, stock.price);

        // Accumulate 24h volume & buy order pressure
        stock.volume24h = (stock.volume24h || 100000) + shares;
        stock.recentBuyVolume = (stock.recentBuyVolume || 0) + totalCost;

        gameState.emit('stockBuy', {
            symbol: actualSymbol,
            shares,
            price: stock.price,
            totalCost,
            orderType: 'MARKET'
        });

        return { symbol: actualSymbol, shares, price: stock.price, totalCost, orderType: 'MARKET' };
    }

    marketSell(symbol, shares) {
        if (!symbol) throw new Error('Stock not found');
        const sKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const stock = this.stocks[sKey] || this.stocks[symbol];
        if (!stock) throw new Error('Stock not found');

        const actualSymbol = stock.symbol || sKey;
        const portfolio = gameState.get('stocks') || {};
        const holding = portfolio[actualSymbol] || portfolio[symbol];

        if (!holding || holding.shares < shares) {
            throw new Error('Saham tidak cukup');
        }

        const totalValue = stock.price * shares;

        // Immediate price impact from sell volume
        const liquidityShares = (stock.sharesOutstanding || 10000000) * 0.005;
        const impact = Math.min(0.025, (shares / liquidityShares) * 0.1);
        if (impact > 0.00001) {
            stock.previousPrice = stock.price;
            stock.price = Math.max(0.01, parseFloat((stock.price * (1 - impact)).toFixed(2)));
            stock.change = parseFloat((((stock.price - stock.basePrice) / (stock.basePrice || 1)) * 100).toFixed(2));
            if (stock.price < (stock.low24h || stock.price)) stock.low24h = stock.price;
            if (!stock.priceHistory) stock.priceHistory = [];
            stock.priceHistory.push(stock.price);
            if (stock.priceHistory.length > 300) stock.priceHistory.shift();
        }

        const costBasis = holding.avgBuyPrice * shares;
        const profit = totalValue - costBasis;
        const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

        financeManager.addIncome(totalValue, 'Stock Sell', `Sold ${shares} shares of ${symbol}`);

        this.removeFromPortfolio(symbol, shares);

        // Accumulate 24h volume & sell order pressure
        stock.volume24h = (stock.volume24h || 100000) + shares;
        stock.recentSellVolume = (stock.recentSellVolume || 0) + totalValue;

        // Record to trade history
        const tradeLog = {
            id: Date.now() + Math.random(),
            asset: symbol,
            assetType: 'stock',
            amount: shares,
            buyPrice: holding.avgBuyPrice,
            sellPrice: stock.price,
            profit: profit,
            profitPercent: profitPercent,
            timestamp: Date.now(),
            date: `${gameState.get('gameTime.day') || 1}/${gameState.get('gameTime.month') || 1}/${gameState.get('gameTime.year') || 2010}`
        };
        const tradeHistory = gameState.get('tradeHistory') || [];
        tradeHistory.unshift(tradeLog);
        gameState.set('tradeHistory', tradeHistory.slice(0, 100));

        gameState.emit('stockSell', {
            symbol,
            shares,
            price: stock.price,
            totalValue,
            profit,
            orderType: 'MARKET'
        });

        return { symbol, shares, price: stock.price, totalValue, profit, orderType: 'MARKET' };
    }

    // ========================================
    // LIMIT ORDER (execute at target price)
    // ========================================

    limitBuy(symbol, shares, limitPrice) {
        if (!symbol) throw new Error('Stock not found');
        const sKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const stock = this.stocks[sKey] || this.stocks[symbol];
        if (!stock) throw new Error('Stock not found');
        if (shares <= 0) throw new Error('Invalid shares');
        if (limitPrice <= 0) throw new Error('Invalid limit price');

        const totalCost = limitPrice * shares;
        const balance = gameState.getBalance();

        if (totalCost > balance) throw new Error('Saldo tidak cukup untuk order');

        // Reserve balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - totalCost
        }));

        const actualSymbol = stock.symbol || sKey;
        const order = {
            id: Date.now() + Math.random(),
            type: 'LIMIT_BUY',
            symbol: actualSymbol,
            shares,
            limitPrice,
            totalReserved: totalCost,
            status: 'PENDING',
            createdAt: Date.now()
        };

        this.pendingOrders.push(order);
        this.savePendingOrders();

        gameState.emit('limitOrderCreated', order);

        return order;
    }

    limitSell(symbol, shares, limitPrice) {
        if (!symbol) throw new Error('Stock not found');
        const sKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const stock = this.stocks[sKey] || this.stocks[symbol];
        if (!stock) throw new Error('Stock not found');

        const actualSymbol = stock.symbol || sKey;
        const portfolio = gameState.get('stocks') || {};
        const holding = portfolio[actualSymbol] || portfolio[symbol];

        if (!holding || holding.shares < shares) {
            throw new Error('Saham tidak cukup');
        }

        // Reserve shares
        holding.reservedShares = (holding.reservedShares || 0) + shares;
        gameState.set('stocks', portfolio);

        const order = {
            id: Date.now() + Math.random(),
            type: 'LIMIT_SELL',
            symbol: actualSymbol,
            shares,
            limitPrice,
            avgBuyPrice: holding.avgBuyPrice,
            status: 'PENDING',
            createdAt: Date.now()
        };

        this.pendingOrders.push(order);
        this.savePendingOrders();

        gameState.emit('limitOrderCreated', order);

        return order;
    }

    checkPendingOrders() {
        const toRemove = [];

        this.pendingOrders.forEach((order, index) => {
            const stock = this.stocks[order.symbol];
            if (!stock) return;

            let executed = false;

            if (order.type === 'LIMIT_BUY' && stock.price <= order.limitPrice) {
                // Execute buy at limit price
                this.addToPortfolio(order.symbol, order.shares, order.limitPrice);

                // Refund difference if price dropped below limit
                const actualCost = order.limitPrice * order.shares;
                if (order.totalReserved > actualCost) {
                    gameState.update('player', p => ({
                        ...p,
                        balance: p.balance + (order.totalReserved - actualCost)
                    }));
                }

                executed = true;
                gameState.emit('limitOrderExecuted', { ...order, executedPrice: order.limitPrice });
            }
            else if (order.type === 'LIMIT_SELL' && stock.price >= order.limitPrice) {
                // Execute sell at limit price
                const totalValue = order.limitPrice * order.shares;
                const costBasis = order.avgBuyPrice * order.shares;
                const profit = totalValue - costBasis;
                const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

                financeManager.addIncome(totalValue, 'Stock Sell', `Limit Sell Executed: ${order.shares} ${order.symbol}`);

                this.removeFromPortfolio(order.symbol, order.shares, true);

                executed = true;

                // Record to trade history
                const tradeLog = {
                    id: Date.now() + Math.random(),
                    asset: order.symbol,
                    assetType: 'stock',
                    amount: order.shares,
                    buyPrice: order.avgBuyPrice,
                    sellPrice: order.limitPrice,
                    profit: profit,
                    profitPercent: profitPercent,
                    timestamp: Date.now(),
                    date: `${gameState.get('gameTime.day') || 1}/${gameState.get('gameTime.month') || 1}/${gameState.get('gameTime.year') || 2010}`
                };
                const tradeHistory = gameState.get('tradeHistory') || [];
                tradeHistory.unshift(tradeLog);
                gameState.set('tradeHistory', tradeHistory.slice(0, 100));

                gameState.emit('limitOrderExecuted', {
                    ...order,
                    executedPrice: order.limitPrice,
                    profit: profit
                });
            }

            if (executed) {
                toRemove.push(index);
            }
        });

        // Remove executed orders
        toRemove.reverse().forEach(i => this.pendingOrders.splice(i, 1));
        if (toRemove.length > 0) this.savePendingOrders();
    }

    cancelLimitOrder(orderId) {
        const index = this.pendingOrders.findIndex(o => o.id === orderId);
        if (index === -1) throw new Error('Order not found');

        const order = this.pendingOrders[index];

        if (order.type === 'LIMIT_BUY') {
            // Refund reserved balance
            gameState.update('player', p => ({
                ...p,
                balance: p.balance + order.totalReserved
            }));
        } else if (order.type === 'LIMIT_SELL') {
            // Release reserved shares
            const portfolio = gameState.get('stocks') || {};
            const holding = portfolio[order.symbol];
            if (holding) {
                holding.reservedShares = Math.max(0, (holding.reservedShares || 0) - order.shares);
                gameState.set('stocks', portfolio);
            }
        }

        this.pendingOrders.splice(index, 1);
        this.savePendingOrders();

        gameState.emit('limitOrderCancelled', order);
        return order;
    }

    // ========================================
    // TAKE PROFIT / STOP LOSS
    // ========================================

    setTakeProfit(symbol, targetPrice) {
        const portfolio = gameState.get('stocks') || {};
        const holding = portfolio[symbol];
        if (!holding) throw new Error('Tidak punya saham ini');

        holding.takeProfit = targetPrice;
        gameState.set('stocks', portfolio);

        gameState.emit('tpslSet', { symbol, type: 'TP', price: targetPrice });
        return { symbol, takeProfit: targetPrice };
    }

    setStopLoss(symbol, targetPrice) {
        const portfolio = gameState.get('stocks') || {};
        const holding = portfolio[symbol];
        if (!holding) throw new Error('Tidak punya saham ini');

        holding.stopLoss = targetPrice;
        gameState.set('stocks', portfolio);

        gameState.emit('tpslSet', { symbol, type: 'SL', price: targetPrice });
        return { symbol, stopLoss: targetPrice };
    }

    checkTakeProfitStopLoss() {
        const portfolio = gameState.get('stocks') || {};

        Object.entries(portfolio).forEach(([symbol, holding]) => {
            const stock = this.stocks[symbol];
            if (!stock || holding.shares <= 0) return;

            // Check Take Profit
            if (holding.takeProfit && stock.price >= holding.takeProfit) {
                const shares = holding.shares - (holding.reservedShares || 0);
                if (shares > 0) {
                    try {
                        const result = this.marketSell(symbol, shares);
                        gameState.emit('takeProfitTriggered', { symbol, ...result });
                    } catch (e) {
                        console.error('TP execution failed:', e);
                    }
                }
                delete holding.takeProfit;
                gameState.set('stocks', portfolio);
            }

            // Check Stop Loss
            else if (holding.stopLoss && stock.price <= holding.stopLoss) {
                const shares = holding.shares - (holding.reservedShares || 0);
                if (shares > 0) {
                    try {
                        const result = this.marketSell(symbol, shares);
                        gameState.emit('stopLossTriggered', { symbol, ...result });
                    } catch (e) {
                        console.error('SL execution failed:', e);
                    }
                }
                delete holding.stopLoss;
                gameState.set('stocks', portfolio);
            }
        });
    }

    // ========================================
    // PORTFOLIO HELPERS
    // ========================================

    addToPortfolio(symbol, shares, price) {
        const portfolio = gameState.get('stocks') || {};
        if (!portfolio[symbol]) {
            portfolio[symbol] = { shares: 0, avgBuyPrice: 0, totalInvested: 0 };
        }

        const existing = portfolio[symbol];
        const newTotalShares = existing.shares + shares;
        const newTotalInvested = existing.totalInvested + (price * shares);

        portfolio[symbol] = {
            ...existing,
            shares: newTotalShares,
            avgBuyPrice: newTotalInvested / newTotalShares,
            totalInvested: newTotalInvested
        };

        gameState.set('stocks', portfolio);
    }

    removeFromPortfolio(symbol, shares, fromReserved = false) {
        const portfolio = gameState.get('stocks') || {};
        const holding = portfolio[symbol];
        if (!holding) return;

        holding.shares -= shares;
        holding.totalInvested -= (holding.avgBuyPrice * shares);

        if (fromReserved) {
            holding.reservedShares = Math.max(0, (holding.reservedShares || 0) - shares);
        }

        if (holding.shares <= 0) {
            delete portfolio[symbol];
        }

        gameState.set('stocks', portfolio);
    }

    savePendingOrders() {
        gameState.set('stockPendingOrders', this.pendingOrders);
    }

    loadPendingOrders() {
        this.pendingOrders = gameState.get('stockPendingOrders') || [];
    }

    // ========================================
    // GETTERS
    // ========================================

    getStock(symbol) {
        if (!symbol) return null;
        const sKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const stock = this.stocks[sKey] || this.stocks[symbol];
        if (stock && !stock.symbol) {
            stock.symbol = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        }
        return stock;
    }

    getAllStocks() {
        return Object.entries(this.stocks).map(([symbol, data]) => ({
            symbol,
            ...data
        }));
    }

    getPortfolio() {
        const portfolio = gameState.get('stocks') || {};
        const holdings = [];
        let needsCleanup = false;

        Object.entries(portfolio).forEach(([symbol, data]) => {
            const stock = this.stocks[symbol];
            // Only include if stock exists in current stock list AND has shares
            if (stock && data.shares > 0) {
                const currentValue = stock.price * data.shares;
                const profit = currentValue - data.totalInvested;
                const profitPercent = (profit / data.totalInvested) * 100;

                holdings.push({
                    symbol,
                    name: stock.name,
                    shares: data.shares,
                    reservedShares: data.reservedShares || 0,
                    avgBuyPrice: data.avgBuyPrice,
                    currentPrice: stock.price,
                    totalInvested: data.totalInvested,
                    currentValue,
                    profit,
                    profitPercent,
                    takeProfit: data.takeProfit,
                    stopLoss: data.stopLoss
                });
            } else if (!stock) {
                // Mark for cleanup - old stock symbol that no longer exists
                needsCleanup = true;
                console.log(`🧹 Cleaning up old portfolio item: ${symbol}`);
            }
        });

        // Clean up invalid portfolio entries
        if (needsCleanup) {
            const cleanedPortfolio = {};
            Object.entries(portfolio).forEach(([symbol, data]) => {
                if (this.stocks[symbol]) {
                    cleanedPortfolio[symbol] = data;
                }
            });
            gameState.set('stocks', cleanedPortfolio);
        }

        return holdings;
    }

    getPendingOrders() {
        return this.pendingOrders;
    }

    getPortfolioValue() {
        return this.getPortfolio().reduce((sum, h) => sum + h.currentValue, 0);
    }

    getStockIcon(sector) {
        const icons = {
            finance: '🏦',
            tech: '💻',
            telecom: '📱',
            energy: '⚡',
            consumer: '🛒',
            automotive: '🚗',
            media: '📺',
            mining: '⛏️',
            ecommerce: '📦',
            healthcare: '💊',
            retail: '🏪'
        };
        return icons[sector] || '📊';
    }

    startUpdates(intervalMs = 5000) {
        if (this.updateInterval) return;
        this.loadPendingOrders();
        this.updateInterval = setInterval(() => this.updatePrices(), intervalMs);
        this.updatePrices();
    }

    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // ========================================
    // AUTHORITATIVE MULTIPLAYER MARKET ENGINE
    // ========================================

    /**
     * Connect to the authoritative Node.js + Fastify + Socket.IO + Supabase backend.
     * Disables local browser price manipulation and synchronizes state from server.
     */
    async connectAuthoritativeServer() {
        try {
            const serverStocks = await marketClient.fetchStocks();
            this.authoritativeMode = true;

            serverStocks.forEach(s => {
                const price = marketClient.fromMinorUnit(s.last_price);
                const prevClose = marketClient.fromMinorUnit(s.previous_close);
                const existing = this.stocks[s.symbol] || {};

                this.stocks[s.symbol] = {
                    ...existing,
                    name: s.name,
                    sector: s.sector,
                    price,
                    basePrice: prevClose || price,
                    previousPrice: prevClose || price,
                    change: Number(s.change_pct || 0),
                    high24h: marketClient.fromMinorUnit(s.high_24h),
                    low24h: marketClient.fromMinorUnit(s.low_24h),
                    volume24h: Number(s.volume_24h || 0),
                    bestBid: s.best_bid !== null ? marketClient.fromMinorUnit(s.best_bid) : null,
                    bestAsk: s.best_ask !== null ? marketClient.fromMinorUnit(s.best_ask) : null,
                    priceHistory: existing.priceHistory?.length ? existing.priceHistory : [price]
                };
            });

            await this.syncPortfolioFromServer().catch(() => {});
            await this.syncOrdersFromServer().catch(() => {});

            await marketClient.connect({
                onSnapshot: (snapshot) => this.applyServerSnapshot(snapshot),
                onTrade: (trade) => this.applyServerTrade(trade),
                onBookUpdate: (book) => this.applyServerBookUpdate(book),
                onTicker: (ticker) => this.applyServerTicker(ticker),
                onOrderUpdated: (order) => this.applyServerOrderUpdate(order),
                onConnectChange: (connected) => {
                    if (connected) {
                        this.syncPortfolioFromServer().catch(() => {});
                        this.syncOrdersFromServer().catch(() => {});
                    }
                }
            });

            gameState.emit('stocksUpdate', this.stocks);
            return true;
        } catch (err) {
            console.warn('⚠️ Authoritative Market Server not reachable, running in local simulation fallback:', err.message);
            this.authoritativeMode = false;
            return false;
        }
    }

    subscribeStock(symbol) {
        if (this.authoritativeMode) {
            marketClient.subscribeSymbol(symbol);
        }
    }

    unsubscribeStock(symbol) {
        if (this.authoritativeMode) {
            marketClient.unsubscribeSymbol(symbol);
        }
    }

    getOrderBook(symbol) {
        return this.orderBooks[symbol] || { symbol, bids: [], asks: [], bestBid: null, bestAsk: null };
    }

    getRecentTrades(symbol) {
        return this.recentTrades[symbol] || [];
    }

    async syncPortfolioFromServer() {
        if (!this.authoritativeMode) return null;
        const data = await marketClient.fetchPortfolio();
        if (!data) return null;

        if (data.account) {
            gameState.update('player', p => ({
                ...p,
                balance: marketClient.fromMinorUnit(data.account.available_balance),
                lockedBalance: marketClient.fromMinorUnit(data.account.locked_balance)
            }));
        }

        if (Array.isArray(data.positions)) {
            const mappedPortfolio = {};
            data.positions.forEach(pos => {
                mappedPortfolio[pos.symbol] = {
                    shares: Number(pos.total_quantity),
                    reservedShares: Number(pos.locked_quantity),
                    avgBuyPrice: marketClient.fromMinorUnit(pos.avg_buy_price),
                    totalInvested: marketClient.fromMinorUnit(pos.total_invested)
                };
            });
            gameState.set('stocks', mappedPortfolio);
        }

        return data;
    }

    async syncOrdersFromServer() {
        if (!this.authoritativeMode) return [];
        const orders = await marketClient.fetchMyOrders({ status: 'ACTIVE' });
        this.pendingOrders = orders.map(o => ({
            id: o.id,
            type: o.side === 'BUY' ? 'LIMIT_BUY' : 'LIMIT_SELL',
            symbol: o.symbol,
            shares: Number(o.remaining_quantity),
            originalShares: Number(o.quantity),
            filledShares: Number(o.filled_quantity),
            limitPrice: o.price !== null ? marketClient.fromMinorUnit(o.price) : 0,
            totalReserved: marketClient.fromMinorUnit(o.locked_funds),
            status: o.status,
            createdAt: new Date(o.created_at).getTime()
        }));
        this.savePendingOrders();
        return this.pendingOrders;
    }

    applyServerSnapshot(snapshot) {
        if (!snapshot?.symbol) return;
        if (snapshot.ticker) this.applyServerTicker(snapshot.ticker);
        if (snapshot.orderbook) this.applyServerBookUpdate(snapshot.orderbook);
        if (Array.isArray(snapshot.trades)) {
            this.recentTrades[snapshot.symbol] = snapshot.trades.map(t => ({
                ...t,
                price: marketClient.fromMinorUnit(t.price),
                total_amount: marketClient.fromMinorUnit(t.total_amount)
            }));
            gameState.emit('marketTradesUpdate', { symbol: snapshot.symbol, trades: this.recentTrades[snapshot.symbol] });
        }
    }

    applyServerTicker(ticker) {
        if (!ticker?.symbol) return;
        const symbol = ticker.symbol;
        const stock = this.stocks[symbol] || { name: ticker.name || symbol, sector: ticker.sector || 'General', priceHistory: [] };
        const newPrice = marketClient.fromMinorUnit(ticker.last_price ?? ticker.lastPrice);

        stock.previousPrice = stock.price || newPrice;
        stock.price = newPrice;
        stock.high24h = marketClient.fromMinorUnit(ticker.high_24h ?? ticker.high24h ?? ticker.last_price);
        stock.low24h = marketClient.fromMinorUnit(ticker.low_24h ?? ticker.low24h ?? ticker.last_price);
        stock.volume24h = Number(ticker.volume_24h ?? ticker.volume24h ?? 0);
        stock.change = Number(ticker.change_pct ?? (((stock.price - (stock.basePrice || stock.previousPrice)) / (stock.basePrice || stock.previousPrice || 1)) * 100));

        if (!stock.priceHistory) stock.priceHistory = [];
        stock.priceHistory.push(newPrice);
        if (stock.priceHistory.length > 300) stock.priceHistory.shift();

        this.stocks[symbol] = stock;
        gameState.emit('stocksUpdate', this.stocks);
    }

    applyServerBookUpdate(book) {
        if (!book?.symbol) return;
        const mappedBook = {
            symbol: book.symbol,
            bestBid: book.bestBid !== null ? marketClient.fromMinorUnit(book.bestBid) : null,
            bestAsk: book.bestAsk !== null ? marketClient.fromMinorUnit(book.bestAsk) : null,
            spread: book.spread !== null ? marketClient.fromMinorUnit(book.spread) : null,
            bids: (book.bids || []).map(l => ({ ...l, price: marketClient.fromMinorUnit(l.price) })),
            asks: (book.asks || []).map(l => ({ ...l, price: marketClient.fromMinorUnit(l.price) })),
            timestamp: book.timestamp
        };
        this.orderBooks[book.symbol] = mappedBook;
        gameState.emit('orderBookUpdate', mappedBook);
    }

    applyServerTrade(trade) {
        if (!trade?.symbol) return;
        const mappedTrade = {
            ...trade,
            price: marketClient.fromMinorUnit(trade.price),
            total_amount: marketClient.fromMinorUnit(trade.total_amount)
        };
        if (!this.recentTrades[trade.symbol]) this.recentTrades[trade.symbol] = [];
        this.recentTrades[trade.symbol].unshift(mappedTrade);
        this.recentTrades[trade.symbol] = this.recentTrades[trade.symbol].slice(0, 100);

        // Update live stock price on real trade
        if (this.stocks[trade.symbol]) {
            const stock = this.stocks[trade.symbol];
            stock.previousPrice = stock.price;
            stock.price = mappedTrade.price;
            if (!stock.priceHistory) stock.priceHistory = [];
            stock.priceHistory.push(mappedTrade.price);
            gameState.emit('stocksUpdate', this.stocks);
        }

        gameState.emit('marketTrade', mappedTrade);
    }

    applyServerOrderUpdate(order) {
        if (!order?.id) return;
        this.syncPortfolioFromServer().catch(() => {});
        this.syncOrdersFromServer().catch(() => {});
        gameState.emit('orderUpdated', order);
    }

    async submitAuthoritativeOrder({ symbol, side, type, shares, limitPrice = null }) {
        const res = await marketClient.placeOrder({
            symbol,
            side,
            type,
            quantity: shares,
            price: limitPrice
        });
        await this.syncPortfolioFromServer();
        await this.syncOrdersFromServer();
        return res;
    }
}

export const stockMarket = new StockMarket();
export default stockMarket;
