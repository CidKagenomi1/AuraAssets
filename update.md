# 🚀 Riwayat Pembaruan & Log Pengembangan (AuraAssets Changelog)

Dokumentasi lengkap pembaruan fitur, keputusan rekayasa finansial, penanda kelanjutan proyek, dan arsitektur sistem AuraAssets.

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

#### 5. 💼 Reksa Dana Market Engine, Instrumen Ultra-Aman & Suite Pembelian Interaktif
- **Mesin Pasar Reksa Dana Terintegrasi (`MutualFundManager.js` & `FinancePanel.js`):**
  - Mengintegrasikan 4 kelas aset reksa dana: Pasar Uang, Pendapatan Tetap, Campuran, dan Saham dengan perhitungan Nilai Aktiva Bersih (NAB/NAV) harian, imbal hasil historis 1 tahun, dan alokasi portofolio terkelola.
  - Perbaikan error navigasi dan dependensi instance pada `FinancePanel` dan `UIManager` sehingga tab Reksa Dana dapat dibuka dan ditransaksikan dengan lancar tanpa crash.
- **Aset Paling Aman & Stabil untuk Pemula & Settle:**
  - Menghadirkan instrumen **Manulife Dana Kas Mandiri** dengan badge khusus **`⭐ PALING AMAN & STABIL • PEMULA & SETTLE`**.
  - Dirancang dengan algoritma pergerakan NAB non-negatif terjamin (~5.2% p.a., fluktuasi harian $+0.012\% \text{ s/d } +0.018\%$), menjadi tempat teraman bagi pemain pemula yang baru membangun modal atau pemain yang sudah mapan (*settle*) untuk mengunci kekayaan dari risiko penurunan harga saham dan kripto.
- **Redesain Modern Menu Pembelian Reksa Dana (Interactive Purchase Suite):**
  - **Live Return Simulator:** Menghitung dan menampilkan proyeksi laba bersih secara dinamis (*Est. Return 1 Bulan* dan *Est. Return 1 Tahun*) serta estimasi total modal di akhir tahun pertama sesuai nominal yang diketik pemain.
  - **Kalkulator Unit Otomatis:** Menghitung jumlah unit penyertaan yang didapat secara presisi berdasarkan harga NAB/unit saat ini.
  - **Preset Alokasi Cepat (Quick Allocation Chips):** Tombol persentase kas instan (**Min**, **25%**, **50%**, **75%**, **Maks**) serta chip penambah saldo nominal (**+$250**, **+$500**, **+$1.000**, **+$5.000**) untuk input nominal yang fleksibel dan cepat.
  - **Validasi Finansial & Transparansi Biaya:** Validasi batas minimum investasi (\$10) dan kecukupan saldo kas secara real-time, dilengkapi garansi Biaya Beli 0% dan Biaya Manajer Investasi 0%.
- **Optimalisasi Skala Dinamis Grafik Plotly (`ChartEngine.js`):**
  - Memperbaiki batas bawah (*baseline*) grafik garis agar tidak lagi terkunci ke titik \$0. Sumbu Y kini menggunakan rentang dinamis berbasis harga terendah (*lowest price stretch scaling*) dengan padding 15% dari spread harga, sehingga formasi gelombang pasar, pola harga, dan tren pergerakan terlihat jelas dan proporsional.

#### 6. ☁️ Direct Frontend Cloud Persistence Supabase (Zero-Server Architecture) & Real-Time Auto-Periodic News Engine
- **Direct Supabase Cloud Persistence (Tanpa Ketergantungan Server Lokal):**
  - **Skema Database Baru (`006_direct_cloud_sync.sql`):**
    - `player_saves`: Menyimpan profil pemain, saldo kas, kekayaan bersih (*net worth*), role risiko investor, credit score, dan seluruh snapshot `save_data` (JSONB).
    - `player_portfolio`: Tabel relasional yang mencerminkan seluruh kepemilikan aset aktif pemain (saham, kripto, reksa dana) dengan harga beli rata-rata (*avg buy price*), unit, total modal investasi, harga terkini, dan valuasi terkini untuk inspeksi langsung di Supabase Table Editor.
    - `player_transactions`: Pencatatan mutasi transaksi keuangan dan aktivitas pasar pemain secara persisten ke cloud.
    - Penerapan Row Level Security (RLS) terbuka untuk akses anon key dan pendaftaran tabel ke publikasi `supabase_realtime`.
  - **Dual-Layer Persistence Engine (`GameState.js` & `SupabaseClient.js`):**
    - **Performa Instan Bebas Lag:** Game tetap menulis ke `localStorage` untuk loading 0-ms dan kemampuan bermain offline tanpa hambatan jaringan.
    - **Sinkronisasi Asinkron Cloud:** Sinkronisasi di latar belakang (*background sync*) ke Supabase Cloud setiap kali state berubah, saldo bermutasi, atau transaksi dieksekusi.
    - **Cross-Device State Hydration:** Deteksi otomatis saat pemain membuka game di browser baru atau HP; profil akun dari Supabase langsung muncul di portal login dan mengunduh save data terbaru.
  - **Portal Login Terintegrasi Cloud (`LoginPortal.js`):**
    - Mendeteksi dan menampilkan chip akun pemain yang tersimpan di Supabase Cloud saat login dibuka di perangkat baru.
    - Autentikasi dan registrasi asinkron dengan proteksi username ganda di cloud serta visual loading feedback (*"Sinkronisasi Cloud..."*).
