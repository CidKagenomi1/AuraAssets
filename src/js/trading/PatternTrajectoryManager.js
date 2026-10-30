/**
 * PatternTrajectoryManager.js - Structured Coordinate Trajectory & 48-Hour Memory System
 * Features:
 *  - Structured technical pattern waypoints (Head & Shoulders, Triangles, Double Top/Bottom, Doji Consolidation)
 *  - Smooth cosine/spline interpolation between waypoints with asset-scaled organic volatility
 *  - Real-time price tracking drift for live market updates (StockMarket & CryptoMarket)
 *  - Timeframe-adaptive candle generation support (CandleGenerator)
 *  - 48-Hour persistent database storage in localStorage with automated eviction of expired records
 *  - Readability of past 24-hour pattern cycles as historical chart memory
 */

const STORAGE_KEY = 'aura_market_pattern_memory_v1';
const PATTERN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours per pattern cycle
const PATTERN_TTL_MS = 48 * 60 * 60 * 1000;      // 48 hours retention in database

export const PATTERN_TYPES = {
    HEAD_AND_SHOULDERS: 'HEAD_AND_SHOULDERS',
    INVERSE_HEAD_AND_SHOULDERS: 'INVERSE_HEAD_AND_SHOULDERS',
    TRIANGLE_ASCENDING: 'TRIANGLE_ASCENDING',
    TRIANGLE_DESCENDING: 'TRIANGLE_DESCENDING',
    TRIANGLE_SYMMETRIC: 'TRIANGLE_SYMMETRIC',
    DOUBLE_TOP: 'DOUBLE_TOP',
    DOUBLE_BOTTOM: 'DOUBLE_BOTTOM',
    DOJI_CONSOLIDATION: 'DOJI_CONSOLIDATION'
};

