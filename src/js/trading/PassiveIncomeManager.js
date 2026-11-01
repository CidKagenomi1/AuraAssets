/**
 * PassiveIncomeManager.js - Passive Income and Automation Systems
 * - Staking crypto assets for APY yields
 * - Launchdrop Ecosystem: Launchpool (Zero-Risk Staking) & Launchpad (50% Discount Presale)
 * - Automatic Bot Trading with AI Momentum strategy
 */

import gameState from '../core/GameState.js';
import stockMarket from './StockMarket.js';
import cryptoMarket from './CryptoMarket.js';
import financeManager from '../finance/FinanceManager.js';
import ui from '../ui/UIManager.js';
import auraEconomy from './AuraEconomyEngine.js';

class PassiveIncomeManager {
    constructor() {
        // Core Staking Asset Specifications (PoS, Smart Contract, DeFi, and Infra)
        this.stakingAssets = {
            ETH: { name: 'Ethereum', apy: 0.048, sector: 'Layer 1 (L1)', minStake: 0.01, desc: 'Proof-of-Stake konsensus Ethereum validator reward' },
            SOL: { name: 'Solana', apy: 0.072, sector: 'Layer 1 (L1)', minStake: 0.1, desc: 'Delegasi validator jaringan high-throughput Solana' },
            ADA: { name: 'Cardano', apy: 0.055, sector: 'Layer 1 (L1)', minStake: 5.0, desc: 'Ouroboros PoS pool staking Cardano' },
            DOT: { name: 'Polkadot', apy: 0.115, sector: 'Layer 2 & Interop', minStake: 1.0, desc: 'Nominated PoS relay chain Polkadot' },
            AVAX: { name: 'Avalanche', apy: 0.085, sector: 'Layer 1 (L1)', minStake: 0.5, desc: 'Avalanche Primary Network subnet validator' },
            NEAR: { name: 'NEAR Protocol', apy: 0.095, sector: 'Layer 1 (L1)', minStake: 1.0, desc: 'Sharded Doomslug PoS staking' },
            SUI: { name: 'Sui', apy: 0.068, sector: 'Layer 1 (L1)', minStake: 1.0, desc: 'Delegated PoS validator Sui Network' },
            TON: { name: 'Toncoin', apy: 0.058, sector: 'Layer 1 (L1)', minStake: 1.0, desc: 'Telegram Open Network PoS validator' },
            TRX: { name: 'TRON', apy: 0.052, sector: 'DeFi & Staking', minStake: 10.0, desc: 'Super Representative freeze staking TRON' },
            ALGO: { name: 'Algorand', apy: 0.065, sector: 'Layer 1 (L1)', minStake: 5.0, desc: 'Pure PoS konsensus Algorand' },
            HYPE: { name: 'Hyperliquid', apy: 0.145, sector: 'DeFi & Staking', minStake: 0.1, desc: 'Perp DEX Liquidity & Validator Vault' },
            AAVE: { name: 'Aave', apy: 0.082, sector: 'DeFi & Staking', minStake: 0.1, desc: 'Aave Safety Module staking' },
            UNI: { name: 'Uniswap', apy: 0.075, sector: 'DeFi & Staking', minStake: 0.5, desc: 'Uniswap Liquidity & Fee-share Vault' },
            LDO: { name: 'Lido DAO', apy: 0.060, sector: 'DeFi & Staking', minStake: 1.0, desc: 'Liquid staking governance vault' },
            LINK: { name: 'Chainlink', apy: 0.068, sector: 'DePIN, Cloud & Infra', minStake: 0.5, desc: 'Chainlink Oracle Staking v0.2' },
            TAO: { name: 'Bittensor', apy: 0.120, sector: 'AI & Big Data', minStake: 0.01, desc: 'Subnet Root Validator Staking' },
            ASTER: { name: 'Aster', apy: 0.150, sector: 'DeFi & Staking', minStake: 1.0, desc: 'DeFi Yield Aggregator Vault' },
            DEXE: { name: 'DeXe', apy: 0.180, sector: 'DeFi & Staking', minStake: 0.5, desc: 'DAO Treasury High-Yield Pool' },
            WLFI: { name: 'World Liberty Financial', apy: 0.165, sector: 'DeFi & Staking', minStake: 10.0, desc: 'Institutional DeFi Protocol Yield' }
        };

        // Available Bot Trading Configurations
        this.botModes = {
            market: {
                name: 'Bot Per Pasar (Broad Market)',
                desc: 'Robot otomatis mendiversifikasikan trading di seluruh indeks pergerakan pasar secara luas.',
                minCapital: 1000
            },
            sector: {
                name: 'Bot Per Sektor Kripto (Sector Rotation)',
                desc: 'Robot mengeksekusi strategi rotasi momentum pada koin-koin dalam satu sektor tertentu.',
                minCapital: 2000
            },
            asset: {
                name: 'Bot Per Token / Aset (Single Asset Precision)',
                desc: 'Robot fokus bertransaksi pada satu aset spesifik memanfaatkan volatilitas dan sinyal teknikal.',
                minCapital: 500
            }
        };
    }

