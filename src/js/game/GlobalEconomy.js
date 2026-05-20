/**
 * GlobalEconomy.js - Enhanced Cycle-Based Economy (v2.2)
 * Markets now follow structured, immersive economic cycles lasting 6-12 months per phase.
 * Broadcasts global economic bulletins to the player on major phase transitions.
 */

import gameState from './GameState.js';
import ui from '../ui/UIManager.js';

export const ECONOMY_PHASES = {
    RECOVERY: { name: 'Recovery (Pemulihan)', drift: 0.001, volatility: 0.006, color: '#60a5fa' },
    BULL: { name: 'Bull Market (Ekspansi)', drift: 0.003, volatility: 0.012, color: '#10b981' },
    PEAK: { name: 'Market Peak (Puncak Keemasan)', drift: -0.0005, volatility: 0.008, color: '#f59e0b' },
    BEAR: { name: 'Bear Market (Resesi)', drift: -0.0025, volatility: 0.018, color: '#ef4444' },
    TROUGH: { name: 'Market Trough (Depresi/Dasar)', drift: 0.0005, volatility: 0.004, color: '#94a3b8' }
};

class GlobalEconomy {
    constructor() {
        this.baseIndex = 1000;
    }

    /**
     * Natural market fluctuation (called daily by TimeManager)
     */
    naturalFluctuation() {
        const currentIndex = gameState.get('economy.index') || this.baseIndex;
        let phase = gameState.get('economy.phase') || 'RECOVERY';
        let remainingDays = gameState.get('economy.cycleDays') || 0;

        // Cycle Management (extended to 180 - 360 days: approx 6-12 months per cycle phase)
        if (remainingDays <= 0) {
            phase = this.getNextPhase(phase);
            remainingDays = Math.floor(Math.random() * 180) + 180; // 6-12 months duration
            gameState.set('economy.phase', phase);
            gameState.set('economy.cycleDays', remainingDays);
            
            // Broadcast the economic shift to the player
            this.broadcastPhaseChange(phase);
            console.log(`🌍 Economy Phase Change: ${phase} for ${remainingDays} days`);
        } else {
            remainingDays--;
            gameState.set('economy.cycleDays', remainingDays);
        }

        const config = ECONOMY_PHASES[phase];
        
        // Algorithmic Movement
        const randomFactor = (Math.random() - 0.5) * 2 * config.volatility;
        const trendDrift = config.drift;
        const meanReversion = (this.baseIndex - currentIndex) / this.baseIndex * 0.001;

        const change = randomFactor + trendDrift + meanReversion;
        const newIndex = Math.max(100, currentIndex * (1 + change));

        gameState.set('economy.index', newIndex);
        gameState.emit('economyUpdate', { index: newIndex, change: change * 100, phase: config.name });

        return newIndex;
    }

    /**
     * Broadcasts elegant in-game bulletins notifying the player of economic shifts
     */
    broadcastPhaseChange(phase) {
        let title = '';
        let message = '';
        
        if (phase === 'BULL') {
            title = '🌍 BULETIN EKONOMI: BULL MARKET!';
            message = 'Sentimen pasar sangat optimis! Permintaan konsumen melonjak tinggi. Sektor Ritel, Otomotif, dan Maskapai akan menikmati peningkatan profitabilitas besar-besaran! 📈🚀';
        } else if (phase === 'PEAK') {
            title = '🌍 BULETIN EKONOMI: MARKET PEAK';
            message = 'Ekonomi mencapai puncak keemasan. Transaksi saham sangat aktif, waspadai potensi koreksi atau gelembung aset jangka pendek. 📊⚖️';
        } else if (phase === 'BEAR') {
            title = '🌍 BULETIN EKONOMI: BEAR MARKET!';
            message = 'Awas resesi global! Daya beli masyarakat merosot drastis. Penjualan mobil premium, tiket maskapai, dan retail akan terpukul hebat. Siapkan dana darurat! 📉🔴';
        } else if (phase === 'TROUGH') {
            title = '🌍 BULETIN EKONOMI: TROUGH (DEPRESI)';
            message = 'Ekonomi menyentuh titik terendah. Aktivitas industri melambat. Namun, ini adalah momentum terbaik untuk membeli aset saham dan kontrak supplier dengan harga obral! 🛡️💼';
        } else { // RECOVERY
            title = '🌍 BULETIN EKONOMI: RECOVERY';
            message = 'Sinyal pemulihan terdeteksi! Rantai pasok mulai stabil dan daya beli masyarakat perlahan bangkit kembali dari masa bear market. 📈🟢';
        }

        setTimeout(() => {
            ui.info(message, title);
        }, 1000);
    }

