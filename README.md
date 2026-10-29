# AuraAssets 💼📈

An advanced, dark-themed **Idle Financial Portfolio & Enterprise Simulation Game** designed to simulate real-world financial systems, career ladders, investment markets, and corporate governance. Experience the journey from unemployment to becoming an industry tycoon.

> **Note:** AuraAssets is a client-side Single Page Application (SPA) utilizing a modern glassmorphism design system, now equipped with an **Authoritative Multiplayer Market Engine (`market-server/`)** powered by Fastify, Socket.IO, and Supabase PostgreSQL.

---

## 🎮 Gameplay Features

### 1. 📈 Financial & Investment Markets
- **Stock Market (Authoritative & Local Fallback):** Real-time stock price fluctuations across 100 stocks and 10 sectors, backed by a continuous limit order book matching engine (Price-Time Priority / FIFO) with automatic price improvement refunds.
- **Cryptocurrency Exchange:** Trade 102 digital assets categorized across 10 standardized bidang (L1, DeFi, AI & Big Data, Meme, Stablecoin, DePIN, etc.) with multi-criteria filtering and drilldown sub-categories.
- **Top Movers & AI Market Signals:** Live dashboard widget showcasing real-time Top Gainers, Top Losers, and active AI Technical Signals (🚀 MOON, 🔥 HOT, ⚡ HEAT).
- **Investor Risk Profile Assessment:** Interactive onboarding questionnaire that evaluates player behavior and classifies them into **Investor Konservatif** (🛡️), **Investor Pasif** (⚖️), or **Investor Agresif** (🚀).
- **Financial Milestones with 75% Cash Rewards:** Tiered financial achievements rewarding 75% of the milestone target value as instant claimable cash.
- **Random Market Events & Breaking News (40 Macro & Sectoral Events):** Dynamic event engine containing 20 US Stock Market and 20 Cryptocurrency breaking news items that directly drive price movements, volatility shifts, and sectoral rallies or sell-offs over multi-day durations.

### 2. 🏢 Enterprise & Corporate Operations
- **Sectors:** Build and manage businesses in 8 distinct industries: Tech, Aerospace, Energy, Finance, Healthcare, Infrastructure, Retail, and Automotive.
- **Corporate Governance:** Purchase subsidiaries, hire staff, manage operational budgets, and adjust executive salaries.
- **Going Public (IPO):** Scale your enterprise, meet listing criteria, and launch an Initial Public Offering (IPO) to trade on the public stock exchange.
- **AI Competitors:** Navigate a dynamic market with rival corporations competing for market share.

### 3. 🏠 Real Estate & Wealth Management
- **Aset Properti:** Buy, hold, and sell residential and commercial real estate properties for passive rental income and capital appreciation.
- **Banking System:** Secure capital through bank loans or park your excess cash in high-yield time deposits.
- **Taxation (Perpajakan):** File monthly tax reports, declare income/assets, and manage corporate tax rates to stay compliant.

### 4. 👔 Career Progression & Office Simulation
- **Office Dashboard:** Perform daily office tasks to earn standard wages.
- **Career Path:** Improve personal skills, apply for corporate promotions, and negotiate salary increases to build your seed capital.

---

## 🛠️ Tech Stack

### Frontend (`src/`)
- **Markup:** Semantic HTML5
- **Styling:** Custom Vanilla CSS3 (features a premium Dark/Glassmorphic dashboard theme with micro-animations)
- **Logic:** Vanilla JavaScript (ES6+ Modular architecture)
- **Visualizations & Charts:** Plotly.js, Chart.js & ECharts (interactive financial Candlestick & Line charts with volume overlays, plus macroeconomic analytics)
- **Real-Time Client:** `socket.io-client` & `@supabase/supabase-js` (`MarketClient.js`)
- **Bundler & Server:** Vite 5.x

### Backend Authoritative Market Engine (`market-server/`)
- **Runtime & HTTP API:** Node.js LTS + Fastify
- **Real-Time Events:** Socket.IO + Transactional Outbox Worker (`FOR UPDATE SKIP LOCKED`)
- **Database & Atomic Settlement:** Supabase PostgreSQL (`BIGINT` minor currency units, PL/pgSQL atomic functions `fn_execute_order_atomic` & `fn_cancel_order_atomic`, immutable `ledger_entries` audit log)
- **Authentication & Validation:** Supabase Auth JWT (`jose`) & Zod schema validation
- **Testing Framework:** Vitest

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v20+ LTS recommended) installed on your machine.