export const PATTERN_PROFILES = {
    [PATTERN_TYPES.HEAD_AND_SHOULDERS]: {
        name: 'Head & Shoulders',
        badge: 'H&S',
        category: 'reversal_bearish',
        desc: 'Pola pembalikan tren dengan bahu kiri, kepala tinggi, dan bahu kanan.',
        // Relative Y multipliers scaled around 1.0 (baseline)
        waypoints: [
            { p: 0.00, y: 1.000, label: 'Start / Baseline' },
            { p: 0.16, y: 1.026, label: 'Bahu Kiri (Peak)' },
            { p: 0.32, y: 0.996, label: 'Neckline 1' },
            { p: 0.50, y: 1.048, label: 'Kepala / Head (Apex)' },
            { p: 0.68, y: 0.995, label: 'Neckline 2' },
            { p: 0.82, y: 1.024, label: 'Bahu Kanan (Peak)' },
            { p: 1.00, y: 0.968, label: 'Breakdown Target' }
        ]
    },
    [PATTERN_TYPES.INVERSE_HEAD_AND_SHOULDERS]: {
        name: 'Inverse Head & Shoulders',
        badge: 'Inv H&S',
        category: 'reversal_bullish',
        desc: 'Pola pembalikan tren naik dengan palung bahu kiri, kepala rendah, dan bahu kanan.',
        waypoints: [
            { p: 0.00, y: 1.000, label: 'Start / Baseline' },
            { p: 0.16, y: 0.974, label: 'Bahu Kiri (Trough)' },
            { p: 0.32, y: 1.005, label: 'Neckline 1' },
            { p: 0.50, y: 0.952, label: 'Kepala Bawah / Head' },
            { p: 0.68, y: 1.006, label: 'Neckline 2' },
            { p: 0.82, y: 0.976, label: 'Bahu Kanan (Trough)' },
            { p: 1.00, y: 1.036, label: 'Breakout Target' }
        ]
    },
    [PATTERN_TYPES.TRIANGLE_SYMMETRIC]: {
        name: 'Symmetrical Triangle',
        badge: 'Sym Triangle',
        category: 'consolidation',
        desc: 'Pola segitiga simetris dengan konvergensi lower highs dan higher lows menuju apeks.',
        waypoints: [
            { p: 0.00, y: 1.032, label: 'Swing High 1' },
            { p: 0.20, y: 0.968, label: 'Swing Low 1' },
            { p: 0.40, y: 1.020, label: 'Lower High 2' },
            { p: 0.60, y: 0.982, label: 'Higher Low 2' },
            { p: 0.80, y: 1.008, label: 'Apex / Penyempitan' },
            { p: 1.00, y: 1.038, label: 'Breakout Ekspansi' }
        ]
    },
    [PATTERN_TYPES.TRIANGLE_ASCENDING]: {
        name: 'Ascending Triangle',
        badge: 'Asc Triangle',
        category: 'bullish',
        desc: 'Pola segitiga naik dengan resistensi horizontal datar dan higher lows yang menekan ke atas.',
        waypoints: [
            { p: 0.00, y: 0.972, label: 'Swing Low 1' },
            { p: 0.25, y: 1.028, label: 'Resistensi 1' },
            { p: 0.50, y: 0.995, label: 'Higher Low 2' },
            { p: 0.72, y: 1.029, label: 'Resistensi 2' },
            { p: 0.86, y: 1.012, label: 'Higher Low 3' },
            { p: 1.00, y: 1.052, label: 'Bullish Breakout' }
        ]
    },
    [PATTERN_TYPES.TRIANGLE_DESCENDING]: {
        name: 'Descending Triangle',
        badge: 'Desc Triangle',
        category: 'bearish',
        desc: 'Pola segitiga turun dengan support datar dan lower highs yang menekan harga ke bawah.',
        waypoints: [
            { p: 0.00, y: 1.028, label: 'Swing High 1' },
            { p: 0.25, y: 0.972, label: 'Support 1' },
            { p: 0.50, y: 1.005, label: 'Lower High 2' },
            { p: 0.72, y: 0.971, label: 'Support 2' },
            { p: 0.86, y: 0.988, label: 'Lower High 3' },
            { p: 1.00, y: 0.948, label: 'Bearish Breakdown' }
        ]
    },
    [PATTERN_TYPES.DOUBLE_TOP]: {
        name: 'Double Top (M-Pattern)',
        badge: 'Double Top',
        category: 'reversal_bearish',
        desc: 'Dua puncak uji resistensi di level yang sama sebelum koreksi tajam.',
        waypoints: [
            { p: 0.00, y: 0.982, label: 'Start' },
            { p: 0.25, y: 1.036, label: 'Puncak 1 (Top 1)' },
            { p: 0.50, y: 0.986, label: 'Palung Tengah (Neckline)' },
            { p: 0.75, y: 1.034, label: 'Puncak 2 (Top 2)' },
            { p: 1.00, y: 0.962, label: 'Breakdown Selesai' }
        ]
    },
    [PATTERN_TYPES.DOUBLE_BOTTOM]: {
        name: 'Double Bottom (W-Pattern)',
        badge: 'Double Bottom',
        category: 'reversal_bullish',
        desc: 'Dua lembah uji support di level yang sama sebelum pembalikan ke atas.',
        waypoints: [
            { p: 0.00, y: 1.018, label: 'Start' },
            { p: 0.25, y: 0.964, label: 'Dasar 1 (Bottom 1)' },
            { p: 0.50, y: 1.016, label: 'Puncak Tengah (Neckline)' },
            { p: 0.75, y: 0.966, label: 'Dasar 2 (Bottom 2)' },
            { p: 1.00, y: 1.038, label: 'Breakout Selesai' }
        ]
    },
    [PATTERN_TYPES.DOJI_CONSOLIDATION]: {
        name: 'Konsolidasi Rata-Rata (Doji Cluster)',
        badge: 'Doji / Flat',
        category: 'neutral',
        desc: 'Kondisi pasar seimbang & rata-rata: fluktuasi sangat tipis dengan bentuk lilin Doji.',
        isDoji: true,
        waypoints: [
            { p: 0.00, y: 1.000, label: 'Titik Imbang Awal' },
            { p: 0.20, y: 1.002, label: 'Micro Fluktuasi +' },
            { p: 0.40, y: 0.998, label: 'Micro Fluktuasi -' },
            { p: 0.60, y: 1.001, label: 'Keseimbangan Pasar' },
            { p: 0.80, y: 0.999, label: 'Kompresi Doji' },
            { p: 1.00, y: 1.000, label: 'Konsolidasi Berjalan' }
        ]
    }
};

class PatternTrajectoryManager {
    constructor() {
        this.cache = new Map();
        this._loadStorage();
        this.cleanExpiredPatterns();
    }

