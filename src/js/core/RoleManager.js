/**
 * RoleManager.js - Investor Risk Profile & Capital Allocation System
 * Classifies player into Conservative, Moderate, Aggressive, or Speculator profiles
 * and determines starting capital range based on risk tolerance, career background,
 * liquidity needs, and strategy discipline.
 */

import gameState from './GameState.js';

const ALL_FEATURES = [
    'market', 'portfolio', 'invest', 'crypto',
    'savings', 'loan', 'finance', 'guide', 'trading-signal',
    'quick-actions', 'donate', 'transfer'
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
        detail: 'Anda lebih memilih kepastian imbal hasil dibandingkan spekulasi fluktuatif. Fokus portofolio Anda bertumpu pada deposito berbunga, pasar uang, dan saham blue-chip defensif.',
        strategy: 'Alokasi rekomendasi: 60% Kas/Deposito · 30% Saham Blue-Chip · 10% Reksa Dana Pasar Uang',
        allowedFeatures: ALL_FEATURES,
        hiddenNav: [],
        minStartingBalance: 100000,
        maxStartingBalance: 250000,
        startingBalance: 175000,
        monthlyEvent: 'Fokus proteksi modal: dividen saham defensif & bunga deposito stabil setiap bulan.',
        color: '#38bdf8' // Sky Blue
    },
    moderate: {
        id: 'moderate',
        label: 'Investor Moderat',
        shortLabel: 'Moderat',
        icon: '⚖️',
        desc: 'Mengutamakan pertumbuhan terukur jangka panjang dengan diversifikasi multi-aset seimbang.',
        detail: 'Anda mencari keseimbangan optimal antara imbal hasil dan risiko. Anda tidak panik saat koreksi wajar dan mengandalkan akumulasi bertahap (DCA).',
        strategy: 'Alokasi rekomendasi: 50% Saham Indeks/Growth · 30% Reksa Dana Campuran · 20% Kas Likuid',
        allowedFeatures: ALL_FEATURES,
        hiddenNav: [],
        minStartingBalance: 75000,
        maxStartingBalance: 150000,
        startingBalance: 112500,
        monthlyEvent: 'Pertumbuhan portofolio terdiversifikasi & akumulasi nilai jangka panjang.',
        color: '#10b981' // Emerald
    },
    aggressive: {
        id: 'aggressive',
        label: 'Investor Agresif',
        shortLabel: 'Agresif',
        icon: '🚀',
        desc: 'Mengutamakan akselerasi modal maksimal, momentum pasar aktif, dan aset pertumbuhan tinggi.',
        detail: 'Anda siap menghadapi fluktuasi tajam demi imbal hasil eksponensial (capital gain tinggi) melalui saham inovasi, teknologi, dan portofolio dinamis.',
        strategy: 'Alokasi rekomendasi: 70% Saham High-Beta · 20% Kripto · 10% Kas Likuid',
        allowedFeatures: ALL_FEATURES,
        hiddenNav: [],
        minStartingBalance: 15000,
        maxStartingBalance: 75000,
        startingBalance: 45000,
        monthlyEvent: 'Momentum pasar tinggi: peluang capital gain maksimal dari dinamika order book.',
        color: '#f59e0b' // Amber
    },
    speculator: {
        id: 'speculator',
        label: 'Trader Spekulan',
        shortLabel: 'Spekulan',
        icon: '⚡',
        desc: 'Mengutamakan perputaran modal kilat, aset volatilitas ekstrem, dan perburuan momentum alpha tinggi.',
        detail: 'Bagi Anda, volatilitas adalah peluang emas. Anda siap menanggung risiko drawdown besar demi potensi penggandaan modal cepat di bursa kripto dan saham momentum tinggi.',
        strategy: 'Alokasi rekomendasi: 70% Kripto & Volatile Assets · 25% Saham Momentum · 5% Kas Margin',
        allowedFeatures: ALL_FEATURES,
        hiddenNav: [],
        minStartingBalance: 5000,
        maxStartingBalance: 15000,
        startingBalance: 10000,
        monthlyEvent: 'Volatilitas ekstrem: ayunan harga tinggi membuka peluang profit kilat atau risiko besar.',
        color: '#a855f7' // Purple
    }
};

// Legacy role mapping for backward compatibility with older saves
export const LEGACY_ROLE_MAP = {
    passive: 'moderate',
    investor: 'moderate',
    tycoon: 'conservative',
    daytrader: 'speculator',
    karyawan: 'conservative',
    pebisnis: 'moderate',
    survivor: 'aggressive'
};

