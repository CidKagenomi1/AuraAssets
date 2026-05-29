/**
 * BankSystem.js - Bank Loans and Credit
 * Pinjaman bank dengan bunga dan credit score
 */

import gameState from '../core/GameState.js';
import timeManager from '../core/TimeManager.js';
import financeManager from './FinanceManager.js';

class BankSystem {
    constructor() {
        this.loanProducts = [
            { id: 'personal', name: 'Pinjaman Personal', maxAmount: 500000, interestRate: 0.015, termMonths: 12 },
            { id: 'business', name: 'Pinjaman Bisnis', maxAmount: 5000000, interestRate: 0.012, termMonths: 24 },
            { id: 'emergency', name: 'Pinjaman Darurat', maxAmount: 100000, interestRate: 0.025, termMonths: 6 },
            { id: 'mortgage', name: 'KPR', maxAmount: 20000000, interestRate: 0.008, termMonths: 120 }
        ];

        // Listen for monthly payments
        timeManager.onMonth(() => this.processMonthlyPayments());
    }

    /**
     * Check if player name matches cheat code names (TRUMP, ELON, etc.)
     */
    isCheatActive() {
        const name = gameState.get('player.name') || '';
        const cheats = ['SENTOT', 'BEAR', 'TRUMP', 'GOLD', 'Dollar', 'ELON', 'SATOSHI', 'PANGESTU'];
        return cheats.includes(name.trim().toUpperCase());
    }

    /**
     * Get available loan amount based on credit score
     */
    getAvailableLoanAmount(productId) {
        if (this.isCheatActive()) {
            return 999999999999;
        }

        const product = this.loanProducts.find(p => p.id === productId);
        if (!product) return 0;

        const creditScore = gameState.get('player.creditScore') || 700;
        const scoreMultiplier = creditScore / 700; // 1.0 at 700, higher/lower based on score

        // Check existing loans
        const existingLoans = gameState.get('loans') || [];
        const totalOutstanding = existingLoans
            .filter(l => !l.paid)
            .reduce((sum, l) => sum + l.remaining, 0);

        // Max debt ratio based on credit score - HIGHER to allow debt traps!
        const maxDebtRatio = 1.5 + (scoreMultiplier - 1) * 0.5; // 150% at 700, up to 200% at max
        const balance = gameState.getBalance();
        const maxAllowedDebt = Math.max((balance + product.maxAmount) * maxDebtRatio, product.maxAmount * 2);

        const availableDebt = Math.max(0, maxAllowedDebt - totalOutstanding);
        const maxByProduct = product.maxAmount * scoreMultiplier;

        return Math.min(availableDebt, maxByProduct);
    }