### Installation
1. Clone this repository or download the source files.
2. Install frontend dependencies in the root directory:
   ```bash
   cd AuraAssets
   npm install
   ```
3. *(Optional - Multiplayer Market Engine)* Install backend dependencies:
   ```bash
   cd market-server
   npm install
   ```

### Running Locally
Start the Vite frontend development server:
```bash
npm run dev
```
Open the local server URL (usually `http://localhost:5173`) in your web browser.

To run the authoritative market server (once `market-server/.env` is configured):
```bash
cd market-server
npm run migrate
npm run dev
```

### Building for Production
Bundle the project for production deployment:
```bash
npm run build
```
The output files will be built into the `dist/` directory, ready to be served by any static host (GitHub Pages, Vercel, Netlify, etc.).

---

## 📂 Project Structure

```text
AuraAssets/
├── index.html              # Application entry point and layout shell
├── package.json            # Frontend Node metadata and dependencies
├── vite.config.js          # Vite configuration file
├── Implamantation plan.md  # Authoritative Market Engine architecture & progress checklist
├── src/
│   ├── styles/             # Curated stylesheets (main, components, trading, compact, mobile)
│   └── js/
│       ├── main.js         # Game entry point, Risk Assessment onboarding, & master orchestration
│       ├── core/           # GameState, TimeManager, GlobalEconomy, RoleManager (Risk Profiles)
│       ├── finance/        # Core engines: FinanceManager, BankSystem, SavingsManager, TaxSystem
│       ├── property/       # Real estate management and property panel
│       ├── trading/        # StockMarket, MarketClient, CryptoMarket, PassiveIncome, ChartEngine, CandleGenerator, TradingPage
│       │   └── panels/     # OrderPanel, TradeHistoryPanel, AssetSearchModal, StockPanel, CryptoPanel, TradingSignalPanel
│       ├── marketplace/    # Luxury status goods, watches, and portfolio boosters
│       └── ui/             # ViewManager, HomeScreen, LoginPortal, KeyboardNav, UIManager
├── market-server/          # Authoritative Multiplayer Stock Market Backend
│   ├── migrations/         # PostgreSQL schema, immutable ledger trigger, & atomic PL/pgSQL procedures
│   ├── src/
│   │   ├── config/         # Environment validation (env.js)
│   │   ├── plugins/        # PostgreSQL pool (database.js) & Socket.IO server (socket.js)
│   │   ├── modules/        # auth, accounts, market (orderbook, matching-engine), trading, portfolio, events
│   │   └── routes/         # market.routes.js, orders.routes.js, portfolio.routes.js
│   └── tests/              # Vitest suites: matching-engine.test.js, trading.test.js, concurrency.test.js
├── isolated_features/      # Isolated feature modules (cleanly decoupled)
│   ├── gambling/           # Full Casino engines (Slot, Mahjong, Zeus, Wheel, Lottery, Parlay)
│   ├── business/           # Enterprise, 12 Sectors, 12 Ops Panels, Board, M&A, IPO Dashboard
│   └── career/             # Office Workplace, Work Simulations, Assistant, Politics System
└── dist/                   # Compiled production bundle (via npm run build)
```

---

## 🔖 Penanda Kelanjutan Project (Project Continuation Checkpoint)

Bagian ini menjadi penanda status terakhir pengerjaan agar sesi pengembangan berikutnya dapat langsung dilanjutkan dengan presisi:

### ✅ Yang Sudah Selesai Dikerjakan (Update Terkini)

#### 1. 🗄️ Database Supabase & Authoritative Market Engine (`market-server/`)
- **Migrasi Database Lengkap (100% Selesai):**
  - `001_initial_schema.sql`: 8 tabel inti (accounts, positions, orders, trades, candlesticks, ledger_entries, outbox_events).
  - `002_atomic_trading_functions.sql`: Stored procedures PL/pgSQL atomic (`fn_execute_order_atomic`, `fn_cancel_order_atomic`, trigger anti-saldo minus).
  - `003_seed_stocks.sql` & `004_seed_all_stocks_and_cryptos.sql`: Seluruh instrumen pasar berhasil dimuat ke cloud Supabase:
    - **100 Saham** di tabel `stocks` & `market_state`.
    - **102 Kripto** di tabel `cryptos` & `crypto_market_state`.
