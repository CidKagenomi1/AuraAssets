/**
 * PoliticsManager.js - Presidential Politics System
 * Manages presidential campaigns, elections, economic policy sliders,
 * executive decrees, and corruption. Policy effects directly impact
 * business sector multipliers in GlobalEconomy.
 */

import gameState from './GameState.js';
import financeManager from '../finance/FinanceManager.js';

// ── Sector definitions (mirrored from GlobalEconomy SECTOR_SENSITIVITY keys) ──
export const POLITICAL_SECTORS = [
    { id: 'tech',           label: 'Teknologi',      icon: '💻', color: '#6366f1' },
    { id: 'energy',         label: 'Energi',          icon: '⚡', color: '#f59e0b' },
    { id: 'finance',        label: 'Keuangan',        icon: '🏦', color: '#10b981' },
    { id: 'healthcare',     label: 'Kesehatan',       icon: '🏥', color: '#ef4444' },
    { id: 'infrastructure', label: 'Infrastruktur',   icon: '🏗️', color: '#64748b' },
    { id: 'retail',         label: 'Ritel',           icon: '🛒', color: '#ec4899' },
    { id: 'automotive',     label: 'Otomotif',        icon: '🚗', color: '#0ea5e9' },
    { id: 'fnb',            label: 'F&B',             icon: '🍽️', color: '#84cc16' },
    { id: 'aerospace',      label: 'Dirgantara',      icon: '✈️', color: '#8b5cf6' },
    { id: 'manufacturing',  label: 'Manufaktur',      icon: '🏭', color: '#f97316' },
    { id: 'media',          label: 'Media',           icon: '📺', color: '#a855f7' },
    { id: 'transportation', label: 'Transportasi',    icon: '🚢', color: '#14b8a6' },
    { id: 'property',       label: 'Properti',        icon: '🏘️', color: '#fbbf24' },
];

// ── Political Parties ──────────────────────────────────────────────────────
export const POLITICAL_PARTIES = [
    { id: 'nasionalis',  name: 'Partai Nasional Maju',    icon: '🦅', color: '#ef4444', slogan: 'Indonesia Maju Bersama!' },
    { id: 'progresif',   name: 'Partai Progresif Digital', icon: '🔵', color: '#3b82f6', slogan: 'Teknologi untuk Rakyat!' },
    { id: 'sejahtera',   name: 'Partai Keadilan Sejahtera', icon: '🌿', color: '#10b981', slogan: 'Adil, Makmur, Berdaulat!' },
    { id: 'demokratis',  name: 'Partai Demokratis Rakyat', icon: '⭐', color: '#f59e0b', slogan: 'Suara Rakyat, Kekuatan Bangsa!' },
];

// ── Campaign Package Costs ─────────────────────────────────────────────────
export const CAMPAIGN_PACKAGES = [
    { id: 'small',   label: 'Kampanye Lokal',       cost: 500_000,     supportBoost: 3,  icon: '📢' },
    { id: 'medium',  label: 'Kampanye Regional',    cost: 2_000_000,   supportBoost: 8,  icon: '📣' },
    { id: 'large',   label: 'Kampanye Nasional',    cost: 10_000_000,  supportBoost: 18, icon: '📡' },
    { id: 'massive', label: 'Blitzkrieg Media',     cost: 50_000_000,  supportBoost: 40, icon: '🚀' },
];

// ── Decree Types ───────────────────────────────────────────────────────────
export const DECREE_TYPES = [
    { id: 'tax',         label: 'Regulasi Pajak',       icon: '📋', color: '#ef4444' },
    { id: 'subsidy',     label: 'Subsidi Sektor',        icon: '💸', color: '#10b981' },
    { id: 'ban',         label: 'Larangan/Embargo',      icon: '🚫', color: '#f59e0b' },
    { id: 'deregulation',label: 'Deregulasi',            icon: '📜', color: '#6366f1' },
    { id: 'stimulus',    label: 'Stimulus Ekonomi',      icon: '💊', color: '#3b82f6' },
    { id: 'nationalize', label: 'Nasionalisasi Aset',    icon: '🏛️', color: '#8b5cf6' },
];

// ── Default Policies (all neutral at 0) ───────────────────────────────────
function _buildDefaultPolicies() {
    const policies = {};
    POLITICAL_SECTORS.forEach(s => {
        policies[s.id] = {
            importTax:      0,   // 0-50%
            exportSubsidy:  0,   // 0-40%
            sectorBudget:   0,   // 0-100 (normalized, trillion scale)
        };
    });
    return policies;
}

class PoliticsManager {
    // ── State Helpers ──────────────────────────────────────────────────────
    getState() {
        return gameState.get('politics') || this._defaultState();
    }

    _defaultState() {
        return {
            isPresident:     false,
            candidateName:   '',
            partyId:         null,
            termStart:       null,
            approvalRating:  65,      // 0-100
            supportPercent:  0,       // current election support 0-100
            corruptionLevel: 0,       // 0-100 (affects approval)
            campaignsFought: 0,
            totalCampaignSpent: 0,
            policies:        _buildDefaultPolicies(),
            decrees:         [],
            corruptionLog:   [],
        };
    }