    /**
     * Apply for loan
     */
    applyLoan(productId, amount) {
        const product = this.loanProducts.find(p => p.id === productId);
        if (!product) throw new Error('Produk pinjaman tidak ditemukan');

        const available = this.getAvailableLoanAmount(productId);
        if (amount > available) throw new Error('Jumlah melebihi batas pinjaman');
        if (amount <= 0) throw new Error('Jumlah tidak valid');

        const isCheat = this.isCheatActive();
        const interestRate = isCheat ? 0 : product.interestRate;

        // Calculate loan details
        const monthlyInterest = interestRate;
        const totalInterest = amount * monthlyInterest * product.termMonths;
        const totalPayment = amount + totalInterest;
        const monthlyPayment = isCheat ? 0 : (totalPayment / product.termMonths);

        const loan = {
            id: Date.now(),
            productId,
            productName: product.name + (isCheat ? ' (Cheat 0%)' : ''),
            principal: amount,
            interestRate: monthlyInterest,
            termMonths: product.termMonths,
            totalPayment,
            monthlyPayment,
            remaining: totalPayment,
            monthsPaid: 0,
            startDate: {
                month: gameState.get('gameTime.month'),
                year: gameState.get('gameTime.year')
            },
            paid: false,
            missedPayments: 0,
            isCheat: isCheat
        };

        // Add loan
        const loans = gameState.get('loans') || [];
        loans.push(loan);
        gameState.set('loans', loans);

        // Add amount to balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + amount
        }));

        // Record transaction to history
        financeManager.recordTransaction({
            amount: amount,
            category: 'loan_received',
            description: `Pinjam ${product.name}`,
            details: {
                loanId: loan.id,
                termMonths: product.termMonths,
                monthlyPayment: monthlyPayment
            }
        });

        gameState.emit('loanApproved', loan);

        return loan;
    }

    /**
     * Make loan payment
     */
    makePayment(loanId, amount = null) {
        const loans = gameState.get('loans') || [];
        const loan = loans.find(l => l.id === loanId);

        if (!loan) throw new Error('Pinjaman tidak ditemukan');
        if (loan.paid) throw new Error('Pinjaman sudah lunas');

        const paymentAmount = amount || loan.monthlyPayment;
        const balance = gameState.getBalance();

        if (paymentAmount > balance) throw new Error('Saldo tidak cukup');
        if (paymentAmount > loan.remaining) throw new Error('Pembayaran melebihi sisa pinjaman');

        // Deduct from balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - paymentAmount
        }));

        // Record transaction to history
        financeManager.recordTransaction({
            amount: -paymentAmount,
            category: 'loan_payment',
            description: `Cicilan ${loan.productName}`,
            details: {
                loanId: loan.id,
                remaining: loan.remaining - paymentAmount,
                monthsPaid: loan.monthsPaid + 1
            }
        });

        // Update loan
        loan.remaining -= paymentAmount;
        loan.monthsPaid++;

        if (loan.remaining <= 0) {
            loan.paid = true;
            loan.remaining = 0;

            // Improve credit score
            this.adjustCreditScore(10);

            gameState.emit('loanPaidOff', loan);
        }

        gameState.set('loans', loans);
        gameState.emit('loanPayment', { loan, amount: paymentAmount });

        return loan;
    }

    /**
     * Process monthly payments (called by TimeManager)
     */
    processMonthlyPayments() {
        const loans = gameState.get('loans') || [];
        const balance = gameState.getBalance();

        loans.filter(l => !l.paid).forEach(loan => {
            if (loan.isCheat) {
                // Free cheat loan: term increments, but no actual player balance deductions occur!
                loan.monthsPaid++;
                if (loan.monthsPaid >= loan.termMonths) {
                    loan.paid = true;
                    loan.remaining = 0;
                }
                return;
            }

            if (balance >= loan.monthlyPayment) {
                try {
                    this.makePayment(loan.id);
                } catch (e) {
                    console.error('Failed to process payment:', e);
                }
            } else {
                // Missed payment
                loan.missedPayments++;
                this.adjustCreditScore(-20); // Penalty

                // Add late fee
                const lateFee = loan.monthlyPayment * 0.05;
                loan.remaining += lateFee;

                gameState.emit('loanMissedPayment', { loan, lateFee });
            }
        });

        gameState.set('loans', loans);
    }

    /**
     * Pay off loan early
     */
    payOffEarly(loanId) {
        const loans = gameState.get('loans') || [];
        const loan = loans.find(l => l.id === loanId);

        if (!loan) throw new Error('Pinjaman tidak ditemukan');
        if (loan.paid) throw new Error('Pinjaman sudah lunas');

        // Early payoff discount (10% off remaining interest)
        const discount = loan.remaining * 0.1;
        const payoffAmount = loan.remaining - discount;

        const balance = gameState.getBalance();
        if (payoffAmount > balance) throw new Error('Saldo tidak cukup');

        // Deduct from balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - payoffAmount
        }));

        // Record transaction to history
        financeManager.recordTransaction({
            amount: -payoffAmount,
            category: 'loan_payoff',
            description: `Pelunasan ${loan.productName}`,
            details: {
                loanId: loan.id,
                saved: discount
            }
        });

        loan.remaining = 0;
        loan.paid = true;

        // Big credit score boost for early payoff
        this.adjustCreditScore(25);

        gameState.set('loans', loans);
        gameState.emit('loanPaidOffEarly', { loan, saved: discount });

        return { loan, saved: discount };
    }

    /**
     * Adjust credit score
     */
    adjustCreditScore(change) {
        const current = gameState.get('player.creditScore') || 700;
        const newScore = Math.max(300, Math.min(850, current + change));
        gameState.set('player.creditScore', newScore);

        gameState.emit('creditScoreChange', { old: current, new: newScore, change });
    }

    /**
     * Get all active loans
     */
    getActiveLoans() {
        return (gameState.get('loans') || []).filter(l => !l.paid);
    }

    /**
     * Get total debt
     */
    getTotalDebt() {
        return this.getActiveLoans().reduce((sum, l) => sum + l.remaining, 0);
    }

    /**
     * Get total payoff amount (with 10% early payoff discount)
     */
    getTotalPayoffAmount() {
        const activeLoans = this.getActiveLoans();
        return activeLoans.reduce((sum, l) => {
            const discount = l.remaining * 0.1;
            return sum + (l.remaining - discount);
        }, 0);
    }

    /**
     * Pay off ALL loans at once
     */
    payAllLoans() {
        const activeLoans = this.getActiveLoans();
        if (activeLoans.length === 0) {
            throw new Error('Tidak ada pinjaman aktif');
        }

        const totalPayoff = this.getTotalPayoffAmount();
        const balance = gameState.getBalance();

        if (totalPayoff > balance) {
            throw new Error(`Saldo tidak cukup! Butuh $ ${financeManager.formatCurrency(totalPayoff)}`);
        }

        let totalSaved = 0;
        const loans = gameState.get('loans') || [];

        activeLoans.forEach(loan => {
            const discount = loan.remaining * 0.1;
            const payoffAmount = loan.remaining - discount;
            totalSaved += discount;

            // Deduct from balance
            gameState.update('player', p => ({
                ...p,
                balance: p.balance - payoffAmount
            }));

            // Record transaction
            financeManager.recordTransaction({
                amount: -payoffAmount,
                category: 'loan_payoff',
                description: `Pelunasan ${loan.productName}`,
                details: {
                    loanId: loan.id,
                    saved: discount
                }
            });

            // Mark loan as paid
            loan.remaining = 0;
            loan.paid = true;
        });

        // Big credit score boost
        this.adjustCreditScore(30 * activeLoans.length);

        gameState.set('loans', loans);
        gameState.emit('allLoansPaidOff', { count: activeLoans.length, totalSaved });

        return { count: activeLoans.length, totalSaved };
    }

    /**
     * Get credit score level
     */
    getCreditLevel(score = null) {
        const s = score || gameState.get('player.creditScore') || 700;

        if (s >= 800) return { level: 'Excellent', color: 'green', emoji: '🌟' };
        if (s >= 740) return { level: 'Very Good', color: 'green', emoji: '✨' };
        if (s >= 670) return { level: 'Good', color: 'blue', emoji: '👍' };
        if (s >= 580) return { level: 'Fair', color: 'gold', emoji: '⚠️' };
        return { level: 'Poor', color: 'red', emoji: '❌' };
    }

    /**
     * Get loan products
     */
    getLoanProducts() {
        return this.loanProducts.map(p => ({
            ...p,
            availableAmount: this.getAvailableLoanAmount(p.id)
        }));
    }
}

export const bankSystem = new BankSystem();
export default bankSystem;
