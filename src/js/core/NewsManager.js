/**
 * NewsManager.js - Dynamic Market News & Real-Time Event Engine
 * Macroeconomic, US Stock Market, and Crypto Breaking News
 * Duration spans from 30 minutes to 5 hours depending on impact magnitude,
 * creating realistic real-time price volatility for active swing/day trading.
 */

import gameState from './GameState.js';
import ui from '../ui/UIManager.js';
import { broadcastCloudEvent, initGlobalNewsRealtime } from './SupabaseClient.js';

// ============================================================================
// 1. US STOCK MARKET BREAKING NEWS (20 EVENTS)
// Duration: 30 minutes to 5 hours (1800s to 18000s) based on impact
// ============================================================================
export const STOCK_NEWS_DATABASE = [
  {
    id: "fed_cpi_rate_cut_50bps",
    market: "stock",
    type: "positive",
    headline: "The Fed Pangkas Suku Bunga Acuan 50 Bps Usai Inflasi CPI Mendingin ke 1.9%",
    ticker_target: "SPY",
    sector: "broad_market",
    impact_percent: 5.4,
    duration_minutes: 45 // 45 Menit
  },
  {
    id: "congress_ai_grid_subsidy_300b",
    market: "stock",
    type: "positive",
    headline: "Kongres AS Sahkan Subsidi Infrastruktur AI & Grid Listrik Senilai $300 Miliar",
    ticker_target: "SOXX",
    sector: "semiconductor_tech",
    impact_percent: 14.2,
    duration_minutes: 150 // 2.5 Jam
  },
  {
    id: "fda_fasttrack_cancer_genetherapy",
    market: "stock",
    type: "positive",
    headline: "FDA Berikan Persetujuan Jalur Cepat untuk Terapi Genetik Kanker Generasi Baru",
    ticker_target: "XBI",
    sector: "biotech_pharma",
    impact_percent: 18.6,
    duration_minutes: 210 // 3.5 Jam
  },
  {
    id: "holiday_retail_spending_record",
    market: "stock",
    type: "positive",
    headline: "Belanja Musim Liburan Tembus Rekor Bersejarah, Konsumen AS Tetap Solid",
    ticker_target: "XLY",
    sector: "consumer_discretionary",
    impact_percent: 8.3,
    duration_minutes: 50 // 50 Menit
  },
  {
    id: "supply_chain_crisis_resolution",
    market: "stock",
    type: "positive",
    headline: "Krisis Rantai Pasok Global Resmi Berakhir, Efisiensi Logistik Dongkrak Margin Korporasi",
    ticker_target: "XLI",
    sector: "industrials",
    impact_percent: 9.5,
    duration_minutes: 90 // 1.5 Jam
  },
  {
    id: "solid_state_battery_texas_mass_prod",
    market: "stock",
    type: "positive",
    headline: "Terobosan Baterai Solid-State Komersial Siap Masuk Jalur Perakitan Massal di Texas",
    ticker_target: "EV_SECTOR",
    sector: "clean_tech_automotive",
    impact_percent: 16.7,
    duration_minutes: 180 // 3 Jam
  },
  {
    id: "sp500_q3_earnings_beat_88pct",
    market: "stock",
    type: "positive",
    headline: "Musim Rilis Kinerja Keuangan Q3: 88% Emiten S&P 500 Kalahkan Estimasi Wall Street",
    ticker_target: "VOO",
    sector: "broad_market",
    impact_percent: 6.8,
    duration_minutes: 45 // 45 Menit
  },
  {
    id: "wallstreet_stress_test_record_capital",
    market: "stock",
    type: "positive",
    headline: "Bank-Bank Raksasa Wall Street Lolos Uji Stres The Fed dengan Rasio Modal Tertinggi Sedekade",
    ticker_target: "XLF",
    sector: "financials",
    impact_percent: 11.2,
    duration_minutes: 120 // 2 Jam
  },
  {
    id: "us_eu_chip_freetrade_pact",
    market: "stock",
    type: "positive",
    headline: "AS dan Uni Eropa Teken Pakta Perdagangan Bebas Komponen Chip Canggih Tanpa Hambatan Tarif",
    ticker_target: "XLK",
    sector: "technology",
    impact_percent: 12.4,
    duration_minutes: 120 // 2 Jam
  },
  {
    id: "utility_fusion_ppa_datacenter",
    market: "stock",
    type: "positive",
    headline: "Perusahaan Utilitas Capai Kesepakatan PPA Jangka Panjang Suplai Listrik Fusi Bersih ke Data Center",
    ticker_target: "XLU",
    sector: "utilities",
    impact_percent: 10.1,
    duration_minutes: 90 // 1.5 Jam
  },
  {
    id: "fed_emergency_hike_75bps_wage_oil",
    market: "stock",
    type: "negative",
    headline: "The Fed Naikkan Suku Bunga Darurat 75 Bps Akibat Lonjakan Tak Terduga Upah dan Harga Minyak",
    ticker_target: "QQQ",
    sector: "growth_broad_market",
    impact_percent: -7.8,
    duration_minutes: 60 // 1 Jam
  },
  {
    id: "doj_ftc_antitrust_cloud_ai_breakup",
    market: "stock",
    type: "negative",
    headline: "DOJ dan Komisi Dagang AS Resmi Ajukan Tuntutan Pemecahan Monopoli Raksasa Cloud & AI",
    ticker_target: "BIG_TECH",
    sector: "technology",
    impact_percent: -16.5,
    duration_minutes: 210 // 3.5 Jam
  },
  {
    id: "taiwan_strait_semiconductor_halt",
    market: "stock",
    type: "negative",
    headline: "Ketegangan di Selat Taiwan Meningkat, Pengiriman Wafer Semikonduktor Global Tertahan",
    ticker_target: "SOXX",
    sector: "semiconductors",
    impact_percent: -22.4,
    duration_minutes: 240 // 4 Jam
  },
  {
    id: "cre_default_regional_banks_liquidity",
    market: "stock",
    type: "negative",
    headline: "Gelombang Gagal Bayar Kredit Properti Komersial Menekan Likuiditas Bank Regional AS",
    ticker_target: "KRE",
    sector: "regional_banking",
    impact_percent: -18.9,
    duration_minutes: 210 // 3.5 Jam
  },
  {
    id: "corporate_buyback_capital_gains_tax_28",
    market: "stock",
    type: "negative",
    headline: "Otoritas Pajak AS Usulkan Kenaikan Pajak Buyback Saham dan Capital Gains Korporasi Menjadi 28%",
    ticker_target: "SPY",
    sector: "broad_market",
    impact_percent: -9.2,
    duration_minutes: 60 // 1 Jam
  },
  {
    id: "hormuz_shutdown_wti_crude_130",
    market: "stock",
    type: "negative",
    headline: "Eskalasi Konflik Timur Tengah Tutup Selat Hormuz, Minyak Mentah WTI Melejit Tembus $130/Barel",
    ticker_target: "JETS",
    sector: "transport_consumer",
    impact_percent: -11.6,
    duration_minutes: 120 // 2 Jam
  },
  {
    id: "cloud_breach_data_leak_fraud",
    market: "stock",
    type: "negative",
    headline: "Audit Independen Ungkap Kebocoran Data Massal dan Fraud Server pada Penyedia Cloud Terbesar",
    ticker_target: "HACK",
    sector: "cloud_saas",
    impact_percent: -19.8,
    duration_minutes: 210 // 3.5 Jam
  },
  {
    id: "glp1_phase3_clinical_trial_failure",
    market: "stock",
    type: "negative",
    headline: "Uji Klinis Fase 3 Obat Pelangsing & Metabolik Blockbuster Gagal Capai Target Primer Efektivitas",
    ticker_target: "XLV",
    sector: "pharma_healthcare",
    impact_percent: -15.3,
    duration_minutes: 120 // 2 Jam
  },
  {
    id: "credit_card_delinquency_record_2008",
    market: "stock",
    type: "negative",
    headline: "Tingkat Default Kartu Kredit Konsumen AS Capai Titik Tertinggi Sejak Krisis Finansial 2008",
    ticker_target: "FINTECH",
    sector: "consumer_finance",
    impact_percent: -13.4,
    duration_minutes: 120 // 2 Jam
  },
  {
    id: "us_govt_debt_ceiling_shutdown_gridlock",
    market: "stock",
    type: "negative",
    headline: "Pemerintah AS Terancam Shutdown Berkepanjangan Akibat Kebuntuan Anggaran Plafon Utang",
    ticker_target: "SPY",
    sector: "broad_market",
    impact_percent: -6.5,
    duration_minutes: 30 // 30 Menit
  }
];