- **Aktivasi & Kalibrasi Mesin Berita Otomatis Berkala (Auto-Periodic Market Engine - `NewsManager.js`):**
  - **Resolusi Bug Pemicu Berita:** Mengidentifikasi dan memperbaiki masalah di mana 40 data breaking news (20 saham AS & 20 kripto) sebelumnya tidak pernah terpicu karena fungsi pemicunya (`triggerRandomEvent`) hanya ada di dalam `onDayPass()` tanpa pemanggil berkala aktif.
  - **Startup Market Catalyst (Auto-Seed):** Memastikan pasar tidak pernah dingin atau statis. Dalam 3.5 detik setelah game dimuat, jika tidak ada berita aktif di cloud, sistem otomatis merilis 1 breaking news katalis pasar pertama.
  - **Background Periodic Ticker (15s Loop):** Interval berkala 15 detik yang membersihkan berita kedaluwarsa dan mengevaluasi peluang rilis berita baru (cooldown 3 menit, peluang 35%, maksimal 2 berita aktif bersamaan agar sentimen pasar tetap terarah).
  - **Integrasi Cloud Broadcast Supabase:** Setiap berita yang dirilis langsung dikirimkan ke tabel `market_events` di Supabase via `broadcastCloudEvent` dan disinkronkan ke seluruh pemain/perangkat via Supabase Realtime.
  - **Reaktivitas UI & Audio:** Menghubungkan visual toast alert (Bullish Surge / Bearish Shock), audio notifikasi, widget snapshot breaking news di dashboard, dan hitung mundur sisa durasi (countdown).
- **Perbaikan Bug Render Arus Kas Dashboard (`HomeScreen.js`):**
  - Mengeliminasi `ReferenceError: propertyRent is not defined` pada `renderHomeCashflow()` dengan perhitungan yield sewa properti yang aman langsung dari `gameState.get('properties')`, mencegah crash saat me-render dashboard.

#### 7. 📊 Tabel Pasar Cerdas (Kolom Sektor & Volatilitas) & Filter Dua Dimensi Top Movers
- **Kolom Kategori Sektor & Volatilitas pada Tabel Pasar (`MarketRows.js` & `ViewManager.js`):**
  - Menambahkan kolom eksplisit **Sektor** dan **Volatilitas / Risiko** pada setiap baris aset saham dan kripto di bursa pasar, sehingga identitas kategori aset tetap terbaca jelas bahkan saat tidak menggunakan filter (*unfiltered state*).
  - **Badge Sektor Terstandar:** Menampilkan nama dan aksen warna tematik untuk 10 sektor saham (Teknologi, Finansial, Kesehatan, Energi, dll.) dan 9 bidang kripto (Layer 1, DeFi, Meme Coin, Stablecoin, AI, DePIN, dll.).
  - **Klasifikasi Risiko Volatilitas:** Setiap instrumen dilabeli dengan badge risiko visual:
    - 🛡️ **Rendah** (Hijau): Aset defensif/stabil (`volatility <= 1.6%` saham / `<= 2%` kripto).
    - ⚖️ **Moderat** (Kuning): Volatilitas menengah (`1.8% - 2.8%` saham / `2% - 7%` kripto).
    - 🚀 **Tinggi** (Merah): Aset momentum tinggi & fluktuatif (`> 2.8%` saham / `> 7%` kripto).
  - **Header Tabel Pasar Terstruktur (`buildMarketTableHeader`):** Baris header interaktif (`ASET`, `NAMA`, `SEKTOR`, `VOLATILITAS`, `HARGA`, `24H %`) lengkap dengan ikon sortir (`▲`/`▼`) yang langsung tersinkronisasi dengan opsi pengurutan saat diklik.
  - **Adaptasi Mobile (< 720px):** Baris beralih ke layout kartu bertingkat yang rapi dengan subline badge kategori di bawah nama aset tanpa menimbulkan overflow atau scroll horizontal yang canggung.
  - **Integrasi Filter & Pipeline Sortir:** Dropdown risiko volatilitas (`#market-filter-risk`), filter tren (`#market-filter-trend`), sector chips, pencarian teks, dan tombol reset filter kini terhubung penuh ke pipeline filter & sortir dengan ringkasan jumlah aset yang tampil.
- **Tombol Kategori Dua Dimensi pada Widget Top Movers (`HomeScreen.js` & `index.html`):**
  - Menambahkan grup tombol filter instrumen pasar di widget **Top Movers** di Beranda: **Semua**, **📈 Saham**, dan **🪙 Kripto**.
  - Beroperasi independen dan bersinergi dengan filter arah pergerakan (**Gainers / Losers**), memungkinkan pemain melihat Top Gainers Saham, Top Losers Saham, Top Gainers Kripto, atau Top Losers Kripto secara instan.
  - Reaktif dan terikat langsung ke siklus pembaruan harga real-time tanpa perlu reload, serta responsif di desktop maupun layar mobile.

#### 12. 📱 Peningkatan UX Mobile & Desktop Komprehensif (`audit.md` - Tahap 2)
- **Sidebar Desktop dengan Pengelompokan Logis (Visual Grouping):**
  - Menata ulang navigasi desktop menjadi 3 kelompok menu dengan header label tematik:
    - **Utama:** Beranda (`home`)
    - **Portofolio & Keuangan:** Laporan Keuangan (`finance`), Reksa Dana & ETF (`mutual_funds`), Deposito (`savings`), dan Pinjaman (`loans`)
    - **Pasar & Analisis:** Bursa Pasar (`market`), Komoditas (`commodities`), dan Berita Makro (`news`)
  - Meningkatkan keterbacaan navigasi dan menghilangkan kesan menu yang berserakan.
- **Modernisasi Bottom Navigation Bar Mobile & Sheet Modal "Lainnya" (`MobileNav.js`):**
  - Membatasi bilah navigasi bawah ponsel menjadi **4 item inti**: `home` (Beranda), `market` (Bursa), `portfolio` (Portofolio), dan `news` (Berita).
  - Menambahkan tombol menu **"Lainnya"** yang memunculkan Bottom Sheet interaktif berdesain glassmorphic dengan backdrop blur dan animasi slide-up untuk mengakses menu sekunder (Reksa Dana & ETF, Komoditas, Deposito, Pinjaman, dan Pengaturan).
- **Toolbar Pasar Mobile Cerdas (Filter Drawer & Horizontal Sector Chips):**
  - Mengeliminasi deretan dropdown filter yang sebelumnya memadati layar mobile menjadi tombol ringkas **"Filter & Urutkan"** yang membuka lembar laci (*filter drawer sheet*).
  - Chip sektor pasar dapat digeser secara horizontal (*smooth touch-scroll*) dengan indikator jumlah aset aktif yang dinamis.
