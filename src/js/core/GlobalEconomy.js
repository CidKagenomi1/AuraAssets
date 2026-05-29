/**
 * GlobalEconomy.js - Smart Economy Engine (v3.0)
 *
 * ALGORITHM UPGRADES:
 *  [B] Adaptive Phase Transitions: probability-based, not a fixed sequence
 *  [B] Mini CORRECTION phase: a soft cooldown between Bull and Bear
 *  [C] Safety Net: demand floor protects new players (first 180 game-days)
 *  [C] Sector Sensitivity: defensive sectors (Healthcare, Infra) resist recession
 *  [C] Progressive Recovery Bonus: longer bear/trough → stronger recovery
 *  [C] Stronger Mean Reversion: 0.001 → 0.004 so crashes self-correct faster
 *  [C] Kinder TROUGH floor: 0.62 → 0.72
 *  [FIX] Player Impact dampened: no longer moves global index directly
 */

import gameState from './GameState.js';
import ui from '../ui/UIManager.js';

// ---------------------------------------------------------------------------
// Phase Definitions
// ---------------------------------------------------------------------------
export const ECONOMY_PHASES = {
    RECOVERY:   { name: 'Recovery (Pemulihan)',        drift:  0.0012, volatility: 0.006, color: '#60a5fa' },
    BULL:       { name: 'Bull Market (Ekspansi)',       drift:  0.0025, volatility: 0.010, color: '#10b981' },
    CORRECTION: { name: 'Correction (Koreksi Sehat)',  drift: -0.0006, volatility: 0.007, color: '#f59e0b' },
    PEAK:       { name: 'Market Peak (Puncak)',         drift: -0.0004, volatility: 0.008, color: '#fbbf24' },
    BEAR:       { name: 'Bear Market (Resesi)',         drift: -0.0018, volatility: 0.015, color: '#ef4444' },
    TROUGH:     { name: 'Market Trough (Dasar)',        drift:  0.0006, volatility: 0.004, color: '#94a3b8' }
};

// ---------------------------------------------------------------------------
// Probabilistic Transition Matrix  [B]
// Row = current phase, columns = probability of transitioning to each phase
// ---------------------------------------------------------------------------
const TRANSITION_MATRIX = {
    //                  RECOVERY  BULL   CORRECTION  PEAK   BEAR   TROUGH
    RECOVERY:   { RECOVERY: 0.05, BULL: 0.75, CORRECTION: 0.10, PEAK: 0.08, BEAR: 0.02, TROUGH: 0.00 },
    BULL:       { RECOVERY: 0.03, BULL: 0.10, CORRECTION: 0.52, PEAK: 0.30, BEAR: 0.05, TROUGH: 0.00 },
    CORRECTION: { RECOVERY: 0.15, BULL: 0.30, CORRECTION: 0.05, PEAK: 0.05, BEAR: 0.40, TROUGH: 0.05 },
    PEAK:       { RECOVERY: 0.08, BULL: 0.10, CORRECTION: 0.15, PEAK: 0.05, BEAR: 0.55, TROUGH: 0.07 },
    BEAR:       { RECOVERY: 0.28, BULL: 0.04, CORRECTION: 0.05, PEAK: 0.00, BEAR: 0.18, TROUGH: 0.45 },
    TROUGH:     { RECOVERY: 0.60, BULL: 0.25, CORRECTION: 0.05, PEAK: 0.02, BEAR: 0.05, TROUGH: 0.03 }
};

// Phase duration ranges (in game-days) [min, max]
const PHASE_DURATION = {
    RECOVERY:   [90,  180],
    BULL:       [120, 240],
    CORRECTION: [30,   60],
    PEAK:       [60,  120],
    BEAR:       [90,  180],
    TROUGH:     [60,  120]
};

// ---------------------------------------------------------------------------
// Sector Sensitivity Coefficients  [C]
// How strongly each sector reacts to the demand multiplier (1.0 = full impact)
// ---------------------------------------------------------------------------
export const SECTOR_SENSITIVITY = {
    retail:        1.00,   // Full market exposure
    automotive:    1.10,   // Slightly amplified (discretionary spend)
    aerospace:     0.90,   // Moderate
    healthcare:    0.30,   // Defensive – very recession-resistant
    infrastructure:0.35,   // Defensive – government-backed demand
    fnb:           0.75,   // People still eat, but restaurants suffer
    tech:          0.85,
    default:       1.00
};

class GlobalEconomy {
    constructor() {
        this.baseIndex = 1000;
    }

