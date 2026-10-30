/**
 * CryptoMarket.js - Enhanced Cryptocurrency Trading
 * Market/Limit Orders, TP/SL, Real Price Integration
 */

import gameState from '../core/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import newsManager from '../core/NewsManager.js';
import { initMarketStateRealtime } from '../core/SupabaseClient.js';
import patternTrajectoryManager from './PatternTrajectoryManager.js';

class CryptoMarket {
    constructor() {
        this.cryptos = this.initializeCryptos();
        this.pendingOrders = [];
        this.updateInterval = null;
        this.pricesLoaded = false;

        // Connect to Supabase Realtime for live multi-device market state synchronization
        try {
            initMarketStateRealtime(null, (serverState) => {
                if (serverState?.symbol && this.cryptos[serverState.symbol]) {
                    const c = this.cryptos[serverState.symbol];
                    if (serverState.last_price) {
                        c.previousPrice = c.price;
                        c.price = Number(serverState.last_price);
                        if (serverState.previous_close) c.basePrice = Number(serverState.previous_close);
                        if (serverState.high_24h) c.high24h = Number(serverState.high_24h);
                        if (serverState.low_24h) c.low24h = Number(serverState.low_24h);
                        if (serverState.volume_24h) c.volume24h = Number(serverState.volume_24h);
                        c.change = ((c.price - c.basePrice) / (c.basePrice || 1)) * 100;
                        if (!c.priceHistory) c.priceHistory = [];
                        c.priceHistory.push(c.price);
                        if (c.priceHistory.length > 300) c.priceHistory.shift();
                        gameState.emit('cryptoUpdate', this.cryptos);
                    }
                }
            });
        } catch (e) {
            console.warn('[CryptoMarket] Supabase Realtime init note:', e.message);
        }
    }