- **Kartu Onboarding Interaktif & Popover Glosarium Edukatif (`glossary.js`):**
  - Kartu panduan ringkas 3 langkah bagi pemain baru di beranda (bisa ditutup permanen dengan status tersimpan di state).
  - Popover penjelasan istilah finansial (NAV/NAB, Dividen, Volatilitas, Sinyal Pasar, PnL) saat pemain mengetuk ikon tanda tanya edukatif `(?)`.
- **Modal Selamat Datang Kembali & Pendapatan Pasif AFK (Welcome Back Modal):**
  - Mendeteksi selisih waktu saat pemain meninggalkan game (AFK) dan menampilkan ringkasan akumulasi bunga simpanan/deposito serta dividen yang diperoleh selama pemain offline.
- **Optimalisasi Tata Letak Hero Saldo Mobile (`main.css` & `mobile.css`):**
  - Menggabungkan elemen saldo bersih, tombol sensor mata (`toggle-balance`), dan tombol "Laporan Keuangan" ke dalam wrapper fleksibel `.hero-balance-header`.
  - Mengeliminasi `position: absolute` legacy yang sebelumnya menyebabkan tombol laporan keuangan dan tombol beli aset bertumpuk (*overlap*) di viewport layar HP.
- **Tombol Judul Tab Dinamis dengan Transisi Blur Terisolasi (`FinancePanel.js`):**
  - Menggantikan tombol tab ganda pada Laporan Keuangan dengan tombol judul tunggal elegan: `[ 💼 Portofolio & Aset ]` dan `[ 📈 Arus Kas & Karir ]`.
  - Mengeliminasi ornamen berlebih (kata "MODE:" dan badge "BERALIH").
  - Menambahkan efek transisi blur (`filter: blur(8px)`) yang terisolasi khusus di dalam konten tombol saat berpindah tampilan tanpa memengaruhi bagian layar lainnya.

#### 13. 📊 Perombakan Arsitektur Chart Finansial & Real-Time Tick Aggregation (`chart_isue.md`)
- **Pencatat Tick Nyata & Agregator OHLCV (`PriceHistoryStore.js`):**
  - Menghentikan pembuatan ulang grafik dari kurva pola fiktif. Seluruh pergerakan chart kini mencerminkan **tick transaksi nyata** (`t`, `price`, `volume`) dari mesin simulasi bursa lokal, transaksi beli/jual pemain, maupun streaming authoritative market server.
  - Mengelompokkan tick ke dalam bucket waktu murni (*time-bucket aggregation*) untuk membentuk data lilin OHLC yang konsisten: `open` = tick awal, `close` = tick akhir, `high`/`low` = nilai ekstrem nyata, dan `volume` = total volume akumulasi.
  - Mendukung 4 horizon timeframe terstandarisasi:
    - **1h:** interval 1 menit (60 candle)
    - **1d:** interval 5 menit (120 candle)
    - **1w:** interval 1 jam (168 candle)
    - **1m:** interval 1 hari (30 candle)
  - Penyimpanan persisten ke `localStorage` (`aura_candles_v1_...`) dengan mekanisme auto-pruning agar riwayat chart tidak hilang saat reload halaman.
- **Penghapusan Total Rumus Sinus & Backfill Deterministik:**
  - Menghapus gelombang sinus buatan `sin(progress·π·6.5)` dan `sin(progress·π·14.2)` dari [`PatternTrajectoryManager.js`](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/trading/PatternTrajectoryManager.js) dan [`CandleGenerator.js`](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/trading/CandleGenerator.js).
  - Mengganti interpolasi waypoint pola dengan *Hermite smoothstep cubic easing* alami.
  - Untuk inisialisasi riwayat sebelum gameplay, sistem menerapkan **random walk mundur** (*backward walk*) deterministik dengan *volatility clustering* berbasis seed PRNG unik per simbol aset, menyatu mulus ke harga live saat ini tanpa lonjakan kurva.
- **Modernisasi Engine Grafik Plotly (`ChartEngine.js`):**
  - **Sumbu Waktu Riil:** Mengubah `xaxis.type` menjadi `'date'` berbasis ISO timestamp nyata (`new Date(t).toISOString()`).
  - **Linear Rendering:** Mengganti kurva `spline` dengan `shape: 'linear'` untuk mengeliminasi anomali overshoot harga.
  - **Interaktivitas Penuh:** Mengaktifkan `dragmode: 'pan'`, `scrollZoom: true`, dan `fixedrange: false` pada sumbu X agar pemain dapat menggeser serta memperbesar/memperkecil grafik secara leluasa, dengan sumbu Y yang auto-fit stabil terhadap rentang harga aktif.
  - Penanda harga interaktif (*crosshair spike line* dan *hover marker*) menampilkan waktu, harga presisi, dan volume bar.
- **Kontinuitas Harian Tanpa Garis Patah (Rolling 24h Rollover):**
  - Menghentikan pemotongan grafik di tengah malam UTC. Di [`StockMarket.js`](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/trading/StockMarket.js) dan [`CryptoMarket.js`](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/trading/CryptoMarket.js), `basePrice` diperbarui secara bertahap menggunakan *Exponential Moving Average* (EMA 85% : 15%) pada `onDayPass()`.
  - Metrik 24h High, 24h Low, dan Volume bergulir dinamis (*rolling 24h*), menjaga kontinuitas visual chart antar-hari.
- **Arsitektur Mode Server & In-Memory Candle Rollup (`market-server/`):**
  - **Skema Database & Pruning (`007_market_candles.sql`):** Tabel `market_candles` terindeks untuk penyimpanan candle OHLCV teragregasi beserta fungsi pembersihan otomatis `prune_expired_market_candles()` (1m disimpan 7 hari, 1h disimpan 60 hari).
  - **In-Memory Accumulator (`CandleService.js`):** Mengolah tick perdagangan di memori RAM server untuk mencegah beban berlebih (*thrashing*) pada database Supabase, lalu melakukan *batch insert* candle 1-menit yang telah ditutup ke PostgreSQL.
  - **Koneksi Live WebSocket & REST API:** Endpoint REST `GET /api/market/:symbol/candles` untuk inisialisasi pembukaan chart, serta siaran real-time event WebSocket `candle:update` ke subscriber room `market:<SYMBOL>`.
  - **Pub-Sub Event Emitter Tangguh (`MarketClient.js`):** Dilengkapi arsitektur pub-sub (`on`/`off`/`emit`) sehingga feed tick, candle, dan order terdistribusi ke `PriceHistoryStore` dan `StockMarket` secara simultan tanpa risiko *race condition*.