    // -------------------------------------------------------------------------
    // Core daily tick – called by TimeManager via main.js
    // -------------------------------------------------------------------------
    naturalFluctuation() {
        const currentIndex = gameState.get('economy.index') || this.baseIndex;
        let phase = gameState.get('economy.phase') || 'RECOVERY';
        let remainingDays = gameState.get('economy.cycleDays') || 0;

        // Phase transition
        if (remainingDays <= 0) {
            phase = this._pickNextPhase(phase);
            const [minDays, maxDays] = PHASE_DURATION[phase];
            remainingDays = Math.floor(Math.random() * (maxDays - minDays)) + minDays;

            gameState.set('economy.phase', phase);
            gameState.set('economy.cycleDays', remainingDays);

            // Track consecutive bear/trough days for recovery bonus  [C]
            if (phase === 'BEAR' || phase === 'TROUGH') {
                const prev = gameState.get('economy.bearStreakDays') || 0;
                gameState.set('economy.bearStreakDays', prev + remainingDays);
            } else if (phase === 'RECOVERY' || phase === 'BULL') {
                gameState.set('economy.bearStreakDays', 0);
            }

            this._broadcastPhaseChange(phase);
            console.log(`🌍 Economy → ${phase} (${remainingDays} days)`);
        } else {
            remainingDays--;
            gameState.set('economy.cycleDays', remainingDays);
        }

        const config = ECONOMY_PHASES[phase];

        // Smoothed random factor (mild momentum)  [A-lite]
        const prevMomentum = gameState.get('economy.momentum') || 0;
        const rawRandom = (Math.random() - 0.5) * 2 * config.volatility;
        const momentum = 0.65 * prevMomentum + 0.35 * rawRandom;
        gameState.set('economy.momentum', momentum);

        // Stronger mean reversion  [C]
        const meanReversion = (this.baseIndex - currentIndex) / this.baseIndex * 0.004;

        // Progressive recovery bonus – longer bear → stronger pull back  [C]
        const bearStreak = gameState.get('economy.bearStreakDays') || 0;
        const recoveryBonus =
            (phase === 'RECOVERY' || phase === 'TROUGH')
                ? Math.min(bearStreak * 0.000015, 0.003)
                : 0;

        const change = momentum + config.drift + meanReversion + recoveryBonus;
        const newIndex = Math.max(150, currentIndex * (1 + change)); // floor at 150 [C]

        gameState.set('economy.index', newIndex);
        gameState.emit('economyUpdate', {
            index: newIndex,
            change: change * 100,
            phase: config.name
        });

        return newIndex;
    }

    // -------------------------------------------------------------------------
    // Probabilistic phase picker  [B]
    // -------------------------------------------------------------------------
    _pickNextPhase(current) {
        const probs = TRANSITION_MATRIX[current] || TRANSITION_MATRIX['RECOVERY'];
        const roll = Math.random();
        let cumulative = 0;
        for (const [phase, prob] of Object.entries(probs)) {
            cumulative += prob;
            if (roll < cumulative) return phase;
        }
        return 'RECOVERY'; // fallback
    }

    // -------------------------------------------------------------------------
    // Demand multiplier with safety nets  [C]
    // -------------------------------------------------------------------------
    /**
     * Get the base demand multiplier for a given sector.
     * @param {string} sector - Optional sector key from SECTOR_SENSITIVITY
     * @returns {number} Multiplier, clamped to safe playable range
     */
    getDemandMultiplier(sector = 'default') {
        const phase = gameState.get('economy.phase') || 'RECOVERY';
        const index = gameState.get('economy.index') || this.baseIndex;
        const totalDays = gameState.get('gameTime.totalDays') || 0;

        const indexFactor = index / this.baseIndex;

        // Phase base values – TROUGH floor raised 0.62 → 0.72  [C]
        let phaseMultiplier = 1.0;
        if      (phase === 'BULL')       phaseMultiplier = 1.22;
        else if (phase === 'PEAK')       phaseMultiplier = 1.10;
        else if (phase === 'CORRECTION') phaseMultiplier = 0.96;
        else if (phase === 'RECOVERY')   phaseMultiplier = 1.04;
        else if (phase === 'BEAR')       phaseMultiplier = 0.82;
        else if (phase === 'TROUGH')     phaseMultiplier = 0.72; // ← was 0.62

        // Sector sensitivity – defensive sectors dampened  [C]
        const sensitivity = SECTOR_SENSITIVITY[sector] ?? SECTOR_SENSITIVITY.default;
        const sectorMult = 1.0 + (phaseMultiplier - 1.0) * sensitivity;

        let totalMultiplier = sectorMult * (0.88 + indexFactor * 0.12);

        // New-player safety net: first 180 game-days, floor at 0.82  [C]
        if (totalDays <= 180) {
            totalMultiplier = Math.max(0.82, totalMultiplier);
        }

        return parseFloat(Math.max(0.55, Math.min(1.80, totalMultiplier)).toFixed(2));
    }

