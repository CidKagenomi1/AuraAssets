/**
 * RoleManager.js - Investor Risk Profile & Assessment System
 * Classifies player into Conservative, Passive, or Aggressive investor profiles
 * based on an interactive risk tolerance questionnaire.
 */

import gameState from './GameState.js';

const ALL_FEATURES = [
    'market', 'portfolio', 'invest', 'crypto', 'property',
    'savings', 'loan', 'finance', 'guide', 'trading-signal',
    'quick-actions', 'marketplace', 'donate', 'tax'
];

// ==========================================
// RISK PROFILE DEFINITIONS
// ==========================================
export const ROLES = {
    conservative: {
        id: 'conservative',
        label: 'Investor Konservatif',
        shortLabel: 'Konservatif',
        icon: '🛡️',
        desc: 'Mengutamakan keamanan modal pokok, stabilitas arus kas, dan instrumen berisiko rendah.',
        detail: 'Anda lebih memilih kepastian imbal hasil dibandingkan spekulasi tinggi. Strategi ideal Anda berfokus pada saham blue-chip defensif, deposito berbunga, dan reksa dana pasar uang.',
        strategy: 'Alokasi rekomendasi: 60% Kas/Deposito · 30% Saham Blue-Chip · 10% Properti',
        allowedFeatures: ALL_FEATURES,
        hiddenNav: [],
        startingBalance: 150000,
        monthlyEvent: 'Fokus proteksi modal: dividen saham defensif & bunga deposito stabil setiap bulan.',
        color: '#38bdf8' // Sky Blue
    },
    passive: {
        id: 'passive',
        label: 'Investor Pasif',
        shortLabel: 'Pasif',
        icon: '⚖️',
        desc: 'Mengutamakan pertumbuhan terukur jangka panjang, diversifikasi seimbang, dan strategi DCA.',
        detail: 'Anda mencari keseimbangan optimal antara risiko dan pertumbuhan aset. Anda tidak panik saat koreksi wajar dan mengandalkan pertumbuhan nilai perusahaan secara bertahap.',
        strategy: 'Alokasi rekomendasi: 50% Saham Indeks/Growth · 30% Properti/Reksa Dana · 20% Kas',
        allowedFeatures: ALL_FEATURES,
        hiddenNav: [],
        startingBalance: 150000,
        monthlyEvent: 'Pertumbuhan portofolio terdiversifikasi & akumulasi nilai jangka panjang.',
        color: '#10b981' // Emerald
    },
    aggressive: {
        id: 'aggressive',
        label: 'Investor Agresif',
        shortLabel: 'Agresif',
        icon: '🚀',
        desc: 'Mengutamakan akselerasi modal maksimal, momentum pasar aktif, dan aset volatilitas tinggi.',
        detail: 'Anda siap menghadapi fluktuasi harga tajam demi mengejar imbal hasil eksponensial (high-alpha) melalui eksekusi order aktif di bursa saham dan kripto.',
        strategy: 'Alokasi rekomendasi: 70% Saham High-Beta & Trading Aktif · 20% Kripto · 10% Kas Likuid',
        allowedFeatures: ALL_FEATURES,
        hiddenNav: [],
        startingBalance: 150000,
        monthlyEvent: 'Momentum pasar tinggi: peluang capital gain maksimal dari dinamika order book.',
        color: '#f59e0b' // Amber / Orange
    }
};

// Legacy role mapping for backward compatibility with older saves
const LEGACY_ROLE_MAP = {
    investor: 'passive',
    tycoon: 'conservative',
    daytrader: 'aggressive',
    karyawan: 'conservative',
    pebisnis: 'passive',
    survivor: 'aggressive'
};

