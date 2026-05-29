/**
 * CryptoMarket.js - Enhanced Cryptocurrency Trading
 * Market/Limit Orders, TP/SL, Real Price Integration
 */

import gameState from '../core/GameState.js';
import financeManager from '../finance/FinanceManager.js';

class CryptoMarket {
    constructor() {
        this.cryptos = this.initializeCryptos();
        this.pendingOrders = [];
        this.updateInterval = null;
        this.pricesLoaded = false;
    }

    initializeCryptos() {
        const cryptos = {
            BTC: { name: 'Bitcoin', price: 79200.00, basePrice: 79200.00, volatility: 0.05, category: 'Store of Value / L1', icon: '₿' },
            ETH: { name: 'Ethereum', price: 2225.00, basePrice: 2225.00, volatility: 0.06, category: 'Smart Contract Platfrom', icon: 'Ξ' },
            USDT: { name: 'Tether', price: 1.00, basePrice: 1.00, volatility: 0.001, category: 'Stablecoin', icon: '₮' },
            BNB: { name: 'BNB', price: 674.00, basePrice: 674.00, volatility: 0.04, category: 'Ecosystem / Exchange Token', icon: '🔶' },
            XRP: { name: 'XRP', price: 1.45, basePrice: 1.45, volatility: 0.08, category: 'Cross-Border Payments', icon: '✕' },
            USDC: { name: 'USD Coin', price: 1.00, basePrice: 1.00, volatility: 0.001, category: 'Stablecoin', icon: '₵' },
            SOL: { name: 'Solana', price: 89.50, basePrice: 89.50, volatility: 0.1, category: 'Smart Contract Platfrom', icon: '◎' },
            TRX: { name: 'TRON', price: 0.35, basePrice: 0.35, volatility: 0.05, category: 'DeFi / Settlement', icon: '💎' },
            DOGE: { name: 'Dogecoin', price: 0.11, basePrice: 0.11, volatility: 0.15, category: 'Meme Coin', icon: '🐕' },
            HYPE: { name: 'Hyperliquid', price: 44.15, basePrice: 44.15, volatility: 0.12, category: 'DeFi / DEX Token', icon: '⚡' },
            ADA: { name: 'Cardano', price: 0.26, basePrice: 0.26, volatility: 0.06, category: 'Smart Contract Platfrom', icon: '₳' },
            LEO: { name: 'UNUS SED LEO', price: 10.15, basePrice: 10.15, volatility: 0.03, category: 'Exchange Token', icon: '🦁' },
            ZEC: { name: 'Zcash', price: 515.00, basePrice: 515.00, volatility: 0.08, category: 'Privacy Coin', icon: 'ⓩ' },
            BCH: { name: 'Bitcoin Cash', price: 425.00, basePrice: 425.00, volatility: 0.07, category: 'Payments', icon: '฿' },
            LINK: { name: 'Chainlink', price: 10.05, basePrice: 10.05, volatility: 0.06, category: 'Oracle / Infrastructure', icon: '⬡' },
            XMR: { name: 'Monero', price: 380.00, basePrice: 380.00, volatility: 0.05, category: 'Privacy Coin', icon: 'ɱ' },
            CC: { name: 'Canton Network', price: 0.16, basePrice: 0.16, volatility: 0.09, category: 'Enterprise Blockchain', icon: '🌐' },
            DAI: { name: 'Dai', price: 1.00, basePrice: 1.00, volatility: 0.002, category: 'Algorithmic Stablecoin', icon: '◈' },
            TON: { name: 'Toncoin', price: 1.95, basePrice: 1.95, volatility: 0.08, category: 'Ecosystem Layer 1', icon: '💎' },
            XLM: { name: 'Stellar', price: 0.15, basePrice: 0.15, volatility: 0.06, category: 'Payments', icon: '🚀' },
            USD1: { name: 'World Liberty Financial USD', price: 1.00, basePrice: 1.00, volatility: 0.001, category: 'Stablecoin', icon: '🇺🇸' },
            LTC: { name: 'Litecoin', price: 57.00, basePrice: 57.00, volatility: 0.05, category: 'Payments', icon: 'Ł' },
            SUI: { name: 'Sui', price: 1.08, basePrice: 1.08, volatility: 0.12, category: 'Smart Contract Platfrom', icon: '💧' },
            USDe: { name: 'Ethena USDe', price: 1.00, basePrice: 1.00, volatility: 0.005, category: 'Synthetic Dollar', icon: 'Ⓢ' },
            M: { name: 'MemeCore', price: 3.25, basePrice: 3.25, volatility: 0.2, category: 'Infrastructure / Meme L1', icon: 'Ⓜ️' },
            AVAX: { name: 'Avalanche', price: 9.50, basePrice: 9.50, volatility: 0.09, category: 'Smart Contract Platfrom', icon: '🔺' },
            HBAR: { name: 'Hedera', price: 0.09, basePrice: 0.09, volatility: 0.06, category: 'Enterprise DLT', icon: 'ℏ' },
            SHIB: { name: 'Shiba Inu', price: 0.000006, basePrice: 0.000006, volatility: 0.2, category: 'Meme Coin', icon: '🐕' },
            PYUSD: { name: 'PayPal USD', price: 1.00, basePrice: 1.00, volatility: 0.001, category: 'Stablecoin', icon: '🅿️' },
            CRO: { name: 'Cronos', price: 0.07, basePrice: 0.07, volatility: 0.08, category: 'Ecosystem / Exchange Token', icon: '🔵' },
            TAO: { name: 'Bittensor', price: 275.00, basePrice: 275.00, volatility: 0.15, category: 'Decentralized AI', icon: 'τ' },
            USDG: { name: 'Global Dollar', price: 1.00, basePrice: 1.00, volatility: 0.001, category: 'Stablecoin', icon: '🌎' },
            XAUt: { name: 'Tether Gold', price: 4535.00, basePrice: 4535.00, volatility: 0.01, category: 'Asset-Backed Token', icon: '🟡' },
            UNI: { name: 'Uniswap', price: 3.58, basePrice: 3.58, volatility: 0.09, category: 'DeFi Governance', icon: '🦄' },
            DOT: { name: 'Polkadot', price: 1.28, basePrice: 1.28, volatility: 0.07, category: 'Interoperability L1', icon: '●' },
            MNT: { name: 'Mantle', price: 0.65, basePrice: 0.65, volatility: 0.1, category: 'Layer 2', icon: 'Ⓜ️' },
            PAXG: { name: 'PAX Gold', price: 4540.00, basePrice: 4540.00, volatility: 0.01, category: 'Asset-Backed Token', icon: '📀' },
            WLFI: { name: 'World Liberty Financial', price: 0.06, basePrice: 0.06, volatility: 0.15, category: 'Governance Token', icon: '🗽' },
            NEAR: { name: 'NEAR Protocol', price: 1.52, basePrice: 1.52, volatility: 0.1, category: 'Smart Contract Platfrom', icon: 'Ⓝ' },
            OKB: { name: 'OKB', price: 84.50, basePrice: 84.50, volatility: 0.05, category: 'Exchange Token', icon: '🆗' },
            PI: { name: 'Pi Network', price: 0.17, basePrice: 0.17, volatility: 0.1, category: 'Mobile Mining Layer 1', icon: 'π' },
            ONDO: { name: 'Ondo Finance', price: 0.35, basePrice: 0.35, volatility: 0.08, category: 'RWA / Real World Assets', icon: '⚪' },
            ASTER: { name: 'Aster', price: 0.67, basePrice: 0.67, volatility: 0.12, category: 'Ecosystem Token', icon: '✳️' },
            SKY: { name: 'Sky (MakerDAO)', price: 0.07, basePrice: 0.07, volatility: 0.08, category: 'DeFi / Stablecoin', icon: '☁️' },
            PEPE: { name: 'Pepe', price: 0.0000038, basePrice: 0.0000038, volatility: 0.25, category: 'Meme Coin', icon: '🐸' },
            RLUSD: { name: 'Ripple USD', price: 1.00, basePrice: 1.00, volatility: 0.001, category: 'Stablecoin', icon: '💧' },
            USDD: { name: 'USDD', price: 1.00, basePrice: 1.00, volatility: 0.002, category: 'Decentralized Stablecoin', icon: '💵' },
            ETC: { name: 'Ethereum Classic', price: 9.10, basePrice: 9.10, volatility: 0.08, category: 'Smart Contract Platfrom', icon: '⟐' },
            ICP: { name: 'Internet Computer', price: 2.58, basePrice: 2.58, volatility: 0.12, category: 'Decentralized Cloud', icon: '∞' },
            BGB: { name: 'Bitget Token', price: 2.03, basePrice: 2.03, volatility: 0.07, category: 'Exchange Token', icon: '💎' },
            AAVE: { name: 'Aave', price: 91.50, basePrice: 91.50, volatility: 0.1, category: 'DeFi Lending', icon: '👻' },
            DEXE: { name: 'DeXe', price: 13.30, basePrice: 13.30, volatility: 0.15, category: 'DeFi Governance', icon: '📉' },
            KCS: { name: 'KuCoin Token', price: 8.15, basePrice: 8.15, volatility: 0.08, category: 'Exchange Token', icon: '🇰' },
            U: { name: 'United Stables', price: 1.00, basePrice: 1.00, volatility: 0.001, category: 'Stablecoin', icon: '🇺' },
            ALGO: { name: 'Algorand', price: 0.11, basePrice: 0.11, volatility: 0.06, category: 'Smart Contract Platfrom', icon: '∀' },
            ENA: { name: 'Ethena', price: 0.11, basePrice: 0.11, volatility: 0.1, category: 'DeFi Protocol Token', icon: 'Ⓔ' },
            RENDER: { name: 'Render Token', price: 1.85, basePrice: 1.85, volatility: 0.15, category: 'Distributed GPU Compute', icon: '🎨' },
            ATOM: { name: 'Cosmos', price: 1.94, basePrice: 1.94, volatility: 0.08, category: 'Interoperability L1', icon: '⚛' },
            QNT: { name: 'Quant', price: 82.00, basePrice: 82.00, volatility: 0.06, category: 'Enterprise Interoperability', icon: 'Ω' },
            POL: { name: 'Polygon Ecosystem Token', price: 0.09, basePrice: 0.09, volatility: 0.1, category: 'Layer 2 Scaling', icon: '⬢' },
            KAS: { name: 'Kaspa', price: 0.03, basePrice: 0.03, volatility: 0.12, category: 'PoW Layer 1', icon: '🖲️' },
            MORPHO: { name: 'Morpho', price: 1.80, basePrice: 1.80, volatility: 0.15, category: 'DeFi Lending', icon: '🦋' },
            WLD: { name: 'Worldcoin', price: 0.24, basePrice: 0.24, volatility: 0.18, category: 'Identity / AI', icon: '👁️' },
            GT: { name: 'GateToken', price: 7.20, basePrice: 7.20, volatility: 0.06, category: 'Exchange Token', icon: 'Ⓖ' },
            APT: { name: 'Aptos', price: 0.99, basePrice: 0.99, volatility: 0.12, category: 'Smart Contract Platfrom', icon: '🅐' },
            FLR: { name: 'Flare', price: 0.009, basePrice: 0.009, volatility: 0.1, category: 'Data-Centric L1', icon: '☀' },
            STABLE: { name: 'Stable', price: 0.035, basePrice: 0.035, volatility: 0.05, category: 'Ecosystem Token', icon: '⚖️' },
            FIL: { name: 'Filecoin', price: 1.01, basePrice: 1.01, volatility: 0.1, category: 'Decentralized Storage', icon: '⨎' },
            JST: { name: 'JUST', price: 0.09, basePrice: 0.09, volatility: 0.1, category: 'DeFi (TRON Ecosystem)', icon: 'ⓙ' },
            ARB: { name: 'Arbitrum', price: 0.12, basePrice: 0.12, volatility: 0.12, category: 'Layer 2 Scaling', icon: '💙' },
            JUP: { name: 'Jupiter', price: 0.21, basePrice: 0.21, volatility: 0.1, category: 'DeFi Aggregator (Solana)', icon: '🪐' },
            XDC: { name: 'XDC Network', price: 0.03, basePrice: 0.03, volatility: 0.08, category: 'Enterprise Hybrid Blockchain', icon: '🇽' },
            PUMP: { name: 'Pump.fun', price: 0.0018, basePrice: 0.0018, volatility: 0.3, category: 'Meme Launchpad Token', icon: '💊' },
            VVV: { name: 'Venice Token', price: 13.65, basePrice: 13.65, volatility: 0.15, category: 'DeFi Protocol Token', icon: '🎭' },
            H: { name: 'Humanity', price: 0.22, basePrice: 0.22, volatility: 0.1, category: 'Identity Protocol', icon: '👤' },
            VET: { name: 'VeChain', price: 0.007, basePrice: 0.007, volatility: 0.06, category: 'Supply Chain Logistics', icon: '⛓️' },
            BONK: { name: 'Bonk', price: 0.0000065, basePrice: 0.0000065, volatility: 0.2, category: 'Meme Coin (Solana)', icon: '🐕‍🦺' },
            NEXO: { name: 'Nexo', price: 0.88, basePrice: 0.88, volatility: 0.07, category: 'CeFi / Lending Token', icon: 'ⓝ' },
            PENGU: { name: 'Pudgy Penguins', price: 0.008, basePrice: 0.008, volatility: 0.2, category: 'NFT Ecosystem Token', icon: '🐧' },
            DASH: { name: 'Dash', price: 43.50, basePrice: 43.50, volatility: 0.07, category: 'Payments / Privacy', icon: 'Ð' },
            MKR: { name: 'Maker', price: 1625.00, basePrice: 1625.00, volatility: 0.08, category: 'DeFi Governance', icon: 'ℳ' },
            IMX: { name: 'Immutable', price: 1.15, basePrice: 1.15, volatility: 0.1, category: 'Gaming / NFT L2', icon: '🛡️' },
            STX: { name: 'Stacks', price: 0.85, basePrice: 0.85, volatility: 0.09, category: 'Bitcoin Layer 2', icon: '🥞' },
            OP: { name: 'Optimism', price: 1.40, basePrice: 1.40, volatility: 0.12, category: 'Layer 2 Scaling', icon: '🔴' },
            GRT: { name: 'The Graph', price: 0.13, basePrice: 0.13, volatility: 0.1, category: 'Web3 Data Indexing', icon: 'indexer' },
            RUNE: { name: 'THORChain', price: 3.80, basePrice: 3.80, volatility: 0.15, category: 'Cross-Chain DEX', icon: 'ᚱ' },
            LDO: { name: 'Lido DAO', price: 1.05, basePrice: 1.05, volatility: 0.09, category: 'Liquid Staking', icon: '💧' },
            FET: { name: 'Artificial Superintelligence', price: 1.10, basePrice: 1.10, volatility: 0.12, category: 'AI Network', icon: '🤖' },
            RNDR: { name: 'Render', price: 1.82, basePrice: 1.82, volatility: 0.15, category: 'Distributed Graphics', icon: '🎨' },
            EGLD: { name: 'MultiversX', price: 22.40, basePrice: 22.40, volatility: 0.08, category: 'Sharded Layer 1', icon: '⚡' },
            FLOW: { name: 'Flow', price: 0.55, basePrice: 0.55, volatility: 0.1, category: 'Gaming / NFT L1', icon: '🌊' },
            THETA: { name: 'Theta Network', price: 0.95, basePrice: 0.95, volatility: 0.07, category: 'Decentralized Video', icon: '📹' },
            AXS: { name: 'Axie Infinity', price: 4.20, basePrice: 4.20, volatility: 0.15, category: 'Play-to-Earn Gaming', icon: '🐉' },
            SAND: { name: 'The Sandbox', price: 0.28, basePrice: 0.28, volatility: 0.12, category: 'Metaverse Ecosystem', icon: '🏖️' },
            MANA: { name: 'Decentraland', price: 0.31, basePrice: 0.31, volatility: 0.12, category: 'Metaverse Ecosystem', icon: '🏔️' },
            FTM: { name: 'Fantom', price: 0.42, basePrice: 0.42, volatility: 0.09, category: 'Smart Contract Platfrom', icon: '👻' },
            CHZ: { name: 'Chiliz', price: 0.06, basePrice: 0.06, volatility: 0.1, category: 'Sports & Entertainment', icon: '🌶️' },
            EOS: { name: 'EOS', price: 0.48, basePrice: 0.48, volatility: 0.08, category: 'Smart Contract Platfrom', icon: 'ε' },
            IOTA: { name: 'IOTA', price: 0.14, basePrice: 0.14, volatility: 0.07, category: 'Internet of Things DLT', icon: 'ι' },
            ASTR: { name: 'Astar', price: 0.05, basePrice: 0.05, volatility: 0.1, category: 'Multichain Smart Contract', icon: '✨' }
        };

        Object.keys(cryptos).forEach(symbol => {
            cryptos[symbol].priceHistory = [cryptos[symbol].price];
            cryptos[symbol].previousPrice = cryptos[symbol].price;
            cryptos[symbol].change = 0;
        });

        return cryptos;
    }