// ==========================================
// 2-PHASE QUESTIONNAIRE DEFINITIONS
// ==========================================
export const RISK_QUESTIONS = [
    // ── FASE 1: Toleransi Risiko Pasar (Q1 - Q3) ──
    {
        id: 'q1_drop_reaction',
        phase: 'Toleransi Risiko',
        phaseLabel: 'Bagian 1: Toleransi Risiko Pasar',
        question: 'Jika nilai portofolio Anda tiba-tiba anjlok 20% dalam seminggu akibat sentimen kepanikan pasar global, apa respon spontan Anda?',
        options: [
            {
                text: 'Segera cut-loss dan jual aset untuk mengamankan sisa kas tunai. Saya tidak nyaman melihat penurunan modal.',
                score: 1,
                tag: 'Proteksi Modal'
            },
            {
                text: 'Tetap tenang menahan posisi (Hold). Fluktuasi adalah hal lumrah dan pasar akan pulih bertahap.',
                score: 2,
                tag: 'Disiplin Hold'
            },
            {
                text: 'Membeli lebih banyak saham di harga bawah (Buy the Dip) pada saham pertumbuhan berfundamental kuat.',
                score: 3,
                tag: 'Serok Bawah'
            },
            {
                text: 'Memanfaatkan ayunan harga liar untuk scalping/swing kilat atau memborong aset diskon ekstrem demi cuan cepat.',
                score: 4,
                tag: 'Volatilitas Ekstrem'
            }
        ]
    },
    {
        id: 'q2_return_preference',
        phase: 'Toleransi Risiko',
        phaseLabel: 'Bagian 1: Toleransi Risiko Pasar',
        question: 'Target pertumbuhan modal mana yang paling realistis dan paling sesuai dengan kenyamanan psikologis Anda?',
        options: [
            {
                text: 'Pertumbuhan stabil +5% hingga +8% per tahun dari bunga dan dividen, dengan kepastian modal pokok aman.',
                score: 1,
                tag: 'Stabilitas Pasti'
            },
            {
                text: 'Pertumbuhan terukur +15% hingga +25% per tahun dengan kemungkinan koreksi sementara wajar ±10%.',
                score: 2,
                tag: 'Seimbang'
            },
            {
                text: 'Pertumbuhan tinggi +35% hingga +60% per tahun, siap melihat portofolio berayun tajam hingga -25%.',
                score: 3,
                tag: 'Pertumbuhan Agresif'
            },
            {
                text: 'Penggandaan modal eksponensial (100%–500%+), siap menanggung risiko drawdown dalam demi imbal hasil maksimal.',
                score: 4,
                tag: 'High Alpha'
            }
        ]
    },
    {
        id: 'q3_asset_preference',
        phase: 'Toleransi Risiko',
        phaseLabel: 'Bagian 1: Toleransi Risiko Pasar',
        question: 'Jika Anda menyusun komposisi portofolio bursa Anda, instrumen apa yang paling ingin Anda prioritaskan?',
        options: [
            {
                text: 'Kas likuid, deposito perbankan berimbal pasti, dan saham blue-chip berdividen rutin.',
                score: 1,
                tag: 'Defensif'
            },
            {
                text: 'Kombinasi seimbang saham indeks pasar modal, reksa dana, dan aset properti produktif.',
                score: 2,
                tag: 'Diversifikasi'
            },
            {
                text: 'Mayoritas di saham sektor teknologi, perusahaan bertumbuh cepat, dan sedikit alokasi kripto teratas.',
                score: 3,
                tag: 'Inovasi & Growth'
            },
            {
                text: 'Aset kripto volatilitas tinggi, token Web3, dan saham momentum dinamis.',
                score: 4,
                tag: 'Spekulatif'
            }
        ]
    },

    // ── FASE 2: Latar Belakang Finansial & Disiplin Strategi (Q4 - Q6) ──
    {
        id: 'q4_career_background',
        phase: 'Kapasitas Modal',
        phaseLabel: 'Bagian 2: Karir & Arus Kas',
        question: 'Bagaimana latar belakang arus kas dan kesiapan finansial karakter Anda saat ini?',
        options: [
            {
                text: 'Karir rintisan awal, mahasiswa, atau freelancer dengan arus kas berjalan dan tabungan awal terukur.',
                score: 0,
                tag: 'Rintisan Karir'
            },
            {
                text: 'Karyawan profesional dengan penghasilan bulanan stabil dan surplus tabungan rutin terencana.',
                score: 1,
                tag: 'Profesional Stabil'
            },
            {
                text: 'Eksekutif senior atau pemilik bisnis mandiri dengan aset mapan dan cadangan dana berlebih.',
                score: 2,
                tag: 'Eksekutif Mapan'
            }
        ]
    },
    {
        id: 'q5_liquidity_horizon',
        phase: 'Kapasitas Modal',
        phaseLabel: 'Bagian 2: Kebutuhan Likuiditas',
        question: 'Berapa porsi dari modal yang Anda tempatkan ini yang benar-benar siap menjadi "uang dingin"?',
        options: [
            {
                text: 'Sebagian dana mungkin perlu ditarik sewaktu-waktu jika ada kebutuhan belanja operasional mendesak.',
                score: 0,
                tag: 'Likuiditas Fleksibel'
            },
            {
                text: 'Mayoritas dana aman untuk diputar jangka menengah, dengan sedikit alokasi cadangan darurat terpisah.',
                score: 1,
                tag: 'Sebagian Besar Dingin'
            },
            {
                text: '100% uang dingin murni tanpa disentuh untuk biaya hidup, siap diinvestasikan jangka panjang.',
                score: 2,
                tag: 'Murni Uang Dingin'
            }
        ]
    },
    {
        id: 'q6_strategy_discipline',
        phase: 'Kapasitas Modal',
        phaseLabel: 'Bagian 2: Kedisiplinan Strategi',
        question: 'Bagaimana prinsip kedisiplinan Anda dalam mengeksekusi order dan mengelola risiko pasar?',
        options: [
            {
                text: 'Cenderung spontan mengikuti sentimen keramaian pasar, rumor viral, atau firasat momentum sesaat.',
                score: 0,
                tag: 'Spontan / Emosional'
            },
            {
                text: 'Memiliki rencana dasar (DCA / analisis tren), namun sesekali fleksibel mengambil momentum cepat.',
                score: 1,
                tag: 'Terencana Fleksibel'
            },
            {
                text: 'Sangat disiplin mengikuti trading plan, aturan money management, batas cut loss, dan target profit baku.',
                score: 2,
                tag: 'Disiplin Ketat'
            }
        ]
    }
];