// ==========================================
// RISK ASSESSMENT QUESTIONNAIRE
// ==========================================
export const RISK_QUESTIONS = [
    {
        id: 'q1_drop_reaction',
        question: 'Jika nilai portofolio saham Anda tiba-tiba turun 20% dalam seminggu karena sentimen pasar, apa tindakan Anda?',
        options: [
            {
                text: 'Segera jual sebagian atau seluruh aset untuk mengamankan sisa modal',
                score: 1,
                tag: 'Proteksi Modal'
            },
            {
                text: 'Tetap tenang menahan posisi (Hold) dan menunggu pasar pulih secara alami',
                score: 2,
                tag: 'Disiplin Jangka Panjang'
            },
            {
                text: 'Membeli lebih banyak saham di harga bawah (Buy the Dip) untuk memaksimalkan rebound',
                score: 3,
                tag: 'High Conviction'
            }
        ]
    },
    {
        id: 'q2_return_preference',
        question: 'Manakah skenario pertumbuhan modal tahunan yang paling sesuai dengan kenyamanan Anda?',
        options: [
            {
                text: 'Pertumbuhan stabil +6% hingga +10% per tahun dengan risiko penurunan hampir nol',
                score: 1,
                tag: 'Stabilitas Pasti'
            },
            {
                text: 'Potensi tumbuh +15% hingga +25% per tahun dengan kemungkinan fluktuasi wajar ±10%',
                score: 2,
                tag: 'Seimbang'
            },
            {
                text: 'Potensi melesat +50% hingga +100% lebih dengan risiko koreksi tajam sewaktu-waktu',
                score: 3,
                tag: 'Eksponensial'
            }
        ]
    },
    {
        id: 'q3_trading_style',
        question: 'Bagaimana gaya Anda dalam mengelola order dan transaksi di bursa pasar modal?',
        options: [
            {
                text: 'Jarang transaksi, fokus menyimpan kas di instrumen aman & saham anti-krisis',
                score: 1,
                tag: 'Defensif'
            },
            {
                text: 'Beli bertahap secara berkala di saham fundamental kuat tanpa memantau grafik tiap menit',
                score: 2,
                tag: 'Investasi Pasif'
            },
            {
                text: 'Aktif memasang Limit/Market Order memanfaatkan spread order book dan momentum harga',
                score: 3,
                tag: 'Active Trader'
            }
        ]
    }
];

class RoleManager {
    /**
     * Evaluate answers array (each 1, 2, or 3) and conclude risk profile ID
     * Total score range for 3 questions: 3 to 9
     * - 3–4: conservative
     * - 5–7: passive
     * - 8–9: aggressive
     */
    evaluateRiskProfile(scores = []) {
        const total = scores.reduce((sum, s) => sum + Number(s || 2), 0);
        if (total <= 4) return 'conservative';
        if (total <= 7) return 'passive';
        return 'aggressive';
    }

    /**
     * Get the active risk profile ID from state, fallback to 'passive'
     */
    getRole() {
        const rawRole = gameState.get('player.role');
        if (rawRole && ROLES[rawRole]) return rawRole;
        if (rawRole && LEGACY_ROLE_MAP[rawRole]) return LEGACY_ROLE_MAP[rawRole];
        return 'passive';
    }

    /**
     * Get full profile definition object
     */
    getRoleData(roleId = null) {
        const mappedId = roleId ? (ROLES[roleId] ? roleId : LEGACY_ROLE_MAP[roleId]) : this.getRole();
        return ROLES[mappedId] || ROLES.passive;
    }

    getAllRoles() {
        return Object.values(ROLES);
    }

    getQuestions() {
        return RISK_QUESTIONS;
    }

    /**
     * Set a new risk profile, emit 'roleChange' event
     */
    setRole(roleId) {
        const resolvedId = ROLES[roleId] ? roleId : (LEGACY_ROLE_MAP[roleId] || 'passive');
        gameState.set('player.role', resolvedId);
        gameState.set('player.riskProfile', resolvedId);
        gameState.set('player.roleSelectedAt', Date.now());
        gameState.emit('roleChange', resolvedId);
        return true;
    }

    /**
     * Check if a feature is allowed
     */
    isFeatureAllowed(featureId) {
        const role = this.getRoleData();
        return role ? role.allowedFeatures.includes(featureId) : true;
    }

    getHiddenNavItems() {
        return [];
    }

    /**
     * Apply profile badge to sidebar and ensure all trading features are visible
     */
    applyVisibility() {
        const role = this.getRoleData();

        document.querySelectorAll('[data-feature]').forEach(el => {
            const feature = el.dataset.feature;
            const allowed = role ? role.allowedFeatures.includes(feature) : true;
            el.classList.toggle('hidden', !allowed);
        });

        document.querySelectorAll('.nav-btn[data-view]').forEach(el => {
            el.classList.remove('hidden');
        });
        document.querySelectorAll('.sidebar-link[data-view]').forEach(el => {
            el.classList.remove('hidden');
        });

        const roleBadge = document.getElementById('player-role-badge');
        if (roleBadge) {
            if (role) {
                roleBadge.textContent = `${role.icon} ${role.label.toUpperCase()}`;
                roleBadge.style.color = role.color;
                roleBadge.classList.remove('hidden');
            } else {
                roleBadge.classList.add('hidden');
            }
        }
    }
}

const roleManager = new RoleManager();
export default roleManager;