#### 8. 📦 Pasar Komoditas Global Mandiri & Brankas Kustodian Fisik Digital 1:1 (`CommodityManager.js` & `CommodityPanel.js`)
- **Mesin Pasar Komoditas Dedikasi Penuh (`CommodityManager.js`):**
  - Mengimplementasikan perdagangan komoditas spot global yang mencakup 13 instrumen nyata dengan satuan fisik standar, terbagi dalam 4 sektor berbatas tegas:
    - **🏛️ Logam Mulia (Precious Metals):** Emas (`XAU` - $2.740/t.oz), Perak (`XAG` - $34.20/t.oz), Platina (`XPT` - $1.025/t.oz).
    - **⚡ Energi (Energy):** Minyak Mentah WTI (`WTI` - $71.80/barrel), Minyak Mentah Brent (`BRENT` - $75.60/barrel), Gas Alam (`NATGAS` - $2.85/MMBtu).
    - **🏭 Logam Industri (Industrial Metals):** Tembaga (`COPPER` - $4.42/lb), Nikel (`NICKEL` - $16.350/ton), Litium Karbonat (`LITHIUM` - $11.200/ton), Aluminium (`ALU` - $2.640/ton).
    - **🌾 Agrikultur & Pangan (Agriculture):** Minyak Sawit CPO (`CPO` - $985/ton), Kopi Robusta (`COFFEE` - $4.650/ton), Gandum Berjangka (`WHEAT` - $5.75/bushel).
  - **Model Fluktuasi Pasar Komoditas:** Algoritma fluktuasi harian berbasis batas volatilitas sektoral ($0.8\% - 3.2\%$), pergerakan 24h High/Low deterministik, serta spread pasar spot wajar ($0.15\% - 0.50\%$).
- **Brankas Kustodian Fisik Digital 1:1 (Digital Custody Vault):**
  - Tracking kepemilikan unit fisik fraksional (`units`, `avgPrice`, `currentValue`, `pnl`, `pnlPercent`) yang dijamin 1:1 oleh sertifikat kustodian resmi bebas biaya penitipan (*zero storage fee*).
  - Konsolidasi instan: Nilai brankas komoditas terhubung langsung ke kalkulasi Kekayaan Bersih (*Total Net Worth*) dan grafik alokasi aset di `FinancePanel.js`.
- **Terminal Trading Komoditas Interaktif (`CommodityPanel.js`):**
  - **Hero Brankas & Likuiditas Kas:** 3 Kartu metrik utama (Total Valuasi Brankas Komoditas, Jumlah Aset Tersimpan, dan Saldo Kas Siap Beli).
  - **Navigasi Sektor & Pembagian Berbatas Jelas:** Filter pil sektor interaktif (Semua, Logam Mulia, Energi, Logam Industri, Agrikultur) lengkap dengan banner header tematik per sektor.
  - **Grafik Interaktif Candlestick 30 Hari (Plotly.js):** Modal grafik candlestick historis berbasis deret waktu deterministik dengan tooltips OHLC dan responsif layar.
  - **Modal Beli Spot dengan Konversi Fraksional Live:** Input nominal dolar fleksibel dengan konversi instan ke unit fisik, validasi saldo, serta tombol alokasi cepat (+$50, +$250, +$1K, 50% Saldo, Maksimal).
  - **Modal Pencairan Kas (Likuidasi):** Menjual unit komoditas tersimpan langsung kembali ke saldo kas utama secara instan tanpa potongan tersembunyi.

#### 9. 🌐 Exchange-Traded Funds (ETF) & Pemisahan Sektor Terstruktur (`MutualFundManager.js` & `ViewManager.js`)
- **Penambahan Pasar ETF Global:**
  - Mengintegrasikan 6 instrumen ETF terkemuka dunia ke dalam engine portofolio terkelola:
    - **SPY** (SPDR S&P 500 ETF Trust) — Indeks Global
    - **QQQ** (Invesco QQQ Trust) — Teknologi & AI
    - **SMH** (VanEck Semiconductor ETF) — Semikonduktor
    - **VNQ** (Vanguard Real Estate ETF) — REITs Properti Komersial & Residensial
    - **EEM** (iShares MSCI Emerging Markets ETF) — Pasar Berkembang
    - **XLV** (Health Care Select Sector SPDR Fund) — Kesehatan & Farmasi
- **Segmented Toggle Switcher & Filter Sektoral:**
  - Pemisahan tegas antarmuka antara **Reksa Dana Konvensional** (Manulife, Schroder, Batavia) dan **Exchange-Traded Funds (ETF)** lewat kontrol segmented bar 2 arah yang intuitif.
  - Filter pil sektor khusus ETF (Semua Sektor, Indeks Global, Teknologi & AI, Semikonduktor, REITs Properti, Pasar Berkembang, Kesehatan) untuk navigasi instrumen terarah.
- **Transparansi Parameter ETF:**
  - Kartu instrumen ETF dilengkapi dengan badge ticker bursa, Expense Ratio tertera transparan (0.09% - 0.68%), dan estimasi Dividend Yield tahunan.

#### 10. 🧹 Pemurnian Fokus Simulasi Trading & Isolasi Fitur Legacy (Property & Marketplace)
- **Isolasi Penuh Fitur Non-Trading (`isolated_features/`):**
  - Seluruh direktori dan file `src/js/property/` dan `src/js/marketplace/` telah dipindahkan dan diarsipkan secara rapi ke `isolated_features/property/` dan `isolated_features/marketplace/`.
  - Game secara murni bertransisi menjadi simulasi trading dan manajemen portofolio investasi modern (Saham, Kripto, Reksa Dana, ETF, Komoditas, Deposito Perbankan, dan Pinjaman).