- **Koneksi & Pengujian Live:**
  - Koneksi PostgreSQL pooler terverifikasi dengan kredensial aman di `market-server/.env`.
  - Service role key terotentikasi dan endpoint REST Fastify (`/health`, `/api/market/stocks`) merespons dengan cepat.
  - Pengujian Vitest di `market-server/` lulus **100% (8/8 tes PASS)** mencakup matching engine, idempotency, dan konkurensi.
  - Server aktif berjalan di port `3001` dengan `active_symbols: 100`.

#### 2. 🎨 Frontend Dashboard & Fitur Game (`src/`)
- **Real-World UTC Clock:** Sinkronisasi jam permainan dengan waktu dunia nyata UTC (`HH:MM:SS UTC`) dan tanggal live.
- **Collapsible Sidebar:** Sidebar dapat dibuka-tutup dengan transisi halus tanpa tertutup sepenuhnya (menyisakan lebar 72px dengan logo dan ikon menu tetap interaktif).
- **Start View:** Pengalaman awal pemain langsung dimulai dari Halaman Beranda (`'home'`), bukan tabel pasar.
- **Sistem Filter Multi-Kriteria Saham & Kripto:**
  - Filter lengkap 10 Sektor Saham & 10 Bidang Kripto + drilldown sub-kategori.
  - Filter Tren Pasar (Gainers, Losers, Signals, Owned), Level Risiko Volatilitas, dan 6 opsi pengurutan (A-Z, Sektor, Harga, % Change, Volatilitas, Default).
- **Home Screen & Milestone Cash Reward 75%:**
  - Widget "Aksi Cepat" dihapus dari beranda untuk tampilan yang lebih bersih.
  - Setiap milestone keuangan yang tercapai memberikan hadiah uang tunai **75% dari target** yang bisa diklaim langsung lewat tombol **`🎁 Klaim +$ ...`**.
- **🔥 Widget Top Movers & Sinyal Pasar Hari Ini:**
  - Widget baru di sebelah Fear & Greed Index dengan 3 tab interaktif: 🟢 Top Gainers, 🔴 Top Losers, dan 🚀 Sinyal AI.
  - Klik kartu aset langsung membuka terminal trading aset terkait.
- **📰 Random Market Events Engine (40 Berita Makro & Sektoral):**
  - Mengintegrasikan 20 Berita Pasar Saham AS (The Fed, subsidi AI semikonduktor, FDA, krisis pasok, antitrust Big Tech) dan 20 Berita Pasar Kripto (ETF Staking ETH/SOL, UU Stablecoin, cadangan devisa BTC negara Teluk, exploit bridge, de-peg stablecoin, audit CEX).
  - Berita muncul secara berkala, memicu pengumuman toast breaking news, dan berdampak langsung mendorong (*drift*) kenaikan atau penurunan harga pasar saham & kripto secara dinamis selama durasi peristiwa aktif.
- **📱 100% Mobile Responsive:**
  - Penyesuaian tata letak untuk baris widget beranda, kartu saldo hero, tombol laporan keuangan, kartu milestone, dan filter sektoral yang otomatis horizontal touch-scroll di perangkat mobile.

#### 3. 📈 Redesain Terminal Trading, Plotly Engine & Arsitektur Modular (`src/js/trading/`)
- **Engine Grafik Finansial Plotly.js (`ChartEngine.js`):**
  - Menggantikan visual grafik lama dengan engine Plotly.js yang bersih, presisi, dan interaktif.
  - Mendukung dua mode tampilan grafik: **Line Chart** dan **Candlestick Chart** dengan tombol toggle instan.
  - Indikator **Volume Pasar** opsional (dapat diaktifkan/dinonaktifkan sesuai kebutuhan analisis).
  - Penanda informasi harga interaktif (*touch/hover price marker*) yang menampilkan timestamp dan harga saat garis grafik disentuh.
  - Timeframe selector cepat: **1h**, **1d**, **1w**, dan **1m** (ringkas dan hemat ruang).
  - Stabilitas rendering bebas flicker/glitch: Memanfaatkan debounced `ResizeObserver`, re-entrancy lock, dan deret lilin historis berbasis pseudo-random deterministik di `CandleGenerator.js` tanpa lompatan sumbu harga.