    // -------------------------------------------------------------------------
    // Broadcast phase change bulletin
    // -------------------------------------------------------------------------
    _broadcastPhaseChange(phase) {
        const bulletins = {
            BULL: {
                title: '🌍 BULETIN EKONOMI: BULL MARKET!',
                msg:   'Sentimen pasar sangat optimis! Permintaan konsumen melonjak. Sektor Ritel, Otomotif, dan Maskapai akan menikmati profitabilitas tinggi! 📈🚀'
            },
            CORRECTION: {
                title: '🌍 BULETIN EKONOMI: KOREKSI PASAR',
                msg:   'Pasar mengalami koreksi sehat setelah ekspansi. Jangan panik — ini fase transisi normal. Evaluasi portofolio dan siapkan cash. 📊⚖️'
            },
            PEAK: {
                title: '🌍 BULETIN EKONOMI: MARKET PEAK',
                msg:   'Ekonomi di puncak keemasan. Waspadai gelembung aset. Pertimbangkan diversifikasi dan kurangi eksposur risiko tinggi. 📊⚠️'
            },
            BEAR: {
                title: '🌍 BULETIN EKONOMI: BEAR MARKET!',
                msg:   'Resesi menghantam! Daya beli merosot. Bisnis non-defensif akan terpukul. Sektor Healthcare & Infrastruktur lebih tahan. Siapkan dana darurat! 📉🔴'
            },
            TROUGH: {
                title: '🌍 BULETIN EKONOMI: TROUGH (DASAR PASAR)',
                msg:   'Ekonomi menyentuh dasar. Ini momentum historis terbaik untuk akumulasi aset dan negosiasi kontrak supplier harga rendah. Recovery akan datang! 🛡️💼'
            },
            RECOVERY: {
                title: '🌍 BULETIN EKONOMI: PEMULIHAN!',
                msg:   'Sinyal recovery terdeteksi! Rantai pasok stabil dan daya beli bangkit. Mulai ekspansi bisnis secara bertahap. 📈🟢'
            }
        };
        const b = bulletins[phase] || bulletins['RECOVERY'];
        setTimeout(() => ui.info(b.msg, b.title), 1200);
    }

    // -------------------------------------------------------------------------
    // Fear & Greed Index (0–100)
    // -------------------------------------------------------------------------
    getFearGreedIndex() {
        const phase = gameState.get('economy.phase') || 'RECOVERY';
        const index = gameState.get('economy.index') || this.baseIndex;

        const baseMap = {
            TROUGH:     12,
            BEAR:       32,
            CORRECTION: 44,
            RECOVERY:   52,
            BULL:       70,
            PEAK:       85
        };
        const baseValue = baseMap[phase] ?? 50;
        const deviation = ((index - this.baseIndex) / this.baseIndex) * 80;
        return Math.max(5, Math.min(95, Math.round(baseValue + deviation)));
    }

    // -------------------------------------------------------------------------
    // Market status snapshot
    // -------------------------------------------------------------------------
    getMarketStatus() {
        const currentIndex = gameState.get('economy.index') || this.baseIndex;
        const phaseKey = gameState.get('economy.phase') || 'RECOVERY';
        const phase = ECONOMY_PHASES[phaseKey];
        const change = ((currentIndex - this.baseIndex) / this.baseIndex) * 100;
        return {
            index:      currentIndex,
            change24h:  parseFloat(change.toFixed(2)),
            trend:      phaseKey,
            phaseName:  phase.name,
            phaseColor: phase.color
        };
    }

    getIndex() {
        return gameState.get('economy.index') || this.baseIndex;
    }

    // -------------------------------------------------------------------------
    // Player action impact (dampened – no longer moves index directly)  [FIX]
    // -------------------------------------------------------------------------
    /**
     * Record a player deposit/withdrawal. Only updates the playerImpact
     * sentiment tracker; it does NOT directly move the economy index anymore.
     * @param {number} amount
     * @param {'inject'|'withdraw'} actionType
     */
    applyPlayerAction(amount, actionType) {
        // Sentiment shift: capped at ±10 per transaction
        let rawImpact = Math.min((amount / 1000000) * 0.5, 10.0);
        let currentImpact = gameState.get('economy.playerImpact') || 0;
        const change = actionType === 'inject' ? rawImpact : -rawImpact;
        const newImpact = Math.max(-100, Math.min(100, currentImpact + change));
        gameState.set('economy.playerImpact', newImpact);

        console.log(`🌍 Player "${actionType}" $${amount.toLocaleString()} → sentiment ${change >= 0 ? '+' : ''}${change.toFixed(1)} (total ${newImpact.toFixed(1)})`);

        return {
            impact: change,
            newPlayerImpact: newImpact,
            newIndex: this.getIndex() // unchanged
        };
    }

    // -------------------------------------------------------------------------
    // Whale helpers (unchanged)
    // -------------------------------------------------------------------------
    isWhaleTransaction(amount) { return amount >= 1000000; }

    getWhaleTier(amount) {
        if (amount >= 1000000000) return '🐋 MEGALODON (Ultra Whale)';
        if (amount >= 100000000)  return '🐋 BLUE WHALE (Giant)';
        if (amount >= 10000007)   return '🐋 HUMPBACK (Heavy)';
        if (amount >= 1000000)    return '🐋 BABY WHALE (Light)';
        return 'NONE';
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------
    formatNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9)  return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6)  return (num / 1e6).toFixed(2) + 'M';
        return num.toFixed(0);
    }

    /**
     * Convenience: get sector-adjusted demand for sectors that pass their key.
     * Falls back to 'default' if sector is unknown.
     */
    getSectorDemand(sectorKey) {
        return this.getDemandMultiplier(sectorKey);
    }
}

export const globalEconomy = new GlobalEconomy();
export default globalEconomy;