- **Pembersihan Dependensi Antar-Modul:**
  - Menghapus ketergantungan unit properti (`propertyManager`) dan kepemilikan jam/aset marketplace dari `CareerManager.js`, `FinancePanel.js`, `HomeScreen.js`, `RoleManager.js`, dan `main.js`.
  - Menggantikan target promosi karier dan achievement lama dengan milestone portofolio finansial modern (*mutual_fund_owner* dan *net worth progression*).

#### 11. 📱 Restrukturisasi Navigasi Mobile & Kepatuhan Penuh Panduan `mobile.md`
- **Modernisasi Bottom Navigation Bar (`MobileNav.js`):**
  - Menggantikan ikon lama properti di bilah navigasi bawah ponsel dengan **Kilas Berita & Makro Pasar (`news`)**.
  - 4 Menu Utama Navigasi Bawah: `home` (Beranda), `market` (Bursa Pasar), `portfolio` (Portofolio), dan `news` (Berita & Makro) + Tombol `Lainnya` yang membuka bottom sheet modal.
  - Memasukkan **Pasar Komoditas** ke dalam grup Pasar Finansial pada modal menu "Lainnya", serta membersihkan opsi properti & marketplace lama.
- **Implementasi Komprehensif Media Query (`mobile.css`):**
  - **Carousel Swipe Horizontal untuk Kartu KPI:** Baris kartu statistik brankas komoditas (`.commodity-vault-hero-row`) dan statistik reksa dana otomatis berubah menjadi carousel horizontal (`scroll-snap-type: x mandatory`, flex `80% - 90%`) pada tablet dan ponsel (≤ 768px dan ≤ 360px), mencegah halaman bertumpuk vertikal berlebihan.
  - **Grid Kolaps 1-Kolom Bebas Overflow:** Grid kartu komoditas (`.commodity-cards-grid`) dan reksa dana/ETF (`.funds-cards-grid`) kolaps ke `1fr` dengan `min-width: 0` dan `box-sizing: border-box`, mengeliminasi bug scroll horizontal pada seluruh target viewport (`360×640`, `375×667`, `390×844`, `412×915`, `768×1024`).
  - **Ergonomi Sentuh Standar Tinggi (≥ 40px):** Seluruh tombol aksi kartu, tombol filter sektor (`.commodity-filter-btn`, `.etf-sector-pill`), segmented switch (`.funds-category-toggle`), dan chip alokasi cepat modal memenuhi target sentuh minimum 40px/38px dengan `-webkit-tap-highlight-color: transparent` dan `touch-action: manipulation`.
  - **Optimasi Modal Bottom Sheet & Plotly Chart:** Tinggi grafik Plotly diatur adaptif (270px di mobile) agar tetap pas di dalam batas modal sheet 92vh, dan font-size input minimal 14px (0.875rem) untuk mencegah auto-zoom browser iOS.

#### 14. 🛡️ Penguatan Keamanan Kritis, Lockdown RLS Supabase & Sanitasi XSS (`audit.md`)
- **Lockdown Row Level Security (RLS) Menyeluruh (`008_secure_rls_and_auth.sql`):**
  - Mengunci akses seluruh tabel PostgreSQL di Supabase dengan kebijakan RLS berbasis Supabase Auth token JWT (`auth.uid()`):
    - `player_saves`: Akses `SELECT`, `INSERT`, `UPDATE`, `DELETE` hanya diizinkan jika `auth.uid() = id`.
    - `player_portfolio`: Akses dibatasi ketat ke pemilik akun (`auth.uid() = user_id`).
    - `player_transactions`: Akses dibatasi ke pemilik akun (`auth.uid() = user_id`).
  - **Tabel Internal Bursa Terkunci (Service Role Only):**
    - Tabel `accounts`, `orders`, `ledger_entries`, `crypto_market_state`, `market_state`, dan `outbox_events` dikunci total dari akses public/anon key dan hanya dapat diakses secara terotorisasi oleh backend via `service_role`.
  - **Penghapusan Kolom Plaintext `password_hash`:**
    - Menghapus kolom sensitif `password_hash` dari tabel publik `player_saves`. Autentikasi akun kini ditangani penuh oleh infrastruktur resmi **Supabase Auth** (`supabase.auth.signUp()` dan `supabase.auth.signInWithPassword()`).
    - Penyimpanan offline di `localStorage` menerapkan enkripsi hashing satu arah SHA-256 (`crypto.subtle.digest`) untuk mencegah penyimpanan credential mentah.
- **Sanitasi XSS (Cross-Site Scripting) Komprehensif (`src/js/core/SecurityUtils.js`):**
  - Mengembangkan modul utilitas keamanan `escapeHtml()` untuk menyaring seluruh karakter khusus (`&`, `<`, `>`, `"`, `'`).
  - Mengaudit dan menyematkan proteksi sanitasi pada seluruh injeksi `innerHTML` dinamis pada data input pengguna, nama instrumen pasar, pencarian modal, notifikasi toast, riwayat transaksi (`TradeHistoryPanel.js`), feed berita (`HomeScreen.js`, `MarketNewsSubView.js`), dan portal autentikasi (`LoginPortal.js`).
- **Penghapusan Kredensial Hardcoded & Isolasi Environment Variables:**
  - Membersihkan kredensial rahasia (Supabase Service Role Key dan Database Password) dari skrip migrasi dan file publik.
  - Memusatkan konfigurasi sensitif ke file `.env` yang terisolasi dan dilindungi oleh `.gitignore`.

#### 15. ⚡ Eliminasi Kedipan Halaman Pendapatan Pasif & Arsitektur In-Place Live Update (`PassiveIncomeView.js` & `ViewManager.js`)
- **Akar Masalah (Root Cause) Kedipan:**
  - `PassiveIncomeManager.js` memancarkan event `passiveIncomeTick` setiap 1 detik (1000ms) untuk memperbarui hitung mundur Launchdrop & reward staking.
  - Sebelumnya, `ViewManager.js` merespons event tersebut dengan memanggil `renderPassiveIncomePage()` penuh secara destruktif (`target.innerHTML = ...`). Hal ini merobohkan seluruh struktur DOM halaman dan memicu ulang `animation: fade-up 0.25s ease` setiap detik, serta menyebabkan input teks kehilangan fokus kursor saat pengguna sedang mengetik.