// ============================================================================
// 2. CRYPTOCURRENCY BREAKING NEWS (20 EVENTS)
// Duration: 30 minutes to 5 hours (1800s to 18000s) based on impact
// ============================================================================
export const CRYPTO_NEWS_DATABASE = [
  {
    id: "sec_eth_sol_staking_etf_approval",
    market: "crypto",
    type: "positive",
    headline: "SEC Beri Lampu Hijau untuk ETF Staking Ethereum dan Solana Spot Pertama di AS",
    target_asset: "ALTCOINS_MAJOR",
    sector: "layer_1",
    impact_percent: 22.5,
    duration_minutes: 240 // 4 Jam
  },
  {
    id: "congress_stablecoin_act_commercial_banks",
    market: "crypto",
    type: "positive",
    headline: "Kongres AS Sahkan UU Stablecoin Nasional, Bank Komersial Resmi Diizinkan Terbitkan Token Sendiri",
    target_asset: "TOTAL_MARKET",
    sector: "regulation_infrastructure",
    impact_percent: 11.8,
    duration_minutes: 150 // 2.5 Jam
  },
  {
    id: "gulf_swf_3pct_btc_reserve_allocation",
    market: "crypto",
    type: "positive",
    headline: "Sovereign Wealth Fund Negara Teluk Alokasikan 3% Portofolio Negara ke Bitcoin Cadangan Devisa",
    target_asset: "BTC",
    sector: "store_of_value",
    impact_percent: 18.4,
    duration_minutes: 240 // 4 Jam
  },
  {
    id: "zk_rollup_99pct_gas_fee_cut",
    market: "crypto",
    type: "positive",
    headline: "Solusi Zero-Knowledge Rollup Baru Pangkas Biaya Gas Jaringan hingga 99% Tanpa Mengorbankan Keamanan",
    target_asset: "L2_TOKENS",
    sector: "layer_2_scaling",
    impact_percent: 27.0,
    duration_minutes: 240 // 4 Jam
  },
  {
    id: "global_pay_public_blockchain_50m_merchants",
    market: "crypto",
    type: "positive",
    headline: "Raksasa Pembayaran Global Integrasikan Settlement Real-Time Berbasis Blockchain Publik untuk 50 Juta Merchant",
    target_asset: "PAYMENT_COINS",
    sector: "payments_adoption",
    impact_percent: 15.6,
    duration_minutes: 150 // 2.5 Jam
  },
  {
    id: "fiat_inflation_emerging_crypto_volume_ath",
    market: "crypto",
    type: "positive",
    headline: "Inflasi Mata Uang Fiat Global Melonjak, Volume Transaksi Kripto Pasar Berkembang Capai Rekor Tertinggi",
    target_asset: "TOTAL_MARKET",
    sector: "macro_hedge",
    impact_percent: 8.9,
    duration_minutes: 60 // 1 Jam
  },
  {
    id: "mainnet_upgrade_200k_tps_consensus",
    market: "crypto",
    type: "positive",
    headline: "Konsensus Upgrade Jaringan Utama Sukses Dieksekusi, Target Throughput 200.000 TPS Terpenuhi",
    target_asset: "SMART_CONTRACTS",
    sector: "layer_1",
    impact_percent: 19.2,
    duration_minutes: 210 // 3.5 Jam
  },
  {
    id: "g7_institutional_custody_pension_inflow",
    market: "crypto",
    type: "positive",
    headline: "Bank Sentral G7 Terbitkan Kerangka Kerja Kustodian Kripto Standar Institusi, Dana Pensiun Mulai Masuk",
    target_asset: "TOP_10_INDEX",
    sector: "institutional_adoption",
    impact_percent: 14.3,
    duration_minutes: 150 // 2.5 Jam
  },
  {
    id: "defi_insurance_5b_protection_fund",
    market: "crypto",
    type: "positive",
    headline: "Protokol DeFi Terbesar Luncurkan Fitur Asuransi Smart Contract Terdesentralisasi dengan Dana Proteksi $5 Miliar",
    target_asset: "DEFI_INDEX",
    sector: "defi",
    impact_percent: 21.0,
    duration_minutes: 210 // 3.5 Jam
  },
  {
    id: "social_media_web3_wallet_mass_rollout",
    market: "crypto",
    type: "positive",
    headline: "Platform Media Sosial Global Luncurkan Dompet Web3 Terintegrasi untuk Seluruh Pengguna Aktif",
    target_asset: "SOCIALFI",
    sector: "web3_social",
    impact_percent: 25.8,
    duration_minutes: 240 // 4 Jam
  },
  {
    id: "cross_chain_bridge_1_2b_exploit",
    market: "crypto",
    type: "negative",
    headline: "Eksploitasi Jembatan Lintas Rantai (Cross-Chain Bridge) Terbesar Kuras Likuiditas Senilai $1.2 Miliar",
    target_asset: "DEFI_INDEX",
    sector: "defi_security",
    impact_percent: -24.5,
    duration_minutes: 240 // 4 Jam
  },
  {
    id: "algo_stablecoin_depeg_62cents_cascade",
    market: "crypto",
    type: "negative",
    headline: "Stablecoin Algoritmik Peringkat 5 Dunia Kehilangan Pasak (De-peg) ke $0.62, Picu Likuidasi Berantai",
    target_asset: "TOTAL_MARKET",
    sector: "stablecoins",
    impact_percent: -29.0,
    duration_minutes: 270 // 4.5 Jam
  },
  {
    id: "doj_top3_cex_server_seizure_asset_freeze",
    market: "crypto",
    type: "negative",
    headline: "Departemen Kehakiman AS Sita Server dan Bekukan Aset Exchange Kripto Terpusat Terbesar Ketiga",
    target_asset: "CEX_TOKENS",
    sector: "centralized_exchanges",
    impact_percent: -32.4,
    duration_minutes: 300 // 5 Jam Maksimal
  },
  {
    id: "eu_pow_mining_energy_strict_ban",
    market: "crypto",
    type: "negative",
    headline: "Uni Eropa Terapkan Larangan Ketat Konsumsi Energi untuk Penambangan Kripto Proof-of-Work",
    target_asset: "POW_MINING",
    sector: "mining_energy",
    impact_percent: -12.8,
    duration_minutes: 120 // 2 Jam
  },
  {
    id: "state_hacker_hardfork_51pct_attack",
    market: "crypto",
    type: "negative",
    headline: "Grup Hacker Terafiliasi Negara Lancarkan Serangan 51% pada Salah Satu Hard Fork Terkemuka",
    target_asset: "MID_CAPS",
    sector: "network_security",
    impact_percent: -26.7,
    duration_minutes: 240 // 4 Jam
  },
  {
    id: "global_kyc_mandate_self_custody_wallets",
    market: "crypto",
    type: "negative",
    headline: "Regulator Global Wajibkan Verifikasi KYC Ketat pada Dompet Kripto Non-Kustodial (Self-Custody)",
    target_asset: "PRIVACY_TOKENS",
    sector: "privacy_wallets",
    impact_percent: -17.6,
    duration_minutes: 180 // 3 Jam
  },
  {
    id: "genesis_2011_whale_100k_btc_dump",
    market: "crypto",
    type: "negative",
    headline: "Paus Kripto Era Genesis 2011 Bangkit dan Mentransfer 100.000 BTC ke Bursa untuk Aksi Jual Masif",
    target_asset: "BTC",
    sector: "whale_activity",
    impact_percent: -14.2,
    duration_minutes: 90 // 1.5 Jam
  },
  {
    id: "evm_zero_day_smart_contract_flaw",
    market: "crypto",
    type: "negative",
    headline: "Celah Fatal Zero-Day Ditemukan pada Mesin Virtual Smart Contract Paling Populer",
    target_asset: "EVM_CHAINS",
    sector: "infrastructure",
    impact_percent: -21.3,
    duration_minutes: 240 // 4 Jam
  },
  {
    id: "l1_class_action_unregistered_securities",
    market: "crypto",
    type: "negative",
    headline: "Gugatan Class-Action Terhadap Yayasan Layer-1 Utama atas Tuduhan Penjualan Sekuritas Ilegal Tanpa Izin",
    target_asset: "ALTCOINS_MAJOR",
    sector: "legal_compliance",
    impact_percent: -18.0,
    duration_minutes: 210 // 3.5 Jam
  },
  {
    id: "cefi_credit_chapter11_bankruptcy_default",
    market: "crypto",
    type: "negative",
    headline: "Perusahaan Finansial Kripto Utama Ajukan Kebangkrutan Bab 11 Akibat Gagal Bayar Pinjaman Terstruktur",
    target_asset: "CEFI_INDEX",
    sector: "cefi_credit",
    impact_percent: -16.5,
    duration_minutes: 180 // 3 Jam
  }
];

