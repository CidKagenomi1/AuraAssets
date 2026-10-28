/**
 * IndustryInitiatives.js - Modular Industry Initiatives Configuration
 * Contains strategic management programs for all 12 business sectors.
 */

export const INDUSTRY_INITIATIVES = {
    tech: [
        {
            key: 'tech_opt_app',
            name: 'Optimasi Aplikasi & Cloud',
            description: 'Meningkatkan performa server dan kecepatan loading aplikasi. Mengurangi downtime.',
            cost: 15000,
            icon: '☁️',
            benefit: 'Biaya operasional -10% & Mutu Produk +1'
        },
        {
            key: 'tech_ai_features',
            name: 'Model AI & Fitur Premium',
            description: 'Merancang fitur AI terintegrasi untuk mendongkrak retensi pengguna berbayar.',
            cost: 35000,
            icon: '🤖',
            benefit: 'Revenue Bulanan +15% & Multiplier Valuasi +0.3x'
        },
        {
            key: 'tech_global_server',
            name: 'Data Center Skala Global',
            description: 'Membangun server node regional baru untuk pasar internasional.',
            cost: 80000,
            icon: '🌐',
            benefit: 'Dampak Iklan +50% & Omzet Bulanan +20%'
        }
    ],
    media: [
        {
            key: 'media_studio',
            name: 'Studio Produksi High-End',
            description: 'Membangun studio produksi modern untuk rekaman konten berkualitas tinggi.',
            cost: 20000,
            icon: '🎥',
            benefit: 'Revenue Bulanan +15% & Mutu Konten +1'
        },
        {
            key: 'media_broadcasting',
            name: 'Lisensi Penyiaran Digital',
            description: 'Mengamankan hak siar nasional digital HD untuk jangkauan sinyal terluas.',
            cost: 45000,
            icon: '📡',
            benefit: 'Valuasi Korporasi +20% & Dampak Iklan +30%'
        },
        {
            key: 'media_viral',
            name: 'Divisi Viral Marketing',
            description: 'Membuka unit kreatif khusus untuk memproduksi tren viral di medsos.',
            cost: 60000,
            icon: '📈',
            benefit: 'Pendapatan Tambahan +$10,000/bln'
        }
    ],
    finance: [
        {
            key: 'fin_hft',
            name: 'Algoritma Perdagangan HFT',
            description: 'Mengintegrasikan bot transaksi super cepat di bursa efek untuk hasil investasi maksimal.',
            cost: 30000,
            icon: '📈',
            benefit: 'Revenue Bulanan +15% (Volatilitas Naik)'
        },
        {
            key: 'fin_audit',
            name: 'Audit Keamanan & Kepatuhan',
            description: 'Memperketat keamanan siber dan kepatuhan regulasi anti pencucian uang (AML/KYC).',
            cost: 20000,
            icon: '🔒',
            benefit: 'Valuasi Sektor +15% & Volatilitas Turun -10%'
        },
        {
            key: 'fin_wealth',
            name: 'Wealth Management Division',
            description: 'Membuka divisi manajemen aset untuk nasabah prioritas bernilai tinggi.',
            cost: 75000,
            icon: '💎',
            benefit: 'Pendapatan Tambahan +$8,000/bln'
        }
    ],
    energy: [
        {
            key: 'energy_find_resource',
            name: 'Eksplorasi Sumber Energi',
            description: 'Melakukan pemetaan geologis intensif untuk mencari titik cadangan energi baru.',
            cost: 25000,
            icon: '🔍',
            benefit: 'Pendapatan Tambahan +$10,000/bln'
        },
        {
            key: 'energy_renewable',
            name: 'Pembangkit Energi Terbarukan',
            description: 'Berinvestasi pada panel surya, kincir angin, dan baterai grid modern.',
            cost: 60000,
            icon: '🍃',
            benefit: 'Biaya Operasional -15% & Valuasi Korporasi +25%'
        },
        {
            key: 'energy_smart_grid',
            name: 'Integrasi Smart Grid Daya',
            description: 'Mengotomatisasi jalur distribusi listrik guna mengurangi kehilangan daya transmisi.',
            cost: 40000,
            icon: '⚡',
            benefit: 'Defect Rate -4% & Pendapatan Utama +10%'
        }
    ],
    aerospace: [
        {
            key: 'aero_safety',
            name: 'Sertifikasi Aviasi & Kepatuhan',
            description: 'Mendapatkan standar kepatuhan regulasi penerbangan sipil internasional.',
            cost: 40000,
            icon: '🛡️',
            benefit: 'Multiplier Valuasi Sektor +0.3x'
        },
        {
            key: 'aero_lounge',
            name: 'VVIP Airport Lounge',
            description: 'Membangun ruang tunggu eksklusif untuk penumpang First/Business Class.',
            cost: 60000,
            icon: '🥂',
            benefit: 'Revenue Bulanan +15% & Mutu Layanan +1'
        },
        {
            key: 'aero_routes',
            name: 'Rute Penerbangan Global',
            description: 'Mengakuisisi slot terbang premium lintas benua di bandara tersibuk.',
            cost: 90000,
            icon: '🗺️',
            benefit: 'Pendapatan Tambahan +$15,000/bln'
        }
    ],
    manufacturing: [
        {
            key: 'mfg_robots',
            name: 'Otomatisasi Lini Robotika',
            description: 'Mengganti lini manual dengan lengan robotik presisi tinggi Jerman.',
            cost: 50000,
            icon: '🤖',
            benefit: 'Defect Rate -6% & Kecepatan Perakitan +2.0'
        },
        {
            key: 'mfg_lean',
            name: 'Lean Production & Kaizen',
            description: 'Menerapkan metodologi Six Sigma untuk meminimalkan sisa limbah bahan baku.',
            cost: 30000,
            icon: '♻️',
            benefit: 'Biaya Perakitan Pabrik -20%'
        },
        {
            key: 'mfg_premium_design',
            name: 'Premium & Ergonomic Design',
            description: 'Melakukan riset desain eksterior, estetika, dan ergonomi produk tingkat lanjut.',
            cost: 45000,
            icon: '📐',
            benefit: 'Valuasi +20% & Dampak Kampanye Marketing +40%'
        }
    ],
    transportation: [
        {
            key: 'trans_ev_fleet',
            name: 'Konversi Armada EV',
            description: 'Mengganti armada BBM konvensional ke kendaraan listrik ramah lingkungan.',
            cost: 55000,
            icon: '🔋',
            benefit: 'Biaya Operasional -15% & Valuasi Korporasi +20%'
        },
        {
            key: 'trans_app_optimization',
            name: 'Algoritma Rute Pintar GPS',
            description: 'Mengoptimalkan algoritma penjemputan online untuk memotong durasi antar.',
            cost: 25000,
            icon: '🗺️',
            benefit: 'Waktu Siklus -3 Hari & Mutu Layanan +1'
        },
        {
            key: 'trans_premium_fleet',
            name: 'Divisi Sewa Mobil Mewah',
            description: 'Membeli unit sedan/SUV mewah untuk pasar korporat dan sewa VIP.',
            cost: 40000,
            icon: '✨',
            benefit: 'Pendapatan Tambahan +$8,000/bln'
        }
    ],
    healthcare: [
        {
            key: 'hc_vaccine',
            name: 'Uji Klinis Paten Formula Baru',
            description: 'Melakukan pengujian lab intensif untuk mempatenkan formula obat baru.',
            cost: 70000,
            icon: '🧪',
            benefit: 'Revenue Utama +25% & Multiplier Valuasi +0.4x'
        },
        {
            key: 'hc_ehr',
            name: 'Hospital EHR System',
            description: 'Mengintegrasikan rekam medis elektronik terpadu dan reservasi cloud.',
            cost: 25000,
            icon: '🏥',
            benefit: 'Gaji Operasional Medis -12%'
        },
        {
            key: 'hc_robots',
            name: 'Robot Bedah Presisi Da Vinci',
            description: 'Melengkapi klinik dengan sistem robot bedah otomatis untuk operasi bedah mikro.',
            cost: 40000,
            icon: '🦾',
            benefit: 'Mutu Layanan +2 & Pendapatan Tambahan +$6,500/bln'
        }
    ],
    fnb: [
        {
            key: 'fnb_michelin',
            name: 'Sertifikasi Bintang Michelin',
            description: 'Mempersiapkan restoran untuk penilaian kritikus makanan kelas dunia.',
            cost: 75000,
            icon: '⭐',
            benefit: 'Kelezatan Restoran +2 & Valuasi Korporasi +25%'
        },
        {
            key: 'fnb_kitchen_upgrade',
            name: 'Upgrade Dapur Modern & Steril',
            description: 'Membeli kompor induksi, sanitasi otomatis, dan kulkas blast chiller.',
            cost: 25000,
            icon: '🍳',
            benefit: 'Kebersihan Restoran +1 & Biaya Operasional -10%'
        },
        {
            key: 'fnb_franchise_expansion',
            name: 'Kemitraan Waralaba Nasional',
            description: 'Membuka opsi franchise kuliner untuk memperluas jangkauan brand.',
            cost: 50000,
            icon: '🏢',
            benefit: 'Pendapatan Tambahan +$9,000/bln'
        }
    ],
    retail: [
        {
            key: 'retail_alliance',
            name: 'Aliansi Distribusi Toko Ritel',
            description: 'Memasukkan produk ritel Anda ke ribuan gerai minimarket waralaba nasional.',
            cost: 30000,
            icon: '🛒',
            benefit: 'Revenue Utama +20% & Peningkatan Traksi Marketing'
        },
        {
            key: 'retail_green',
            name: 'Eco-Friendly Packing',
            description: 'Mengubah kemasan menjadi 100% plastik daur ulang biodegradable ramah lingkungan.',
            cost: 18000,
            icon: '♻️',
            benefit: 'Mutu Produk +1 & Valuasi Korporasi +15%'
        },
        {
            key: 'retail_warehouse',
            name: 'Gudang Logistik Otomatis',
            description: 'Menggunakan robot pemilah AGV guna mengotomatisasi logistik inventaris.',
            cost: 45000,
            icon: '📦',
            benefit: 'Lead Time Logistik -5 Hari & Biaya Suplai -15%'
        }
    ],
    infrastructure: [
        {
            key: 'infra_heavy_machinery',
            name: 'Akuisisi Alat Berat Modern',
            description: 'Membeli excavator dan crane tambahan untuk mempercepat pengerjaan sipil.',
            cost: 80000,
            icon: '🚜',
            benefit: 'Kecepatan Proyek +50% & Valuasi Korporasi +20%'
        },
        {
            key: 'infra_civil_license',
            name: 'Lisensi Proyek Strategis',
            description: 'Mengamankan izin tender sipil kelas atas dari dinas pekerjaan umum.',
            cost: 60000,
            icon: '📄',
            benefit: 'Pendapatan Proyek Sipil +25%'
        },
        {
            key: 'infra_safety_first',
            name: 'Sertifikasi K3 Zero Accident',
            description: 'Memperketat SOP keselamatan konstruksi untuk menghindari penalti kecelakaan.',
            cost: 30000,
            icon: '🦺',
            benefit: 'Defect Rate -5% & Mutu Produk +1'
        }
    ],
    property: [
        {
            key: 'prop_township',
            name: 'Pembangunan Township Terpadu',
            description: 'Membangun kawasan residensial superblok komersial mandiri.',
            cost: 120000,
            icon: '🏙️',
            benefit: 'Valuasi Korporasi +$350,000 Flat'
        },
        {
            key: 'prop_green_cert',
            name: 'Sertifikasi LEED Green Building',
            description: 'Menerapkan standar ramah lingkungan tingkat tinggi untuk gedung pencakar langit Anda.',
            cost: 50000,
            icon: '🌱',
            benefit: 'Multiplier Valuasi Sektor +0.4x'
        },
        {
            key: 'prop_modular',
            name: 'Beton Cetak Modular Precast',
            description: 'Menggunakan beton cetak modular untuk mempercepat waktu pembangunan konstruksi.',
            cost: 35000,
            icon: '🧱',
            benefit: 'Kecepatan Konstruksi +43% (Lead Time Berkurang)'
        }
    ]
};

export default INDUSTRY_INITIATIVES;
