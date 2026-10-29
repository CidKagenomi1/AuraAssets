/**
 * MutualFundManager.js - Comprehensive Mutual Funds (Reksa Dana) Market Engine
 * Real-time NAV valuation, correlated with stock market and macroeconomic interest rates.
 */

import gameState from '../core/GameState.js';
import timeManager from '../core/TimeManager.js';
import financeManager from '../finance/FinanceManager.js';
import stockMarket from './StockMarket.js';

class MutualFundManager {
    constructor() {
        this.funds = [
            {
                id: 'pasar_uang',
                name: 'Manulife Dana Kas Mandiri',
                type: 'Pasar Uang',
                icon: '💵',
                risk: 'Sangat Rendah',
                riskColor: '#10b981',
                nav: 1.052,
                baseNav: 1.050,
                dailyChange: 0.02,
                returnAnnual: 5.2,
                minBuy: 100,
                manager: 'PT Manulife Aset Manajemen',
                aum: '$ 1.4 Miliar',
                desc: 'Investasi pada instrumen pasar uang likuid dan deposito bank berjangka rating AAA dengan risiko penurunan nilai hampir nol.'
            },
            {
                id: 'pendapatan_tetap',
                name: 'Schroder Obligasi Mantap Plus',
                type: 'Pendapatan Tetap',
                icon: '📄',
                risk: 'Moderat-Rendah',
                riskColor: '#0ea5e9',
                nav: 1.258,
                baseNav: 1.250,
                dailyChange: 0.04,
                returnAnnual: 8.6,
                minBuy: 250,
                manager: 'PT Schroder Investment Management',
                aum: '$ 850 Juta',
                desc: 'Mayoritas portofolio dialokasikan pada Surat Berharga Negara (SBN/US Treasuries) dan obligasi korporasi pilihan berperingkat investasi.'
            },
            {
                id: 'campuran',
                name: 'Batavia Kombinasi Optimal',
                type: 'Campuran',
                icon: '⚖️',
                risk: 'Moderat',
                riskColor: '#f59e0b',
                nav: 2.165,
                baseNav: 2.150,
                dailyChange: 0.12,
                returnAnnual: 13.8,
                minBuy: 500,
                manager: 'PT Batavia Prosperindo Aset',
                aum: '$ 620 Juta',
                desc: 'Alokasi seimbang 50% saham berfundamental tangguh dan 50% surat utang berkualitas untuk pertumbuhan modal optimal jangka menengah.'
            },
            {
                id: 'saham',
                name: 'Eastspring Equity Alpha Discovery',
                type: 'Saham (Equity)',
                icon: '📈',
                risk: 'Tinggi',
                riskColor: '#ef4444',
                nav: 3.945,
                baseNav: 3.920,
                dailyChange: 0.35,
                returnAnnual: 21.5,
                minBuy: 1000,
                manager: 'PT Eastspring Investments',
                aum: '$ 1.2 Miliar',
                desc: 'Portofolio saham unggulan berkapitalisasi besar (Blue-Chip) dan pemimpin industri inovatif dengan akselerasi imbal hasil maksimal.'
            }
        ];

        this.loadState();

        // Daily NAV micro-fluctuation
        timeManager.onDay(() => {
            this.updateDailyNAV();
        });
    }

    loadState() {
        const savedNav = gameState.get('reksaDanaNav');
        if (savedNav) {
            this.funds.forEach(f => {
                if (savedNav[f.id]) {
                    f.nav = savedNav[f.id].nav;
                    f.dailyChange = savedNav[f.id].dailyChange || 0;
                }
            });
        }
    }

    saveState() {
        const navMap = {};
        this.funds.forEach(f => {
            navMap[f.id] = { nav: f.nav, dailyChange: f.dailyChange };
        });
        gameState.set('reksaDanaNav', navMap);
    }

    /**
     * Update daily NAV based on market movements and bond yields
     */
    updateDailyNAV() {
        // Calculate average stock market movement
        const allStocks = stockMarket.getAllStocks() || [];
        let stockAvgChange = 0;
        if (allStocks.length > 0) {
            const sumChange = allStocks.reduce((sum, s) => sum + (s.change || 0), 0);
            stockAvgChange = sumChange / allStocks.length;
        }

        this.funds.forEach(f => {
            const prevNav = f.nav;
            let dayPercent = 0;

            if (f.id === 'pasar_uang') {
                // Steady daily gain, strictly non-negative
                dayPercent = 0.012 + (Math.random() * 0.006);
            } else if (f.id === 'pendapatan_tetap') {
                // Low volatility, steady upward drift
                dayPercent = 0.022 + ((Math.random() - 0.3) * 0.02);
            } else if (f.id === 'campuran') {
                // 50% stock correlation + 50% steady yield
                dayPercent = (stockAvgChange * 0.45) + 0.035 + ((Math.random() - 0.5) * 0.05);
            } else if (f.id === 'saham') {
                // Strongly correlated with overall stock index
                dayPercent = (stockAvgChange * 0.85) + ((Math.random() - 0.5) * 0.1);
            }

            // Apply change
            f.nav = Math.max(0.1, +(f.nav * (1 + (dayPercent / 100))).toFixed(4));
            f.dailyChange = +(((f.nav - prevNav) / prevNav) * 100).toFixed(2);
        });

        this.saveState();
        gameState.emit('mutualFundsUpdate');
    }

