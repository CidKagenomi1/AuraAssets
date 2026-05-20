/**
 * TaxSystem.js - Tax Calculation and Payment
 * Pajak penghasilan dengan bracket system
 */

import gameState from '../game/GameState.js';
import timeManager from '../game/TimeManager.js';
import financeManager from './FinanceManager.js';

class TaxSystem {
    constructor() {
        // Indonesian tax brackets (simplified)
        this.taxBrackets = [
            { min: 0, max: 11000, rate: 0.10 },          // 10% up to $11k
            { min: 11000, max: 44725, rate: 0.12 },      // 12% for $11k-$45k
            { min: 44725, max: 95375, rate: 0.22 },      // 22% for $45k-$95k
            { min: 95375, max: 182100, rate: 0.24 },     // 24% for $95k-$182k
            { min: 182100, max: Infinity, rate: 0.32 }   // 32% for $182k+
        ];

        this.taxDueMonth = 3; // March (annual tax deadline)
        this.penaltyRate = 0.02; // 2% penalty per month late

        // Track yearly income for tax
        this.yearlyIncome = 0;

        // Listen for year end
        timeManager.onYear(() => this.onYearEnd());
    }

    /**
     * Calculate tax for a given income
     */
    calculateTax(income) {
        let tax = 0;
        let remaining = income;

        for (const bracket of this.taxBrackets) {
            if (remaining <= 0) break;

            const taxableInBracket = Math.min(remaining, bracket.max - bracket.min);
            if (taxableInBracket > 0 && income > bracket.min) {
                const actualTaxable = Math.min(taxableInBracket, income - bracket.min);
                tax += actualTaxable * bracket.rate;
                remaining -= taxableInBracket;
            }
        }

        return Math.round(tax);
    }

    /**
     * Get current year's income for tax calculation
     */
    getCurrentYearIncome() {
        const currentYear = gameState.get('gameTime.year');
        const transactions = gameState.get('transactions') || [];

        return transactions
            .filter(t => t.gameTime?.year === currentYear && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
    }

    /**
     * Get tax summary
     */
    getTaxSummary() {
        const yearlyIncome = this.getCurrentYearIncome();
        const taxDue = this.calculateTax(yearlyIncome);
        const taxPaid = this.getTaxPaidThisYear();
        const remaining = Math.max(0, taxDue - taxPaid);

        // Calculate effective tax rate
        const effectiveRate = yearlyIncome > 0 ? (taxDue / yearlyIncome) * 100 : 0;

        return {
            yearlyIncome,
            taxDue,
            taxPaid,
            remaining,
            effectiveRate,
            deadline: `31 Mar ${gameState.get('gameTime.year')}`
        };
    }

    /**
     * Get tax paid this year
     */
    getTaxPaidThisYear() {
        const currentYear = gameState.get('gameTime.year');
        const transactions = gameState.get('transactions') || [];

        return transactions
            .filter(t =>
                t.gameTime?.year === currentYear &&
                t.category === 'Pajak' &&
                t.amount < 0
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }

    /**
     * Pay tax
     */
    payTax(amount) {
        if (amount <= 0) throw new Error('Jumlah tidak valid');

        const balance = gameState.getBalance();
        if (amount > balance) throw new Error('Saldo tidak cukup');

        const summary = this.getTaxSummary();

        // Can't pay more than owed
        const actualPayment = Math.min(amount, summary.remaining);
        if (actualPayment <= 0) throw new Error('Tidak ada pajak yang perlu dibayar');

        // Record payment
        financeManager.addExpense(actualPayment, 'Pajak', 'Pembayaran Pajak Penghasilan');

        gameState.emit('taxPaid', { amount: actualPayment, remaining: summary.remaining - actualPayment });

        return { paid: actualPayment, remaining: summary.remaining - actualPayment };
    }

    /**
     * Pay all remaining tax
     */
    payAllTax() {
        const summary = this.getTaxSummary();
        if (summary.remaining <= 0) throw new Error('Tidak ada pajak yang perlu dibayar');

        return this.payTax(summary.remaining);
    }

    /**
     * Check if tax is overdue
     */
    isTaxOverdue() {
        const month = gameState.get('gameTime.month');
        const summary = this.getTaxSummary();

        return month > this.taxDueMonth && summary.remaining > 0;
    }

    /**
     * Calculate penalty
     */
    calculatePenalty() {
        if (!this.isTaxOverdue()) return 0;

        const month = gameState.get('gameTime.month');
        const monthsLate = month - this.taxDueMonth;
        const summary = this.getTaxSummary();

        return Math.round(summary.remaining * this.penaltyRate * monthsLate);
    }

    /**
     * Get tax bracket for income
     */
    getTaxBracket(income) {
        for (let i = this.taxBrackets.length - 1; i >= 0; i--) {
            if (income > this.taxBrackets[i].min) {
                return {
                    ...this.taxBrackets[i],
                    index: i
                };
            }
        }
        return { ...this.taxBrackets[0], index: 0 };
    }

    /**
     * Get tax breakdown by bracket
     */
    getTaxBreakdown(income = null) {
        const taxableIncome = income || this.getCurrentYearIncome();
        const breakdown = [];
        let remaining = taxableIncome;

        for (const bracket of this.taxBrackets) {
            if (remaining <= 0) break;

            const rangeStart = bracket.min;
            const rangeEnd = Math.min(bracket.max, taxableIncome);
            const taxableInBracket = Math.max(0, Math.min(remaining, rangeEnd - rangeStart));

            if (taxableInBracket > 0) {
                breakdown.push({
                    bracket: `${this.formatCurrency(bracket.min)} - ${bracket.max === Infinity ? '∞' : this.formatCurrency(bracket.max)}`,
                    rate: bracket.rate * 100,
                    taxableAmount: taxableInBracket,
                    tax: Math.round(taxableInBracket * bracket.rate)
                });
                remaining -= taxableInBracket;
            }
        }

        return breakdown;
    }

    /**
     * Year end processing
     */
    onYearEnd() {
        // Apply penalties for unpaid tax
        const penalty = this.calculatePenalty();
        if (penalty > 0) {
            // Add penalty to debt (or other mechanism)
            gameState.emit('taxPenalty', { amount: penalty });
        }

        // Reset for new year
        console.log('📅 New tax year started');
    }

    formatCurrency(amount) {
        return financeManager.formatCurrency(amount, true);
    }
}

export const taxSystem = new TaxSystem();
export default taxSystem;