class RoleManager {
    /**
     * Evaluate answers array (Q1-Q3 determine risk profile)
     * Risk score range for 3 questions: 3 to 12
     * - 3–4: conservative ($100k - $250k)
     * - 5–7: moderate     ($75k - $150k)
     * - 8–10: aggressive  ($15k - $75k)
     * - 11–12: speculator ($5k - $15k)
     */
    evaluateRiskProfile(scores = []) {
        const riskScores = scores.slice(0, 3);
        const total = riskScores.reduce((sum, s) => sum + Number(s || 2), 0);
        if (total <= 4) return 'conservative';
        if (total <= 7) return 'moderate';
        if (total <= 10) return 'aggressive';
        return 'speculator';
    }

    /**
     * Calculate exact starting balance within the profile range
     * using behavior and background answers (Q4-Q6: scores 0-2, max 6).
     * Linear interpolation rounded to nearest 500.
     */
    calculateStartingBalance(roleId, scores = []) {
        const profile = this.getRoleData(roleId);
        const min = profile.minStartingBalance || 10000;
        const max = profile.maxStartingBalance || min;

        // Behavior answers from Q4, Q5, Q6 (indices 3, 4, 5)
        const behaviorScores = scores.slice(3, 6);
        const behaviorSum = behaviorScores.reduce((sum, s) => sum + (Number(s) || 0), 0);
        const maxBehaviorSum = 6;
        const factor = Math.min(1, Math.max(0, behaviorSum / maxBehaviorSum));

        const raw = min + factor * (max - min);
        return Math.round(raw / 500) * 500;
    }

    /**
     * Get the active risk profile ID from state, fallback to 'moderate'
     */
    getRole() {
        const rawRole = gameState.get('player.role');
        if (rawRole && ROLES[rawRole]) return rawRole;
        if (rawRole && LEGACY_ROLE_MAP[rawRole]) return LEGACY_ROLE_MAP[rawRole];
        return 'moderate';
    }

    /**
     * Get full profile definition object
     */
    getRoleData(roleId = null) {
        const active = roleId || this.getRole();
        const mappedId = ROLES[active] ? active : (LEGACY_ROLE_MAP[active] || 'moderate');
        return ROLES[mappedId] || ROLES.moderate;
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
        const resolvedId = ROLES[roleId] ? roleId : (LEGACY_ROLE_MAP[roleId] || 'moderate');
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