    _save(updated) {
        gameState.set('politics', updated);
    }

    // ── Eligibility ────────────────────────────────────────────────────────
    /**
     * Returns true only if the player is on the Government path at level 8.
     */
    canRunForPresident() {
        const work = gameState.get('work') || {};
        return work.careerPath === 'government' && work.careerLevel >= 8;
    }

    // ── Election / Campaign ────────────────────────────────────────────────
    /**
     * Initialize the candidate registration for an election run.
     * @param {string} candidateName
     * @param {string} partyId
     */
    registerCandidate(candidateName, partyId) {
        if (!this.canRunForPresident()) {
            throw new Error('Anda harus mencapai jabatan Cabinet Minister (Level 8) untuk mendaftar.');
        }
        const state = this.getState();
        state.candidateName = candidateName || 'Kandidat';
        state.partyId = partyId;
        // Base support depends on approval if they were previously president
        const baseSupport = state.isPresident ? Math.max(20, state.approvalRating * 0.6) : 30;
        state.supportPercent = parseFloat(baseSupport.toFixed(1));
        state.campaignsFought = (state.campaignsFought || 0) + 1;
        this._save(state);
    }

    /**
     * Purchase a campaign package to boost support.
     * @param {string} packageId
     * @returns {{ newSupport: number, spent: number }}
     */
    buyCampaign(packageId) {
        const pkg = CAMPAIGN_PACKAGES.find(p => p.id === packageId);
        if (!pkg) throw new Error('Paket kampanye tidak valid.');

        const balance = gameState.getBalance();
        if (balance < pkg.cost) {
            throw new Error(`Saldo tidak cukup! Butuh $${financeManager.formatCurrency(pkg.cost)}`);
        }

        financeManager.addExpense(pkg.cost, 'Politik', `Biaya Kampanye: ${pkg.label}`);

        const state = this.getState();
        // Support has diminishing returns above 85%
        const current = state.supportPercent;
        const boost = pkg.supportBoost * Math.max(0.2, (100 - current) / 100);
        state.supportPercent = Math.min(95, parseFloat((current + boost).toFixed(1)));
        state.totalCampaignSpent = (state.totalCampaignSpent || 0) + pkg.cost;
        this._save(state);

        return { newSupport: state.supportPercent, spent: pkg.cost };
    }

    /**
     * Run the election. Returns { won: boolean, playerVotes, opponentVotes }.
     * Win probability is based on supportPercent. Election is instant (non-live).
     */
    runElection() {
        const state = this.getState();
        const support = state.supportPercent;

        // Win probability: support% / 100, with some randomness ±15%
        const noise = (Math.random() - 0.5) * 30;
        const effectiveWinChance = Math.max(5, Math.min(95, support + noise));
        const roll = Math.random() * 100;
        const won = roll < effectiveWinChance;

        // Generate vote percentages for display
        const playerVotes = Math.max(15, Math.min(85, support + (Math.random() - 0.5) * 10));
        const opponentVotes = 100 - playerVotes;

        if (won) {
            state.isPresident     = true;
            state.termStart       = this._currentDateStr();
            state.approvalRating  = Math.max(50, Math.min(80, support));
            state.corruptionLevel = 0;
        } else {
            // Lose: reset support back low for next attempt
            state.supportPercent = Math.max(10, support * 0.4);
        }

        this._save(state);
        return { won, playerVotes: playerVotes.toFixed(1), opponentVotes: opponentVotes.toFixed(1) };
    }

    // ── Economic Policy Sliders ────────────────────────────────────────────
    /**
     * Update a policy slider value.
     * @param {string} sectorId
     * @param {'importTax'|'exportSubsidy'|'sectorBudget'} policyType
     * @param {number} value
     */
    setPolicy(sectorId, policyType, value) {
        const state = this.getState();
        if (!state.policies[sectorId]) return;
        state.policies[sectorId][policyType] = value;
        this._save(state);
        // Immediately recompute economic effects
        this._applyPolicyEffects(state);
    }

    // ── Compute and Apply Effects to GlobalEconomy ─────────────────────────
    /**
     * Computes the net multiplier offset for each sector based on policy sliders
     * and stores it in gameState so GlobalEconomy can read it.
     */
    _applyPolicyEffects(state) {
        if (!state.isPresident) return;

        const sectorEffects = {};
        POLITICAL_SECTORS.forEach(s => {
            const p = state.policies[s.id] || {};
            const importTax     = (p.importTax || 0) / 100;       // 0-0.50
            const exportSubsidy = (p.exportSubsidy || 0) / 100;   // 0-0.40
            const budget        = (p.sectorBudget || 0) / 100;    // 0-1.0 (normalized)

            // Net effect: high import tax = domestic boom (+), export subsidy = income boost (+),
            // budget spending = productivity (+), but import tax can reduce competition quality
            const netBoost = (importTax * 0.4) + (exportSubsidy * 0.3) + (budget * 0.5);
            // Penalty: high import tax also slightly hurts consumers (negative correction)
            const consumerPenalty = importTax * 0.1;

            sectorEffects[s.id] = parseFloat(Math.max(-0.30, Math.min(0.60, netBoost - consumerPenalty)).toFixed(3));
        });

        gameState.set('politics.sectorEffects', sectorEffects);
    }