    getFunds() {
        const portfolio = gameState.get('savings.reksaDana') || {};
        return this.funds.map(f => {
            const holding = portfolio[f.id] || { units: 0, invested: 0 };
            const currentValue = holding.units * f.nav;
            const pnl = currentValue - holding.invested;
            const pnlPercent = holding.invested > 0 ? (pnl / holding.invested) * 100 : 0;

            return {
                ...f,
                ownedUnits: holding.units || 0,
                invested: holding.invested || 0,
                currentValue: currentValue,
                pnl: pnl,
                pnlPercent: pnlPercent
            };
        });
    }

    getFund(id) {
        return this.getFunds().find(f => f.id === id);
    }

    getTotalPortfolioValue() {
        const funds = this.getFunds();
        return funds.reduce((sum, f) => sum + f.currentValue, 0);
    }

    /**
     * Subscribe / Buy mutual fund units
     */
    buy(fundId, amountUSD) {
        if (amountUSD <= 0) throw new Error('Nominal pembelian tidak valid');

        const fund = this.getFund(fundId);
        if (!fund) throw new Error('Produk Reksa Dana tidak ditemukan');

        if (amountUSD < fund.minBuy) {
            throw new Error(`Minimal pembelian untuk ${fund.name} adalah $ ${financeManager.formatCurrency(fund.minBuy)}`);
        }

        const balance = gameState.getBalance();
        if (amountUSD > balance) {
            throw new Error('Saldo kas utama Anda tidak mencukupi');
        }

        // Deduct player balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amountUSD
        }));

        // Calculate units
        const unitsBought = +(amountUSD / fund.nav).toFixed(4);

        // Update portfolio in GameState
        const portfolio = gameState.get('savings.reksaDana') || {};
        const currentHolding = portfolio[fundId] || { units: 0, invested: 0 };

        portfolio[fundId] = {
            units: +(currentHolding.units + unitsBought).toFixed(4),
            invested: Math.floor(currentHolding.invested + amountUSD),
            lastBuyNav: fund.nav,
            updatedAt: Date.now()
        };

        gameState.set('savings.reksaDana', portfolio);

        // Record transaction
        financeManager.recordTransaction({
            type: 'expense',
            amount: -amountUSD,
            category: 'Investasi',
            description: `Beli Reksa Dana ${fund.name} (${unitsBought.toLocaleString()} Unit @ NAV $${fund.nav.toFixed(4)})`
        });

        gameState.emit('mutualFundsUpdate');
        gameState.emit('savingsUpdate');
        return { unitsBought, fund };
    }

    /**
     * Redeem / Sell mutual fund units
     */
    sell(fundId, units) {
        if (units <= 0) throw new Error('Jumlah unit penjualan tidak valid');

        const fund = this.getFund(fundId);
        if (!fund) throw new Error('Produk Reksa Dana tidak ditemukan');

        if (units > fund.ownedUnits) {
            throw new Error(`Jumlah unit melebihi kepemilikan Anda (Maksimal: ${fund.ownedUnits.toLocaleString()} Unit)`);
        }

        const payoutCash = Math.floor(units * fund.nav);

        // Add cash to player balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + payoutCash
        }));

        // Update portfolio
        const portfolio = gameState.get('savings.reksaDana') || {};
        const currentHolding = portfolio[fundId] || { units: 0, invested: 0 };
        const remainingUnits = +(currentHolding.units - units).toFixed(4);

        // Proportionally reduce invested principal
        const fractionSold = units / currentHolding.units;
        const reducedInvested = Math.floor(currentHolding.invested * (1 - fractionSold));

        if (remainingUnits <= 0.0001) {
            delete portfolio[fundId];
        } else {
            portfolio[fundId] = {
                units: remainingUnits,
                invested: reducedInvested,
                lastBuyNav: currentHolding.lastBuyNav,
                updatedAt: Date.now()
            };
        }

        gameState.set('savings.reksaDana', portfolio);

        financeManager.recordTransaction({
            type: 'income',
            amount: payoutCash,
            category: 'Investasi',
            description: `Penjualan Reksa Dana ${fund.name} (${units.toLocaleString()} Unit @ NAV $${fund.nav.toFixed(4)})`
        });

        gameState.emit('mutualFundsUpdate');
        gameState.emit('savingsUpdate');
        return { payoutCash, remainingUnits };
    }
}

export const mutualFundManager = new MutualFundManager();
export default mutualFundManager;