export const ALL_NEWS_DATABASE = [...STOCK_NEWS_DATABASE, ...CRYPTO_NEWS_DATABASE];

class NewsManager {
    constructor() {
        this.activeNews = [];
        this.newsHistory = [];
        this.lastTriggerTimestamp = 0;
        this.cleanupInterval = null;
        this.loadState();
        this.startBackgroundTimer();

        // Listen to game events
        gameState.on('dayPass', () => this.onDayPass());

        // Connect to Supabase Cloud Realtime for multi-device synchronized events
        try {
            initGlobalNewsRealtime(this);
        } catch (e) {
            console.warn('[NewsManager] Supabase Realtime init bypassed:', e);
        }

        // Initial launch check: Ensure market always has active catalyst
        setTimeout(() => {
            if (this.activeNews.length === 0) {
                console.log('📢 [NewsManager] No active breaking news found on launch, releasing market catalyst...');
                this.triggerRandomEvent();
            }
        }, 3500);
    }

    loadState() {
        const saved = gameState.get('newsState');
        if (saved) {
            const now = Date.now();
            // Filter out events whose real-time duration has already ended
            this.activeNews = (saved.activeNews || []).filter(item => item.endTime > now);
            this.newsHistory = saved.newsHistory || [];
            this.lastTriggerTimestamp = saved.lastTriggerTimestamp || 0;
        }
    }