    /**
     * Calculates dynamic demand multiplier for active businesses
     * Blends the phase base with raw index levels.
     * @returns {number} 0.50 to 1.70 multiplier
     */
    getDemandMultiplier() {
        const phase = gameState.get('economy.phase') || 'RECOVERY';
        const index = gameState.get('economy.index') || this.baseIndex;
        const indexFactor = index / this.baseIndex;
        
        let phaseMultiplier = 1.0;
        if (phase === 'BULL') phaseMultiplier = 1.25;
        else if (phase === 'PEAK') phaseMultiplier = 1.12;
        else if (phase === 'RECOVERY') phaseMultiplier = 1.05;
        else if (phase === 'BEAR') phaseMultiplier = 0.78;
        else if (phase === 'TROUGH') phaseMultiplier = 0.62;
        
        const totalMultiplier = phaseMultiplier * (0.85 + indexFactor * 0.15);
        return parseFloat(Math.max(0.5, Math.min(1.8, totalMultiplier)).toFixed(2));
    }

    getNextPhase(current) {
        const sequence = ['RECOVERY', 'BULL', 'PEAK', 'BEAR', 'TROUGH'];
        const idx = sequence.indexOf(current);
        return sequence[(idx + 1) % sequence.length];
    }

    /**
     * Get current index value
     */
    getIndex() {
        return gameState.get('economy.index') || this.baseIndex;
    }

    /**
     * Get market status with cycle info
     */
    getMarketStatus() {
        const currentIndex = gameState.get('economy.index') || this.baseIndex;
        const phaseKey = gameState.get('economy.phase') || 'RECOVERY';
        const phase = ECONOMY_PHASES[phaseKey];
        const change = ((currentIndex - this.baseIndex) / this.baseIndex) * 100;

        return {
            index: currentIndex,
            change24h: parseFloat(change.toFixed(2)),
            trend: phaseKey,
            phaseName: phase.name,
            phaseColor: phase.color
        };
    }

    formatNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        return num.toFixed(0);
    }

    /**
     * Check if an amount qualifies as a whale transaction
     * @param {number} amount 
     * @returns {boolean}
     */
    isWhaleTransaction(amount) {
        return amount >= 1000000; // $1 Million USD is a whale
    }

    /**
     * Get the whale tier description based on transaction size
     * @param {number} amount 
     * @returns {string}
     */
    getWhaleTier(amount) {
        if (amount >= 1000000000) return '🐋 MEGALODON (Ultra Whale)';
        if (amount >= 100000000) return '🐋 BLUE WHALE (Giant)';
        if (amount >= 10000007) return '🐋 HUMPBACK (Heavy)';
        if (amount >= 1000000) return '🐋 BABY WHALE (Light)';
        return 'NONE';
    }

    /**
     * Apply player deposit (inject) or withdrawal to global economy playerImpact
     * @param {number} amount 
     * @param {string} actionType - 'inject' or 'withdraw'
     * @returns {object}
     */
    applyPlayerAction(amount, actionType) {
        // Calculate raw impact based on transaction size
        let rawImpact = (amount / 1000000) * 1.0; 
        
        // Cap the change per transaction to keep it balanced
        rawImpact = Math.min(rawImpact, 50.0);

        let currentImpact = gameState.get('economy.playerImpact') || 0;
        let change = 0;

        if (actionType === 'inject') {
            change = rawImpact;
        } else if (actionType === 'withdraw') {
            change = -rawImpact;
        }

        const newImpact = Math.max(-100, Math.min(100, currentImpact + change));
        gameState.set('economy.playerImpact', newImpact);

        // Also adjust the economy index directly!
        const currentIndex = gameState.get('economy.index') || this.baseIndex;
        const indexChangePercent = (change / 100) * 0.05; // Max 5% change for max rawImpact
        const newIndex = Math.max(100, currentIndex * (1 + indexChangePercent));
        gameState.set('economy.index', newIndex);

        console.log(`🌍 Player action "${actionType}" of $${amount.toLocaleString()} applied. Impact: ${change.toFixed(2)}%. New playerImpact: ${newImpact.toFixed(2)}%. New Index: ${newIndex.toFixed(2)}`);

        return {
            impact: change,
            newPlayerImpact: newImpact,
            newIndex
        };
    }
}

export const globalEconomy = new GlobalEconomy();
export default globalEconomy;