    /**
     * Fetch real crypto prices (called once at game start)
     */
    async fetchRealPrices() {
        try {
            // Using approximate real prices in USD
            const realPrices = {
                BTC: 67940,    
                ETH: 2600,     
                SOL: 100,      
                DOGE: 0.08,    
                SHIB: 0.00001, 
                PEPE: 0.000005 
            };

            Object.keys(realPrices).forEach(symbol => {
                if (this.cryptos[symbol]) {
                    this.cryptos[symbol].price = realPrices[symbol];
                    this.cryptos[symbol].basePrice = realPrices[symbol];
                    this.cryptos[symbol].previousPrice = realPrices[symbol];
                }
            });

            this.pricesLoaded = true;
            console.log('🪙 Real crypto prices loaded');
            gameState.emit('cryptoPricesLoaded', this.cryptos);

            return true;
        } catch (error) {
            console.error('Failed to fetch crypto prices:', error);
            return false;
        }
    }

    /**
     * Update all crypto prices (high volatility)
     */
    updatePrices() {
        const economyIndex = gameState.get('economy.index') || 1000;
        const playerImpact = gameState.get('economy.playerImpact') || 0;

        const whaleFactor = 1 + (playerImpact / 100) * 2;
        const marketFactor = economyIndex / 1000;

        // Fetch active trading signals from gameState to apply market biases
        const activeSignals = gameState.get('tradingSignals') || [];

        Object.keys(this.cryptos).forEach(symbol => {
            const crypto = this.cryptos[symbol];

            // 1. Check if this asset has a trading signal active
            let signalBulls = 0;
            let signalVolAdd = 0;
            const activeSignal = activeSignals.find(s => s.id === symbol);
            if (activeSignal) {
                if (activeSignal.label === 'MOON 🚀') {
                    signalBulls = 0.30; // Parabolic positive trend bias (30% positive bias per tick) like Dogecoin or Pepe
                    signalVolAdd = 0.20; // Extreme volatility overlay for legendary meme-shots
                } else if (activeSignal.label === 'HOT 🔥') {
                    signalBulls = 0.03; // Strong pump bias (3% positive bias per tick)
                    signalVolAdd = 0.02;
                } else if (activeSignal.label === 'HEAT ⚡') {
                    signalBulls = 0.015; // Moderate pump bias
                } else if (activeSignal.label === 'COOL ❄️') {
                    signalVolAdd = -crypto.volatility * 0.5; // Dampen volatility by 50%
                }
            }

            // 2. Calculate standard price movements with signal overlays
            const luckActive = (gameState.get('donations.luckTicksRemaining') || 0) > 0;
            const luckDrift = luckActive ? 0.035 : 0; // 3.5% upward drift per tick under donation luck for crypto (higher volatility)

            const randomChange = (Math.random() - 0.5 + signalBulls) * 2 * (crypto.volatility + signalVolAdd);
            const meanReversion = (crypto.basePrice - crypto.price) / crypto.basePrice * 0.01;
            const marketInfluence = (marketFactor - 1) * whaleFactor;

            const totalChange = randomChange + meanReversion + marketInfluence + luckDrift;
            const newPrice = crypto.price * (1 + totalChange);

            crypto.previousPrice = crypto.price;
            crypto.price = Math.max(0.0001, newPrice);
            crypto.change = ((crypto.price - crypto.previousPrice) / crypto.previousPrice) * 100;

            // Track history
            if (!crypto.priceHistory) crypto.priceHistory = [crypto.price];
            crypto.priceHistory.push(crypto.price);
            if (crypto.priceHistory.length > 50) crypto.priceHistory.shift();

            if (!crypto.high24h || crypto.price > crypto.high24h) crypto.high24h = crypto.price;
            if (!crypto.low24h || crypto.price < crypto.low24h) crypto.low24h = crypto.price;
        });

        // Check orders and TP/SL
        this.checkPendingOrders();
        this.checkTakeProfitStopLoss();

        gameState.emit('cryptoUpdate', this.cryptos);
    }