- **Pemisahan Header & Tata Letak Adaptif (Split Header Layout):**
  - **Identitas Aset (Di Atas Chart):** Bar ringkas sticky di bagian atas grafik yang menampilkan ikon aset, tombol pemilih instrumen (simbol ticker + dropdown modal pencarian), nama lengkap, badge sektor/kategori, serta Mark Price dan badge persentase perubahan 24 jam dengan pemangkasan otomatis agar tidak terpotong di layar kecil.
  - **Parameter Pasar & Analisis Statistik (Di Bawah Chart):** Kartu khusus (`.trading-params-card`) tepat di bawah grafik agar analisis mudah dibaca tanpa mengorbankan ruang grafik utama:
    - 5 Tile Statistik Real-time: 24h High, 24h Low, Volume 24h, Avg Volume historis, dan Volatilitas pasar (Low / Medium / High).
    - **Rasio Volume Order Book (Bid vs Ask Depth Ratio):** Menggantikan batang rentang harga 24 jam dengan visualisator dual-tone rasio volume beli (bid) vs jual (ask) real-time yang dihitung langsung dari data kedalaman order book pasar, dilengkapi badge sentimen mayoritas (🔥 Mayoritas Beli, 🔻 Mayoritas Jual, ⚖️ Seimbang) serta tips panduan akumulasi/distribusi untuk trader.
- **Arsitektur Panel Modular & Responsif Penuh (`src/js/trading/panels/`):**
  - Dekopling komponen visual pendukung dari `TradingPage.js` ke modul terisolasi:
    - `OrderPanel.js`: Formulir order canggih (Market & Limit) berdesain glassmorphism dengan glowing tabs BUY/SELL, chip persentase saldo (25%, 50%, 75%, 100%), unit dinamis (`LOT` untuk saham, `TOKEN/USD` untuk kripto), Take Profit (TP) & Stop Loss (SL) opsional, serta kartu posisi aktif & floating PnL real-time.
    - `TradeHistoryPanel.js`: Buku besar transaksi interaktif yang diposisikan tepat di bawah panel order, lengkap dengan filter (Semua, Beli, Jual) dan fitur ekspor gambar PnL resolusi tinggi via Canvas.
    - `AssetSearchModal.js`: Modal dialog pencarian instrumen pasar (saham & kripto) dengan pencarian langsung (*live query search*), filter instrumen, dan daftar rekomendasi sektor terpopuler.
    - `CandleGenerator.js`: Modul matematis murni untuk simulasi deret lilin (Elliott Wave, pola head & shoulders, kalkulasi OHLC per timeframe).
  - **Sistem Ikon Vektor SVG Terpusat (`src/js/ui/Icons.js`):**
    - Mengonversi seluruh ikon emoji menjadi ikon vektor SVG modern berstandar 24x24 viewBox (gaya Lucide/Feather) untuk tampilan UI trading berkelas profesional, konsisten di semua platform (Android, iOS, Windows), dan bebas rendering font emoji kartun.
    - Mencakup ikon grafik finansial (Line, Candle, Volume), indikator pasar (24h High/Low, Volatilitas, Order Book Ratio), tombol aksi order (Beli, Jual, Market, Limit), status posisi, dialog pencarian aset, serta sistem notifikasi toast & modal.
  - **Pengalaman Trading Mobile Fit Layar (Full Width 100%):**
    - Mengeliminasi ruang kosong di kanan layar mobile: Panel order, kartu posisi aktif, dan riwayat trading secara otomatis membentang penuh (100% width) dengan padding sisi yang presisi dan konsisten.
    - Mencegah interferensi gestur sentuh saat menggulir halaman mobile (`dragmode: false`, `fixedrange: true`, dan pencegahan box-zoom tak sengaja pada chart).
    - Menghilangkan celah hitam ruang kosong bottom navbar (70px margin) ketika terminal trading sedang dibuka di perangkat mobile.

