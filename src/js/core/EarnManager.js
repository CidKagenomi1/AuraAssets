/**
 * EarnManager.js - Idle Earn System
 * Handles passive income generation with leveling mechanics
 */

import gameState from './GameState.js';
import financeManager from '../finance/FinanceManager.js';

class EarnManager {
    constructor() {
        this.tickInterval = null;
        this.tickRate = 1000; // 1 second per tick
    }

    /**
     * Get earn rate per second based on level
     * Base: 1000 $/sec, +50% per level
     */
    getEarnRate(level = null) {
        const earnLevel = level || gameState.get('earn.level') || 1;
        return Math.floor(500 * Math.pow(1.5, earnLevel - 1));
    }

    /**
     * Get upgrade cost for next level
     * Base: 250K, 2x per level
     */
    getUpgradeCost(level = null) {
        const earnLevel = level || gameState.get('earn.level') || 1;
        return Math.floor(250000 * Math.pow(2, earnLevel - 1));
    }

    /**
     * Start the earning ticker
     */
    start() {
        if (this.tickInterval) return;

        // Calculate offline earnings first
        this.calculateOfflineEarnings();

        this.tickInterval = setInterval(() => this.tick(), this.tickRate);
        console.log('💰 Earn system started');
    }

    /**
     * Stop the earning ticker
     */
    stop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
            console.log('⏸️ Earn system stopped');
        }
    }

    /**
     * Calculate earnings accumulated while game was closed
     */
    calculateOfflineEarnings() {
        const lastTick = gameState.get('earn.lastEarnTick');
        if (!lastTick) return;

        const now = Date.now();
        const elapsedSeconds = Math.floor((now - lastTick) / 1000);

        // Cap offline earnings to 24 hours (86400 seconds)
        const cappedSeconds = Math.min(elapsedSeconds, 86400);

        if (cappedSeconds > 0) {
            const disabled = gameState.get('settings.subsidyDisabled') || false;
            const earnRate = disabled ? 0 : this.getEarnRate();
            const offlineEarnings = earnRate * cappedSeconds;

            gameState.update('earn', e => ({
                ...e,
                pendingEarn: (e.pendingEarn || 0) + offlineEarnings,
                lastEarnTick: now
            }));

            if (offlineEarnings > 0) {
                console.log(`💤 Offline earnings: ${financeManager.formatCurrency(offlineEarnings)} (${cappedSeconds}s)`);
            }
        }
    }

    /**
     * Tick - add earnings every second
     */
    tick() {
        const disabled = gameState.get('settings.subsidyDisabled') || false;
        const earnRate = disabled ? 0 : this.getEarnRate();
        const now = Date.now();

        gameState.update('earn', e => ({
            ...e,
            pendingEarn: (e.pendingEarn || 0) + earnRate,
            lastEarnTick: now
        }));

        gameState.emit('earnTick', {
            earnRate,
            pendingEarn: gameState.get('earn.pendingEarn')
        });
    }

    /**
     * Claim pending earnings to player balance
     */
    claim() {
        const pendingEarn = gameState.get('earn.pendingEarn') || 0;
        if (pendingEarn <= 0) return { success: false, message: 'Tidak ada subsidi untuk diklaim' };

        // BUG-02 FIX: Use addBalance() so transaction is properly recorded in history
        gameState.addBalance(pendingEarn, 'Earn', 'Subsidi Govermen');

        // Update earn state
        gameState.update('earn', e => ({
            ...e,
            pendingEarn: 0,
            totalEarned: (e.totalEarned || 0) + pendingEarn
        }));

        gameState.emit('earnClaim', { amount: pendingEarn });

        return { success: true, amount: pendingEarn };
    }

    /**
     * Upgrade earn level
     */
    upgrade() {
        const currentLevel = gameState.get('earn.level') || 1;
        const upgradeCost = this.getUpgradeCost(currentLevel);
        const balance = gameState.getBalance();

        if (balance < upgradeCost) {
            return {
                success: false,
                message: `Saldo tidak cukup. Butuh $ ${financeManager.formatCurrency(upgradeCost)} untuk mengajukan peningkatan`
            };
        }

        // BUG-03 FIX: Use addBalance() so the deduction is recorded in transaction history
        gameState.addBalance(-upgradeCost, 'Upgrade', `Peningkatan Subsidi Level ${currentLevel} → ${currentLevel + 1}`);

        // Upgrade level
        const newLevel = currentLevel + 1;
        gameState.update('earn', e => ({
            ...e,
            level: newLevel
        }));

        const newEarnRate = this.getEarnRate(newLevel);

        gameState.emit('earnUpgrade', {
            level: newLevel,
            earnRate: newEarnRate,
            cost: upgradeCost
        });

        return {
            success: true,
            level: newLevel,
            earnRate: newEarnRate,
            cost: upgradeCost
        };
    }

    /**
     * Get current earn state
     */
    getState() {
        return {
            level: gameState.get('earn.level') || 1,
            earnRate: this.getEarnRate(),
            pendingEarn: gameState.get('earn.pendingEarn') || 0,
            totalEarned: gameState.get('earn.totalEarned') || 0,
            upgradeCost: this.getUpgradeCost()
        };
    }
}

export const earnManager = new EarnManager();
export default earnManager;