    saveState() {
        gameState.set('newsState', {
            activeNews: this.activeNews,
            newsHistory: this.newsHistory.slice(-60),
            lastTriggerTimestamp: this.lastTriggerTimestamp
        });
    }

    startBackgroundTimer() {
        if (this.cleanupInterval) return;
        // Periodic check every 15 seconds for expiration and new news release
        this.cleanupInterval = setInterval(() => {
            this.checkExpiredNews();
            this.evaluatePeriodicTrigger();
        }, 15000);
    }

    /**
     * Periodically evaluate whether a new catalyst should be released into the market
     */
    evaluatePeriodicTrigger() {
        const now = Date.now();
        const minCooldownMs = 3 * 60 * 1000; // 3 menit jeda antar peristiwa
        const maxActiveEvents = 2; // Maksimal 2 berita aktif bersamaan agar tren terarah

        if (this.activeNews.length < maxActiveEvents) {
            const timeSinceLast = now - (this.lastTriggerTimestamp || 0);

            // Jika pasar kosong sama sekali dan sudah 30 detik sejak event terakhir berakhir
            if (this.activeNews.length === 0 && timeSinceLast > 30000) {
                if (Math.random() < 0.50) {
                    this.triggerRandomEvent();
                    return;
                }
            }

            // Pemicu berkala jika sudah melewati masa cooldown minimum
            if (timeSinceLast > minCooldownMs) {
                if (Math.random() < 0.35) {
                    this.triggerRandomEvent();
                }
            }
        }
    }