    /**
     * Get the policy multiplier override for a sector.
     * GlobalEconomy reads this to modify getDemandMultiplier().
     * Returns a value like +0.25 (boost) or -0.10 (penalty).
     */
    getSectorEffect(sectorId) {
        if (!this.getState().isPresident) return 0;
        const effects = gameState.get('politics.sectorEffects') || {};
        return effects[sectorId] || 0;
    }

    // ── Executive Decrees ──────────────────────────────────────────────────
    /**
     * Issue an executive decree.
     * @param {{ title, type, intensity, description }} decree
     */
    issueDecree({ title, type, intensity, description }) {
        if (!title?.trim()) throw new Error('Judul dekret tidak boleh kosong.');
        const state = this.getState();

        const typeData = DECREE_TYPES.find(d => d.id === type) || DECREE_TYPES[0];
        const entry = {
            id:          Date.now(),
            title:       title.trim(),
            type:        type,
            typeLabel:   typeData.label,
            typeIcon:    typeData.icon,
            intensity:   intensity || 50,
            description: description?.trim() || '',
            date:        this._currentDateStr(),
        };

        // Approval rating slightly changes based on decree intensity
        const approvalImpact = this._decreApprovalImpact(type, intensity);
        state.approvalRating = Math.max(0, Math.min(100, state.approvalRating + approvalImpact));
        state.decrees.unshift(entry);
        if (state.decrees.length > 30) state.decrees = state.decrees.slice(0, 30);

        this._save(state);
        return { entry, approvalImpact };
    }

    _decreApprovalImpact(type, intensity) {
        const base = (intensity - 50) / 100; // -0.5 to +0.5
        const impactMap = {
            stimulus:     +3 + base * 4,
            subsidy:      +2 + base * 3,
            deregulation: +1 + base * 2,
            tax:          -1 + base * 2,
            ban:          -2 + base * 3,
            nationalize:  -3 + base * 5,
        };
        return parseFloat((impactMap[type] || 0).toFixed(2));
    }

    // ── Corruption ────────────────────────────────────────────────────────
    /**
     * Commit a corruption act: take money from "state funds", update corruption level & approval.
     * @param {number} amount
     * @returns {{ approvalPenalty: number, corruptionIncrease: number }}
     */
    commitCorruption(amount) {
        if (amount <= 0) throw new Error('Jumlah tidak valid.');
        if (!this.getState().isPresident) throw new Error('Anda bukan Presiden.');

        const state = this.getState();

        // Corruption funds come from thin air (state treasury flavor)
        financeManager.addIncome(amount, 'Korupsi', 'Dana Negara (Rahasia)');

        // Scale penalty: bigger amounts = bigger scandal risk
        const corruptionIncrease = Math.min(50, Math.log10(amount + 1) * 4);
        const approvalPenalty    = corruptionIncrease * 0.8;

        state.corruptionLevel = Math.min(100, state.corruptionLevel + corruptionIncrease);
        state.approvalRating  = Math.max(0, state.approvalRating - approvalPenalty);

        // Log entry (obfuscated)
        const code = `TRX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        state.corruptionLog.unshift({
            id:    code,
            label: `[${code}] ${this._encryptAmount(amount)}`,
            date:  this._currentDateStr(),
        });
        if (state.corruptionLog.length > 20) state.corruptionLog = state.corruptionLog.slice(0, 20);

        this._save(state);
        return {
            approvalPenalty:    parseFloat(approvalPenalty.toFixed(1)),
            corruptionIncrease: parseFloat(corruptionIncrease.toFixed(1)),
        };
    }

    _encryptAmount(amount) {
        // Show obfuscated representation
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        let result = '';
        const str = String(amount);
        for (let i = 0; i < str.length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return `${result} IDR`;
    }

    // ── Daily Tick ─────────────────────────────────────────────────────────
    /**
     * Called every in-game day from main.js onDay hook.
     * Re-applies policy effects to keep them current.
     */
    tickDailyEffects() {
        const state = this.getState();
        if (!state.isPresident) return;

        // Natural approval drift: slowly trends toward 50
        const drift = (50 - state.approvalRating) * 0.005;
        // Corruption drags approval down over time
        const corruptionDrag = state.corruptionLevel * 0.02;
        state.approvalRating = Math.max(0, Math.min(100,
            state.approvalRating + drift - corruptionDrag
        ));

        this._save(state);
        this._applyPolicyEffects(state);
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    _currentDateStr() {
        const d = gameState.get('gameTime.day') || 1;
        const m = gameState.get('gameTime.month') || 1;
        const y = gameState.get('gameTime.year') || 2024;
        const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        return `${d} ${months[m-1]} ${y}`;
    }
}

export const politicsManager = new PoliticsManager();
export default politicsManager;