    _loadStorage() {
        this.storage = {};
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.storage = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[PatternTrajectoryManager] Gagal membaca storage:', e);
            this.storage = {};
        }
    }

    _saveStorage() {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
        } catch (e) {
            console.warn('[PatternTrajectoryManager] Gagal menyimpan ke storage:', e);
        }
    }

    /**
     * Otomatis membersihkan pola yang sudah melewati batas kadaluarsa 48 jam
     */
    cleanExpiredPatterns() {
        const now = Date.now();
        let changed = false;
        const cleaned = {};

        for (const [key, record] of Object.entries(this.storage)) {
            if (record.expiresAt && record.expiresAt > now) {
                cleaned[key] = record;
            } else {
                changed = true;
            }
        }

        if (changed) {
            this.storage = cleaned;
            this._saveStorage();
        }
    }

    /**
     * Mendapatkan rentang siklus 24 jam berbasis waktu UTC
     */
    _getCycleWindow(timestamp = Date.now()) {
        const dayMs = PATTERN_DURATION_MS;
        const cycleIndex = Math.floor(timestamp / dayMs);
        const startTime = cycleIndex * dayMs;
        const endTime = startTime + dayMs;
        const expiresAt = startTime + PATTERN_TTL_MS; // 48 jam sejak awal siklus
        return { cycleIndex, startTime, endTime, expiresAt };
    }

    /**
     * Menghasilkan hash deterministik stabil dari string dan angka
     */
    _pseudoHash(str, salt = 0) {
        let hash = (salt * 37) % 100000;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) % 100000;
        }
        return hash;
    }

    /**
     * Mengambil atau membuat pola aktif untuk aset pada siklus 24 jam saat ini
     */
    getActivePattern(symbol, asset = null) {
        this.cleanExpiredPatterns();
        const now = Date.now();
        const { cycleIndex, startTime, endTime, expiresAt } = this._getCycleWindow(now);
        const key = `${symbol}_${cycleIndex}`;

        if (this.storage[key]) {
            return this.storage[key];
        }

        // Tentukan pola berdasarkan karakteristik aset dan hari
        const pattern = this._generatePatternRecord(symbol, asset, cycleIndex, startTime, endTime, expiresAt);
        this.storage[key] = pattern;
        this._saveStorage();
        return pattern;
    }

    /**
     * Mengambil riwayat pola yang tersimpan dalam kurun 48 jam terakhir untuk aset
     */
    getAssetPatternHistory(symbol) {
        this.cleanExpiredPatterns();
        const history = [];
        for (const record of Object.values(this.storage)) {
            if (record.symbol === symbol) {
                history.push(record);
            }
        }
        // Urutkan dari yang terbaru
        return history.sort((a, b) => b.startTime - a.startTime);
    }

    /**
     * Logika pemilihan pola: membagi antara pola geometris tren dan fase Doji pasar datar
     */
    _selectPatternType(symbol, asset, cycleIndex) {
        const hash = this._pseudoHash(symbol, cycleIndex);
        const vol = asset?.volatility || 0.02;

        // Jika volatilitas rendah atau hash jatuh di rentang pasar tenang (~25% kemungkinan):
        // Aktifkan konsolidasi Doji (pasar sedang rata-rata/flat)
        if (vol < 0.012 || (hash % 100) < 25) {
            return PATTERN_TYPES.DOJI_CONSOLIDATION;
        }

        const patternPool = [
            PATTERN_TYPES.HEAD_AND_SHOULDERS,
            PATTERN_TYPES.INVERSE_HEAD_AND_SHOULDERS,
            PATTERN_TYPES.TRIANGLE_SYMMETRIC,
            PATTERN_TYPES.TRIANGLE_ASCENDING,
            PATTERN_TYPES.TRIANGLE_DESCENDING,
            PATTERN_TYPES.DOUBLE_TOP,
            PATTERN_TYPES.DOUBLE_BOTTOM,
            PATTERN_TYPES.DOJI_CONSOLIDATION
        ];

        const index = hash % patternPool.length;
        return patternPool[index];
    }

    _generatePatternRecord(symbol, asset, cycleIndex, startTime, endTime, expiresAt) {
        const patternType = this._selectPatternType(symbol, asset, cycleIndex);
        const profile = PATTERN_PROFILES[patternType] || PATTERN_PROFILES[PATTERN_TYPES.DOJI_CONSOLIDATION];

        const basePrice = asset?.basePrice || asset?.price || 100;
        const volatility = Math.min(0.06, Math.max(0.008, asset?.volatility || 0.025));

        // Sesuaikan koordinat waypoints dengan bobot volatilitas aset
        const waypoints = profile.waypoints.map(wp => {
            // Skala deviasi (y - 1.0) dikalikan volatilitas riil aset
            const deviation = (wp.y - 1.0);
            const scaledDeviation = profile.isDoji 
                ? deviation * 0.15 
                : deviation * (volatility / 0.025);
            const targetMultiplier = 1.0 + scaledDeviation;
            const absolutePrice = parseFloat((basePrice * targetMultiplier).toFixed(2));

            return {
                progress: wp.p,
                relY: targetMultiplier,
                targetPrice: absolutePrice,
                label: wp.label
            };
        });

        return {
            id: `pat_${symbol}_${cycleIndex}`,
            symbol,
            patternType,
            name: profile.name,
            badge: profile.badge,
            desc: profile.desc,
            category: profile.category,
            isDoji: !!profile.isDoji,
            startTime,
            endTime,
            expiresAt,
            basePrice,
            volatility,
            waypoints
        };
    }

    /**
     * Interpolasi kurva non-linear organik & sub-wave harmonik antara titik koordinat waypoints
     */
    getTargetMultiplier(pattern, progress, includeHarmonics = true) {
        if (!pattern || !pattern.waypoints || pattern.waypoints.length === 0) {
            return 1.0;
        }

        const clampedProgress = Math.max(0, Math.min(1, progress));
        const wps = pattern.waypoints;

        if (clampedProgress <= wps[0].progress) return wps[0].relY;
        if (clampedProgress >= wps[wps.length - 1].progress) return wps[wps.length - 1].relY;

        let wpA = wps[0];
        let wpB = wps[1];

        for (let i = 0; i < wps.length - 1; i++) {
            if (clampedProgress >= wps[i].progress && clampedProgress <= wps[i + 1].progress) {
                wpA = wps[i];
                wpB = wps[i + 1];
                break;
            }
        }

        const range = wpB.progress - wpA.progress || 1;
        const localT = (clampedProgress - wpA.progress) / range;
        
        // Hermite smoothstep cubic easing untuk transisi kontur kurva alami (menghilangkan garis patah linear)
        const ease = localT * localT * (3 - 2 * localT);
        let baseMultiplier = wpA.relY + (wpB.relY - wpA.relY) * ease;

        if (!includeHarmonics) {
            return baseMultiplier;
        }

        // Jika pola Doji: pasar rata-rata -> micro-ripples sangat tipis di sekitar harga keseimbangan
        if (pattern.isDoji) {
            const dojiRipple = (Math.sin(clampedProgress * 37.7) * 0.0006) + (Math.sin(clampedProgress * 75.4) * 0.0003);
            return baseMultiplier + dojiRipple;
        }

        // Untuk pola geometris (Head & Shoulders, Triangles, dsb.):
        // Tambahkan secondary harmonic price waves (gerakan gelombang sub-siklus non-linear realistis)
        const vol = pattern.volatility || 0.025;
        const subWave1 = Math.sin(clampedProgress * Math.PI * 6.5) * (vol * 0.35);
        const subWave2 = Math.sin(clampedProgress * Math.PI * 14.2) * (vol * 0.18);
        
        // Tapering lembut mendekati puncak/lembah utama agar titik waypoints tetap presisi
        const distToWaypoint = Math.min(
            Math.abs(clampedProgress - wpA.progress),
            Math.abs(clampedProgress - wpB.progress)
        );
        const taper = Math.min(1, distToWaypoint * 16);

        return baseMultiplier + (subWave1 + subWave2) * taper;
    }

    /**
     * Hitung target harga absolut yang harus dicapai pada titik waktu tertentu
     */
    getTargetPrice(symbol, asset, progress = null) {
        const pattern = this.getActivePattern(symbol, asset);
        let p = progress;
        if (p === null || p === undefined) {
            const now = Date.now();
            const elapsed = now - pattern.startTime;
            p = Math.max(0, Math.min(1, elapsed / PATTERN_DURATION_MS));
        }

        const multiplier = this.getTargetMultiplier(pattern, p);
        const base = asset?.basePrice || pattern.basePrice || 100;
        return base * multiplier;
    }

    /**
     * Memberikan vektor gaya tarik (drift) untuk updatePrices di StockMarket / CryptoMarket
     * Menuntun pergerakan acak brownian agar sejalan dengan pola geometris yang sedang terbentuk
     */
    getPatternDrift(symbol, asset, currentPrice) {
        const pattern = this.getActivePattern(symbol, asset);
        const now = Date.now();
        const elapsed = now - pattern.startTime;
        const progress = Math.max(0, Math.min(1, elapsed / PATTERN_DURATION_MS));

        const targetMultiplier = this.getTargetMultiplier(pattern, progress);
        const basePrice = asset?.basePrice || pattern.basePrice || currentPrice;
        const targetPrice = basePrice * targetMultiplier;

        // Hitung jarak deviasi antara harga sekarang dan target track pola
        const priceDiffRatio = (targetPrice - currentPrice) / (currentPrice || 1);

        // Jika pola Doji / flat: berikan tarikan stabil yang menekan volatilitas (dampener)
        if (pattern.isDoji) {
            return {
                drift: priceDiffRatio * 0.008,
                volatilityScale: 0.35, // redam brownian motion hingga 65% saat pasar tenang
                isDoji: true,
                pattern
            };
        }

        // Untuk pola geometris reguler (Head & Shoulders, Triangle, dsb.)
        return {
            drift: priceDiffRatio * 0.006, // dorongan halus membimbing arah harga
            volatilityScale: 1.0,
            isDoji: false,
            pattern
        };
    }
}

export default new PatternTrajectoryManager();