    checkExpiredNews() {
        const now = Date.now();
        const initialCount = this.activeNews.length;
        this.activeNews = this.activeNews.filter(item => item.endTime > now);

        if (this.activeNews.length !== initialCount) {
            this.saveState();
            gameState.emit('newsUpdate', this.activeNews);
        }
    }

    /**
     * Format remaining real-time countdown (e.g. "3j 45m" or "28m 10s")
     */
    getRemainingCountdown(item) {
        const remainingMs = Math.max(0, item.endTime - Date.now());
        const totalSeconds = Math.floor(remainingMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}j ${minutes}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    // =========================================================================
    // STOCK TARGET MATCHING & BIAS
    // =========================================================================
    matchesStockTarget(news, symbol, stockSector) {
        if (news.market !== 'stock') return false;

        const sec = (news.sector || '').toLowerCase();
        const target = (news.ticker_target || '').toUpperCase();
        const sym = (symbol || '').toUpperCase();
        const sSec = (stockSector || '').toLowerCase();

        if (sec.includes('broad_market') || target === 'SPY' || target === 'VOO' || target === 'QQQ') return true;

        if (sec.includes('semiconductor') || target === 'SOXX') {
            const semiSymbols = ['NVDA', 'AVGO', 'AMD', 'QCOM', 'INTC', 'TXN', 'ADI', 'LRCX', 'KLAC', 'MU'];
            return semiSymbols.includes(sym) || sSec.includes('tech');
        }

        if (target === 'BIG_TECH' || sec.includes('technology') || sec.includes('cloud') || target === 'XLK' || target === 'HACK') {
            const bigTech = ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'CRM', 'ADBE', 'CSCO', 'INTU', 'IBM', 'ADP', 'PANW', 'SNPS', 'CDNS'];
            return bigTech.includes(sym) || sSec.includes('technology');
        }

        if (sec.includes('biotech') || sec.includes('pharma') || sec.includes('healthcare') || target === 'XBI' || target === 'XLV') {
            return sSec.includes('health') || ['LLY', 'UNH', 'JNJ', 'MRK', 'ABBV', 'PFE', 'AMGN', 'REGN', 'VRTX', 'BMY', 'SYK', 'CVS'].includes(sym);
        }

        if (sec.includes('clean_tech') || sec.includes('automotive') || target === 'EV_SECTOR') {
            return sym === 'TSLA' || sSec.includes('cyclical');
        }

        if (sec.includes('consumer_discretionary') || sec.includes('transport') || target === 'XLY' || target === 'JETS') {
            return sSec.includes('cyclical') || ['AMZN', 'HD', 'MCD', 'NKE', 'DIS', 'LOW', 'TJX', 'BA'].includes(sym);
        }

        if (sec.includes('financial') || sec.includes('banking') || target === 'XLF' || target === 'KRE' || target === 'FINTECH') {
            return sSec.includes('financial') || ['JPM', 'V', 'MA', 'BAC', 'GS', 'MS', 'BLK', 'C', 'WFC', 'AXP', 'SPGI'].includes(sym);
        }

        if (sec.includes('industrial') || target === 'XLI') {
            return sSec.includes('industrial') || ['CAT', 'UNP', 'GE', 'HON', 'RTX', 'LMT', 'BA', 'ITW', 'NOC', 'CTAS'].includes(sym);
        }

        if (sec.includes('utilities') || target === 'XLU') {
            return sSec.includes('utilities') || ['SO', 'DUK'].includes(sym);
        }

        return sym === target;
    }

