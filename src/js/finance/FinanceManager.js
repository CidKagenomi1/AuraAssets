/**
 * FinanceManager.js - Financial Management
 * Handles income, expenses, transactions, and balance
 */

import gameState from '../core/GameState.js';
import globalEconomy from '../core/GlobalEconomy.js';

class FinanceManager {
    constructor() {
        this.categories = {
            income: ['Gaji', 'Freelance', 'Investasi', 'Penjualan', 'Top Up', 'Earn', 'Bonus', 'Lainnya'],
            expense: ['Belanja', 'Makanan', 'Transport', 'Tagihan', 'Pajak', 'Donasi', 'Cicilan', 'Upgrade', 'Lainnya']
        };
    }

    /**
     * Top Up - Add money to account (affects global economy)
     */
    topUp(amount, source = 'Top Up') {
        if (amount <= 0) throw new Error('Amount must be positive');

        // Add to balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + amount,
            totalTopUp: p.totalTopUp + amount
        }));

        // Record transaction
        const transaction = this.recordTransaction({
            type: 'income',
            category: 'Top Up',
            amount,
            description: source
        });

        // Apply whale effect - money injection = pump
        const isWhale = globalEconomy.isWhaleTransaction(amount);
        const economyResult = globalEconomy.applyPlayerAction(amount, 'inject');

        gameState.emit('topUp', {
            amount,
            isWhale,
            whaleTier: globalEconomy.getWhaleTier(amount),
            economyImpact: economyResult.impact
        });

        return { transaction, economyResult, isWhale };
    }

    /**
     * Donasi / Transfer/Withdraw - Remove money (affects global economy)
     */
    donate(amount, recipient = 'Donasi Amal', category = 'Donasi') {
        if (amount <= 0) throw new Error('Amount must be positive');

        const balance = gameState.getBalance();
        if (amount > balance) throw new Error('Saldo tidak cukup');

        // Subtract from balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amount,
            totalWithdraw: p.totalWithdraw + amount
        }));

        // Record transaction
        const transaction = this.recordTransaction({
            type: 'expense',
            category,
            amount: -amount,
            description: recipient
        });

        // If it's a Donation, apply Luck boost!
        if (category === 'Donasi') {
            const donations = gameState.get('donations') || { totalDonated: 0, luckMultiplier: 1.0, luckTicksRemaining: 0 };
            const newTotal = (donations.totalDonated || 0) + amount;
            
            // Add luck ticks: 30 game days (1 month) per donation action. Max duration 180 days.
            const ticksAdded = 30;
            const newTicks = Math.min(180, (donations.luckTicksRemaining || 0) + ticksAdded);
            
            gameState.set('donations', {
                totalDonated: newTotal,
                luckMultiplier: 1.5,
                luckTicksRemaining: newTicks
            });
            console.log(`🎁 Donation made! Total: $${newTotal}. Luck active for ${newTicks} days.`);
        }

        // Apply whale effect - money removal = dump
        const isWhale = globalEconomy.isWhaleTransaction(amount);
        const economyResult = globalEconomy.applyPlayerAction(amount, 'withdraw');

        gameState.emit('donate', {
            amount,
            isWhale,
            whaleTier: globalEconomy.getWhaleTier(amount),
            economyImpact: economyResult.impact
        });

        return { transaction, economyResult, isWhale };
    }

    /**
     * Add income (doesn't affect global economy unless it's top up)
     */
    addIncome(amount, category = 'Lainnya', description = '') {
        if (amount <= 0) throw new Error('Amount must be positive');

        gameState.update('player', p => ({
            ...p,
            balance: p.balance + amount
        }));

        const transaction = this.recordTransaction({
            type: 'income',
            category,
            amount,
            description
        });

        // Track in income array (capped to last 200 items to avoid localStorage bloat)
        const incomes = gameState.get('income') || [];
        incomes.push({
            ...transaction,
            month: gameState.get('gameTime.month'),
            year: gameState.get('gameTime.year')
        });
        if (incomes.length > 200) {
            gameState.set('income', incomes.slice(-200));
        } else {
            gameState.set('income', incomes);
        }

        return transaction;
    }

    /**
     * Add expense (doesn't affect global economy unless it's transfer)
     */
    addExpense(amount, category = 'Lainnya', description = '') {
        if (amount <= 0) throw new Error('Amount must be positive');

        const balance = gameState.getBalance();
        if (amount > balance) throw new Error('Saldo tidak cukup');

        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amount
        }));

        const transaction = this.recordTransaction({
            type: 'expense',
            category,
            amount: -amount,
            description
        });

        // Track in expenses array (capped to last 200 items to avoid localStorage bloat)
        const expenses = gameState.get('expenses') || [];
        expenses.push({
            ...transaction,
            month: gameState.get('gameTime.month'),
            year: gameState.get('gameTime.year')
        });
        if (expenses.length > 200) {
            gameState.set('expenses', expenses.slice(-200));
        } else {
            gameState.set('expenses', expenses);
        }

        return transaction;
    }

    /**
     * Record transaction in history
     */
    recordTransaction({ type, category, amount, description }) {
        const transaction = {
            id: Date.now() + Math.random(),
            type,
            category,
            amount,
            description,
            balance: gameState.getBalance(),
            timestamp: Date.now(),
            gameTime: {
                day: gameState.get('gameTime.day'),
                month: gameState.get('gameTime.month'),
                year: gameState.get('gameTime.year')
            }
        };

        const transactions = gameState.get('transactions') || [];
        transactions.unshift(transaction);

        // Keep last 500 transactions
        if (transactions.length > 500) {
            gameState.set('transactions', transactions.slice(0, 500));
        } else {
            gameState.set('transactions', transactions);
        }

        return transaction;
    }

    /**
     * Get monthly summary
     */
    getMonthlySummary(month = null, year = null) {
        const currentMonth = month || gameState.get('gameTime.month');
        const currentYear = year || gameState.get('gameTime.year');

        const transactions = gameState.get('transactions') || [];
        const monthTransactions = transactions.filter(t =>
            t.gameTime?.month === currentMonth && t.gameTime?.year === currentYear
        );

        const totalIncome = monthTransactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = monthTransactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const netFlow = totalIncome - totalExpense;

        // Group by category
        const incomeByCategory = {};
        const expenseByCategory = {};

        monthTransactions.forEach(t => {
            if (t.amount > 0) {
                incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
            } else {
                expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Math.abs(t.amount);
            }
        });

        return {
            month: currentMonth,
            year: currentYear,
            totalIncome,
            totalExpense,
            netFlow,
            incomeByCategory,
            expenseByCategory,
            transactionCount: monthTransactions.length
        };
    }

    /**
     * Get balance change percentage this month
     */
    getMonthlyChange() {
        const currentBalance = gameState.getBalance();
        const monthStart = gameState.get('player.monthStartBalance') || currentBalance;

        if (monthStart === 0) return 0;
        return ((currentBalance - monthStart) / monthStart) * 100;
    }

    /**
     * Format currency
     */
    formatCurrency(amount, short = false) {
        const abs = Math.abs(amount);

        if (short) {
            if (abs >= 1e12) return (amount / 1e12).toFixed(1) + 'T';
            if (abs >= 1e9) return (amount / 1e9).toFixed(1) + 'B';
            if (abs >= 1e6) return (amount / 1e6).toFixed(1) + 'M';
            if (abs >= 1e3) return (amount / 1e3).toFixed(1) + 'K';
        }

        return new Intl.NumberFormat('en-US').format(Math.round(amount));
    }

    /**
     * Get recent transactions
     */
    getRecentTransactions(limit = 10) {
        const transactions = gameState.get('transactions') || [];
        return transactions.slice(0, limit);
    }

    /**
     * Get transaction icon
     */
    getTransactionIcon(category) {
        const icons = {
            'Gaji': '💰',
            'salary': '💰',
            'Freelance': '💻',
            'Investasi': '📈',
            'Penjualan': '🛒',
            'Top Up': '➕',
            'topup': '➕',
            'Earn': '💰',
            'Upgrade': '⬆️',
            'Bonus': '🎁',
            'Belanja': '🛍️',
            'Makanan': '🍔',
            'Transport': '🚗',
            'Tagihan': '📄',
            'Pajak': '🧾',
            'Donate': '🎁',
            'Donasi': '🎁',
            'Cicilan': '🏦',
            'loan_received': '🏦',
            'loan_payment': '💳',
            'loan_payoff': '✅',
            'stock_buy': '📊',
            'stock_sell': '📈',
            'crypto_buy': '🪙',
            'crypto_sell': '💎',
            'Lainnya': '📝'
        };
        return icons[category] || '📝';
    }
}

export const financeManager = new FinanceManager();
export default financeManager;