    getStakingPool(symbol) {
        if (this.stakingAssets[symbol]) {
            return this.stakingAssets[symbol];
        }
        // Fallback dynamic yield based on crypto market sector
        const crypto = cryptoMarket ? cryptoMarket.getCrypto(symbol) : null;
        if (!crypto) return null;

        let apy = 0.06;
        if (crypto.sector === 'DeFi & Staking') apy = 0.12;
        else if (crypto.sector === 'Layer 1 (L1)') apy = 0.07;
        else if (crypto.sector === 'AI & Big Data') apy = 0.11;
        else if (crypto.sector === 'Meme Coin') apy = 0.20;

        return {
            name: crypto.name,
            apy: apy,
            sector: crypto.sector || 'Kripto',
            minStake: 0.0001,
            desc: `Vault staking resmi untuk aset ${crypto.name} (${symbol})`
        };
    }

    getAllStakingPools() {
        const pools = { ...this.stakingAssets };
        // Enrich with any cryptos in wallet that are stakeable
        const wallet = gameState.get('crypto') || {};
        Object.keys(wallet).forEach(sym => {
            if (!pools[sym] && cryptoMarket?.getCrypto(sym)) {
                const p = this.getStakingPool(sym);
                if (p) pools[sym] = p;
            }
        });
        return pools;
    }

    getState() {
        let state = gameState.get('passiveIncome');
        if (!state) {
            state = {
                staked: {}, // { symbol: amount }
                stakedLocks: {}, // { symbol: 'flexible' | 'locked' }
                stakingRewards: {}, // symbol: amount
                launchdrops: [],
                bots: [],    // [ { id, mode, targetId, targetName, targetType, capital, profit, profitPct, status, runtimeTicks, entryPrice } ]
                botHistory: [] // [ { id, mode, targetId, targetName, targetType, capital, profit, profitPct, runtimeTicks, entryPrice, stopTime } ]
            };
            gameState.set('passiveIncome', state);
        } else {
            let changed = false;
            if (!state.staked) { state.staked = {}; changed = true; }
            if (!state.stakedLocks) { state.stakedLocks = {}; changed = true; }
            if (!state.stakingRewards) { state.stakingRewards = {}; changed = true; }
            if (!state.launchdrops || !Array.isArray(state.launchdrops)) {
                state.launchdrops = [];
                changed = true;
            }
            if (!state.bots) { state.bots = []; changed = true; }
            if (!state.botHistory) { state.botHistory = []; changed = true; }
            if (changed) {
                gameState.set('passiveIncome', state);
            }
        }

        // Synchronize dynamic daily pools (Launchpool & Launchpad)
        this.syncDailyLaunchdrops(state);
        return state;
    }

