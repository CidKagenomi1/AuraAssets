/**
 * SavingsManager.js - Deposito/Savings System
 * Simple savings account with monthly interest
 */

import gameState from '../game/GameState.js';
import timeManager from '../game/TimeManager.js';
import financeManager from './FinanceManager.js';

class SavingsManager {
    constructor() {
        this.interestRate = 0.005; // 0.5% per month = 6% per year

        // Process interest monthly
        timeManager.onMonth(() => {
            this.processMonthlyInterest();
            this.processAutoDeposit();
        });
    }

    /**
     * Get current savings balance
     */
    getBalance() {
        return gameState.get('savings.balance') || 0;
    }

    /**
     * Deposit money into savings
     */
    deposit(amount) {
        if (amount <= 0) throw new Error('Jumlah tidak valid');

        const playerBalance = gameState.getBalance();
        if (amount > playerBalance) throw new Error('Saldo tidak cukup');

        // Deduct from player balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amount
        }));

        // Add to savings
        const currentSavings = this.getBalance();
        gameState.set('savings.balance', currentSavings + amount);
        gameState.set('savings.lastDeposit', {
            amount,
            date: {
                day: gameState.get('gameTime.day'),
                month: gameState.get('gameTime.month'),
                year: gameState.get('gameTime.year')
            }
        });

        // Record transaction
        financeManager.recordTransaction({
            amount: -amount,
            category: 'savings_deposit',
            description: 'Setor Deposito'
        });

        gameState.emit('savingsUpdate');
        return this.getBalance();
    }

    /**
     * Withdraw money from savings
     */
    withdraw(amount) {
        if (amount <= 0) throw new Error('Jumlah tidak valid');

        const savingsBalance = this.getBalance();
        if (amount > savingsBalance) throw new Error('Saldo deposito tidak cukup');

        // Deduct from savings
        gameState.set('savings.balance', savingsBalance - amount);

        // Add to player balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + amount
        }));

        // Record transaction
        financeManager.recordTransaction({
            amount: amount,
            category: 'savings_withdraw',
            description: 'Tarik Deposito'
        });

        gameState.emit('savingsUpdate');
        return this.getBalance();
    }

    /**
     * Process monthly interest
     */
    processMonthlyInterest() {
        const balance = this.getBalance();
        if (balance <= 0) return;

        const interest = Math.floor(balance * this.interestRate);
        if (interest > 0) {
            gameState.set('savings.lastInterest', interest);

            // Add interest directly to the player's main balance (saldo utama)
            financeManager.addIncome(interest, 'Investasi', `Bunga Deposito (${(this.interestRate * 100).toFixed(1)}%)`);

            gameState.emit('interestReceived', { amount: interest });
        }
    }

    processAutoDeposit() {
        const isAutoEnabled = gameState.get('savings.autoDepositEnabled') || false;
        if (!isAutoEnabled) return;

        const autoAmount = gameState.get('savings.autoDepositAmount') || 0;
        if (autoAmount <= 0) return;

        const playerBalance = gameState.getBalance();
        if (playerBalance >= autoAmount) {
            // Deduct from player balance
            gameState.update('player', p => ({
                ...p,
                balance: p.balance - autoAmount
            }));

            // Add to savings
            const currentSavings = this.getBalance();
            gameState.set('savings.balance', currentSavings + autoAmount);

            // Record transaction
            financeManager.recordTransaction({
                type: 'expense',
                category: 'savings_deposit',
                amount: -autoAmount,
                description: 'Auto Deposit Bulanan'
            });

            gameState.emit('savingsUpdate');

            // Trigger notification
            import('../ui/UIManager.js').then(({ default: ui }) => {
                ui.success(`Auto Deposit Berhasil: $ ${financeManager.formatCurrency(autoAmount)} ditransfer otomatis ke deposito.`, 'Deposito');
            });
        } else {
            // Trigger warning
            import('../ui/UIManager.js').then(({ default: ui }) => {
                ui.warning(`Auto Deposit Gagal: Saldo tidak mencukupi untuk setoran otomatis sebesar $ ${financeManager.formatCurrency(autoAmount)}.`, 'Deposito');
            });
        }
    }

    /**
     * Get interest rate info
     */
    getInterestInfo() {
        return {
            monthlyRate: this.interestRate,
            yearlyRate: this.interestRate * 12,
            monthlyRatePercent: this.interestRate * 100,
            yearlyRatePercent: this.interestRate * 12 * 100
        };
    }
}

export const savingsManager = new SavingsManager();
export default savingsManager;