- **Arsitektur Shell Tunggal (Mount Once):**
  - Mengadopsi arsitektur container `#passive-income-shell` yang hanya dirender satu kali saat pengguna pertama kali memasuki halaman Pendapatan Pasif.
- **Pembaruan Elemen Live Tepat Sasaran (In-Place DOM Mutation):**
  - Mengimplementasikan `updatePassiveIncomeLive()` yang memutasi langsung nilai teks (`textContent`) pada elemen target tanpa merender ulang DOM:
    - **KPI Hero Banner:** `#pi-hero-staked-usd`, `#pi-hero-staked-pending`, `#pi-hero-bot-profit`, `#pi-hero-ld-status`.
    - **Launchdrop Timers & Status:** `.launchdrop-timer-val`, `#launchdrop-next-countdown-val`, `.launchdrop-status-badge`.
    - **Vault Staking Yield:** `.staking-reward-amt`, `.staking-reward-usd`.
    - **Trading Bot Realtime:** `.bot-profit-val`, `.bot-current-val`, `.bot-change-badge`, `.bot-cycles-val`.
- **Navigasi Sub-Tab Tanpa Kedip & Proteksi Fokus Input:**
  - Fungsi `switchPassiveSubTab()` kini hanya mengganti konten internal `#passive-subview-content` tanpa mengganggu shell luar maupun memicu ulang animasi kontainer utama.
  - Fitur pencarian koin (`setStakingSearch`) dan pemilihan tab filter mempertahankan fokus dan posisi kursor pengguna secara mulus saat data diperbarui.
  - Tombol switcher pada Laporan Keuangan diperhalus dengan transisi blur terisolasi (`filter: blur(5px)`) dan sinkronisasi navigasi otomatis.

#### 16. 🚀 Widget On-Going Launchdrop di Beranda (Direct Purchase & Claim - `HomeScreen.js`)
- **Penempatan Ergonomis Tepat di Bawah Arus Kas:**
  - Menghadirkan zona baru `#home-launchdrop-widget` di bawah baris Arus Kas & Karier Investor di layar Beranda.
- **Partisipasi & Transaksi Langsung (Direct Purchase on Home Screen):**
  - **Launchpool (Staking Kas Aman 100%):** Pemain dapat langsung menekan tombol **`🚀 Stake Kas`** untuk mengunci modal kas dan memanen reward airdrop token baru (+12% APY) tanpa perlu berpindah halaman.
  - **Launchpad (Presale Diskon 50%):** Pemain dapat langsung menekan tombol **`💎 Beli Presale Diskon 50%`** untuk memesan alokasi token dengan setengah harga pasar.
  - **Klaim Sekali Klik:** Tombol klaim interaktif **`🎁 Klaim Modal Pokok + Airdrop`** atau **`🚀 Klaim Token Presale`** saat pool selesai (*claimable*), yang secara instan mengkreditkan dana kembali ke kas dan token ke dompet kripto.
- **Sinkronisasi Live Bebas Kedip (Zero-Flicker Countdown):**
  - Mengintegrasikan listener `passiveIncomeTick` dengan pembaruan in-place target `.home-ld-timer-val` dan `.home-ld-status-badge`, menjaga countdown detik tetap akurat 100% tanpa re-render DOM atau mengganggu kenyamanan visual pemain di beranda.

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

#### 6. Proteksi Modal Reksa Dana Pasar Uang & Dynamic Stretch Scaling
* **Konsep Finansial Pasar Uang:** Instrumen pasar uang (*Money Market Fund*) di dunia nyata berinvestasi pada deposito perbankan dan surat utang jangka pendek (< 1 tahun) dengan imbal hasil terakresi harian bebas risiko penurunan modal (*zero drawdown*).
* **Solusi Permainan:** Menerapkan drift harian bernilai positif murni ($+0.012\% \dots +0.018\%$ per hari permainan) pada reksa dana pasar uang pilihan, memberikan tempat parkir modal yang aman bagi pemain pemula dan pemain tahap lanjut (*settle*).
* **Dynamic Stretch Scaling pada Chart:** Menggantikan batas sumbu Y berbasis `$0` dengan rentang dinamis $[Y_{\min} - \text{padding}, Y_{\max} + \text{padding}]$ sehingga fluktuasi harga mikro tidak terkompresi secara vertikal, memungkinkan pola pergerakan harga terbaca secara visual dan estetik.

#### 7. Arsitektur Dual-Layer Persistence (Offline-First Zero-Latency + Background Supabase Sync)
* **Konsep:** Pengguna mengharapkan respons instan (0-ms latency) saat berinteraksi dengan antarmuka finansial lokal, sekaligus mengharapkan portabilitas data di cloud saat berganti perangkat (laptop, tablet, HP) tanpa perlu menyalakan server lokal secara mandiri.
* **Solusi Arsitektur:**
  - *Layer 1 (Lokal):* Setiap aksi langsung dimutasi ke `localStorage` sehingga game tetap dapat dimainkan offline tanpa blocking network round-trip.
  - *Layer 2 (Cloud):* Mutasi secara asinkron disinkronkan ke Supabase Cloud (`player_saves`, `player_portfolio`, `player_transactions`).
  - *Reconciliation on Startup:* Saat game dibuka, jika save di cloud memiliki timestamp lebih baru daripada lokal, state lokal di-*hydrate* secara mulus tanpa kehilangan progres.

#### 8. Mesin Katalis Sentimen Pasar Real-Time (Auto-Periodic Event Loop & Startup Seeding)
* **Konsep:** Pasar modal di dunia nyata digerakkan oleh aliran berita dan sentimen makro yang terus bergulir. Pasar tanpa katalis terasa sepi dan mekanis.
* **Solusi Gameplay:** Mengintegrasikan loop evaluasi berkala (15 detik) dengan cooldown 3–5 menit dan auto-seed pada saat startup. Berita yang aktif memberikan bias dorongan harga yang nyata, tersinkronisasi lintas perangkat via WebSocket Supabase CDC, dan langsung termanifestasi pada candlestick grafik.

