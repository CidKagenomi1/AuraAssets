/**
 * CareerManager.js - Investor Mastery, Rank & Milestone Progression System
 * Pure milestone & achievement-based prestige progression (Bukan bekerja / tanpa gaji kantor).
 */

import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import financeManager from '../finance/FinanceManager.js';
import propertyManager from '../property/PropertyManager.js';
import stockMarket from '../trading/StockMarket.js';
import cryptoMarket from '../trading/CryptoMarket.js';

export const INVESTOR_RANKS = [
    {
        level: 1,
        title: 'Investor Pemula',
        subtitle: 'Novice Investor',
        badge: '🔰',
        reqNetWorth: 0,
        reqTrades: 0,
        reqProps: 0,
        desc: 'Memulai perjalanan membangun modal awal di pasar finansial.',
        perk: 'Gelar kehormatan Pemula & akses bursa'
    },
    {
        level: 2,
        title: 'Trader Terampil',
        subtitle: 'Active Market Explorer',
        badge: '📈',
        reqNetWorth: 200000,
        reqTrades: 3,
        reqProps: 0,
        desc: 'Mulai aktif membaca momentum pasar dan melakukan akumulasi aset.',
        perk: 'Akses sinyal AI momentum & analisis pasar'
    },
    {
        level: 3,
        title: 'Pengelola Modal',
        subtitle: 'Smart Capital Builder',
        badge: '🛡️',
        reqNetWorth: 750000,
        reqTrades: 10,
        reqProps: 0,
        desc: 'Memiliki kestabilan portofolio dan manajemen risiko terukur.',
        perk: 'Diskon komisi trading bursa 25%'
    },
    {
        level: 4,
        title: 'Penguasa Aset Multi-Sektor',
        subtitle: 'Asset Master',
        badge: '🏛️',
        reqNetWorth: 2500000,
        reqTrades: 20,
        reqProps: 1,
        desc: 'Membangun diversifikasi multi-aset saham, kripto, dan properti.',
        perk: 'Passive yield properti & staking booster +5%'
    },
    {
        level: 5,
        title: 'Taipan Finansial',
        subtitle: 'Financial Tycoon',
        badge: '👑',
        reqNetWorth: 10000000,
        reqTrades: 35,
        reqProps: 2,
        desc: 'Penguasa modal besar dengan portofolio berskala institusi.',
        perk: 'Hak istimewa Bot Trading otomatis'
    },
    {
        level: 6,
        title: 'Sovereign Whale',
        subtitle: 'Market Sovereign Legend',
        badge: '🌌',
        reqNetWorth: 50000000,
        reqTrades: 50,
        reqProps: 4,
        desc: 'Legenda pasar dengan kebebasan finansial mutlak.',
        perk: 'Gelar prestise Whale Abadi & fee bursa 0%'
    }
];

export const CAREER_ACHIEVEMENTS = [
    {
        id: 'first_trade',
        title: 'Langkah Pertama',
        desc: 'Eksekusi order beli saham atau kripto perdana',
        icon: '🔰',
        check: () => {
            const txs = gameState.get('transactions') || [];
            return txs.some(t => 
                t.category === 'Beli Saham' || t.category === 'Jual Saham' ||
                t.category === 'Beli Kripto' || t.category === 'Jual Kripto' ||
                t.category === 'Stock Buy' || t.category === 'Stock Sell' ||
                t.category === 'Crypto Buy' || t.category === 'Crypto Sell'
            );
        }
    },
    {
        id: 'green_pnl',
        title: 'Cuan Pertama',
        desc: 'Raih total modal berjalan dan nilai pasar positif',
        icon: '💰',
        check: () => {
            const stockVal = stockMarket.getPortfolioValue ? stockMarket.getPortfolioValue() : 0;
            const cryptoVal = cryptoMarket.getWalletValue ? cryptoMarket.getWalletValue() : 0;
            return (stockVal + cryptoVal) >= 150000;
        }
    },
    {
        id: 'multi_asset',
        title: 'Diversifikasi Aset',
        desc: 'Miliki saham dan kripto secara bersamaan',
        icon: '📊',
        check: () => {
            const stocks = stockMarket.getPortfolio ? (stockMarket.getPortfolio() || []) : [];
            const crypto = cryptoMarket.getWallet ? (cryptoMarket.getWallet() || []) : [];
            return stocks.length > 0 && crypto.length > 0;
        }
    },
    {
        id: 'property_owner',
        title: 'Tuan Tanah',
        desc: 'Miliki minimal 1 unit properti real-estate',
        icon: '🏢',
        check: () => {
            const props = propertyManager.getOwnedProperties ? propertyManager.getOwnedProperties() : [];
            return props.length >= 1;
        }
    },
    {
        id: 'wealth_half_m',
        title: 'Klub $500K',
        desc: 'Capai total Kekayaan Bersih $500.000',
        icon: '💼',
        check: () => {
            const nw = gameState.getNetWorth ? gameState.getNetWorth() : gameState.getBalance();
            return nw >= 500000;
        }
    },
    {
        id: 'millionaire',
        title: 'Jutawan Mapan',
        desc: 'Capai total Kekayaan Bersih $1.000.000',
        icon: '💎',
        check: () => {
            const nw = gameState.getNetWorth ? gameState.getNetWorth() : gameState.getBalance();
            return nw >= 1000000;
        }
    },
    {
        id: 'tycoon_club',
        title: 'Taipan Modal',
        desc: 'Capai total Kekayaan Bersih $10.000.000',
        icon: '👑',
        check: () => {
            const nw = gameState.getNetWorth ? gameState.getNetWorth() : gameState.getBalance();
            return nw >= 10000000;
        }
    }
];