#### 4. ⚡ Stabilisasi Dinamika Harga Real-Time, Reaktivitas Berita & Volume, dan Koneksi Supabase
- **Kalibrasi Volatilitas Mikro-Tick Realistis (Anti-Liar):**
  - Mengeliminasi anomali pergerakan harga liar (seperti Bitcoin yang sebelumnya dapat melonjak dari \$68,000 ke \$112,000 dalam hitungan menit akibat multiplikasi langsung volatilitas harian 5%–25% di setiap tick 3 detik).
  - Mengonversi volatilitas aset menjadi fluktuasi Brownian mikro-tick realistis (~0.05% – 0.20% per tick 3–4 detik), dilengkapi *mean-reversion* halus ke harga pembukaan harian (*basePrice*) sehingga pergerakan grafik tampak organik, stabil, dan berstandar bursa institusional.
- **Koreksi Persentase Perubahan 24 Jam & High/Low Harian:**
  - Memperbaiki perhitungan badge persentase perubahan harga agar mengacu pada harga pembukaan harian (`basePrice`) bukan tick per 3 detik yang sebelumnya membuat angka persentase berfluktuasi ekstrem.
  - Menambahkan *daily rollover handler* (`onDayPass`) yang mereset 24h High, 24h Low, dan Volume harian saat hari game berganti.
- **Reaktivitas Nyata terhadap Breaking News (Katalis Berita):**
  - Mengalibrasikan formula pembobotan berita di `NewsManager.js` dengan faktor pacuan gameplay (2.5x–3.0x) sehingga efek berita breaking (seperti pemangkasan suku bunga, ETF approval, atau regulasi) menjadi kekuatan penggerak utama grafik yang terlihat jelas dan memicu tren terarah (*bullish breakout* atau *bearish slide*) saat berita aktif.
- **Reaktivitas Order terhadap Volume Transaksi (*Market Price Impact*):**
  - Transaksi beli (`marketBuy`) dan jual (`marketSell`) kini memberikan dampak langsung pada pergerakan harga (*price impact & liquidity absorption*) proporsional terhadap ukuran order pemain vs kedalaman likuiditas pasar.
  - Volume transaksi nyata langsung menambah akumulasi Volume 24 Jam dan menggeser indikator Rasio Volume Beli vs Jual di Order Book secara dinamis.
- **Konektivitas Supabase Cloud Realtime:**
  - Mengintegrasikan listener Postgres Changes di `SupabaseClient.js` untuk tabel `market_state` dan `crypto_market_state`.
  - Sinkronisasi instan jika backend multi-player cloud aktif, dengan fallback otomatis yang mulus ke simulasi mikro-tick lokal yang telah distabilkan saat offline.

---

### 🧠 Arsitektur Finansial & Pembelajaran Sistem Baru (Financial Engineering Insights)

Dokumentasi prinsip matematika keuangan dan rekayasa perangkat lunak yang diimplementasikan pada pembaruan ini:

#### 1. Pembedaan Horizon Waktu Volatilitas (*Daily Volatility vs. Micro-Tick Brownian Motion*)
* **Masalah:** Nilai volatilitas standar dalam pasar modal (misal $\sigma = 0.05$ untuk Bitcoin, $0.15$ untuk Dogecoin) didefinisikan untuk horizon waktu harian (*daily scale*). Ketika angka ini dimasukkan mentah-mentah ke dalam *loop* eksekusi setiap 3–4 detik, variansi harga terakumulasi secara eksponensial ($\sigma \sqrt{N}$), menyebabkan harga bergerak hingga puluhan persen dalam hitungan menit (*erratic random walk*).
* **Solusi Finansial:** Mengonversi volatilitas makro menjadi deviasi mikro-tick:
  $$\sigma_{tick} = \sigma_{day} \times \text{tickScale}$$
  Dilengkapi gaya tarik *mean-reversion* berbasis proses *Ornstein-Uhlenbeck* ke harga referensi harian (`basePrice`) agar instrumen mempertahankan koridor perdagangan harian yang autentik tanpa mematikan fluktuasi alami.