#### 9. Kustodian Brankas Komoditas Digital 1:1 & Alokasi Fraksional Bebas Biaya Simpan
* **Konsep Finansial:** Membeli komoditas fisik batangan secara konvensional seringkali terkendala modal besar dan biaya penitipan brankas berkala (*storage/custody fee*).
* **Solusi Permainan:** Menerapkan sistem kepemilikan fraksional berbasis kustodian digital 1:1 (*vault allocated ownership*). Pemain dapat membeli komoditas spot mulai dari nominal terjangkau ($10 - $100), mendapatkan konversi unit fisik terpresisi hingga 4 digit desimal (misal 0.0365 t.oz emas), dan menyimpannya di brankas digital tanpa potongan biaya simpan harian. Nilai aset terkonsolidasi secara live ke total kekayaan bersih.

#### 10. Struktur Biaya ETF vs Reksa Dana Konvensional (Expense Ratio & Transparansi Dividen)
* **Konsep Finansial:** Exchange-Traded Funds (ETF) di bursa global menawarkan diversifikasi sektoral instan dengan biaya pengelolaan (*expense ratio*) yang jauh lebih rendah daripada reksa dana konvensional (misal SPY 0.09% vs reksa dana aktif 1.5%–2.5%), serta memberikan imbal hasil dividen kas transparan (*dividend yield*).
* **Implementasi Desain:** Memisahkan kedua instrumen dengan switcher berkategori jelas, menampilkan indikator *Expense Ratio* dan *Dividend Yield* secara eksplisit pada setiap kartu ETF, dan memungkinkan pemain membangun portofolio indeks pasif bertaraf global.

#### 11. Deterministik Candlestick Generator untuk Komoditas Spot
* **Konsep:** Grafik komoditas memerlukan kontinuitas historis yang logis dan konsisten ketika dibuka berulang kali oleh pemain tanpa membuat data server bengkak.
* **Solusi:** Memanfaatkan generator pseudo-random deterministik berbasis seed unik instrumen dan timestamp hari kalender untuk merender 30 lilin candlestick harian (Open, High, Low, Close) dengan batas volatilitas realistis, candle terakhir tertaut presisi ke harga spot saat ini (*live market anchor*).

#### 12. In-Memory Candle Rollup & Pencegahan Database Thrashing (Anti-DB Thrashing)
* **Konsep Rekayasa Backend:** Menyimpan setiap transaksi mikro-tick (3–5 detik) dari ±220 instrumen pasar langsung ke database akan menghasilkan ~4,4 juta baris/hari (~300 MB/hari). Pola ini akan menghabiskan kuota database PostgreSQL Supabase (500 MB) hanya dalam 2 hari (*database thrashing*).
* **Solusi Arsitektur:** Menampung dan mengagregasi tick di memori RAM Node.js (`activeCandleBucket`). Hanya bar 1-menit yang telah final ditutup yang di-*flush* dalam bentuk batch insert ke PostgreSQL. Ditambah fungsi retensi otomatis (`prune_expired_market_candles`) yang membersihkan candle 1m di atas 7 hari dan candle 1h di atas 60 hari, kapasitas database PostgreSQL stabil terkendali di bawah 150 MB selamanya tanpa mengorbankan performa bursa real-time.

#### 13. Cermin Harga Nyata (True Tick Mirroring) & Immutability Candle
* **Konsep Grafik Finansial:** Grafik pasar harus menjadi cermin jujur dari harga yang benar-benar terjadi, bukan simulasi ulang visual dari kurva pola fiktif.
* **Solusi Sistem:** Memisahkan pencatatan tick murni ke `PriceHistoryStore.js` dan mengelompokkannya ke bucket waktu ISO nyata. Lilin-lilin lampau bersifat **immutable** (tidak digambar ulang), dan hanya lilin paling kanan yang aktif berjalan yang terus diperbarui seiring tibanya tick harga baru.

#### 14. Pola Grafik Geometris Sebagai Bias Gaya Tarik Halus (Weak Drift Waypoints)
* **Konsep Pasar Organik:** Pola teknikal seperti Head & Shoulders, Double Bottom, atau Triangle di bursa nyata adalah fenomena probabilistik alami akibat akumulasi/distribusi modal, bukan kurva matematis statis yang dipaksakan.
* **Solusi Permainan:** Pola geometris dipindahkan perannya menjadi vektor tarikan halus (*weak directional drift* ~0.006 per tick) di dalam mesin harga acak Brownian motion. Chart tidak pernah menggambar pola ideal secara paksa, melainkan membiarkan pola muncul secara berkala dan alami dari dinamika pasar.

#### 15. Arsitektur Pertahanan Berlapis (Defense-in-Depth): Row Level Security (RLS) & Native Supabase Auth
* **Konsep Keamanan Database:** Dalam arsitektur *Direct Cloud Persistence*, klien frontend berkomunikasi langsung dengan database PostgreSQL menggunakan Supabase anon key. Jika tidak dikunci dengan RLS yang benar, pihak ketiga dapat mengirimkan mutasi langsung (`POST`/`PATCH`) untuk mengubah saldo pemain lain, memalsukan kepemilikan aset, atau mencuri data sensitif.
* **Solusi Rekayasa:**
  - Menerapkan Row Level Security (RLS) ketat yang memvalidasi `auth.uid() = id` berbasis JSON Web Token (JWT) kriptografis yang diverifikasi oleh Supabase Auth.
  - Menghapus kolom password buatan sendiri dan memanfaatkan native identity provider Supabase Auth, sehingga password pemain tidak pernah tersimpan di tabel aplikasi.
  - Mengisolasi tabel pasar internal (`accounts`, `orders`, `ledger_entries`) di balik hak akses `service_role` sehingga integritas bursa tidak dapat dimanipulasi oleh klien publik.

