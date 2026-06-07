/**
 * PassiveIncomeManager.js - Passive Income and Automation Systems
 * - Staking crypto assets for APY yields
 * - Mining crypto using ASIC, GPU, and CPU mining rigs
 * - Automatic Bot Trading with AI Momentum strategy
 */

import gameState from '../core/GameState.js';
import stockMarket from './StockMarket.js';
import cryptoMarket from './CryptoMarket.js';
import financeManager from '../finance/FinanceManager.js';
import ui from '../ui/UIManager.js';

class PassiveIncomeManager {
    constructor() {
        this.rigTypes = {
            CPU: { name: 'CPU Miner', cost: 1000, yieldBTC: 0.00000005, powerCost: 0.1 },
            GPU: { name: 'GPU Rig', cost: 5000, yieldBTC: 0.00000045, powerCost: 0.8 },
            ASIC: { name: 'ASIC Miner', cost: 25000, yieldBTC: 0.0000035, powerCost: 5.0 },
            Industrial: { name: 'Industrial Hashrate Center', cost: 150000, yieldBTC: 0.000028, powerCost: 35.0 }
        };

        this.stakingAssets = {
            ETH: { name: 'Ethereum', apy: 0.045 },
            SOL: { name: 'Solana', apy: 0.065 },
            ADA: { name: 'Cardano', apy: 0.05 },
            DOT: { name: 'Polkadot', apy: 0.12 },
            LDO: { name: 'Lido DAO', apy: 0.055 },
            AVAX: { name: 'Avalanche', apy: 0.08 }
        };

        this.botStrategies = {
            ai: { name: 'AI Auto-Trading', desc: 'Robot secara otomatis mendeteksi momentum sinyal pasar (HOT/MOON) untuk menghasilkan profit.', minCapital: 5000 }
        };
    }

    getState() {
        let state = gameState.get('passiveIncome');
        if (!state) {
            state = {
                rigs: { CPU: 0, GPU: 0, ASIC: 0, Industrial: 0 },
                staked: {}, // { symbol: amount }
                stakingRewards: {}, // symbol: amount
                miningRewards: 0, // amount of BTC
                launchdrops: [
                    { id: 'AURA', name: 'Aura Network', symbol: 'AURA', desc: 'Cosmos-based Layer-1 blockchain for smart contracts.', timeRemaining: 60, committed: 0, status: 'ACTIVE', rate: 0.1 },
                    { id: 'NEX', name: 'Nexus AI', symbol: 'NEX', desc: 'Enterprise decentralized Artificial Intelligence computation core.', timeRemaining: 120, committed: 0, status: 'ACTIVE', rate: 0.25 }
                ],
                bots: [],    // [ { id, type, asset, assetType, capital, profit, profitPct, status, runtimeDays, entryPrice } ]
                botHistory: [] // [ { id, type, asset, assetType, capital, profit, profitPct, runtimeTicks, entryPrice, stopTime } ]
            };
            gameState.set('passiveIncome', state);
        } else {
            let changed = false;
            if (!state.rigs) { state.rigs = { CPU: 0, GPU: 0, ASIC: 0, Industrial: 0 }; changed = true; }
            if (!state.staked) { state.staked = {}; changed = true; }
            if (!state.stakingRewards) { state.stakingRewards = {}; changed = true; }
            if (state.miningRewards === undefined) { state.miningRewards = 0; changed = true; }
            if (!state.launchdrops) {
                state.launchdrops = [
                    { id: 'AURA', name: 'Aura Network', symbol: 'AURA', desc: 'Cosmos-based Layer-1 blockchain for smart contracts.', timeRemaining: 60, committed: 0, status: 'ACTIVE', rate: 0.1 },
                    { id: 'NEX', name: 'Nexus AI', symbol: 'NEX', desc: 'Enterprise decentralized Artificial Intelligence computation core.', timeRemaining: 120, committed: 0, status: 'ACTIVE', rate: 0.25 }
                ];
                changed = true;
            }
            if (!state.bots) { state.bots = []; changed = true; }
            if (!state.botHistory) { state.botHistory = []; changed = true; }
            if (changed) {
                gameState.set('passiveIncome', state);
            }
        }
        return state;
    }

    saveState(state) {
        gameState.set('passiveIncome', state);
    }

    /**
     * Staking Methods
     */
    stake(symbol, amount) {
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
        this.saveState(state);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
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
        }
        this.saveState(state);