    getStockPriceBias(symbol, stockSector) {
        if (!this.activeNews || this.activeNews.length === 0) return 0;
        const now = Date.now();

        let totalBias = 0;
        this.activeNews.forEach(item => {
            if (now < item.endTime && this.matchesStockTarget(item, symbol, stockSector)) {
                // Approximate 6-second stock tick interval
                const totalTicks = Math.max(1, (item.duration_minutes * 60) / 6);
                // Accelerated gameplay pacing factor (2.5x) so news catalysts drive clear observable trends during session
                const biasPerTick = ((item.impact_percent / 100) / totalTicks) * 2.5;
                totalBias += biasPerTick;
            }
        });

        return totalBias;
    }

    // =========================================================================
    // CRYPTO TARGET MATCHING & BIAS
    // =========================================================================
    matchesCryptoTarget(news, symbol, cryptoSector, cryptoCategory) {
        if (news.market !== 'crypto') return false;

        const target = (news.target_asset || '').toUpperCase();
        const sec = (news.sector || '').toLowerCase();
        const sym = (symbol || '').toUpperCase();
        const cSec = (cryptoSector || '').toLowerCase();
        const cCat = (cryptoCategory || '').toLowerCase();

        if (target === 'TOTAL_MARKET') return true;

        if (target === 'TOP_10_INDEX') {
            const top10 = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'TRX', 'AVAX', 'SUI', 'LINK'];
            return top10.includes(sym);
        }

        if (target === 'BTC' || sec.includes('whale_activity') || sec.includes('store_of_value')) {
            return sym === 'BTC';
        }

        if (target === 'ALTCOINS_MAJOR' || target === 'SMART_CONTRACTS' || target === 'EVM_CHAINS' || sec === 'layer_1') {
            return cSec.includes('layer 1') || ['ETH', 'SOL', 'BNB', 'ADA', 'AVAX', 'SUI', 'TON', 'TRX', 'DOT', 'NEAR'].includes(sym);
        }