    syncDailyLaunchdrops(state) {
        if (!state.launchdrops) state.launchdrops = [];

        const now = new Date();
        const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
        const daySeed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();

        const TOP_10 = ['BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'USDC', 'SOL', 'TRX', 'DOGE', 'ADA'];
        const STABLE_SECTORS = ['Stablecoin & RWA'];
        const MEME_GAME_SECTORS = ['Meme Coin', 'Gaming, NFT & Metaverse'];

        const allCryptos = cryptoMarket ? Object.values(cryptoMarket.cryptos || {}) : [];
        if (allCryptos.length === 0) return;

        // Categorize into Launchpad (Meme Coin & Gaming/NFT) vs Launchpool (All other non-top-10, non-stables)
        const padCandidates = allCryptos.filter(c => MEME_GAME_SECTORS.includes(c.sector));
        const poolCandidates = allCryptos.filter(c => !MEME_GAME_SECTORS.includes(c.sector) && !TOP_10.includes(c.symbol) && !STABLE_SECTORS.includes(c.sector));

        if (padCandidates.length === 0 || poolCandidates.length === 0) return;

        const todayPoolToken = poolCandidates[daySeed % poolCandidates.length];
        const todayPadToken = padCandidates[daySeed % padCandidates.length];

        const poolId = `pool_${todayPoolToken.symbol}_${dateKey}`;
        const padId = `pad_${todayPadToken.symbol}_${dateKey}`;

        let modified = false;

        // 1. Check Launchpool entry for today (Staking Kas 100% Balik + Free Airdrop)
        let poolEntry = state.launchdrops.find(l => l.id === poolId || (l.dateKey === dateKey && l.type === 'launchpool'));
        if (!poolEntry) {
            poolEntry = {
                id: poolId,
                type: 'launchpool',
                symbol: todayPoolToken.symbol,
                name: todayPoolToken.name,
                icon: todayPoolToken.icon || '🪙',
                sector: todayPoolToken.sector,
                category: todayPoolToken.category,
                desc: `Kunci modal kas Anda di Launchpool ${todayPoolToken.name} untuk memanen alokasi token utilitas secara gratis. Modal kas pokok 100% dikembalikan utuh saat klaim!`,
                dateKey: dateKey,
                startTimeUtc: 12, // 12:00 UTC (19:00 WIB)
                durationHours: 3, // 3 Jam (12:00 - 15:00 UTC / 19:00 - 22:00 WIB)
                durationSeconds: 3 * 3600,
                yieldRate: 0.12, // 12% airdrop reward rate
                committed: 0,
                status: 'UPCOMING',
                timeRemaining: 0,
                claimed: false
            };
            state.launchdrops.push(poolEntry);
            modified = true;
        }

        // 2. Check Launchpad entry for today (Presale IDO Diskon 50%, Tradeable setelah 5 jam)
        let padEntry = state.launchdrops.find(l => l.id === padId || (l.dateKey === dateKey && l.type === 'launchpad'));
        if (!padEntry) {
            padEntry = {
                id: padId,
                type: 'launchpad',
                symbol: todayPadToken.symbol,
                name: todayPadToken.name,
                icon: todayPadToken.icon || '💎',
                sector: todayPadToken.sector,
                category: todayPadToken.category,
                desc: `Dapatkan alokasi presale perdana ${todayPadToken.name} dengan diskon 50% dari harga pasar. Token didistribusikan setelah masa presale 5 jam selesai dan langsung siap diperjualbelikan di pasar!`,
                dateKey: dateKey,
                startTimeUtc: 12, // 12:00 UTC (19:00 WIB)
                durationHours: 5, // 5 Jam (12:00 - 17:00 UTC / 19:00 - 00:00 WIB)
                durationSeconds: 5 * 3600,
                discountRate: 0.50, // Diskon 50% dari harga listing
                committed: 0,
                status: 'UPCOMING',
                timeRemaining: 0,
                claimed: false
            };
            state.launchdrops.push(padEntry);
            modified = true;
        }

        // Purge legacy hardcoded static entries if present
        state.launchdrops = state.launchdrops.filter(l => l.type === 'launchpool' || l.type === 'launchpad');

        // Clean up ancient ended entries if more than 6 exist
        if (state.launchdrops.length > 6) {
            state.launchdrops = state.launchdrops.filter((l, idx) => {
                if (l.dateKey === dateKey) return true;
                if (l.committed > 0 && !l.claimed) return true;
                return idx >= state.launchdrops.length - 4;
            });
            modified = true;
        }

        if (modified) {
            this.saveState(state);
        }
    }

    updateLaunchdropTimers(state) {
        if (!state.launchdrops || state.launchdrops.length === 0) return false;

        const now = new Date();
        const currentUtcSeconds = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
        const startSeconds = 12 * 3600; // 12:00 UTC = 43,200 seconds

        let changed = false;

        state.launchdrops.forEach(ld => {
            // Handle active test simulation
            if (ld.isSimulatedActive) {
                if (ld.timeRemaining > 0) {
                    ld.timeRemaining = Math.max(0, ld.timeRemaining - 1);
                    changed = true;
                    if (ld.timeRemaining === 0) {
                        ld.isSimulatedActive = false;
                        if (ld.committed > 0 && !ld.claimed) {
                            ld.status = 'CLAIMABLE';
                        } else {
                            ld.status = 'ENDED';
                        }
                        changed = true;
                    }
                }
                return;
            }

            // Normal Real UTC Schedule
            const endSeconds = startSeconds + (ld.durationSeconds || (ld.type === 'launchpool' ? 10800 : 18000));

            // Case A: Before 12:00 UTC (Upcoming countdown)
            if (currentUtcSeconds < startSeconds) {
                if (ld.claimed) {
                    if (ld.status !== 'ENDED') { ld.status = 'ENDED'; changed = true; }
                } else if (ld.committed > 0 && ld.status === 'CLAIMABLE') {
                    // Previous day's unclaimed pool remains claimable
                } else {
                    const diff = startSeconds - currentUtcSeconds;
                    if (ld.status !== 'UPCOMING') { ld.status = 'UPCOMING'; changed = true; }
                    if (ld.timeRemaining !== diff) { ld.timeRemaining = diff; changed = true; }
                }
            } 
            // Case B: Between 12:00 UTC and Event End (Active Window)
            else if (currentUtcSeconds >= startSeconds && currentUtcSeconds < endSeconds) {
                if (ld.claimed) {
                    if (ld.status !== 'ENDED') { ld.status = 'ENDED'; changed = true; }
                } else {
                    const diff = endSeconds - currentUtcSeconds;
                    if (ld.status !== 'ACTIVE') { ld.status = 'ACTIVE'; changed = true; }
                    if (ld.timeRemaining !== diff) { ld.timeRemaining = diff; changed = true; }
                }
            } 
            // Case C: After Event End (15:00 UTC for Pool, 17:00 UTC for Pad)
            else {
                if (ld.committed > 0 && !ld.claimed) {
                    if (ld.status !== 'CLAIMABLE') { ld.status = 'CLAIMABLE'; changed = true; }
                    if (ld.timeRemaining !== 0) { ld.timeRemaining = 0; changed = true; }
                } else {
                    if (ld.status !== 'ENDED') { ld.status = 'ENDED'; changed = true; }
                    if (ld.timeRemaining !== 0) { ld.timeRemaining = 0; changed = true; }
                }
            }
        });

        return changed;
    }

    saveState(state) {
        gameState.set('passiveIncome', state);
    }

    /**
     * Staking Methods
     */
    stake(symbol, amount, lockType = 'flexible') {
        const wallet = gameState.get('crypto') || {};
        const holding = wallet[symbol];

        if (!holding || holding.amount < amount) {
            throw new Error(`Saldo ${symbol} tidak mencukupi untuk di-stake`);
        }

        // Deduct from crypto holding
        cryptoMarket.removeFromWallet(symbol, amount);

        // Add to staked
        const state = this.getState();
        state.staked[symbol] = (state.staked[symbol] || 0) + amount;
        if (!state.stakedLocks) state.stakedLocks = {};
        state.stakedLocks[symbol] = lockType;
        this.saveState(state);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return true;
    }

    unstake(symbol, amount) {
        const state = this.getState();
        const stakedAmount = state.staked[symbol] || 0;

        if (stakedAmount < amount) {
            throw new Error(`Saldo staked ${symbol} tidak mencukupi`);
        }

        // Subtract from staked
        state.staked[symbol] = stakedAmount - amount;
        if (state.staked[symbol] <= 1e-10) {
            delete state.staked[symbol];
            if (state.stakedLocks) delete state.stakedLocks[symbol];
        }
        this.saveState(state);

        // Refund to wallet
        const crypto = cryptoMarket.getCrypto(symbol);
        cryptoMarket.addToWallet(symbol, amount, crypto ? crypto.price : 1.0);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return true;
    }

    claimStaking(symbol) {
        const state = this.getState();
        const pending = state.stakingRewards[symbol] || 0;
        if (pending <= 0) throw new Error('Tidak ada reward staking untuk diklaim');

        state.stakingRewards[symbol] = 0;
        this.saveState(state);

        const crypto = cryptoMarket.getCrypto(symbol);
        cryptoMarket.addToWallet(symbol, pending, crypto ? crypto.price : 1.0);

        // AuraEconomy: Expand token supply dynamically from newly minted staking emissions
        auraEconomy.mintLaunchdropTokens(symbol, pending);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return true;
    }

    claimAllStaking() {
        const state = this.getState();
        let claimedCount = 0;
        Object.entries(state.stakingRewards).forEach(([symbol, amount]) => {
            if (amount > 0) {
                state.stakingRewards[symbol] = 0;
                const crypto = cryptoMarket.getCrypto(symbol);
                cryptoMarket.addToWallet(symbol, amount, crypto ? crypto.price : 1.0);
                auraEconomy.mintLaunchdropTokens(symbol, amount);
                claimedCount++;
            }
        });

        if (claimedCount > 0) {
            this.saveState(state);
            gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
            document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
            return true;
        }
        throw new Error('Tidak ada reward staking untuk diklaim');
    }

    commitLaunchdrop(id, amount) {
        if (!amount || amount <= 0) throw new Error('Jumlah komitmen modal harus lebih dari $0');
        const balance = gameState.getBalance();
        if (balance < amount) throw new Error('Saldo kas tidak mencukupi untuk komitmen modal');

        const state = this.getState();
        const ld = state.launchdrops.find(l => l.id === id);
        if (!ld) throw new Error('Pool Launchdrop tidak ditemukan');
        if (ld.status !== 'ACTIVE') throw new Error('Pool ini sedang tidak dalam masa aktif/open');

        // Deduct player balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amount
        }));

        const isPool = ld.type === 'launchpool';
        const title = isPool ? 'Launchpool Stake' : 'Launchpad Presale';
        const desc = isPool 
            ? `Commit $${amount.toLocaleString()} kas di Launchpool ${ld.name} (Modal 100% aman & kembali saat klaim)`
            : `Beli presale diskon 50% $${amount.toLocaleString()} di Launchpad ${ld.name}`;

        if (financeManager?.addExpense) {
            financeManager.addExpense(amount, title, desc);
        }

        ld.committed = (ld.committed || 0) + amount;
        this.saveState(state);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return ld;
    }

    claimLaunchdrop(id) {
        const state = this.getState();
        const ld = state.launchdrops.find(l => l.id === id);
        if (!ld) throw new Error('Pool Launchdrop tidak ditemukan');
        if (ld.status !== 'CLAIMABLE') throw new Error('Alokasi belum siap diklaim atau event belum selesai');
        if (ld.committed <= 0) throw new Error('Anda tidak memiliki alokasi modal untuk diklaim');
        if (ld.claimed) throw new Error('Alokasi dari pool ini sudah pernah diklaim');

        const crypto = cryptoMarket.getCrypto(ld.symbol);
        const currentPrice = crypto ? crypto.price : 1.0;

        let result = {};

        if (ld.type === 'launchpool') {
            // Model A: Launchpool Staking
            // 1. Return 100% committed cash modal
            const refundCash = ld.committed;
            gameState.update('player', p => ({
                ...p,
                balance: p.balance + refundCash
            }));

            // 2. Airdrop reward tokens (12% of committed cash value)
            const airdropValueUSD = ld.committed * (ld.yieldRate || 0.12);
            const tokenReward = airdropValueUSD / currentPrice;

            // Add free tokens to crypto wallet
            cryptoMarket.addToWallet(ld.symbol, tokenReward, currentPrice);

            // AuraEconomy: Expand circulating token supply dynamically from Launchpool reward
            auraEconomy.mintLaunchdropTokens(ld.symbol, tokenReward);

            if (financeManager?.addIncome) {
                financeManager.addIncome(airdropValueUSD, 'Launchpool Reward', `Airdrop gratis ${tokenReward.toFixed(4)} ${ld.symbol} + modal kas $${refundCash.toLocaleString()} kembali utuh`);
            }

            result = {
                type: 'launchpool',
                name: ld.name,
                symbol: ld.symbol,
                refundCash,
                tokenReward,
                airdropValueUSD
            };
        } else {
            // Model B: Launchpad IDO Presale (Diskon 50%)
            const discount = ld.discountRate || 0.50;
            const presalePrice = currentPrice * (1 - discount);
            const allocatedTokens = ld.committed / presalePrice;

            // Add tokens to wallet with discounted presale price as avgBuyPrice!
            cryptoMarket.addToWallet(ld.symbol, allocatedTokens, presalePrice);

            // AuraEconomy: Expand circulating token supply dynamically from Launchpad presale
            auraEconomy.mintLaunchdropTokens(ld.symbol, allocatedTokens);

            const marketValueUSD = allocatedTokens * currentPrice;
            const estimatedProfit = marketValueUSD - ld.committed;

            result = {
                type: 'launchpad',
                name: ld.name,
                symbol: ld.symbol,
                allocatedTokens,
                presalePrice,
                currentPrice,
                committed: ld.committed,
                marketValueUSD,
                estimatedProfit,
                profitPct: ((currentPrice - presalePrice) / presalePrice) * 100
            };
        }

        ld.claimed = true;
        ld.status = 'ENDED';
        this.saveState(state);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return result;
    }

    simulateStartPoolNow(type = 'launchpool') {
        const state = this.getState();
        const ld = state.launchdrops.find(l => l.type === type);
        if (!ld) throw new Error(`Tidak ada ${type} yang dapat disimulasikan`);

        ld.isSimulatedActive = true;
        ld.status = 'ACTIVE';
        ld.timeRemaining = ld.type === 'launchpool' ? 180 : 300; // 3 min / 5 min test timer
        ld.claimed = false;
        this.saveState(state);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return ld;
    }

    simulateNextPhase(id) {
        const state = this.getState();
        const ld = state.launchdrops.find(l => l.id === id);
        if (!ld) throw new Error('Pool tidak ditemukan');

        if (ld.status === 'UPCOMING') {
            ld.isSimulatedActive = true;
            ld.status = 'ACTIVE';
            ld.timeRemaining = ld.type === 'launchpool' ? 180 : 300;
        } else if (ld.status === 'ACTIVE') {
            ld.isSimulatedActive = false;
            ld.timeRemaining = 0;
            ld.status = 'CLAIMABLE';
        }
        this.saveState(state);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return ld;
    }

    /**
     * Bot Methods
     */
    startBot(options, legacyAsset, legacyType, legacyCapital) {
        let config = {};
        if (typeof options === 'object' && options !== null) {
            config = options;
        } else {
            // Backwards compatibility for legacy calls: startBot(strategy, asset, assetType, capital)
            config = {
                mode: 'asset',
                targetType: legacyType || 'crypto',
                targetId: legacyAsset,
                targetName: legacyAsset,
                capital: legacyCapital
            };
        }

        const balance = gameState.getBalance();
        const capital = Number(config.capital);
        if (isNaN(capital) || capital <= 0) throw new Error('Nominal modal bot tidak valid');
        if (balance < capital) throw new Error('Saldo kas tidak mencukupi untuk modal bot');

        const mode = config.mode || 'asset'; // 'market' | 'sector' | 'asset'
        const spec = this.botModes[mode] || this.botModes.asset;
        if (capital < spec.minCapital) {
            throw new Error(`Minimal modal untuk ${spec.name} adalah $ ${spec.minCapital.toLocaleString()}`);
        }

        // Deduct capital
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - capital
        }));

        if (financeManager?.addExpense) {
            financeManager.addExpense(capital, 'Alokasi Modal Bot', `Menjalankan ${config.targetName || 'Trading Bot'}`);
        }

        const bot = {
            id: Date.now() + Math.random(),
            mode: mode,
            targetId: config.targetId,
            targetName: config.targetName || config.targetId,
            targetType: config.targetType || (config.targetId === 'stock' ? 'stock' : 'crypto'),
            icon: config.icon || (mode === 'market' ? '🌐' : mode === 'sector' ? '🗂️' : '🤖'),
            capital: capital,
            profit: 0,
            profitPct: 0,
            status: 'RUNNING',
            runtimeTicks: 0,
            startTime: Date.now(),
            entryPrice: config.entryPrice || 0,
            leverage: config.targetType === 'stock' ? 1 : 2
        };

        const state = this.getState();
        state.bots.push(bot);
        this.saveState(state);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return bot;
    }

    stopBot(id) {
        const state = this.getState();
        const botIndex = state.bots.findIndex(b => b.id === id);
        if (botIndex === -1) throw new Error('Bot tidak ditemukan');

        const bot = state.bots[botIndex];
        const returnAmount = Math.max(0, bot.capital + bot.profit);

        // Refund capital + profit to player cash
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + returnAmount
        }));

        if (bot.profit >= 0) {
            financeManager.addIncome(returnAmount, 'Klaim Bot Trading', `Menghentikan ${bot.targetName} dengan keuntungan $ ${Math.round(bot.profit).toLocaleString()} (${bot.profitPct.toFixed(1)}%)`);
        } else {
            financeManager.addIncome(returnAmount, 'Klaim Bot Trading', `Menghentikan ${bot.targetName} dengan hasil $ ${Math.round(returnAmount).toLocaleString()} (Drawdown ${bot.profitPct.toFixed(1)}%)`);
        }

        // Save to history before removing
        if (!state.botHistory) {
            state.botHistory = [];
        }
        state.botHistory.unshift({
            id: bot.id,
            mode: bot.mode,
            targetId: bot.targetId,
            targetName: bot.targetName,
            targetType: bot.targetType,
            icon: bot.icon,
            capital: bot.capital,
            profit: bot.profit,
            profitPct: bot.profitPct,
            runtimeTicks: bot.runtimeTicks,
            stopTime: Date.now()
        });
        
        // Limit history to 20 items
        if (state.botHistory.length > 20) {
            state.botHistory.pop();
        }

        // Remove bot
        state.bots.splice(botIndex, 1);
        this.saveState(state);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        return returnAmount;
    }

    /**
     * Central Update Cycle (triggered by market ticks)
     */
    tick() {
        const state = this.getState();
        let stateChanged = false;

        // 1. Process Staking Yields
        Object.entries(state.staked).forEach(([symbol, amount]) => {
            if (amount > 0) {
                const spec = this.getStakingPool(symbol);
                if (spec) {
                    const isLocked = state.stakedLocks?.[symbol] === 'locked';
                    const baseApy = spec.apy || 0.06;
                    const effectiveApy = isLocked ? baseApy * 1.35 : baseApy;
                    // Boosted interactive tick rate
                    const yieldRate = effectiveApy / 12000;
                    const rewardAmount = amount * yieldRate;

                    if (!state.stakingRewards) state.stakingRewards = {};
                    state.stakingRewards[symbol] = (state.stakingRewards[symbol] || 0) + rewardAmount;
                    stateChanged = true;
                }
            }
        });

        // 2. Process Trading Bots
        const activeSignals = gameState.get('tradingSignals') || [];
        const allCryptos = cryptoMarket ? Object.values(cryptoMarket.cryptos || {}) : [];
        const allStocks = stockMarket ? Object.values(stockMarket.stocks || {}) : [];

        state.bots.forEach(bot => {
            bot.runtimeTicks += 1;
            let profitRate = 0;

            if (bot.mode === 'market') {
                // Mode A: Broad Market Index Bot
                if (bot.targetId === 'stock') {
                    const avgChange = allStocks.reduce((sum, s) => sum + (s.change || 0), 0) / (allStocks.length || 1);
                    const alpha = (Math.random() - 0.46) * 0.008;
                    profitRate = (avgChange / 100) * 0.4 + alpha;
                } else {
                    // Crypto Market (24/7, high vol, 2x leverage)
                    const avgChange = allCryptos.reduce((sum, c) => sum + (c.change || 0), 0) / (allCryptos.length || 1);
                    const alpha = (Math.random() - 0.45) * 0.018;
                    profitRate = ((avgChange / 100) * 0.6 + alpha) * (bot.leverage || 2);
                }
            } else if (bot.mode === 'sector') {
                // Mode B: Sector Rotation Bot
                const sectorTokens = allCryptos.filter(c => c.sector === bot.targetId);
                const avgChange = sectorTokens.length > 0 
                    ? sectorTokens.reduce((sum, c) => sum + (c.change || 0), 0) / sectorTokens.length 
                    : 0;
                
                // Sector signal boost
                let sectorBias = 0;
                sectorTokens.forEach(t => {
                    const sig = activeSignals.find(s => s.id === t.symbol);
                    if (sig?.label?.includes('MOON')) sectorBias += 0.008;
                    else if (sig?.label?.includes('HOT')) sectorBias += 0.004;
                });
                sectorBias = Math.min(0.04, sectorBias);

                const alpha = (Math.random() - 0.46 + sectorBias) * 0.022;
                profitRate = ((avgChange / 100) * 0.7 + alpha) * (bot.leverage || 2);
            } else {
                // Mode C: Single Asset Precision Bot
                const asset = bot.targetType === 'stock' ? stockMarket.getStock(bot.targetId) : cryptoMarket.getCrypto(bot.targetId);
                if (asset) {
                    const changePct = (asset.change || 0) / 100;
                    const signal = activeSignals.find(s => s.id === bot.targetId);
                    const signalLabel = signal ? signal.label : 'NEUTRAL 😐';

                    let bias = 0;
                    if (signalLabel.includes('MOON')) bias = 0.05;
                    else if (signalLabel.includes('HOT')) bias = 0.02;
                    else if (signalLabel.includes('HEAT')) bias = 0.008;
                    else if (signalLabel.includes('COOL')) bias = -0.018;

                    const leverage = bot.leverage || (bot.targetType === 'crypto' ? 2 : 1);
                    const vol = asset.volatility || 0.05;
                    const randomWalk = (Math.random() - 0.46 + bias) * (vol * 1.8);
                    profitRate = (changePct * 0.6 + randomWalk) * leverage;
                }
            }

            bot.profit += bot.capital * profitRate;
            bot.profitPct = (bot.profit / bot.capital) * 100;
            stateChanged = true;
        });

        if (stateChanged) {
            this.saveState(state);
            document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        }
    }

    tickTime() {
        const state = this.getState();
        const changed = this.updateLaunchdropTimers(state);
        if (changed) {
            this.saveState(state);
            document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        }
    }
}

export const passiveIncomeManager = new PassiveIncomeManager();

// Automatically update passive income systems on price ticks (Mining, Staking, Trading Bots)
gameState.on('cryptoUpdate', () => {
    passiveIncomeManager.tick();
});

// Real-Time UTC second clock synchronization for Launchpool & Launchpad countdowns
gameState.on('utcTick', () => {
    passiveIncomeManager.tickTime();
});

export default passiveIncomeManager;