        // Refund to wallet
        const crypto = cryptoMarket.getCrypto(symbol);
        cryptoMarket.addToWallet(symbol, amount, crypto ? crypto.price : 1.0);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
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

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
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
                claimedCount++;
            }
        });

        if (claimedCount > 0) {
            this.saveState(state);
            gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
            return true;
        }
        throw new Error('Tidak ada reward staking untuk diklaim');
    }

    claimMining() {
        const state = this.getState();
        const pending = state.miningRewards || 0;
        if (pending <= 0) throw new Error('Tidak ada hasil tambang untuk diklaim');

        state.miningRewards = 0;
        this.saveState(state);

        const btc = cryptoMarket.getCrypto('BTC');
        cryptoMarket.addToWallet('BTC', pending, btc ? btc.price : 60000);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        return true;
    }

    commitLaunchdrop(id, amount) {
        const balance = gameState.getBalance();
        if (balance < amount) throw new Error('Saldo kas tidak mencukupi untuk commit');

        const state = this.getState();
        const ld = state.launchdrops.find(l => l.id === id);
        if (!ld) throw new Error('Launchdrop tidak ditemukan');
        if (ld.status !== 'ACTIVE') throw new Error('Launchdrop sudah tidak aktif');

        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amount
        }));

        financeManager.addExpense ? financeManager.addExpense(amount, 'Launchdrop Commit', `Commit $${amount.toLocaleString()} ke ${ld.name}`) : null;

        ld.committed = (ld.committed || 0) + amount;
        this.saveState(state);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        return true;
    }

    claimLaunchdrop(id) {
        const state = this.getState();
        const ld = state.launchdrops.find(l => l.id === id);
        if (!ld) throw new Error('Launchdrop tidak ditemukan');
        if (ld.status !== 'CLAIMABLE') throw new Error('Launchdrop belum siap diklaim atau sudah diklaim');

        const rewardAmount = ld.committed * ld.rate;
        if (rewardAmount <= 0) throw new Error('Anda tidak memiliki alokasi untuk diklaim');

        ld.status = 'ENDED';
        this.saveState(state);

        const crypto = cryptoMarket.getCrypto(ld.symbol);
        cryptoMarket.addToWallet(ld.symbol, rewardAmount, crypto ? crypto.price : 1.0);

        gameState.emit('cryptoUpdate', cryptoMarket.cryptos);
        return true;
    }

    /**
     * Mining Methods
     */
    buyRig(type) {
        const rig = this.rigTypes[type];
        if (!rig) throw new Error('Rig type not found');

        const balance = gameState.getBalance();
        if (balance < rig.cost) {
            throw new Error('Saldo kas tidak cukup untuk membeli mining rig');
        }

        // Deduct balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - rig.cost
        }));

        // Add transaction
        financeManager.addExpense ? financeManager.addExpense(rig.cost, 'Mining Purchase', `Membeli ${rig.name}`) : null;

        // Add rig count
        const state = this.getState();
        state.rigs[type] = (state.rigs[type] || 0) + 1;
        this.saveState(state);

        return true;
    }

    sellRig(type) {
        const state = this.getState();
        const currentCount = state.rigs[type] || 0;
        if (currentCount <= 0) throw new Error('Tidak memiliki rig jenis ini');

        const rig = this.rigTypes[type];
        const refund = Math.round(rig.cost * 0.6); // 60% resale value

        // Refund cash
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + refund
        }));

        financeManager.addIncome(refund, 'Mining Rig Sale', `Menjual ${rig.name} (Second)`);

        state.rigs[type] = currentCount - 1;
        this.saveState(state);

        return true;
    }

    /**
     * Bot Methods
     */
    startBot(strategy, asset, assetType, capital) {
        const balance = gameState.getBalance();
        if (balance < capital) throw new Error('Saldo kas tidak mencukupi modal bot');

        const spec = this.botStrategies[strategy];
        if (!spec) throw new Error('Strategi bot tidak ditemukan');
        if (capital < spec.minCapital) throw new Error(`Minimal modal untuk strategi ${spec.name} adalah $ ${spec.minCapital.toLocaleString()}`);

        const assetData = assetType === 'stock' ? stockMarket.getStock(asset) : cryptoMarket.getCrypto(asset);
        if (!assetData) throw new Error('Aset tidak valid');

        // Deduct capital
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - capital
        }));

        // Differentiate stock and crypto systems: Crypto bots have default 3x virtual leverage, stock bots have 1x.
        const leverage = assetType === 'crypto' ? 3 : 1;
        const bot = {
            id: Date.now() + Math.random(),
            type: strategy,
            asset,
            assetType,
            capital,
            profit: 0,
            profitPct: 0,
            status: 'RUNNING',
            runtimeTicks: 0,
            entryPrice: assetData.price,
            leverage: leverage,
            // Separate system params: Crypto bots run 24/7 (always active), Stock bots run only during market sessions
            systemName: assetType === 'crypto' ? 'High-Frequency Crypto Engine (3x Leverage)' : 'Standard Equity Momentum Optimizer (1x Leverage)'
        };

        const state = this.getState();
        state.bots.push(bot);
        this.saveState(state);

        return bot;
    }

    stopBot(id) {
        const state = this.getState();
        const botIndex = state.bots.findIndex(b => b.id === id);
        if (botIndex === -1) throw new Error('Bot tidak ditemukan');

        const bot = state.bots[botIndex];
        const returnAmount = bot.capital + bot.profit;

        // Refund capital + profit to player cash
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + returnAmount
        }));

        if (bot.profit >= 0) {
            financeManager.addIncome(returnAmount, 'Bot Trading Claim', `Menghentikan Bot ${bot.asset} dengan keuntungan $ ${bot.profit.toLocaleString()}`);
        } else {
            // Deduct total as expense (capital was already deducted, refund whatever remains)
            financeManager.addIncome(returnAmount, 'Bot Trading Claim', `Menghentikan Bot ${bot.asset} dengan kerugian $ ${Math.abs(bot.profit).toLocaleString()}`);
        }

        // Save to history before removing
        if (!state.botHistory) {
            state.botHistory = [];
        }
        state.botHistory.unshift({
            id: bot.id,
            type: bot.type,
            asset: bot.asset,
            assetType: bot.assetType,
            capital: bot.capital,
            profit: bot.profit,
            profitPct: bot.profitPct,
            runtimeTicks: bot.runtimeTicks,
            entryPrice: bot.entryPrice,
            stopTime: Date.now()
        });
        
        // Limit history to 20 items
        if (state.botHistory.length > 20) {
            state.botHistory.pop();
        }

        // Remove bot
        state.bots.splice(botIndex, 1);
        this.saveState(state);

        return returnAmount;
    }

    /**
     * Central Update Cycle (triggered by market ticks)
     */
    tick() {
        const state = this.getState();
        let stateChanged = false;

        // 1. Process Mining Yields (Mines BTC)
        let totalBTCYield = 0;
        let totalPowerCost = 0;

        Object.entries(state.rigs).forEach(([type, count]) => {
            if (count > 0) {
                const rig = this.rigTypes[type];
                totalBTCYield += rig.yieldBTC * count;
                totalPowerCost += rig.powerCost * count;
            }
        });

        if (totalBTCYield > 0) {
            // Add to pending mining rewards instead of wallet directly
            state.miningRewards = (state.miningRewards || 0) + totalBTCYield;

            // Deduct power consumption / maintenance fee
            if (totalPowerCost > 0) {
                const actualCost = Math.round(totalPowerCost);
                gameState.update('player', p => ({
                    ...p,
                    balance: Math.max(0, p.balance - actualCost)
                }));
            }
            stateChanged = true;
        }

        // 2. Process Staking Yields
        Object.entries(state.staked).forEach(([symbol, amount]) => {
            if (amount > 0) {
                const spec = this.stakingAssets[symbol];
                if (spec) {
                    // Boosted yield rate: APY / 15000 for faster interactive feedback
                    const yieldRate = spec.apy / 15000;
                    const rewardAmount = amount * yieldRate;

                    // Add to pending rewards instead of wallet directly
                    if (!state.stakingRewards) state.stakingRewards = {};
                    state.stakingRewards[symbol] = (state.stakingRewards[symbol] || 0) + rewardAmount;
                    stateChanged = true;
                }
            }
        });

        // 3. Process Trading Bots
        const activeSignals = gameState.get('tradingSignals') || [];
        state.bots.forEach(bot => {
            bot.runtimeTicks += 1;
            const asset = bot.assetType === 'stock' ? stockMarket.getStock(bot.asset) : cryptoMarket.getCrypto(bot.asset);
            if (!asset) return;

            const changePct = asset.change / 100; // current tick change
            const signal = activeSignals.find(s => s.id === bot.asset);
            const signalLabel = signal ? signal.label : 'NEUTRAL 😐';

            let bias = 0;
            if (signalLabel.includes('MOON')) bias = 0.05; // parabolic momentum
            else if (signalLabel.includes('HOT')) bias = 0.02;
            else if (signalLabel.includes('HEAT')) bias = 0.008;
            else if (signalLabel.includes('COOL')) bias = -0.018; // bad trend

            // Simplistic yield based on asset growth and signal prediction
            const leverage = bot.leverage || (bot.assetType === 'crypto' ? 3 : 1);
            let profitRate = 0;

            if (bot.assetType === 'crypto') {
                // Crypto: high volatility, leverage multiplier, runs continuously
                const randomWalk = (Math.random() - 0.46 + bias) * (asset.volatility * 2.2);
                profitRate = (changePct * 0.7 + randomWalk) * leverage;
            } else {
                // Stocks: lower volatility, lower random drift, normal execution
                const randomWalk = (Math.random() - 0.44 + bias) * (asset.volatility * 1.0);
                profitRate = (changePct * 0.4 + randomWalk) * leverage;
            }

            bot.profit += bot.capital * profitRate;
            bot.profitPct = (bot.profit / bot.capital) * 100;
            stateChanged = true;
        });

        // 4. Process Launchdrops countdown
        if (state.launchdrops) {
            state.launchdrops.forEach(ld => {
                if (ld.status === 'ACTIVE' && ld.committed > 0) {
                    ld.timeRemaining = Math.max(0, ld.timeRemaining - 1);
                    if (ld.timeRemaining === 0) {
                        ld.status = 'CLAIMABLE';
                    }
                    stateChanged = true;
                }
            });
        }

        if (stateChanged) {
            this.saveState(state);
            // Request UI updates
            document.dispatchEvent(new CustomEvent('passiveIncomeTick'));
        }
    }
}

export const passiveIncomeManager = new PassiveIncomeManager();

// Automatically update passive income systems on price ticks
gameState.on('cryptoUpdate', () => {
    passiveIncomeManager.tick();
});

export default passiveIncomeManager;