    initializeCryptos() {
        const cryptos = {
            BTC: { name: 'Bitcoin', price: 79200.00, basePrice: 79200.00, volatility: 0.05, sector: 'Layer 1 (L1)', category: 'Store of Value / L1', icon: '₿' },
            ETH: { name: 'Ethereum', price: 2225.00, basePrice: 2225.00, volatility: 0.06, sector: 'Layer 1 (L1)', category: 'Smart Contract Platform', icon: 'Ξ' },
            USDT: { name: 'Tether', price: 1.00, basePrice: 1.00, volatility: 0.001, sector: 'Stablecoin & RWA', category: 'Fiat Stablecoin', icon: '₮' },
            BNB: { name: 'BNB', price: 674.00, basePrice: 674.00, volatility: 0.04, sector: 'Exchange & CeFi', category: 'Ecosystem / Exchange Token', icon: '🔶' },
            XRP: { name: 'XRP', price: 1.45, basePrice: 1.45, volatility: 0.08, sector: 'Payments & Privacy', category: 'Cross-Border Payments', icon: '✕' },
            USDC: { name: 'USD Coin', price: 1.00, basePrice: 1.00, volatility: 0.001, sector: 'Stablecoin & RWA', category: 'Fiat Stablecoin', icon: '₵' },
            SOL: { name: 'Solana', price: 89.50, basePrice: 89.50, volatility: 0.1, sector: 'Layer 1 (L1)', category: 'High-Speed Smart Contract L1', icon: '◎' },
            TRX: { name: 'TRON', price: 0.35, basePrice: 0.35, volatility: 0.05, sector: 'DeFi & Staking', category: 'DeFi / Settlement L1', icon: '💎' },
            DOGE: { name: 'Dogecoin', price: 0.11, basePrice: 0.11, volatility: 0.15, sector: 'Meme Coin', category: 'PoW Meme Coin', icon: '🐕' },
            HYPE: { name: 'Hyperliquid', price: 44.15, basePrice: 44.15, volatility: 0.12, sector: 'DeFi & Staking', category: 'Perp DEX / DeFi L1', icon: '⚡' },
            ADA: { name: 'Cardano', price: 0.26, basePrice: 0.26, volatility: 0.06, sector: 'Layer 1 (L1)', category: 'Smart Contract Platform', icon: '₳' },
            LEO: { name: 'UNUS SED LEO', price: 10.15, basePrice: 10.15, volatility: 0.03, sector: 'Exchange & CeFi', category: 'Exchange Utility Token', icon: '🦁' },
            ZEC: { name: 'Zcash', price: 515.00, basePrice: 515.00, volatility: 0.08, sector: 'Payments & Privacy', category: 'Zero-Knowledge Privacy', icon: 'ⓩ' },
            BCH: { name: 'Bitcoin Cash', price: 425.00, basePrice: 425.00, volatility: 0.07, sector: 'Payments & Privacy', category: 'Peer-to-Peer Payments', icon: '฿' },
            LINK: { name: 'Chainlink', price: 10.05, basePrice: 10.05, volatility: 0.06, sector: 'DePIN, Cloud & Infra', category: 'Decentralized Oracle', icon: '⬡' },
            XMR: { name: 'Monero', price: 380.00, basePrice: 380.00, volatility: 0.05, sector: 'Payments & Privacy', category: 'Privacy Coin', icon: 'ɱ' },
            CC: { name: 'Canton Network', price: 0.16, basePrice: 0.16, volatility: 0.09, sector: 'DePIN, Cloud & Infra', category: 'Enterprise Blockchain', icon: '🌐' },
            DAI: { name: 'Dai', price: 1.00, basePrice: 1.00, volatility: 0.002, sector: 'Stablecoin & RWA', category: 'Decentralized Stablecoin', icon: '◈' },
            TON: { name: 'Toncoin', price: 1.95, basePrice: 1.95, volatility: 0.08, sector: 'Layer 1 (L1)', category: 'Social Ecosystem L1', icon: '💎' },
            XLM: { name: 'Stellar', price: 0.15, basePrice: 0.15, volatility: 0.06, sector: 'Payments & Privacy', category: 'Cross-Border Payments', icon: '🚀' },
            USD1: { name: 'World Liberty Financial USD', price: 1.00, basePrice: 1.00, volatility: 0.001, sector: 'Stablecoin & RWA', category: 'Fiat Stablecoin', icon: '🇺🇸' },
            LTC: { name: 'Litecoin', price: 57.00, basePrice: 57.00, volatility: 0.05, sector: 'Payments & Privacy', category: 'Digital Silver / Payments', icon: 'Ł' },
            SUI: { name: 'Sui', price: 1.08, basePrice: 1.08, volatility: 0.12, sector: 'Layer 1 (L1)', category: 'Move Smart Contract L1', icon: '💧' },
            USDe: { name: 'Ethena USDe', price: 1.00, basePrice: 1.00, volatility: 0.005, sector: 'Stablecoin & RWA', category: 'Synthetic Dollar', icon: 'Ⓢ' },
            M: { name: 'MemeCore', price: 3.25, basePrice: 3.25, volatility: 0.2, sector: 'Meme Coin', category: 'Meme Culture L1', icon: 'Ⓜ️' },
            AVAX: { name: 'Avalanche', price: 9.50, basePrice: 9.50, volatility: 0.09, sector: 'Layer 1 (L1)', category: 'Subnet Smart Contract L1', icon: '🔺' },
            HBAR: { name: 'Hedera', price: 0.09, basePrice: 0.09, volatility: 0.06, sector: 'DePIN, Cloud & Infra', category: 'Enterprise Hashgraph DLT', icon: 'ℏ' },
            SHIB: { name: 'Shiba Inu', price: 0.000006, basePrice: 0.000006, volatility: 0.2, sector: 'Meme Coin', category: 'Ecosystem Meme Coin', icon: '🐕' },
            PYUSD: { name: 'PayPal USD', price: 1.00, basePrice: 1.00, volatility: 0.001, sector: 'Stablecoin & RWA', category: 'Fintech Stablecoin', icon: '🅿️' },
            CRO: { name: 'Cronos', price: 0.07, basePrice: 0.07, volatility: 0.08, sector: 'Exchange & CeFi', category: 'Exchange / Cronos Chain', icon: '🔵' },
            TAO: { name: 'Bittensor', price: 275.00, basePrice: 275.00, volatility: 0.15, sector: 'AI & Big Data', category: 'Decentralized AI Network', icon: 'τ' },
            USDG: { name: 'Global Dollar', price: 1.00, basePrice: 1.00, volatility: 0.001, sector: 'Stablecoin & RWA', category: 'Regulated Stablecoin', icon: '🌎' },
            XAUt: { name: 'Tether Gold', price: 4535.00, basePrice: 4535.00, volatility: 0.01, sector: 'Stablecoin & RWA', category: 'Tokenized Gold (RWA)', icon: '🟡' },
            UNI: { name: 'Uniswap', price: 3.58, basePrice: 3.58, volatility: 0.09, sector: 'DeFi & Staking', category: 'AMM DEX Governance', icon: '🦄' },
            DOT: { name: 'Polkadot', price: 1.28, basePrice: 1.28, volatility: 0.07, sector: 'Layer 2 & Interop', category: 'Multichain Interoperability', icon: '●' },
            MNT: { name: 'Mantle', price: 0.65, basePrice: 0.65, volatility: 0.1, sector: 'Layer 2 & Interop', category: 'Modular Ethereum L2', icon: 'Ⓜ️' },
            PAXG: { name: 'PAX Gold', price: 4540.00, basePrice: 4540.00, volatility: 0.01, sector: 'Stablecoin & RWA', category: 'Tokenized Gold (RWA)', icon: '📀' },
            WLFI: { name: 'World Liberty Financial', price: 0.06, basePrice: 0.06, volatility: 0.15, sector: 'DeFi & Staking', category: 'DeFi Governance Token', icon: '🗽' },
            NEAR: { name: 'NEAR Protocol', price: 1.52, basePrice: 1.52, volatility: 0.1, sector: 'Layer 1 (L1)', category: 'Sharded AI-Ready L1', icon: 'Ⓝ' },
            OKB: { name: 'OKB', price: 84.50, basePrice: 84.50, volatility: 0.05, sector: 'Exchange & CeFi', category: 'Exchange Utility Token', icon: '🆗' },
            PI: { name: 'Pi Network', price: 0.17, basePrice: 0.17, volatility: 0.1, sector: 'Layer 1 (L1)', category: 'Mobile Mining Layer 1', icon: 'π' },
            ONDO: { name: 'Ondo Finance', price: 0.35, basePrice: 0.35, volatility: 0.08, sector: 'Stablecoin & RWA', category: 'Institutional RWA Yield', icon: '⚪' },
            ASTER: { name: 'Aster', price: 0.67, basePrice: 0.67, volatility: 0.12, sector: 'DeFi & Staking', category: 'Derivatives & Yield DeFi', icon: '✳️' },
            SKY: { name: 'Sky (MakerDAO)', price: 0.07, basePrice: 0.07, volatility: 0.08, sector: 'DeFi & Staking', category: 'DeFi CDP & Stablecoin', icon: '☁️' },
            PEPE: { name: 'Pepe', price: 0.0000038, basePrice: 0.0000038, volatility: 0.25, sector: 'Meme Coin', category: 'Ethereum Meme Coin', icon: '🐸' },
            RLUSD: { name: 'Ripple USD', price: 1.00, basePrice: 1.00, volatility: 0.001, sector: 'Stablecoin & RWA', category: 'Enterprise Stablecoin', icon: '💧' },
            USDD: { name: 'USDD', price: 1.00, basePrice: 1.00, volatility: 0.002, sector: 'Stablecoin & RWA', category: 'Over-Collateralized Stablecoin', icon: '💵' },
            ETC: { name: 'Ethereum Classic', price: 9.10, basePrice: 9.10, volatility: 0.08, sector: 'Layer 1 (L1)', category: 'PoW Smart Contract L1', icon: '⟐' },
            ICP: { name: 'Internet Computer', price: 2.58, basePrice: 2.58, volatility: 0.12, sector: 'DePIN, Cloud & Infra', category: 'Decentralized Cloud Compute', icon: '∞' },
            BGB: { name: 'Bitget Token', price: 2.03, basePrice: 2.03, volatility: 0.07, sector: 'Exchange & CeFi', category: 'Exchange Utility Token', icon: '💎' },
            AAVE: { name: 'Aave', price: 91.50, basePrice: 91.50, volatility: 0.1, sector: 'DeFi & Staking', category: 'DeFi Liquidity & Lending', icon: '👻' },
            DEXE: { name: 'DeXe', price: 13.30, basePrice: 13.30, volatility: 0.15, sector: 'DeFi & Staking', category: 'DAO & Social Trading DeFi', icon: '📉' },
            KCS: { name: 'KuCoin Token', price: 8.15, basePrice: 8.15, volatility: 0.08, sector: 'Exchange & CeFi', category: 'Exchange Revenue Share', icon: '🇰' },
            U: { name: 'United Stables', price: 1.00, basePrice: 1.00, volatility: 0.001, sector: 'Stablecoin & RWA', category: 'Fiat Stablecoin', icon: '🇺' },
            ALGO: { name: 'Algorand', price: 0.11, basePrice: 0.11, volatility: 0.06, sector: 'Layer 1 (L1)', category: 'Pure PoS Smart Contract L1', icon: '∀' },
            ENA: { name: 'Ethena', price: 0.11, basePrice: 0.11, volatility: 0.1, sector: 'DeFi & Staking', category: 'Synthetic Dollar Protocol', icon: 'Ⓔ' },
            RENDER: { name: 'Render Token', price: 1.85, basePrice: 1.85, volatility: 0.15, sector: 'AI & Big Data', category: 'Distributed GPU Compute', icon: '🎨' },
            ATOM: { name: 'Cosmos', price: 1.94, basePrice: 1.94, volatility: 0.08, sector: 'Layer 2 & Interop', category: 'IBC Interoperability Hub', icon: '⚛' },
            QNT: { name: 'Quant', price: 82.00, basePrice: 82.00, volatility: 0.06, sector: 'Layer 2 & Interop', category: 'Enterprise Interoperability', icon: 'Ω' },
            POL: { name: 'Polygon Ecosystem Token', price: 0.09, basePrice: 0.09, volatility: 0.1, sector: 'Layer 2 & Interop', category: 'ZK Layer 2 Scaling', icon: '⬢' },
            KAS: { name: 'Kaspa', price: 0.03, basePrice: 0.03, volatility: 0.12, sector: 'Layer 1 (L1)', category: 'BlockDAG PoW Layer 1', icon: '🖲️' },
            MORPHO: { name: 'Morpho', price: 1.80, basePrice: 1.80, volatility: 0.15, sector: 'DeFi & Staking', category: 'Modular DeFi Lending', icon: '🦋' },
            WLD: { name: 'Worldcoin', price: 0.24, basePrice: 0.24, volatility: 0.18, sector: 'AI & Big Data', category: 'Proof-of-Personhood & AI', icon: '👁️' },
            GT: { name: 'GateToken', price: 7.20, basePrice: 7.20, volatility: 0.06, sector: 'Exchange & CeFi', category: 'Exchange Utility Token', icon: 'Ⓖ' },
            APT: { name: 'Aptos', price: 0.99, basePrice: 0.99, volatility: 0.12, sector: 'Layer 1 (L1)', category: 'Move Smart Contract L1', icon: '🅐' },
            FLR: { name: 'Flare', price: 0.009, basePrice: 0.009, volatility: 0.1, sector: 'AI & Big Data', category: 'Data-Centric Oracle L1', icon: '☀' },
            STABLE: { name: 'Stable', price: 0.035, basePrice: 0.035, volatility: 0.05, sector: 'Stablecoin & RWA', category: 'Stablecoin Liquidity Protocol', icon: '⚖️' },
            FIL: { name: 'Filecoin', price: 1.01, basePrice: 1.01, volatility: 0.1, sector: 'DePIN, Cloud & Infra', category: 'Decentralized Storage Network', icon: '⨎' },
            JST: { name: 'JUST', price: 0.09, basePrice: 0.09, volatility: 0.1, sector: 'DeFi & Staking', category: 'TRON DeFi Lending', icon: 'ⓙ' },
            ARB: { name: 'Arbitrum', price: 0.12, basePrice: 0.12, volatility: 0.12, sector: 'Layer 2 & Interop', category: 'Optimistic Rollup L2', icon: '💙' },
            JUP: { name: 'Jupiter', price: 0.21, basePrice: 0.21, volatility: 0.1, sector: 'DeFi & Staking', category: 'Solana DEX Aggregator', icon: '🪐' },
            XDC: { name: 'XDC Network', price: 0.03, basePrice: 0.03, volatility: 0.08, sector: 'DePIN, Cloud & Infra', category: 'Trade Finance Hybrid DLT', icon: '🇽' },
            PUMP: { name: 'Pump.fun', price: 0.0018, basePrice: 0.0018, volatility: 0.3, sector: 'Meme Coin', category: 'Meme Token Launchpad', icon: '💊' },
            VVV: { name: 'Venice Token', price: 13.65, basePrice: 13.65, volatility: 0.15, sector: 'AI & Big Data', category: 'Uncensored AI Inference', icon: '🎭' },
            H: { name: 'Humanity', price: 0.22, basePrice: 0.22, volatility: 0.1, sector: 'DePIN, Cloud & Infra', category: 'Biometric Identity Protocol', icon: '👤' },
            VET: { name: 'VeChain', price: 0.007, basePrice: 0.007, volatility: 0.06, sector: 'DePIN, Cloud & Infra', category: 'Supply Chain Logistics', icon: '⛓️' },
            BONK: { name: 'Bonk', price: 0.0000065, basePrice: 0.0000065, volatility: 0.2, sector: 'Meme Coin', category: 'Solana Community Meme', icon: '🐕‍🦺' },
            NEXO: { name: 'Nexo', price: 0.88, basePrice: 0.88, volatility: 0.07, sector: 'Exchange & CeFi', category: 'CeFi Wealth & Lending', icon: 'ⓝ' },
            PENGU: { name: 'Pudgy Penguins', price: 0.008, basePrice: 0.008, volatility: 0.2, sector: 'Gaming, NFT & Metaverse', category: 'NFT IP & Consumer Brand', icon: '🐧' },
            DASH: { name: 'Dash', price: 43.50, basePrice: 43.50, volatility: 0.07, sector: 'Payments & Privacy', category: 'Instant Digital Cash', icon: 'Ð' },
            MKR: { name: 'Maker', price: 1625.00, basePrice: 1625.00, volatility: 0.08, sector: 'DeFi & Staking', category: 'DeFi Credit & Reserve', icon: 'ℳ' },
            IMX: { name: 'Immutable', price: 1.15, basePrice: 1.15, volatility: 0.1, sector: 'Gaming, NFT & Metaverse', category: 'Web3 Gaming ZK L2', icon: '🛡️' },
            STX: { name: 'Stacks', price: 0.85, basePrice: 0.85, volatility: 0.09, sector: 'Layer 2 & Interop', category: 'Bitcoin Smart Contract L2', icon: '🥞' },
            OP: { name: 'Optimism', price: 1.40, basePrice: 1.40, volatility: 0.12, sector: 'Layer 2 & Interop', category: 'Superchain Rollup L2', icon: '🔴' },
            GRT: { name: 'The Graph', price: 0.13, basePrice: 0.13, volatility: 0.1, sector: 'AI & Big Data', category: 'Web3 Data Indexing', icon: '🔎' },
            RUNE: { name: 'THORChain', price: 3.80, basePrice: 3.80, volatility: 0.15, sector: 'DeFi & Staking', category: 'Native Cross-Chain DEX', icon: 'ᚱ' },
            LDO: { name: 'Lido DAO', price: 1.05, basePrice: 1.05, volatility: 0.09, sector: 'DeFi & Staking', category: 'Liquid Staking Protocol', icon: '💧' },
            FET: { name: 'Artificial Superintelligence', price: 1.10, basePrice: 1.10, volatility: 0.12, sector: 'AI & Big Data', category: 'Autonomous AI Agents', icon: '🤖' },
            RNDR: { name: 'Render', price: 1.82, basePrice: 1.82, volatility: 0.15, sector: 'AI & Big Data', category: '3D & AI GPU Rendering', icon: '🎨' },
            EGLD: { name: 'MultiversX', price: 22.40, basePrice: 22.40, volatility: 0.08, sector: 'Layer 1 (L1)', category: 'Adaptive Sharded L1', icon: '⚡' },
            FLOW: { name: 'Flow', price: 0.55, basePrice: 0.55, volatility: 0.1, sector: 'Gaming, NFT & Metaverse', category: 'Consumer NFT & Gaming L1', icon: '🌊' },
            THETA: { name: 'Theta Network', price: 0.95, basePrice: 0.95, volatility: 0.07, sector: 'DePIN, Cloud & Infra', category: 'Decentralized Video & Edge', icon: '📹' },
            AXS: { name: 'Axie Infinity', price: 4.20, basePrice: 4.20, volatility: 0.15, sector: 'Gaming, NFT & Metaverse', category: 'Play-to-Earn Gaming', icon: '🐉' },
            SAND: { name: 'The Sandbox', price: 0.28, basePrice: 0.28, volatility: 0.12, sector: 'Gaming, NFT & Metaverse', category: 'Voxel Metaverse World', icon: '🏖️' },
            MANA: { name: 'Decentraland', price: 0.31, basePrice: 0.31, volatility: 0.12, sector: 'Gaming, NFT & Metaverse', category: 'Virtual Social Metaverse', icon: '🏔️' },
            FTM: { name: 'Fantom', price: 0.42, basePrice: 0.42, volatility: 0.09, sector: 'Layer 1 (L1)', category: 'DAG Smart Contract L1', icon: '👻' },
            CHZ: { name: 'Chiliz', price: 0.06, basePrice: 0.06, volatility: 0.1, sector: 'Gaming, NFT & Metaverse', category: 'Sports Fan Token Chain', icon: '🌶️' },
            EOS: { name: 'EOS', price: 0.48, basePrice: 0.48, volatility: 0.08, sector: 'Layer 1 (L1)', category: 'WebAssembly Smart Contract L1', icon: 'ε' },
            IOTA: { name: 'IOTA', price: 0.14, basePrice: 0.14, volatility: 0.07, sector: 'DePIN, Cloud & Infra', category: 'IoT Tangle DLT', icon: 'ι' },
            ASTR: { name: 'Astar', price: 0.05, basePrice: 0.05, volatility: 0.1, sector: 'Layer 2 & Interop', category: 'Multichain Wasm & EVM', icon: '✨' },
            AURA: { name: 'Aura Network', price: 1.00, basePrice: 1.00, volatility: 0.12, sector: 'Layer 1 (L1)', category: 'Cosmos Ecosystem L1', icon: '🌌' },
            NEX: { name: 'Nexus AI', price: 2.50, basePrice: 2.50, volatility: 0.15, sector: 'AI & Big Data', category: 'AI Computing Network', icon: '🧬' }
        };

        Object.keys(cryptos).forEach(symbol => {
            cryptos[symbol].symbol = symbol;
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
     * Update all crypto prices (Micro-tick realistic brownian motion + reactive news & volume)
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
                    signalBulls = 0.25; // Continuous bullish impulse
                    signalVolAdd = 0.04;
                } else if (activeSignal.label === 'HOT 🔥') {
                    signalBulls = 0.10;
                    signalVolAdd = 0.02;
                } else if (activeSignal.label === 'HEAT ⚡') {
                    signalBulls = 0.05;
                    signalVolAdd = 0.01;
                } else if (activeSignal.label === 'COOL ❄️') {
                    signalVolAdd = -crypto.volatility * 0.4; // Dampen volatility
                }
            }

            // 2. Structured technical pattern trajectory & waypoints (H&S, Triangles, Doji consolidation)
            const patternInfo = patternTrajectoryManager.getPatternDrift(symbol, crypto, crypto.price);
            const patternDrift = patternInfo.drift;
            crypto.activePattern = patternInfo.pattern;

            // 3. Scaled micro-tick volatility (~0.05% to ~0.20% per 4-second tick, dampened during Doji)
            // Daily volatility (0.05 for BTC, 0.25 for PEPE) is converted to per-tick standard deviation
            const tickScale = 0.025; 
            const volDampener = patternInfo.volatilityScale || 1.0;
            const scaledVol = Math.max(0.0005, (crypto.volatility + signalVolAdd) * tickScale * volDampener);
            const brownianMotion = (Math.random() - 0.5) * 2 * scaledVol;

            // 4. Signal drift (e.g. MOON gives steady +0.12% per tick)
            const signalDrift = signalBulls * 0.005;

            // 5. Directional drift from active crypto breaking news (accelerated 3x pacing)
            const newsDrift = newsManager.getCryptoPriceBias(symbol, crypto.sector, crypto.category);

            // 6. Gentle mean reversion towards basePrice to maintain realistic daily trading channels
            const meanReversion = ((crypto.basePrice - crypto.price) / (crypto.basePrice || 1)) * 0.002;

            // 7. Macro economy & luck drift
            const luckActive = (gameState.get('donations.luckTicksRemaining') || 0) > 0;
            const luckDrift = luckActive ? 0.0008 : 0;
            const marketInfluence = (marketFactor - 1) * 0.0004 * whaleFactor;

            // 8. Recent order flow imbalance (from active player & simulated market trades)
            const orderImbalance = (crypto.recentBuyVolume || 0) - (crypto.recentSellVolume || 0);
            const orderFlowDrift = Math.max(-0.003, Math.min(0.003, orderImbalance / 20000000));
            // Decay recent order flow volumes over time
            crypto.recentBuyVolume = (crypto.recentBuyVolume || 0) * 0.88;
            crypto.recentSellVolume = (crypto.recentSellVolume || 0) * 0.88;

            const totalChange = brownianMotion + signalDrift + newsDrift + meanReversion + marketInfluence + luckDrift + orderFlowDrift + patternDrift;
            const newPrice = Math.max(0.0001, crypto.price * (1 + totalChange));

            crypto.previousPrice = crypto.price;
            crypto.price = newPrice;

            // Real 24h Change based on basePrice (daily reference)
            crypto.change = ((crypto.price - crypto.basePrice) / (crypto.basePrice || 1)) * 100;

            // Track 24h High & Low
            if (!crypto.high24h || crypto.price > crypto.high24h) crypto.high24h = crypto.price;
            if (!crypto.low24h || crypto.price < crypto.low24h) crypto.low24h = crypto.price;

            // Track 24h Volume (seed realistic baseline volume if not present)
            if (!crypto.volume24h) {
                const multiplier = crypto.price > 1000 ? 500000 : 2500000;
                crypto.volume24h = Math.round(crypto.price * multiplier * (0.8 + Math.random() * 0.4));
            }

            // Track history
            if (!crypto.priceHistory) crypto.priceHistory = [crypto.price];
            crypto.priceHistory.push(crypto.price);
            if (crypto.priceHistory.length > 300) crypto.priceHistory.shift();
        });

        // Check orders and TP/SL
        this.checkPendingOrders();
        this.checkTakeProfitStopLoss();

        gameState.emit('cryptoUpdate', this.cryptos);
    }

    /**
     * Daily rollover reset (resets 24h High, Low, and anchors basePrice to today's open)
     */
    onDayPass() {
        Object.keys(this.cryptos).forEach(sym => {
            const c = this.cryptos[sym];
            c.basePrice = c.price;
            c.high24h = c.price;
            c.low24h = c.price;
            c.change = 0;
            const multiplier = c.price > 1000 ? 500000 : 2500000;
            c.volume24h = Math.round(c.price * multiplier * (0.8 + Math.random() * 0.4));
        });
    }

    // ========================================
    // MARKET ORDER (Real volume & price impact)
    // ========================================

    marketBuy(symbol, amountUSD) {
        if (!symbol) throw new Error('Crypto not found');
        const cKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const crypto = this.cryptos[cKey] || this.cryptos[symbol];
        if (!crypto) throw new Error('Crypto not found');
        if (amountUSD <= 0) throw new Error('Invalid amount');

        const balance = gameState.getBalance();
        if (amountUSD > balance) throw new Error('Saldo tidak cukup');

        // Immediate price impact from buy volume (slippage / taking ask liquidity)
        const liquidityDepth = (crypto.price > 1000) ? 50000000 : 5000000;
        const impact = Math.min(0.035, (amountUSD / liquidityDepth) * 0.2);
        if (impact > 0.00001) {
            crypto.previousPrice = crypto.price;
            crypto.price = crypto.price * (1 + impact);
            crypto.change = ((crypto.price - crypto.basePrice) / (crypto.basePrice || 1)) * 100;
            if (crypto.price > (crypto.high24h || crypto.price)) crypto.high24h = crypto.price;
            if (!crypto.priceHistory) crypto.priceHistory = [];
            crypto.priceHistory.push(crypto.price);
            if (crypto.priceHistory.length > 300) crypto.priceHistory.shift();
        }

        const cryptoAmount = amountUSD / crypto.price;

        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amountUSD
        }));

        const actualSymbol = crypto.symbol || cKey;
        this.addToWallet(actualSymbol, cryptoAmount, crypto.price);

        // Accumulate 24h volume & buy order pressure
        crypto.volume24h = (crypto.volume24h || (crypto.price * 50000)) + amountUSD;
        crypto.recentBuyVolume = (crypto.recentBuyVolume || 0) + amountUSD;

        gameState.emit('cryptoBuy', {
            symbol: actualSymbol,
            cryptoAmount,
            price: crypto.price,
            totalCost: amountUSD,
            orderType: 'MARKET'
        });

        return { symbol: actualSymbol, cryptoAmount, price: crypto.price, totalCost: amountUSD, orderType: 'MARKET' };
    }

    marketSell(symbol, cryptoAmount) {
        if (!symbol) throw new Error('Crypto not found');
        const cKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const crypto = this.cryptos[cKey] || this.cryptos[symbol];
        if (!crypto) throw new Error('Crypto not found');

        const actualSymbol = crypto.symbol || cKey;
        const wallet = gameState.get('crypto') || {};
        const holding = wallet[actualSymbol] || wallet[symbol];

        if (!holding || holding.amount < cryptoAmount) {
            throw new Error('Crypto tidak cukup');
        }

        const totalValueUSD = crypto.price * cryptoAmount;

        // Immediate price impact from sell volume (slippage / hitting bid liquidity)
        const liquidityDepth = (crypto.price > 1000) ? 50000000 : 5000000;
        const impact = Math.min(0.035, (totalValueUSD / liquidityDepth) * 0.2);
        if (impact > 0.00001) {
            crypto.previousPrice = crypto.price;
            crypto.price = Math.max(0.0001, crypto.price * (1 - impact));
            crypto.change = ((crypto.price - crypto.basePrice) / (crypto.basePrice || 1)) * 100;
            if (crypto.price < (crypto.low24h || crypto.price)) crypto.low24h = crypto.price;
            if (!crypto.priceHistory) crypto.priceHistory = [];
            crypto.priceHistory.push(crypto.price);
            if (crypto.priceHistory.length > 300) crypto.priceHistory.shift();
        }

        const costBasis = holding.avgBuyPrice * cryptoAmount;
        const profit = totalValueUSD - costBasis;
        const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

        financeManager.addIncome(totalValueUSD, 'Crypto Sell', `Sold ${cryptoAmount} ${symbol}`);

        this.removeFromWallet(symbol, cryptoAmount);

        // Accumulate 24h volume & sell order pressure
        crypto.volume24h = (crypto.volume24h || (crypto.price * 50000)) + totalValueUSD;
        crypto.recentSellVolume = (crypto.recentSellVolume || 0) + totalValueUSD;

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
        if (!symbol) throw new Error('Crypto not found');
        const cKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const crypto = this.cryptos[cKey] || this.cryptos[symbol];
        if (!crypto) throw new Error('Crypto not found');
        if (amountUSD <= 0) throw new Error('Invalid amount');

        const balance = gameState.getBalance();
        if (amountUSD > balance) throw new Error('Saldo tidak cukup');

        // Reserve balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amountUSD
        }));

        const actualSymbol = crypto.symbol || cKey;
        const order = {
            id: Date.now() + Math.random(),
            type: 'LIMIT_BUY',
            symbol: actualSymbol,
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
        if (!symbol) throw new Error('Crypto not found');
        const cKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const crypto = this.cryptos[cKey] || this.cryptos[symbol];
        if (!crypto) throw new Error('Crypto not found');

        const actualSymbol = crypto.symbol || cKey;
        const wallet = gameState.get('crypto') || {};
        const holding = wallet[actualSymbol] || wallet[symbol];

        if (!holding || holding.amount < cryptoAmount) {
            throw new Error('Crypto tidak cukup');
        }

        // Reserve crypto
        holding.reservedAmount = (holding.reservedAmount || 0) + cryptoAmount;
        gameState.set('crypto', wallet);

        const order = {
            id: Date.now() + Math.random(),
            type: 'LIMIT_SELL',
            symbol: actualSymbol,
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
        if (!symbol) return null;
        const cKey = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        const crypto = this.cryptos[cKey] || this.cryptos[symbol];
        if (crypto && !crypto.symbol) {
            crypto.symbol = typeof symbol === 'string' ? symbol.toUpperCase() : symbol;
        }
        return crypto;
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
                    sector: crypto.sector || 'Layer 1 (L1)',
                    category: crypto.category || '',
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
