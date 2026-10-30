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
            // ==========================================
            // KATEGORI 1: REKSA DANA KONVENSIONAL
            // ==========================================
            {
                id: 'pasar_uang',
                category: 'reksa_dana',
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
                desc: 'Investasi pada instrumen pasar uang likuid dan deposito bank berjangka rating AAA dengan risiko penurunan nilai hampir nol.',
                isSafest: true,
                badge: '⭐ Paling Aman & Stabil',
                suitability: 'Sangat cocok untuk pemula & orang yang sudah settle (Anti-Turun)'
            },
            {
                id: 'pendapatan_tetap',
                category: 'reksa_dana',
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
                desc: 'Mayoritas portofolio dialokasikan pada Surat Berharga Negara (SBN/US Treasuries) dan obligasi korporasi pilihan berperingkat investasi.',
                isSafest: false,
                badge: '🛡️ Stabil & Terukur',
                suitability: 'Cocok untuk modal bertumbuh stabil di atas bunga deposito'
            },
            {
                id: 'campuran',
                category: 'reksa_dana',
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
                desc: 'Alokasi seimbang 50% saham berfundamental tangguh dan 50% surat utang berkualitas untuk pertumbuhan modal optimal jangka menengah.',
                isSafest: false,
                badge: '⚖️ Pertumbuhan Seimbang',
                suitability: 'Cocok untuk pertumbuhan modal optimal jangka menengah'
            },
            {
                id: 'saham',
                category: 'reksa_dana',
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
                desc: 'Portofolio saham unggulan berkapitalisasi besar (Blue-Chip) dan pemimpin industri inovatif dengan akselerasi imbal hasil maksimal.',
                isSafest: false,
                badge: '🚀 Imbal Hasil Maksimal',
                suitability: 'Cocok untuk investor agresif pemburu imbal hasil tertinggi'
            },

            // ==========================================
            // KATEGORI 2: EXCHANGE-TRADED FUNDS (ETF)
            // ==========================================
            {
                id: 'etf_spy',
                category: 'etf',
                ticker: 'SPY',
                name: 'SPDR S&P 500 ETF Trust',
                type: 'Indeks Saham AS (Large-Cap)',
                sector: 'Indeks Global',
                icon: '🏛️',
                risk: 'Moderat',
                riskColor: '#0ea5e9',
                nav: 520.45,
                baseNav: 520.00,
                dailyChange: 0.18,
                returnAnnual: 16.4,
                minBuy: 50,
                expenseRatio: '0.09%',
                dividendYield: '1.45% p.a.',
                manager: 'State Street Global Advisors',
                aum: '$ 530 Miliar',
                desc: 'Melacak 500 perusahaan raksasa teratas AS (Apple, Microsoft, Nvidia, Amazon, Berkshire). Aset indeks paling likuid di dunia.',
                isSafest: false,
                badge: '👑 Indeks Terbesar Dunia',
                suitability: 'Fondasi portofolio jangka panjang investor global'
            },
            {
                id: 'etf_qqq',
                category: 'etf',
                ticker: 'QQQ',
                name: 'Invesco QQQ Trust (Nasdaq 100)',
                type: 'Teknologi & Inovasi AI',
                sector: 'Teknologi & AI',
                icon: '💻',
                risk: 'Tinggi',
                riskColor: '#818cf8',
                nav: 468.20,
                baseNav: 465.00,
                dailyChange: 0.42,
                returnAnnual: 28.6,
                minBuy: 50,
                expenseRatio: '0.20%',
                dividendYield: '0.62% p.a.',
                manager: 'Invesco Capital Management',
                aum: '$ 280 Miliar',
                desc: 'Melacak 100 pemimpin inovasi bursa Nasdaq penopang revolusi kecerdasan buatan, cloud computing, dan komputasi mobile.',
                isSafest: false,
                badge: '🚀 Raksasa AI & Tech',
                suitability: 'Akselerasi capital gain dari revolusi AI'
            },
            {
                id: 'etf_smh',
                category: 'etf',
                ticker: 'SMH',
                name: 'VanEck Semiconductor ETF',
                type: 'Semikonduktor & Hardware AI',
                sector: 'Semikonduktor',
                icon: '⚡',
                risk: 'Sangat Tinggi',
                riskColor: '#ef4444',
                nav: 242.80,
                baseNav: 240.00,
                dailyChange: 0.75,
                returnAnnual: 42.5,
                minBuy: 50,
                expenseRatio: '0.35%',
                dividendYield: '0.48% p.a.',
                manager: 'VanEck Associates Corp',
                aum: '$ 22 Miliar',
                desc: 'Eksposur murni ke 25 produsen semikonduktor dunia (TSMC, ASML, Nvidia, Broadcom) produsen chip kecerdasan buatan.',
                isSafest: false,
                badge: '🔥 Super-Cycle Chip Global',
                suitability: 'Investor pemburu momentum pertumbuhan industri chip'
            },
            {
                id: 'etf_vnq',
                category: 'etf',
                ticker: 'VNQ',
                name: 'Vanguard Real Estate ETF (REITs)',
                type: 'Real Estate & Properti Komersial',
                sector: 'REITs Properti',
                icon: '🏢',
                risk: 'Moderat',
                riskColor: '#f59e0b',
                nav: 89.15,
                baseNav: 89.00,
                dailyChange: 0.08,
                returnAnnual: 11.2,
                minBuy: 25,
                expenseRatio: '0.12%',
                dividendYield: '4.12% p.a.',
                manager: 'The Vanguard Group',
                aum: '$ 64 Miliar',
                desc: 'Portofolio dana perwalian properti komersial dunia (gedung perkantoran, pusat data cloud, pergudangan & logistik).',
                isSafest: false,
                badge: '🏙️ Dividen Sewa Properti Global',
                suitability: 'Pengganti cerdas aset properti fisik dengan likuiditas instan'
            },
            {
                id: 'etf_eem',
                category: 'etf',
                ticker: 'EEM',
                name: 'iShares MSCI Emerging Markets ETF',
                type: 'Pasar Berkembang Global',
                sector: 'Pasar Berkembang',
                icon: '🌏',
                risk: 'Moderat-Tinggi',
                riskColor: '#34d399',
                nav: 44.60,
                baseNav: 44.50,
                dailyChange: 0.22,
                returnAnnual: 13.5,
                minBuy: 25,
                expenseRatio: '0.68%',
                dividendYield: '2.55% p.a.',
                manager: 'BlackRock Financial Management',
                aum: '$ 18 Miliar',
                desc: 'Akses diversifikasi ke 800+ emiten terkemuka di negara berkembang Asia, Amerika Latin, dan Timur Tengah.',
                isSafest: false,
                badge: '🌐 Pertumbuhan Ekonomi Baru',
                suitability: 'Diversifikasi geografis di luar pasar AS'
            },
            {
                id: 'etf_xlv',
                category: 'etf',
                ticker: 'XLV',
                name: 'Health Care Select Sector SPDR',
                type: 'Kesehatan & Farmasi Defensif',
                sector: 'Kesehatan',
                icon: '🧬',
                risk: 'Rendah-Moderat',
                riskColor: '#10b981',
                nav: 149.30,
                baseNav: 149.00,
                dailyChange: 0.05,
                returnAnnual: 10.8,
                minBuy: 50,
                expenseRatio: '0.10%',
                dividendYield: '1.62% p.a.',
                manager: 'State Street Global Advisors',
                aum: '$ 39 Miliar',
                desc: 'Sektor farmasi, alat kesehatan, dan bioteknologi defensif (Eli Lilly, UnitedHealth, Johnson & Johnson) tahan banting resesi.',
                isSafest: false,
                badge: '🛡️ Sektor Defensif Anti-Resesi',
                suitability: 'Proteksi modal saat siklus pasar melambat'
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
                    f.nav = Number(savedNav[f.id].nav) || f.baseNav;
                    f.dailyChange = Number(savedNav[f.id].dailyChange) || 0;
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
                // Steady daily gain, strictly non-negative (Ultra-safe for beginners & settled people)
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
            } else if (f.id === 'etf_spy') {
                dayPercent = (stockAvgChange * 1.0) + ((Math.random() - 0.5) * 0.08);
            } else if (f.id === 'etf_qqq') {
                dayPercent = (stockAvgChange * 1.35) + ((Math.random() - 0.5) * 0.18);
            } else if (f.id === 'etf_smh') {
                dayPercent = (stockAvgChange * 1.7) + ((Math.random() - 0.5) * 0.3);
            } else if (f.id === 'etf_vnq') {
                dayPercent = 0.025 + ((Math.random() - 0.48) * 0.12);
            } else if (f.id === 'etf_eem') {
                dayPercent = (stockAvgChange * 0.75) + ((Math.random() - 0.5) * 0.2);
            } else if (f.id === 'etf_xlv') {
                dayPercent = (stockAvgChange * 0.35) + 0.02 + ((Math.random() - 0.5) * 0.08);
            }

            // Apply change
            f.nav = Math.max(0.1, +(f.nav * (1 + (dayPercent / 100))).toFixed(4));
            f.dailyChange = +(((f.nav - prevNav) / prevNav) * 100).toFixed(2);
        });

        this.saveState();
        gameState.emit('mutualFundsUpdate');
    }

    getFunds(category = null) {
        const portfolio = gameState.get('savings.reksaDana') || {};
        const list = category ? this.funds.filter(f => f.category === category) : this.funds;
        return list.map(f => {
            const holding = portfolio[f.id] || { units: 0, invested: 0 };
            const nav = Number(f.nav) || f.baseNav;
            const units = Number(holding.units) || 0;
            const invested = Number(holding.invested) || 0;
            const currentValue = units * nav;
            const pnl = currentValue - invested;
            const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

            return {
                ...f,
                nav,
                ownedUnits: units,
                invested: invested,
                currentValue: currentValue,
                pnl: pnl,
                pnlPercent: pnlPercent
            };
        });
    }

    getConventionalFunds() {
        return this.getFunds('reksa_dana');
    }

    getETFs() {
        return this.getFunds('etf');
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
        amountUSD = Number(amountUSD);
        if (!amountUSD || isNaN(amountUSD) || amountUSD <= 0) {
            throw new Error('Nominal pembelian tidak valid');
        }

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
            balance: Math.max(0, p.balance - amountUSD)
        }));

        // Calculate units
        const unitsBought = +(amountUSD / fund.nav).toFixed(4);

        // Update portfolio in GameState
        const portfolio = gameState.get('savings.reksaDana') || {};
        const currentHolding = portfolio[fundId] || { units: 0, invested: 0 };
        const currentUnits = Number(currentHolding.units) || 0;
        const currentInvested = Number(currentHolding.invested) || 0;

        portfolio[fundId] = {
            units: +((currentUnits + unitsBought).toFixed(4)),
            invested: Math.round(currentInvested + amountUSD),
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
        units = Number(units);
        if (!units || isNaN(units) || units <= 0) {
            throw new Error('Jumlah unit penjualan tidak valid');
        }

        const fund = this.getFund(fundId);
        if (!fund) throw new Error('Produk Reksa Dana tidak ditemukan');

        if (units > (fund.ownedUnits + 0.0001)) {
            throw new Error(`Jumlah unit melebihi kepemilikan Anda (Maksimal: ${fund.ownedUnits.toLocaleString()} Unit)`);
        }

        const actualUnitsToSell = Math.min(units, fund.ownedUnits);
        const payoutCash = Math.floor(actualUnitsToSell * fund.nav);

        // Add cash to player balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + payoutCash
        }));

        // Update portfolio
        const portfolio = gameState.get('savings.reksaDana') || {};
        const currentHolding = portfolio[fundId] || { units: 0, invested: 0 };
        const currentUnits = Number(currentHolding.units) || 0;
        const currentInvested = Number(currentHolding.invested) || 0;
        const remainingUnits = Math.max(0, +((currentUnits - actualUnitsToSell).toFixed(4)));

        // Proportionally reduce invested principal
        const fractionSold = currentUnits > 0 ? (actualUnitsToSell / currentUnits) : 1;
        const reducedInvested = Math.max(0, Math.round(currentInvested * (1 - fractionSold)));

        if (remainingUnits <= 0.0001) {
            delete portfolio[fundId];
        } else {
            portfolio[fundId] = {
                units: remainingUnits,
                invested: reducedInvested,
                lastBuyNav: currentHolding.lastBuyNav || fund.nav,
                updatedAt: Date.now()
            };
        }

        gameState.set('savings.reksaDana', portfolio);

        financeManager.recordTransaction({
            type: 'income',
            amount: payoutCash,
            category: 'Investasi',
            description: `Penjualan Reksa Dana ${fund.name} (${actualUnitsToSell.toLocaleString()} Unit @ NAV $${fund.nav.toFixed(4)})`
        });

        gameState.emit('mutualFundsUpdate');
        gameState.emit('savingsUpdate');
        return { payoutCash, remainingUnits };
    }
}

export const mutualFundManager = new MutualFundManager();
export default mutualFundManager;