class CareerManager {
    constructor() {}

    getCareerState() {
        return gameState.get('work') || {
            careerLevel: 1,
            xp: 0,
            history: []
        };
    }

    getCurrentRank() {
        const state = this.getCareerState();
        const level = state.careerLevel || 1;
        return INVESTOR_RANKS.find(r => r.level === level) || INVESTOR_RANKS[0];
    }

    getNextRank() {
        const current = this.getCurrentRank();
        return INVESTOR_RANKS.find(r => r.level === current.level + 1) || null;
    }

    getNetWorth() {
        return gameState.getNetWorth ? gameState.getNetWorth() : gameState.getBalance();
    }

    getTotalTradesCount() {
        const txs = gameState.get('transactions') || [];
        return txs.filter(t => 
            t.category === 'Beli Saham' || t.category === 'Jual Saham' ||
            t.category === 'Beli Kripto' || t.category === 'Jual Kripto' ||
            t.category === 'Stock Buy' || t.category === 'Stock Sell' ||
            t.category === 'Crypto Buy' || t.category === 'Crypto Sell'
        ).length;
    }

    getOwnedPropsCount() {
        const props = propertyManager.getOwnedProperties ? propertyManager.getOwnedProperties() : [];
        return props.length;
    }

    getAchievementsStatus() {
        return CAREER_ACHIEVEMENTS.map(ach => ({
            ...ach,
            unlocked: ach.check()
        }));
    }

    getRankEligibility() {
        const next = this.getNextRank();
        if (!next) {
            return { canAdvance: false, isMax: true, progress: 100, unmet: [] };
        }

        const netWorth = this.getNetWorth();
        const trades = this.getTotalTradesCount();
        const props = this.getOwnedPropsCount();

        const unmet = [];
        let metCriteria = 0;
        let totalCriteria = 1;

        if (netWorth >= next.reqNetWorth) {
            metCriteria++;
        } else {
            unmet.push(`Net Worth min $ ${financeManager.formatCurrency(next.reqNetWorth, true)}`);
        }

        if (next.reqTrades > 0) {
            totalCriteria++;
            if (trades >= next.reqTrades) {
                metCriteria++;
            } else {
                unmet.push(`${next.reqTrades}x transaksi pasar (saat ini: ${trades}x)`);
            }
        }

        if (next.reqProps > 0) {
            totalCriteria++;
            if (props >= next.reqProps) {
                metCriteria++;
            } else {
                unmet.push(`${next.reqProps} unit properti (saat ini: ${props})`);
            }
        }

        const progress = Math.min(100, Math.round((metCriteria / totalCriteria) * 100));

        return {
            canAdvance: unmet.length === 0,
            isMax: false,
            progress,
            unmet
        };
    }

    advanceRank() {
        const eligibility = this.getRankEligibility();
        if (!eligibility.canAdvance) {
            ui.warning(`Syarat kenaikan tingkat belum terpenuhi:\n• ${eligibility.unmet.join('\n• ')}`, 'Target Belum Tercapai');
            return false;
        }

        const next = this.getNextRank();
        if (!next) return false;

        const state = this.getCareerState();
        state.careerLevel = next.level;
        state.xp = (state.xp || 0) + 150;

        state.history = state.history || [];
        state.history.push({
            type: 'promotion',
            date: gameState.getFormattedDate ? gameState.getFormattedDate() : 'Hari ini',
            description: `Mencapai Gelar: ${next.title}`,
            extra: next.desc
        });

        gameState.set('work', state);
        gameState.emit('careerUpdate', { rank: next });

        ui.success(
            `Selamat! Anda telah naik tingkat menjadi "${next.title}" (${next.subtitle})!\n` +
            `• Keistimewaan: ${next.perk}\n` +
            `• Deskripsi: ${next.desc}`,
            '🏆 Gelar Investor Baru!'
        );

        try {
            import('../ui/AuraSound.js').then(m => m.default.playLevelUp?.());
        } catch(e) {}

        return true;
    }
}

export const careerManager = new CareerManager();
export default careerManager;
