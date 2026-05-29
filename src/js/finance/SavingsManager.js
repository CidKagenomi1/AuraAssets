/**
 * SavingsManager.js - Deposito/Savings System
 * Simple savings account with monthly interest
 */

import gameState from '../game/GameState.js';
import timeManager from '../game/TimeManager.js';
import financeManager from './FinanceManager.js';

class SavingsManager {
    constructor() {
        this.interestRate = 0.005; // 0.5% per month = 6% per year (default)

        // Process interest monthly
        timeManager.onMonth(() => {
            // Use custom rate if set by player
            const customRate = gameState.get('savings.customInterestRate');
            if (customRate !== undefined) this.interestRate = customRate;

            this.processMonthlyInterest();
            this.processAutoDeposit();
            this.processReksaDanaReturns();
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
     * Process monthly reksa dana returns
     */
    processReksaDanaReturns() {
        const rdPortfolio = gameState.get('savings.reksaDana') || {};
        const rdFunds = [
            { id: 'pasar_uang', nav: 1.042, returnMonthly: 0.004 },
            { id: 'pendapatan_tetap', nav: 1.238, returnMonthly: 0.0068 },
            { id: 'campuran', nav: 2.115, returnMonthly: 0.01125 },
            { id: 'saham', nav: 3.871, returnMonthly: 0.01833 },
        ];

        let totalReturn = 0;
        rdFunds.forEach(f => {
            const holding = rdPortfolio[f.id];
            if (!holding || holding.units <= 0) return;
            const currentValue = holding.units * f.nav * 1000;
            const monthReturn = Math.floor(currentValue * f.returnMonthly);
            if (monthReturn > 0) {
                // Grow NAV slightly
                f.nav = f.nav * (1 + f.returnMonthly * 0.1);
                totalReturn += monthReturn;
            }
        });

        if (totalReturn > 0) {
            financeManager.addIncome(totalReturn, 'Investasi', 'Return Reksa Dana Bulanan');
            gameState.emit('rdReturnReceived', { amount: totalReturn });
        }
    }

    /**
     * Get interest rate info
     */
    getInterestInfo() {
        const customRate = gameState.get('savings.customInterestRate');
        const rate = customRate !== undefined ? customRate : this.interestRate;
        return {
            monthlyRate: rate,
            yearlyRate: rate * 12,
            monthlyRatePercent: rate * 100,
            yearlyRatePercent: rate * 12 * 100
        };
    }
}

export const savingsManager = new SavingsManager();
export default savingsManager;
