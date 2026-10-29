/**
 * SavingsManager.js - Realistic Bank Savings & Time Deposit (Deposito Berjangka) System
 * Integrates directly with central bank benchmark rates & macroeconomic cycles.
 */

import gameState from '../core/GameState.js';
import timeManager from '../core/TimeManager.js';
import financeManager from './FinanceManager.js';
import globalEconomy from '../core/GlobalEconomy.js';

class SavingsManager {
    constructor() {
        // Daily tick for Time Deposits maturity countdown
        timeManager.onDay(() => {
            this.processDailyTimeDeposits();
        });

        // Monthly tick for Flexible Savings account interest & Auto-Deposit
        timeManager.onMonth(() => {
            this.processMonthlyInterest();
            this.processAutoDeposit();
        });
    }

    /**
     * Get Central Bank Benchmark Policy Rate (% per annum)
     * Dynamic based on macroeconomic cycle phase
     */
    getBenchmarkRate() {
        const econ = gameState.get('economy') || {};
        const phase = econ.phase || 'RECOVERY';

        switch (phase) {
            case 'BEAR':
            case 'CORRECTION':
                // Central bank raises rate to fight inflation or defend currency
                return 6.50;
            case 'PEAK':
                return 5.75;
            case 'RECOVERY':
                return 5.25;
            case 'BULL':
            default:
                // Accommodative low rates for business expansion
                return 4.75;
        }
    }

    /**
     * Tenor Configurations with realistic yield spreads & early break penalties
     */
    getTenorOptions() {
        const benchmark = this.getBenchmarkRate();
        return [
            {
                id: 'tenor_3d',
                tenorDays: 3,
                label: '3 Hari (Kilat)',
                shortLabel: '3 Hari',
                minDeposit: 500,
                rateAnnual: Math.max(3.5, +(benchmark - 0.50).toFixed(2)),
                penaltyPercent: 0,
                penaltyDesc: 'Bunga berjalan hangus jika dicairkan sebelum 3 hari',
                desc: 'Parkir dana kilat dengan likuiditas super cepat untuk trader harian'
            },
            {
                id: 'tenor_7d',
                tenorDays: 7,
                label: '7 Hari (1 Minggu)',
                shortLabel: '7 Hari',
                minDeposit: 1000,
                rateAnnual: Math.max(4.5, +(benchmark + 0.25).toFixed(2)),
                penaltyPercent: 0.25,
                penaltyDesc: 'Bunga hangus + penalti biaya admin 0.25% dari pokok',
                desc: 'Alokasi likuiditas mingguan terukur dengan imbal hasil stabil'
            },
            {
                id: 'tenor_14d',
                tenorDays: 14,
                label: '14 Hari (2 Minggu)',
                shortLabel: '14 Hari',
                minDeposit: 2500,
                rateAnnual: Math.max(5.75, +(benchmark + 1.00).toFixed(2)),
                penaltyPercent: 0.5,
                penaltyDesc: 'Bunga hangus + penalti biaya admin 0.5% dari pokok',
                desc: 'Pertumbuhan modal optimal paruh bulan dengan imbal hasil kompetitif'
            },
            {
                id: 'tenor_30d',
                tenorDays: 30,
                label: '30 Hari (1 Bulan)',
                shortLabel: '30 Hari (1 Bln)',
                minDeposit: 5000,
                rateAnnual: Math.max(7.25, +(benchmark + 2.00).toFixed(2)),
                penaltyPercent: 1.0,
                penaltyDesc: 'Bunga hangus + penalti biaya admin 1.0% dari pokok',
                desc: 'Imbal hasil prima tertinggi komitmen modal 1 bulan penuh'
            }
        ];
    }

    getBalance() {
        return gameState.get('savings.balance') || 0;
    }

    /**
     * Get active time deposits array
     */
    getTimeDeposits() {
        return gameState.get('savings.timeDeposits') || [];
    }

    /**
     * Total Savings Wealth = Flexible Savings + Active Time Deposits Principals
     */
    getTotalSavings() {
        const flexible = this.getBalance();
        const deposits = this.getTimeDeposits();
        const depositsSum = deposits.reduce((sum, d) => sum + (d.principal || 0), 0);
        return flexible + depositsSum;
    }