    // ========================================
    // MARKET ORDER
    // ========================================

    marketBuy(symbol, amountUSD) {
        const crypto = this.cryptos[symbol];
        if (!crypto) throw new Error('Crypto not found');
        if (amountUSD <= 0) throw new Error('Invalid amount');

        const balance = gameState.getBalance();
        if (amountUSD > balance) throw new Error('Saldo tidak cukup');

        const cryptoAmount = amountUSD / crypto.price;

        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amountUSD
        }));

        this.addToWallet(symbol, cryptoAmount, crypto.price);

        gameState.emit('cryptoBuy', {
            symbol,
            cryptoAmount,
            price: crypto.price,
            totalCost: amountUSD,
            orderType: 'MARKET'
        });

        return { symbol, cryptoAmount, price: crypto.price, totalCost: amountUSD, orderType: 'MARKET' };
    }

    marketSell(symbol, cryptoAmount) {
        const crypto = this.cryptos[symbol];
        if (!crypto) throw new Error('Crypto not found');

        const wallet = gameState.get('crypto') || {};
        const holding = wallet[symbol];

        if (!holding || holding.amount < cryptoAmount) {
            throw new Error('Crypto tidak cukup');
        }

        const totalValueUSD = crypto.price * cryptoAmount;
        const costBasis = holding.avgBuyPrice * cryptoAmount;
        const profit = totalValueUSD - costBasis;
        const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

        financeManager.addIncome(totalValueUSD, 'Crypto Sell', `Sold ${cryptoAmount} ${symbol}`);

        this.removeFromWallet(symbol, cryptoAmount);

        // Record to trade history
        const tradeLog = {
            id: Date.now() + Math.random(),
            asset: symbol,
            assetType: 'crypto',
            amount: cryptoAmount,
            buyPrice: holding.avgBuyPrice,
            sellPrice: crypto.price,
            profit: profit,
            profitPercent: profitPercent,
            timestamp: Date.now(),
            date: `${gameState.get('gameTime.day') || 1}/${gameState.get('gameTime.month') || 1}/${gameState.get('gameTime.year') || 2010}`
        };
        const tradeHistory = gameState.get('tradeHistory') || [];
        tradeHistory.unshift(tradeLog);
        gameState.set('tradeHistory', tradeHistory.slice(0, 100));

        gameState.emit('cryptoSell', {
            symbol,
            cryptoAmount,
            price: crypto.price,
            totalValue: totalValueUSD,
            profit,
            orderType: 'MARKET'
        });

        return { symbol, cryptoAmount, price: crypto.price, totalValue: totalValueUSD, profit, orderType: 'MARKET' };
    }

    // ========================================
    // LIMIT ORDER
    // ========================================

    limitBuy(symbol, amountUSD, limitPrice) {
        const crypto = this.cryptos[symbol];
        if (!crypto) throw new Error('Crypto not found');
        if (amountUSD <= 0) throw new Error('Invalid amount');

        const balance = gameState.getBalance();
        if (amountUSD > balance) throw new Error('Saldo tidak cukup');

        // Reserve balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amountUSD
        }));

        const order = {
            id: Date.now() + Math.random(),
            type: 'LIMIT_BUY',
            symbol,
            amountUSD,
            limitPrice,
            cryptoAmount: amountUSD / limitPrice,
            status: 'PENDING',
            createdAt: Date.now()
        };

        this.pendingOrders.push(order);
        this.savePendingOrders();

        gameState.emit('cryptoLimitOrderCreated', order);
        return order;
    }

    limitSell(symbol, cryptoAmount, limitPrice) {
        const crypto = this.cryptos[symbol];
        if (!crypto) throw new Error('Crypto not found');

        const wallet = gameState.get('crypto') || {};
        const holding = wallet[symbol];

        if (!holding || holding.amount < cryptoAmount) {
            throw new Error('Crypto tidak cukup');
        }

        // Reserve crypto
        holding.reservedAmount = (holding.reservedAmount || 0) + cryptoAmount;
        gameState.set('crypto', wallet);

        const order = {
            id: Date.now() + Math.random(),
            type: 'LIMIT_SELL',
            symbol,
            cryptoAmount,
            limitPrice,
            avgBuyPrice: holding.avgBuyPrice,
            status: 'PENDING',
            createdAt: Date.now()
        };

        this.pendingOrders.push(order);
        this.savePendingOrders();

        gameState.emit('cryptoLimitOrderCreated', order);
        return order;
    }

    checkPendingOrders() {
        const toRemove = [];

        this.pendingOrders.forEach((order, index) => {
            const crypto = this.cryptos[order.symbol];
            if (!crypto) return;

            let executed = false;

            if (order.type === 'LIMIT_BUY' && crypto.price <= order.limitPrice) {
                // Execute at limit price
                const actualAmount = order.amountUSD / order.limitPrice;
                this.addToWallet(order.symbol, actualAmount, order.limitPrice);

                executed = true;
                gameState.emit('cryptoLimitOrderExecuted', { ...order, executedPrice: order.limitPrice });
            }
            else if (order.type === 'LIMIT_SELL' && crypto.price >= order.limitPrice) {
                const totalValue = order.limitPrice * order.cryptoAmount;
                const costBasis = order.avgBuyPrice * order.cryptoAmount;
                const profit = totalValue - costBasis;
                const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

                financeManager.addIncome(totalValue, 'Crypto Sell', `Limit Sell Executed: ${order.cryptoAmount} ${order.symbol}`);

                this.removeFromWallet(order.symbol, order.cryptoAmount, true);

                executed = true;

                // Record to trade history
                const tradeLog = {
                    id: Date.now() + Math.random(),
                    asset: order.symbol,
                    assetType: 'crypto',
                    amount: order.cryptoAmount,
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

                gameState.emit('cryptoLimitOrderExecuted', {
                    ...order,
                    executedPrice: order.limitPrice,
                    profit: profit
                });
            }

            if (executed) toRemove.push(index);
        });

        toRemove.reverse().forEach(i => this.pendingOrders.splice(i, 1));
        if (toRemove.length > 0) this.savePendingOrders();
    }

    cancelLimitOrder(orderId) {
        const index = this.pendingOrders.findIndex(o => o.id === orderId);
        if (index === -1) throw new Error('Order not found');

        const order = this.pendingOrders[index];

        if (order.type === 'LIMIT_BUY') {
            gameState.update('player', p => ({
                ...p,
                balance: p.balance + order.amountUSD
            }));
        } else if (order.type === 'LIMIT_SELL') {
            const wallet = gameState.get('crypto') || {};
            const holding = wallet[order.symbol];
            if (holding) {
                holding.reservedAmount = Math.max(0, (holding.reservedAmount || 0) - order.cryptoAmount);
                gameState.set('crypto', wallet);
            }
        }

        this.pendingOrders.splice(index, 1);
        this.savePendingOrders();

        gameState.emit('cryptoLimitOrderCancelled', order);
        return order;
    }

    // ========================================
    // TAKE PROFIT / STOP LOSS
    // ========================================

    setTakeProfit(symbol, targetPrice) {
        const wallet = gameState.get('crypto') || {};
        const holding = wallet[symbol];
        if (!holding) throw new Error('Tidak punya crypto ini');

        holding.takeProfit = targetPrice;
        gameState.set('crypto', wallet);

        gameState.emit('cryptoTpslSet', { symbol, type: 'TP', price: targetPrice });
        return { symbol, takeProfit: targetPrice };
    }

    setStopLoss(symbol, targetPrice) {
        const wallet = gameState.get('crypto') || {};
        const holding = wallet[symbol];
        if (!holding) throw new Error('Tidak punya crypto ini');

        holding.stopLoss = targetPrice;
        gameState.set('crypto', wallet);

        gameState.emit('cryptoTpslSet', { symbol, type: 'SL', price: targetPrice });
        return { symbol, stopLoss: targetPrice };
    }

    checkTakeProfitStopLoss() {
        const wallet = gameState.get('crypto') || {};

        Object.entries(wallet).forEach(([symbol, holding]) => {
            const crypto = this.cryptos[symbol];
            if (!crypto || holding.amount <= 0) return;

            const availableAmount = holding.amount - (holding.reservedAmount || 0);

            if (holding.takeProfit && crypto.price >= holding.takeProfit) {
                if (availableAmount > 0) {
                    try {
                        const result = this.marketSell(symbol, availableAmount);
                        gameState.emit('cryptoTakeProfitTriggered', { symbol, ...result });
                    } catch (e) {
                        console.error('Crypto TP failed:', e);
                    }
                }
                delete holding.takeProfit;
                gameState.set('crypto', wallet);
            }
            else if (holding.stopLoss && crypto.price <= holding.stopLoss) {
                if (availableAmount > 0) {
                    try {
                        const result = this.marketSell(symbol, availableAmount);
                        gameState.emit('cryptoStopLossTriggered', { symbol, ...result });
                    } catch (e) {
                        console.error('Crypto SL failed:', e);
                    }
                }
                delete holding.stopLoss;
                gameState.set('crypto', wallet);
            }
        });
    }

    // ========================================
    // WALLET HELPERS
    // ========================================

    addToWallet(symbol, amount, price) {
        const wallet = gameState.get('crypto') || {};
        if (!wallet[symbol]) {
            wallet[symbol] = { amount: 0, avgBuyPrice: 0, totalInvested: 0 };
        }

        const existing = wallet[symbol];
        const newTotal = existing.amount + amount;
        const newInvested = existing.totalInvested + (price * amount);

        wallet[symbol] = {
            ...existing,
            amount: newTotal,
            avgBuyPrice: newInvested / newTotal,
            totalInvested: newInvested
        };

        gameState.set('crypto', wallet);
    }

    removeFromWallet(symbol, amount, fromReserved = false) {
        const wallet = gameState.get('crypto') || {};
        const holding = wallet[symbol];
        if (!holding) return;

        holding.amount -= amount;
        holding.totalInvested -= (holding.avgBuyPrice * amount);

        if (fromReserved) {
            holding.reservedAmount = Math.max(0, (holding.reservedAmount || 0) - amount);
        }

        if (holding.amount <= 0.00000001) {
            delete wallet[symbol];
        }

        gameState.set('crypto', wallet);
    }

    savePendingOrders() {
        gameState.set('cryptoPendingOrders', this.pendingOrders);
    }

    loadPendingOrders() {
        this.pendingOrders = gameState.get('cryptoPendingOrders') || [];
    }

    // ========================================
    // GETTERS
    // ========================================

    getCrypto(symbol) {
        return this.cryptos[symbol];
    }

    getAllCryptos() {
        return Object.entries(this.cryptos).map(([symbol, data]) => ({
            symbol,
            ...data
        }));
    }

    getWallet() {
        const wallet = gameState.get('crypto') || {};
        const holdings = [];

        Object.entries(wallet).forEach(([symbol, data]) => {
            const crypto = this.cryptos[symbol];
            if (crypto && data.amount > 0) {
                const currentValue = crypto.price * data.amount;
                const profit = currentValue - data.totalInvested;
                const profitPercent = data.totalInvested > 0 ? (profit / data.totalInvested) * 100 : 0;

                holdings.push({
                    symbol,
                    name: crypto.name,
                    icon: crypto.icon,
                    amount: data.amount,
                    reservedAmount: data.reservedAmount || 0,
                    avgBuyPrice: data.avgBuyPrice,
                    currentPrice: crypto.price,
                    totalInvested: data.totalInvested,
                    currentValue,
                    profit,
                    profitPercent,
                    takeProfit: data.takeProfit,
                    stopLoss: data.stopLoss
                });
            }
        });

        return holdings;
    }

    getPendingOrders() {
        return this.pendingOrders;
    }

    getWalletValue() {
        return this.getWallet().reduce((sum, h) => sum + h.currentValue, 0);
    }

    formatAmount(amount) {
        if (amount >= 1) return amount.toFixed(4);
        if (amount >= 0.0001) return amount.toFixed(6);
        return amount.toFixed(8);
    }

    formatPrice(price) {
        if (price >= 1000) return '$ ' + new Intl.NumberFormat('id-ID').format(Math.round(price));
        if (price >= 1) return '$ ' + price.toFixed(2);
        return '$ ' + price.toFixed(6);
    }

    startUpdates(intervalMs = 3000) {
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
}

export const cryptoMarket = new CryptoMarket();
export default cryptoMarket;