#### 2. Model Likuiditas & *Market Price Impact* (Slippage Dinamis)
* **Konsep:** Transaksi pasar tidak lagi sekadar transaksi saldo pasif, melainkan berinteraksi langsung dengan kedalaman likuiditas pasar (*taking liquidity from order book*).
* **Formula Dampak Harga:**
  $$\Delta P = P \times \min\left(0.035, \frac{\text{Nominal Transaksi}}{\text{Kedalaman Likuiditas}} \times 0.2\right)$$
  - Order **BUY** mengonsumsi likuiditas jual (*ask*), seketika menaikkan harga pasar dan menambahkan *buy pressure*.
  - Order **SELL** mengonsumsi likuiditas beli (*bid*), seketika menurunkan harga pasar dan menambahkan *sell pressure*.
  - Tekanan beli/jual meluruh secara eksponensial (*flow decay*) di setiap tick, secara otomatis menggerakkan visualisator **Rasio Volume Order Book (Bid vs Ask Depth)** di terminal trading.

#### 3. Penyelarasan Pacing Katalis Berita (*Game-Paced Catalyst Drift*)
* **Konsep:** Berita breaking di dunia nyata berlangsung 45 menit hingga beberapa jam. Dalam durasi bermain game (5–15 menit per sesi), pergerakan linier lambat membuat berita terasa "tidak berefek".
* **Solusi:** Menerapkan faktor akselerasi gameplay ($2.5\times$ untuk saham, $3.0\times$ untuk kripto) pada kalkulasi `biasPerTick` di `NewsManager.js`. Dengan berkurangnya *random noise* per-tick, rasio *signal-to-noise* berita menjadi jauh lebih kuat, sehingga pemain dapat secara jelas melihat dan memanfaatkan momentum berita (*trade the news*).

#### 4. Arsitektur Dual-State: Supabase Cloud Realtime + Graceful Local Fallback
* **Konsep:** Single Page Application (SPA) modern yang tangguh harus dapat beroperasi baik secara *cloud-connected* maupun *offline/standalone*.
* **Implementasi:**
  - Saat terhubung ke Supabase/`market-server`, status harga, buku pesanan, dan breaking news disinkronkan langsung via WebSocket / Postgres CDC (`postgres_changes`).
  - Jika koneksi backend tidak tersedia, aplikasi secara otomatis dan transparan mengaktifkan mesin simulasi mikro-tick lokal tanpa memunculkan error atau layar kosong (*zero-downtime graceful degradation*).

#### 5. Sistem Vektor SVG Terpusat vs Emoji Platform-Dependent
* **Konsep:** Menghilangkan disparitas tampilan emoji antar sistem operasi (Windows Segoe UI Emoji, Apple Color Emoji, Android Noto Color Emoji) yang kerap tampak tidak profesional atau bergaya kartun di antarmuka keuangan.
* **Solusi:** Membangun repositori ikon vektor SVG mandiri (`src/js/ui/Icons.js`) dengan standar `viewBox="0 0 24 24"`, *stroke-based styling*, dan pewarnaan CSS dinamis untuk menjaga estetika terminal trading kelas institusi di seluruh perangkat.

---

### ⏳ Tahap Selanjutnya (Rekomendasi Pengembangan Berikutnya)
- [ ] **Langkah 1 — Playtest Transaksi Real-Time ke Supabase:**
  - Memasang order limit/market dari terminal trading frontend dan memverifikasi rekaman langsung di tabel `orders`, `positions`, dan `ledger_entries` Supabase.
- [ ] **Langkah 2 — Tes Multi-User Matching Engine:**
  - Uji coba transaksi dua arah (jual & beli) secara simultan dari dua tab browser berbeda untuk menguji eksekusi instan order book matching.
- [ ] **Langkah 3 — Integrasi Supabase Auth di Frontend:**
  - Menghubungkan formulir Sign In / Sign Up Supabase Auth agar data profil dan aset pemain tersimpan per akun pengguna.
- [ ] **Langkah 4 — Deployment Produksi Backend:**
  - Menerapkan `market-server/` ke cloud hosting (Render, Railway, atau VPS) dan menghubungkan URL produksi ke frontend.

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](file:///d:/Data%20Project/Personal%20Project/AuraAssets/LICENSE) file for details.