        if (target === 'L2_TOKENS' || sec.includes('layer_2')) {
            return cSec.includes('layer 2') || ['ARB', 'OP', 'POL', 'MATIC', 'STRK', 'MNT', 'IMX'].includes(sym);
        }

        if (target === 'DEFI_INDEX' || sec.includes('defi')) {
            return cSec.includes('defi') || cCat.includes('dex') || ['UNI', 'AAVE', 'MKR', 'CRV', 'HYPE', 'LDO', 'SNX', 'CAKE'].includes(sym);
        }

        if (target === 'PAYMENT_COINS' || target === 'PRIVACY_TOKENS' || sec.includes('payments') || sec.includes('privacy')) {
            return cSec.includes('payments') || ['XRP', 'XLM', 'LTC', 'BCH', 'XMR', 'ZEC', 'DASH'].includes(sym);
        }

        if (target === 'CEX_TOKENS' || target === 'CEFI_INDEX' || sec.includes('centralized_exchanges') || sec.includes('cefi')) {
            return cSec.includes('exchange') || ['BNB', 'CRO', 'LEO', 'OKB', 'BGB', 'HTX', 'KCS'].includes(sym);
        }

        if (sec.includes('stablecoins')) {
            return cSec.includes('stablecoin') || ['USDT', 'USDC', 'DAI', 'USDe', 'PYUSD', 'USD1', 'USDG'].includes(sym);
        }

        if (target === 'SOCIALFI' || sec.includes('social')) {
            return cSec.includes('gaming') || sym === 'TON' || cCat.includes('social');
        }

        if (target === 'POW_MINING' || sec.includes('mining')) {
            return ['BTC', 'LTC', 'BCH', 'KAS', 'DOGE', 'ETC'].includes(sym);
        }

        if (target === 'MID_CAPS') {
            return !['BTC', 'ETH', 'USDT', 'USDC'].includes(sym);
        }

