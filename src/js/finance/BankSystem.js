/**
 * BankSystem.js - Bank Loans and Credit System
 * Game-scaled loans: Fast turnover, daily installments, maximum 30-day tenor.
 */

import gameState from '../core/GameState.js';
import timeManager from '../core/TimeManager.js';
import financeManager from './FinanceManager.js';

class BankSystem {
    constructor() {
        this.loanProducts = [
            { 
                id: 'flash', 
                name: 'Pinjaman Kilat Flash', 
                maxAmount: 25000, 
                interestRate: 0.015, 
                termDays: 3, 
                termMonths: 1,
                termLabel: '3 Hari',
                icon: '⚡',
                desc: 'Talangan dana darurat kilat untuk trading & momentum pasar cepat' 
            },
            { 
                id: 'personal', 
                name: 'Pinjaman Personal', 
                maxAmount: 100000, 
                interestRate: 0.025, 
                termDays: 7, 
                termMonths: 1,
                termLabel: '7 Hari (1 Mgg)',
                icon: '💳',
                desc: 'Tambahan modal belanja & kebutuhan likuiditas mingguan' 
            },
            { 
                id: 'business', 
                name: 'Pinjaman Modal Usaha', 
                maxAmount: 500000, 
                interestRate: 0.040, 
                termDays: 14, 
                termMonths: 1,
                termLabel: '14 Hari (2 Mgg)',
                icon: '💼',
                desc: 'Ekspansi investasi portofolio atau dana awal akuisisi properti' 
            },
            { 
                id: 'mortgage', 
                name: 'Kredit Investasi Utama', 
                maxAmount: 2500000, 
                interestRate: 0.060, 
                termDays: 30, 
                termMonths: 1,
                termLabel: '30 Hari (1 Bln)',
                icon: '🏛️',
                desc: 'Leverage modal besar tenor maksimal 1 bulan untuk akumulasi aset bernilai tinggi' 
            }
        ];

        // Listen for daily installment auto-deduction
        timeManager.onDay(() => this.processDailyPayments());
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
        const scoreMultiplier = creditScore / 700; // 1.0 at 700

        // Check existing loans
        const existingLoans = gameState.get('loans') || [];
        const totalOutstanding = existingLoans
            .filter(l => !l.paid)
            .reduce((sum, l) => sum + l.remaining, 0);

        // Max debt ratio based on credit score
        const maxDebtRatio = 1.5 + (scoreMultiplier - 1) * 0.5;
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
        if (amount > available) throw new Error('Jumlah melebihi batas pinjaman yang diizinkan');
        if (amount <= 0) throw new Error('Jumlah pinjaman tidak valid');

        const isCheat = this.isCheatActive();
        const interestRate = isCheat ? 0 : product.interestRate;

        // Calculate loan details
        const termDays = product.termDays || 30;
        const totalInterest = Math.floor(amount * interestRate);
        const totalPayment = amount + totalInterest;
        const dailyPayment = isCheat ? 0 : Math.ceil(totalPayment / termDays);

        const loan = {
            id: Date.now() + '_' + Math.floor(Math.random() * 1000),
            productId,
            productName: product.name + (isCheat ? ' (Cheat 0%)' : ''),
            principal: amount,
            interestRate: interestRate,
            termDays: termDays,
            termMonths: Math.max(1, Math.round(termDays / 30)),
            termLabel: product.termLabel || (termDays + ' Hari'),
            totalPayment,
            dailyPayment,
            monthlyPayment: dailyPayment * 30,
            remaining: totalPayment,
            daysPaid: 0,
            monthsPaid: 0,
            startDate: {
                day: gameState.get('gameTime.day') || 1,
                month: gameState.get('gameTime.month') || 1,
                year: gameState.get('gameTime.year') || 2026
            },
            paid: false,
            missedPayments: 0,
            isCheat: isCheat
        };

        // Add loan to state
        const loans = gameState.get('loans') || [];
        loans.push(loan);
        gameState.set('loans', loans);

        // Add cash to balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + amount
        }));

        // Record transaction
        financeManager.recordTransaction({
            type: 'income',
            amount: amount,
            category: 'loan_received',
            description: `Pencairan ${product.name} (Tenor: ${loan.termLabel})`,
            details: {
                loanId: loan.id,
                termDays: termDays,
                dailyPayment: dailyPayment
            }
        });

        gameState.emit('loanApproved', loan);
        return loan;
    }

    /**
     * Make loan payment (single daily installment or custom amount)
     */
    makePayment(loanId, amount = null) {
        const loans = gameState.get('loans') || [];
        const loan = loans.find(l => l.id === loanId);

        if (!loan) throw new Error('Pinjaman tidak ditemukan');
        if (loan.paid) throw new Error('Pinjaman sudah lunas');

        const paymentAmount = amount || loan.dailyPayment || Math.ceil(loan.monthlyPayment / 30) || loan.remaining;
        const balance = gameState.getBalance();

        if (paymentAmount > balance) throw new Error('Saldo kas tidak mencukupi untuk membayar cicilan');
        if (paymentAmount > loan.remaining) throw new Error('Pembayaran melebihi sisa pinjaman');

        // Deduct from balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - paymentAmount
        }));

        const currentDayPaid = (loan.daysPaid || 0) + 1;
        const termDays = loan.termDays || (loan.termMonths ? loan.termMonths * 30 : 30);

        // Record transaction
        financeManager.recordTransaction({
            type: 'expense',
            amount: -paymentAmount,
            category: 'loan_payment',
            description: `Cicilan Harian ${loan.productName} (Hari ${currentDayPaid}/${termDays})`,
            details: {
                loanId: loan.id,
                remaining: loan.remaining - paymentAmount,
                daysPaid: currentDayPaid
            }
        });

        // Update loan progress
        loan.remaining -= paymentAmount;
        loan.daysPaid = currentDayPaid;
        loan.monthsPaid = Math.floor(currentDayPaid / 30);

        if (loan.remaining <= 0) {
            loan.paid = true;
            loan.remaining = 0;

            // Improve credit score on completion
            this.adjustCreditScore(15);
            gameState.emit('loanPaidOff', loan);
        }

        gameState.set('loans', loans);
        gameState.emit('loanPayment', { loan, amount: paymentAmount });

        return loan;
    }

    /**
     * Process daily installment payments (called on every game UTC day pass)
     */
    processDailyPayments() {
        const loans = gameState.get('loans') || [];
        const activeLoans = loans.filter(l => !l.paid);
        if (activeLoans.length === 0) return;

        const balance = gameState.getBalance();

        activeLoans.forEach(loan => {
            if (loan.isCheat) {
                loan.daysPaid = (loan.daysPaid || 0) + 1;
                const termDays = loan.termDays || 30;
                if (loan.daysPaid >= termDays) {
                    loan.paid = true;
                    loan.remaining = 0;
                }
                return;
            }

            const dailyInstallment = loan.dailyPayment || Math.ceil((loan.monthlyPayment || loan.remaining) / 30);

            if (gameState.getBalance() >= dailyInstallment) {
                try {
                    this.makePayment(loan.id, dailyInstallment);
                } catch (e) {
                    console.error('Failed auto payment:', e);
                }
            } else {
                // Missed payment handling
                loan.missedPayments = (loan.missedPayments || 0) + 1;
                this.adjustCreditScore(-15);

                const lateFee = Math.max(25, Math.floor(dailyInstallment * 0.05));
                loan.remaining += lateFee;

                gameState.emit('loanMissedPayment', { loan, lateFee });

                import('../ui/UIManager.js').then(({ default: ui }) => {
                    ui.warning(
                        `⚠️ Saldo tidak cukup untuk cicilan harian ${loan.productName}! Denda keterlambatan +$ ${financeManager.formatCurrency(lateFee)} ditambahkan.`,
                        'Gagal Bayar Cicilan'
                    );
                }).catch(() => {});
            }
        });

        gameState.set('loans', loans);
    }

    /**
     * Pay off loan early with 10% interest discount
     */
    payOffEarly(loanId) {
        const loans = gameState.get('loans') || [];
        const loan = loans.find(l => l.id === loanId);

        if (!loan) throw new Error('Pinjaman tidak ditemukan');
        if (loan.paid) throw new Error('Pinjaman sudah lunas');

        // Early payoff discount (10% off remaining balance)
        const discount = Math.floor(loan.remaining * 0.1);
        const payoffAmount = loan.remaining - discount;

        const balance = gameState.getBalance();
        if (payoffAmount > balance) throw new Error('Saldo tidak cukup untuk melunasi pinjaman');

        // Deduct from balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - payoffAmount
        }));

        financeManager.recordTransaction({
            type: 'expense',
            amount: -payoffAmount,
            category: 'loan_payoff',
            description: `Pelunasan Dini ${loan.productName} (Hemat Diskon: $ ${financeManager.formatCurrency(discount)})`,
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
        return this.getActiveLoans().reduce((sum, l) => sum + (l.remaining || 0), 0);
    }

    /**
     * Get total payoff amount (with 10% early payoff discount)
     */
    getTotalPayoffAmount() {
        const activeLoans = this.getActiveLoans();
        return activeLoans.reduce((sum, l) => {
            const discount = Math.floor(l.remaining * 0.1);
            return sum + (l.remaining - discount);
        }, 0);
    }

    /**
     * Pay off ALL active loans at once
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
            const discount = Math.floor(loan.remaining * 0.1);
            const payoffAmount = loan.remaining - discount;
            totalSaved += discount;

            gameState.update('player', p => ({
                ...p,
                balance: p.balance - payoffAmount
            }));

            financeManager.recordTransaction({
                type: 'expense',
                amount: -payoffAmount,
                category: 'loan_payoff',
                description: `Pelunasan Kolektif ${loan.productName}`,
                details: {
                    loanId: loan.id,
                    saved: discount
                }
            });

            loan.remaining = 0;
            loan.paid = true;
        });

        // Credit score boost for total payoff
        this.adjustCreditScore(30 * activeLoans.length);

        gameState.set('loans', loans);
        gameState.emit('allLoansPaidOff', { count: activeLoans.length, totalSaved });

        return { count: activeLoans.length, totalSaved };
    }

    /**
     * Get credit score tier level
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
     * Get loan products with current user borrowing power
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