#### 16. In-Place Element Updates vs Destructive Re-rendering (Zero-Flicker Clock Ticking)
* **Konsep Antarmuka Real-Time:** Aplikasi finansial modern memiliki puluhan metrik yang terus berdetak setiap detik (countdown timer, pending yield, pergerakan PnL floating bot). Menggunakan pola *full view re-render* (`innerHTML = render()`) pada setiap tick jam akan memicu *DOM thrashing*, *layout recalculation*, *CSS animation replay*, dan hilangnya fokus kursor (*focus dropping*).
* **Solusi Arsitektur UI:** Membagi antarmuka menjadi **Shell Statis** (dirender sekali saat inisialisasi) dan **Live Data Targets** (elemen span/div spesifik yang diikat oleh atribut data unik seperti `data-ld-id` atau `data-symbol`). Pada setiap tick 1000ms, sistem hanya melakukan mutasi teks langsung (`textContent = newVal`) pada elemen target, menjamin 60 FPS, memori stabil, dan bebas kedipan 100%.

#### 17. Engine Makroekonomi Suplai Terbatas & Bonding Curve Scarcity (`AuraEconomyEngine.js`)
* **Konsep Finansial & Game Ekonomi:** Dalam perekonomian bursa yang realistis, harga tidak boleh ditentukan semata-mata oleh angka acak (*pure random walk*), melainkan harus mencerminkan hukum penawaran dan permintaan riil (*Supply and Demand*). Jika suatu aset diborong oleh pasar, ketersediaan lembar/token beredar menyusut (*scarcity spikes*) sehingga harga otomatis terdorong naik. Sebaliknya, saat aset dijual kembali ke pasar, kelimpahan barang menekan harga turun.
* **Solusi Rekayasa:**
  - **Fundamental Parameter 202 Aset:** Mengintegrasikan model pasokan terhingga untuk 100 saham dan 102 kripto, mencakup `totalSupply`, `availableSupply` (cadangan free float awal di bursa AuraAssets: 40% untuk saham, 50% untuk kripto), `soldSupply` (persentase kepemilikan pemain), `marketCap` ($\text{Harga} \times \text{Total Supply}$), dan `reserveCash` (kas cadangan bursa).
  - **Elastisitas Kapitalisasi Pasar (Market Cap Elasticity):** 
    - Saham berkapitalisasi mega (seperti AAPL, MSFT, NVDA) memiliki pasokan belasan miliar lembar sehingga kebal dari manipulasi liar dan harganya terjaga stabil di koridor rasional ($180 – $350).
    - Aset berkapitalisasi kerdil (Meme Coins, Altcoins baru) memiliki pasokan yang sangat elastis sehingga memungkinkan pemain bertindak sebagai "Paus / Bandar" (*Whale*) yang dapat melakukan *Pump & Dump* hingga ratusan persen.
  - **Suplai Dinamis Kripto (Launchpool, Launchpad & Staking Emission):** Berbeda dengan saham yang berpasokan tetap (*fixed equity*), suplai kripto bersifat dinamis (*dynamic token emission*). Token baru yang diperoleh dari reward Launchpool, presale Launchpad diskon 50%, dan klaim imbal hasil Staking otomatis mencetak token baru (`mintLaunchdropTokens`), memperluas pasokan beredar di bursa secara akurat.
  - **Terminal Trading Integration:** Menampilkan indikator **Market Cap** (format T/B/M) dan **Suplai Beredar / Free Float** secara real-time pada strip analisis tepat di bawah grafik Plotly.

#### 18. Eliminasi Kondisi Split-Brain & Unifikasi Arsitektur Serverless (Solusi 1)
* **Diagnosis Masalah:** Pada arsitektur sebelumnya, terdapat koneksi *Authoritative Server* gantung (`connectAuthoritativeServer`) yang dijalankan otomatis saat startup. Jika server lokal merespons, sistem mengaktifkan `authoritativeMode = true` yang memblokir pergerakan harga lokal (`updatePrices` berhenti) dan menimpa saldo kas serta portofolio pemain dengan data tabel server kosong, sementara tombol eksekusi trading tetap berjalan lokal. Kondisi ini memicu bentrok data (*split-brain*) di mana transaksi lokal tertimpa dan harga membeku.
* **Solusi Arsitektur:**
  - **Pencabutan Auto-Connect:** Menghapus pemanggilan otomatis `connectAuthoritativeServer` dari `main.js` dan menonaktifkannya secara permanen untuk memproteksi save data pemain.
  - **Pembebasan Loop Harga:** Menghapus blokade pada `updatePrices()` sehingga mesin harga terus berjalan hidup dan dinamis dipandu oleh `AuraEconomyEngine`.
  - **Penghapusan Mean Reversion Mati:** Membuang formula `meanReversion` lama yang bertindak seperti magnet penarik harga kembali ke angka default awal di JavaScript.
  - **Patokan Harian Dinamis (Previous Close):** Memperbarui `basePrice` menjadi harga penutupan hari kemarin (`s.basePrice = s.price`) setiap pergantian hari (`onDayPass`), sehingga persentase untung/rugi harian selalu akurat dan tidak pernah kembali ke patokan mati masa lalu.
  - **Single Source of Truth:** Seluruh data pemain, portofolio, dan transaksi kini berada di bawah kendali tunggal `GameState` yang disinkronkan secara aman, cepat, dan 100% bebas biaya ke Supabase Cloud (`player_saves` & `player_portfolio`).

---

### ⏳ Tahap Selanjutnya (Rekomendasi Pengembangan Berikutnya)
- [x] **Langkah 1 & 3 — Integrasi Direct Cloud Persistence Supabase:**
  - Menyimpan profil pemain, save state JSONB, dan cerminan portofolio langsung ke tabel `player_saves`, `player_portfolio`, dan `player_transactions` di Supabase.
- [ ] **Langkah 2 — Tes Multi-User Matching Engine:**
  - Uji coba transaksi dua arah (jual & beli) secara simultan dari dua tab browser berbeda untuk menguji eksekusi instan order book matching via `market-server`.
- [ ] **Langkah 4 — Deployment Produksi Backend:**
  - Menerapkan `market-server/` ke cloud hosting (Render, Railway, atau VPS) jika bursa multipemain terpusat ingin dijalankan 24 jam.

---