        return false;
    }

    getCryptoPriceBias(symbol, cryptoSector, cryptoCategory) {
        if (!this.activeNews || this.activeNews.length === 0) return 0;
        const now = Date.now();

        let totalBias = 0;
        this.activeNews.forEach(item => {
            if (now < item.endTime && this.matchesCryptoTarget(item, symbol, cryptoSector, cryptoCategory)) {
                // Approximate 4-second crypto tick interval
                const totalTicks = Math.max(1, (item.duration_minutes * 60) / 4);
                // Accelerated gameplay pacing factor (3.0x) so crypto news catalysts drive authentic observable breakout trends
                const biasPerTick = ((item.impact_percent / 100) / totalTicks) * 3.0;
                totalBias += biasPerTick;
            }
        });

        return totalBias;
    }

    // =========================================================================
    // EVENT TRIGGER & MANAGEMENT
    // =========================================================================
    triggerRandomEvent(forcedId = null) {
        const now = Date.now();
        this.checkExpiredNews();

        let candidatePool = ALL_NEWS_DATABASE;
        const activeIds = new Set(this.activeNews.map(n => n.id));

        if (forcedId) {
            candidatePool = ALL_NEWS_DATABASE.filter(e => e.id === forcedId);
        } else {
            // Keep at most 3 simultaneous active events so market has clear focus
            if (this.activeNews.length >= 3) return null;
            candidatePool = ALL_NEWS_DATABASE.filter(e => !activeIds.has(e.id));
        }

        if (candidatePool.length === 0) return null;

        const picked = candidatePool[Math.floor(Math.random() * candidatePool.length)];
        const durationMs = picked.duration_minutes * 60 * 1000;

        const eventInstance = {
            ...picked,
            startTime: now,
            endTime: now + durationMs,
            timestamp: now
        };

        this.activeNews.push(eventInstance);
        this.newsHistory.unshift(eventInstance);
        this.lastTriggerTimestamp = now;
        this.saveState();

        // Broadcast to Supabase Cloud Realtime so all Vercel/mobile clients sync
        try {
            broadcastCloudEvent(eventInstance);
        } catch (e) {
            console.warn('[NewsManager] Cloud broadcast error:', e);
        }

        // Broadcast event locally
        gameState.emit('newsAlert', eventInstance);
        gameState.emit('newsUpdate', this.activeNews);

        // Visual UI Announcement Toast
        const isPos = picked.type === 'positive';
        const isCrypto = picked.market === 'crypto';
        const sign = picked.impact_percent > 0 ? '+' : '';
        const marketLabel = isCrypto ? '🪙 KRIPTO' : '📈 SAHAM AS';
        const durationText = picked.duration_minutes >= 60
            ? `${(picked.duration_minutes / 60).toFixed(1)} Jam`
            : `${picked.duration_minutes} Menit`;

        const title = isPos
            ? `📢 BREAKING NEWS: SENTIMEN POSITIF (${marketLabel})`
            : `⚠️ BREAKING NEWS: SENTIMEN NEGATIF (${marketLabel})`;

        const targetLabel = isCrypto ? (picked.target_asset || picked.sector) : (picked.ticker_target || picked.sector);
        const msg = `"${picked.headline}"\n\n🎯 Target: ${targetLabel} | Dampak: ${sign}${picked.impact_percent}% selama ${durationText}.`;

        if (isPos) {
            ui.success(msg, title);
        } else {
            ui.error(msg, title);
        }

        try {
            import('../ui/AuraSound.js').then(m => m.default.playNotification?.());
        } catch (e) {}

        return eventInstance;
    }

    /**
     * Ingest incoming cloud breaking news received via Supabase Realtime
     */
    receiveCloudEvent(eventItem, shouldAnnounce = true) {
        if (!eventItem || !eventItem.id) return;
        const now = Date.now();
        if (eventItem.endTime <= now) return;

        const existingIdx = this.activeNews.findIndex(n => n.id === eventItem.id);
        if (existingIdx >= 0) {
            this.activeNews[existingIdx] = eventItem;
        } else {
            this.activeNews.push(eventItem);
            this.newsHistory.unshift(eventItem);
        }

        this.saveState();
        gameState.emit('newsUpdate', this.activeNews);

        if (shouldAnnounce) {
            const isPos = eventItem.type === 'positive';
            const isCrypto = eventItem.market === 'crypto';
            const sign = eventItem.impact_percent > 0 ? '+' : '';
            const marketLabel = isCrypto ? '🪙 KRIPTO' : '📈 SAHAM AS';
            const durationText = eventItem.duration_minutes >= 60
                ? `${(eventItem.duration_minutes / 60).toFixed(1)} Jam`
                : `${eventItem.duration_minutes} Menit`;

            const title = isPos
                ? `📢 BREAKING NEWS: SENTIMEN POSITIF (${marketLabel})`
                : `⚠️ BREAKING NEWS: SENTIMEN NEGATIF (${marketLabel})`;

            const targetLabel = isCrypto ? (eventItem.target_asset || eventItem.sector) : (eventItem.ticker_target || eventItem.sector);
            const msg = `"${eventItem.headline}"\n\n🎯 Target: ${targetLabel} | Dampak: ${sign}${eventItem.impact_percent}% selama ${durationText}.`;

            if (isPos) {
                ui.success(msg, title);
            } else {
                ui.error(msg, title);
            }

            try {
                import('../ui/AuraSound.js').then(m => m.default.playNotification?.());
            } catch (e) {}
        }
    }

    /**
     * Periodic evaluation called on game day / clock tick
     */
    onDayPass() {
        this.checkExpiredNews();
        if (this.activeNews.length < 2) {
            this.triggerRandomEvent();
        }
    }

    getActiveNews() {
        this.checkExpiredNews();
        return this.activeNews;
    }

    getNewsHistory() {
        return this.newsHistory;
    }

    getLatestHeadline() {
        this.checkExpiredNews();
        if (this.activeNews.length > 0) {
            const latest = this.activeNews[this.activeNews.length - 1];
            const sign = latest.impact_percent > 0 ? '+' : '';
            const marketIcon = latest.market === 'crypto' ? '🪙' : '📈';
            const countdown = this.getRemainingCountdown(latest);
            return `${marketIcon} [${sign}${latest.impact_percent}%] ${latest.headline} (${countdown})`;
        }
        return null;
    }

    // Compatibility method
    getPriceBias(symbol, stockSector) {
        return this.getStockPriceBias(symbol, stockSector);
    }
}

export const newsManager = new NewsManager();
export default newsManager;