    /**
     * Deposit cash into flexible liquid savings
     */
    deposit(amount) {
        if (amount <= 0) throw new Error('Jumlah setoran tidak valid');

        const playerBalance = gameState.getBalance();
        if (amount > playerBalance) throw new Error('Saldo kas utama tidak cukup');

        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amount
        }));

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

        financeManager.recordTransaction({
            type: 'expense',
            amount: -amount,
            category: 'Investasi',
            description: 'Setor Kas ke Tabungan Bank'
        });

        gameState.emit('savingsUpdate');
        return this.getBalance();
    }

    /**
     * Withdraw cash from flexible liquid savings
     */
    withdraw(amount) {
        if (amount <= 0) throw new Error('Jumlah penarikan tidak valid');

        const savingsBalance = this.getBalance();
        if (amount > savingsBalance) throw new Error('Saldo tabungan bank tidak cukup');

        gameState.set('savings.balance', savingsBalance - amount);

        gameState.update('player', p => ({
            ...p,
            balance: p.balance + amount
        }));

        financeManager.recordTransaction({
            type: 'income',
            amount: amount,
            category: 'Investasi',
            description: 'Tarik Kas dari Tabungan Bank'
        });

        gameState.emit('savingsUpdate');
        return this.getBalance();
    }

    /**
     * Open a new Time Deposit Certificate (Deposito Berjangka)
     */
    openTimeDeposit(amount, tenorDays, autoRollOver = false) {
        if (amount <= 0) throw new Error('Nominal penempatan tidak valid');

        const tenors = this.getTenorOptions();
        const selectedTenor = tenors.find(t => t.tenorDays === tenorDays);
        if (!selectedTenor) throw new Error('Tenor deposito tidak ditemukan');

        if (amount < selectedTenor.minDeposit) {
            throw new Error(`Minimal penempatan untuk tenor ${selectedTenor.shortLabel} adalah $ ${financeManager.formatCurrency(selectedTenor.minDeposit)}`);
        }

        const playerBalance = gameState.getBalance();
        if (amount > playerBalance) {
            throw new Error('Saldo kas utama tidak mencukupi untuk membuka sertifikat deposito ini');
        }

        // Deduct from main cash
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amount
        }));

        const nowDay = gameState.get('gameTime.day') || 1;
        const nowMonth = gameState.get('gameTime.month') || 1;
        const nowYear = gameState.get('gameTime.year') || 2026;

        // Calculate expected interest payout: (Principal * Rate * Days / 360)
        const projectedInterest = Math.max(1, Math.round(amount * (selectedTenor.rateAnnual / 100) * (tenorDays / 360)));

        const newDeposit = {
            id: 'dep_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            principal: amount,
            tenorDays: tenorDays,
            tenorLabel: selectedTenor.shortLabel,
            rateAnnual: selectedTenor.rateAnnual,
            startDay: nowDay,
            startMonth: nowMonth,
            startYear: nowYear,
            daysRemaining: tenorDays,
            projectedInterest: projectedInterest,
            autoRollOver: !!autoRollOver,
            penaltyPercent: selectedTenor.penaltyPercent
        };

        const currentDeposits = this.getTimeDeposits();
        gameState.set('savings.timeDeposits', [...currentDeposits, newDeposit]);

        financeManager.recordTransaction({
            type: 'expense',
            amount: -amount,
            category: 'Investasi',
            description: `Pembukaan Deposito Berjangka (${selectedTenor.shortLabel} @ ${selectedTenor.rateAnnual}% p.a.)`
        });

        gameState.emit('savingsUpdate');
        return newDeposit;
    }

    /**
     * Break / Early Liquidation of a Time Deposit before maturity
     */
    breakTimeDeposit(depositId) {
        const deposits = this.getTimeDeposits();
        const deposit = deposits.find(d => d.id === depositId);
        if (!deposit) throw new Error('Sertifikat deposito tidak ditemukan');

        const penaltyAmount = Math.floor(deposit.principal * (deposit.penaltyPercent / 100));
        const netRefund = deposit.principal - penaltyAmount;

        // Return refunded principal to player
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + netRefund
        }));

        // Remove from active deposits
        const updatedDeposits = deposits.filter(d => d.id !== depositId);
        gameState.set('savings.timeDeposits', updatedDeposits);

        financeManager.recordTransaction({
            type: 'income',
            amount: netRefund,
            category: 'Investasi',
            description: `Pencairan Dini Deposito (${deposit.tenorLabel} - Penalti: $ ${financeManager.formatCurrency(penaltyAmount)})`
        });

        gameState.emit('savingsUpdate');
        return { netRefund, penaltyAmount };
    }

    /**
     * Daily tick: Advance remaining days on active time deposits & handle maturity
     */
    processDailyTimeDeposits() {
        const deposits = this.getTimeDeposits();
        if (!deposits.length) return;

        let hasChanges = false;
        const updatedDeposits = [];

        deposits.forEach(dep => {
            dep.daysRemaining -= 1;

            if (dep.daysRemaining <= 0) {
                // Deposit matured!
                hasChanges = true;
                const payoutInterest = dep.projectedInterest;

                if (dep.autoRollOver) {
                    // Pay out interest to player cash, reset tenor for principal
                    gameState.addBalance(payoutInterest, 'Investasi', `Bunga Deposito Jatuh Tempo (${dep.tenorLabel})`);
                    
                    // Reset days remaining
                    dep.daysRemaining = dep.tenorDays;
                    dep.projectedInterest = Math.max(1, Math.round(dep.principal * (dep.rateAnnual / 100) * (dep.tenorDays / 360)));
                    updatedDeposits.push(dep);

                    import('../ui/UIManager.js').then(({ default: ui }) => {
                        ui.success(
                            `Deposito $ ${financeManager.formatCurrency(dep.principal)} jatuh tempo & diperpanjang otomatis (ARO)! Bunga +$ ${financeManager.formatCurrency(payoutInterest)} telah masuk ke kas utama.`,
                            '🏦 Deposito Diperpanjang'
                        );
                    });
                } else {
                    // Full payout: Principal + Interest back to player cash
                    const totalPayout = dep.principal + payoutInterest;
                    gameState.addBalance(totalPayout, 'Investasi', `Pencairan Pokok + Bunga Deposito (${dep.tenorLabel})`);

                    import('../ui/UIManager.js').then(({ default: ui }) => {
                        ui.success(
                            `Deposito $ ${financeManager.formatCurrency(dep.principal)} telah lunas jatuh tempo! Total pencairan +$ ${financeManager.formatCurrency(totalPayout)} (termasuk bunga $ ${financeManager.formatCurrency(payoutInterest)}) berhasil diterima.`,
                            '🏦 Deposito Jatuh Tempo'
                        );
                    });
                }
            } else {
                updatedDeposits.push(dep);
            }
        });

        if (hasChanges || deposits.length > 0) {
            gameState.set('savings.timeDeposits', updatedDeposits);
            gameState.emit('savingsUpdate');
        }
    }

    /**
     * Process monthly interest for flexible liquid savings account
     */
    processMonthlyInterest() {
        const balance = this.getBalance();
        if (balance <= 0) return;

        // Flexible liquid savings rate: benchmark - 2.0% p.a., min 2.5% p.a.
        const benchmark = this.getBenchmarkRate();
        const annualRate = Math.max(2.5, benchmark - 2.0);
        const monthlyRate = (annualRate / 100) / 12;

        const interest = Math.floor(balance * monthlyRate);
        if (interest > 0) {
            gameState.set('savings.lastInterest', interest);
            gameState.addBalance(interest, 'Investasi', `Bunga Tabungan Fleksibel (${annualRate.toFixed(2)}% p.a.)`);
            gameState.emit('interestReceived', { amount: interest });
        }
    }

    /**
     * Process monthly auto-deposit from main cash to flexible savings
     */
    processAutoDeposit() {
        const isAutoEnabled = gameState.get('savings.autoDepositEnabled') || false;
        if (!isAutoEnabled) return;

        const autoAmount = gameState.get('savings.autoDepositAmount') || 0;
        if (autoAmount <= 0) return;

        const playerBalance = gameState.getBalance();
        if (playerBalance >= autoAmount) {
            gameState.update('player', p => ({
                ...p,
                balance: p.balance - autoAmount
            }));

            const currentSavings = this.getBalance();
            gameState.set('savings.balance', currentSavings + autoAmount);

            financeManager.recordTransaction({
                type: 'expense',
                category: 'Investasi',
                amount: -autoAmount,
                description: 'Auto-Deposit Tabungan Bulanan'
            });

            gameState.emit('savingsUpdate');

            import('../ui/UIManager.js').then(({ default: ui }) => {
                ui.success(`Auto-Deposit Berhasil: $ ${financeManager.formatCurrency(autoAmount)} dialokasikan ke tabungan bank.`, 'Tabungan Bank');
            });
        } else {
            import('../ui/UIManager.js').then(({ default: ui }) => {
                ui.warning(`Auto-Deposit Tertunda: Saldo kas utama tidak mencukupi untuk setoran otomatis sebesar $ ${financeManager.formatCurrency(autoAmount)}.`, 'Tabungan Bank');
            });
        }
    }

    /**
     * Get Flexible savings interest rate info
     */
    getInterestInfo() {
        const benchmark = this.getBenchmarkRate();
        const annualRate = Math.max(2.5, benchmark - 2.0);
        const monthlyRate = annualRate / 12;
        return {
            benchmarkRate: benchmark,
            flexibleAnnualRate: annualRate,
            flexibleMonthlyRate: monthlyRate
        };
    }
}

export const savingsManager = new SavingsManager();
export default savingsManager;
