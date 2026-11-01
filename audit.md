# AuraAssets: Audit Program

Tanggal: 2026-11-01

Cakupan: analisis kode statis. Aplikasi belum dijalankan, jadi catatan visual berasal dari kode dan CSS, bukan dari tampilan nyata. Tidak semua file dibuka (misalnya `HomeScreen.js`, `matching-engine.js`, dan sebagian besar logika ekonomi).

File yang dibaca: struktur proyek, `GameState.js`, `SupabaseClient.js`, `PassiveIncomeManager.js`, `mobile.md`, `auth-service.js`, `006_direct_cloud_sync.sql`, `package.json`, `README.md`.

## Penilaian Umum
Proyek ambisius dengan fitur lengkap: saham, kripto, reksa dana, komoditas, staking, bot, karier, bisnis, bank. Ada mode lokal dan server market otoritatif (Fastify, Socket.IO, Supabase). Server market ditulis dengan baik: matching engine FIFO, fungsi SQL atomik, tes konkurensi. `mobile.md` rapi sebagai pedoman desain.

Masalah utama: keamanan, arsitektur front-end, dan utang CSS.

## 1. Logic

### Kritis (keamanan)
- [x] **RLS terbuka total.** *(Selesai)* Dibuat migrasi `008_secure_rls_and_auth.sql`, menghapus kebijakan publik `USING (true) WITH CHECK (true)`, menerapkan RLS berbasis `auth.uid() = player_id` pada `player_saves`, `player_portfolio`, dan `player_transactions`, serta mengamankan `market_events` agar hanya dapat dibaca publik (SELECT) sedangkan INSERT/UPDATE dibatasi pada service role / server.
- [x] **Password dikelola di klien.** *(Selesai)* Mengintegrasikan Supabase Auth (`authSignUp`, `authSignIn`, `authSignOut`, `getAuthUser`, `getAuthSession`), menghapus kolom `password_hash` dari tabel `player_saves`, menyelaraskan JWT Supabase dengan `auth-service.js` di server, serta mengamankan kredensial lokal offline menggunakan hashing SHA-256 (Web Crypto API) sehingga password tidak lagi disimpan dalam bentuk teks biasa.
- [x] **Kredensial fallback di kode.** *(Selesai)* Menghapus kredensial hardcoded fallback dari `SupabaseClient.js`. Konfigurasi URL dan anon key kini dibaca murni dari environment variables (`VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`) dengan mode fallback offline yang anggun tanpa membocorkan kredensial.
- [x] **Mode lokal bisa dicurangi** *(Selesai)* Autentikasi cloud diselaraskan dengan verifikasi identitas token JWT `auth.uid()`. Sinkronisasi save data memvalidasi angka saldo, net worth, dan timestamp agar tidak bernilai negatif atau tidak wajar.

### Menengah
- [ ] `GameState.js` (860 baris) terlalu besar: save, login, cloud, riwayat chart, notifikasi. Pecah menjadi `AuthService`, `SaveService`, `HistoryService`.
- [ ] `set()` punya efek samping: saat `player.balance` berubah, ia menulis ulang history chart dan memanggil `prepopulate...`. Pindahkan ke listener `dayPass` atau snapshot.
- [ ] ID dibuat dengan `Date.now() + Math.random()` di `StockMarket.js`. Ganti dengan `crypto.randomUUID()`.
- [ ] Uang memakai float JS, sedangkan server memakai `VITE_PRICE_SCALE=100`. Pakai integer cents secara konsisten.
- [ ] Migrasi state tidak terpusat: `PassiveIncomeManager.getState()` menambal field satu per satu. Buat `saveVersion` dan `migrate(state)`.
- [ ] `getState()` memanggil `syncDailyLaunchdrops` di setiap pembacaan. Pindahkan ke event `dayPass`.
- [ ] Sesi 24 jam hanya dicek saat load, bukan saat sesi berjalan.
- [ ] Balance ekonomi belum diuji: APY staking sampai 18%, bot trading, dan dana "ultra-aman" 5,2% non-negatif bisa membuat uang tumbuh tanpa batas. Perlu simulasi atau tes.
- [ ] Tes hanya ada di `market-server`. Logika klien (bank, pinjaman, pajak, ekonomi) belum punya tes.

## 2. Arsitektur dan Kode Front-end
- [ ] **File raksasa dengan HTML inline.** `HomeScreen.js` 1954 baris (195 `style="`, 14 `innerHTML`); `PassiveIncomeView.js` 302 `style="`. Responsif bergantung pada hack `[style*=...]` dan `!important` (diakui di §9 `mobile.md`).
- [x] **Risiko XSS.** *(Selesai)* Dibuat modul keamanan terpusat `SecurityUtils.js` dengan fungsi `escapeHtml()`. Seluruh data dinamis dari cloud/pengguna (nama pemain, headline berita pasar, target sektor/aset, dan riwayat transaksi) pada `innerHTML` di `HomeScreen.js`, `MarketNewsSubView.js`, `LoginPortal.js`, dan `TradeHistoryPanel.js` telah di-escape secara ketat.
- [ ] **Re-render penuh** (dugaan, belum diverifikasi): cek di profiler, lalu update hanya node angka yang berubah.
- [x] **Duplikasi `ViewManager.js`:** *(Selesai)* `main.js` diselaraskan untuk mengimpor langsung dari `src/js/ui/views/ViewManager.js`, sementara `src/js/ui/ViewManager.js` dipertahankan sebagai clean facade re-export.
- [ ] **Bundel besar:** `index-*.js` 857 KB dan `plotly.min` 4,8 MB. `mobile.md` menyebut Plotly juga dimuat dari CDN. Pakai `plotly.js-basic-dist-min` atau lazy-load. Pilih satu antara Chart.js dan Plotly.
- [x] Pastikan `check.log`, `dist/`, dan `.env` di-ignore git. *(Selesai - Terverifikasi di `.gitignore` dan git status)*
- [x] README mengandung karakter rusak (emoji menjadi `dY"^`). Simpan sebagai UTF-8. *(Selesai - Terverifikasi UTF-8 valid)*
- [x] `package.json` bernama `business-tycoon`, bukan AuraAssets. *(Selesai - Bernama `aura-assets` dan `aura-assets-market-server`)*

## 3. Visual
Desain konsisten: dark, glassmorphism, aksen emerald, token CSS jelas.

- [ ] **CSS tambal-sulam.** `main`, `compact`, `mobile` saling menimpa dengan `!important` dan selector atribut. Migrasikan inline style ke class, mulai dari halaman yang paling sering dipakai.
- [ ] **Performa mobile.** `backdrop-filter` dan blur di banyak kartu berat di HP menengah. Batasi pada elemen besar, bukan baris daftar.
- [ ] **Kepadatan beranda** (direvisi): sengaja dibuat ramai sebagai "sampul gameplay". Jumlah kartu dipertahankan; yang dicek adalah apakah tiap kartu jelas dan bisa diketuk (lihat Saran UX bagian 2).
- [ ] **Aksesibilitas** (belum diperiksa penerapannya): `aria-label` tombol ikon, kontras `--text-dim`, tanda ▲/▼ selain warna.
- [ ] **Empty dan loading state:** skeleton yang konsisten, terutama untuk data server yang bisa gagal.
- [ ] **Konsistensi bahasa:** campuran Indonesia dan Inggris (Gainers/Losers, Launchpool). Pilih satu aturan.

## Prioritas
1. [x] **Perbaiki RLS dan auth (Supabase Auth, RLS per pemain, hapus `password_hash`).** *(Selesai)*
2. [x] **Escape semua data dinamis di `innerHTML`.** *(Selesai)*
3. [ ] Pecah `GameState` dan buat migrasi versi save.
4. [ ] Kurangi inline style di `HomeScreen` dan `PassiveIncomeView`.
5. [ ] Kecilkan bundel (Plotly) dan tambahkan tes logika ekonomi.
6. [ ] Rapikan visual: performa blur dan kejelasan tiap kartu beranda (keramaiannya dipertahankan).



---

# Audit Tahap 2: UX, Susunan, dan Kerapihan (non-teknis)

Dasar: `index.html`, `MobileNav.js`, `RoleManager.js`, dan `mobile.md`. Aplikasi belum dijalankan dan belum diuji dengan pengguna, jadi ini penilaian dari struktur, bukan dari pengamatan langsung. Perlu dipastikan dengan melihat aplikasi saat berjalan.

## Yang sudah baik
- Bahasa UI konsisten Indonesia dan istilah jelas.
- Identitas visual kuat (dark, emerald) dan aturan desain tertulis di `mobile.md`.
- Ada alur role atau profil risiko dan fitur yang dikunci per role.
- Bottom nav mobile berisi 4 item ditambah "Lainnya", pola yang sudah umum.

## Temuan

### A. Navigasi dan arsitektur informasi (prioritas tinggi)
- [x] **Terlalu banyak menu di level yang sama.** *(Selesai)* Sidebar desktop kini dikelompokkan ke dalam 4 grup terstruktur dengan label seksi: **Beranda**, **Investasi** (Pasar, Portofolio, Pendapatan Pasif), **Bank & Finansial** (Deposito, Pinjaman, Transfer Dana), dan **Akun & Sistem** (Riwayat, Donasi & Keberuntungan, Panduan, Pengaturan).
- [x] **Hierarki tidak konsisten.** *(Selesai)* Komoditas, Reksa Dana, dan Berita Pasar kini menjadi tab terintegrasi langsung di dalam layar Pasar (`view-market`). Akses deep-link otomatis mengarahkan ke tab terkait tanpa kebingungan.
- [x] **Portofolio ada di dua tempat.** *(Selesai)* Portofolio dipusatkan sebagai menu utama navigasi; di dalam halaman pasar difokuskan pada instrumen trading dan tautan cepat ke ringkasan kepemilikan.
- [x] **Berita punya halaman sendiri.** *(Selesai)* Berita Pasar dijadikan tab resmi di layar Pasar (`data-tab="news"`). Slot bottom nav mobile yang sebelumnya diisi Berita digantikan dengan **Bank** (membuka modal/sheet pilihan Deposito, Pinjaman, dan Transfer).
- [x] **Judul menu tidak seragam.** *(Selesai)* Diseragamkan di sidebar desktop maupun mobile: "Panduan", "Deposito", "Pinjaman", "Pengaturan".
- [x] **Pengaturan punya 2 pintu masuk.** *(Selesai)* Akses diselaraskan dan disederhanakan; tombol di topbar dan sidebar membuka panel pengaturan yang sama.
- [x] **Label "tag" di menu mobile bernada teknis.** *(Selesai)* Diganti dengan bahasa manfaat langsung bagi pemain: "Lihat semua transaksi" (Riwayat), "Kirim uang ke teman" (Transfer), "Simpan uang, dapat bunga" (Deposito), "Cuan otomatis tanpa trading" (Pendapatan Pasif), "Donasi untuk bonus keberuntungan" (Donasi).
- [x] **Tidak ada sistem breadcrumb atau tombol kembali yang konsisten.** *(Selesai)* Dynamic view panel dilengkapi tombol kembali terstandar dengan ukuran sentuh nyaman (`40px`).

### B. Onboarding dan alur pemain baru
- [x] **Pemain baru langsung melihat dashboard dengan banyak widget.** *(Selesai)* Ditambahkan kartu onboarding pemula 3 langkah interaktif "Mulai di Sini" di Beranda: (1) Profil risiko terverifikasi, (2) Modal awal simulasi aktif, (3) Beli aset pertama di pasar. Kartu ini dinamis membaca progres pemain dan bisa ditutup/dibuka kembali dari Panduan.
- [x] **Panduan tersembunyi.** *(Selesai)* Ditambahkan tombol bantuan cepat `?` di Topbar (`#btn-quick-guide`) yang langsung memunculkan modal panduan komprehensif, daftar glosarium istilah, dan opsi membuka kembali langkah awal investor.
- [x] **Istilah finansial tanpa penjelasan.** *(Selesai)* Dibuat modul terpusat `glossary.js` berisi kamus istilah finansial (APY, NAV, Launchpool, Staking, Lot, Volatilitas, YTD, Fear & Greed). Seluruh istilah di UI dilengkapi ikon info interaktif yang menampilkan popover penjelasan saat diketuk/diklik (responsif di mobile & desktop).
- [x] **Nama dan cerita produk berbeda-beda.** *(Selesai)* Disatukan identitas produk sebagai simulator & terminal investasi `AuraAssets`, update `package.json`, README, dan narasi landing onboarding.

### C. Susunan layar dan kerapihan visual
- [x] **Beranda ramai tanpa jalur baca.** *(Selesai)* Ditambahkan label zona visual pembacaan (`Pasar & Sentimen`, `Kilas Berita Pasar`, `Arus Kas & Karier`, `Milestone & Aktivitas`). Kartu saldo net worth dijadikan jangkar visual utama dengan tombol aksi "Beli Aset ↗" dan "Laporan Keuangan", serta tiap kartu memiliki status angka hidup dan navigasi langsung ke fiturnya.
- [x] **Hierarki visual lemah.** *(Selesai)* Diterapkan skala tipografi 3 tingkat (angka utama tebal, judul seksi terstruktur, keterangan teks muted) dan padding konsisten.
- [x] **Filter dan sort Pasar berlapis.** *(Selesai)* Kontrol pasar diringkas menjadi 1 baris bersih: kolom pencarian, tombol toggle drawer "Filter" dengan badge indikator jumlah filter aktif, dan satu dropdown "Urutkan". Dilengkapi barisan chip filter aktif yang dapat dihapus per item atau direset sekaligus.
- [x] **Ukuran kontrol tidak seragam.** *(Selesai)* Tombol timeframe grafik ditingkatkan menjadi minimal $\ge 36\text{--}40\text{ px}$ (`.btn-chart-timeframe`), seluruh kontrol sentuh memenuhi pedoman mobile.
- [x] **Gaya tombol dan chip berbeda-beda.** *(Selesai)* Dibuat sistem class terstandar di `components.css`: `.btn-chart-timeframe`, `.btn-market-filter`, `.market-sort-select`, `.chip-item`, `.btn-hero-buy`, dll.
- [x] **Lebar halaman tidak seragam.** *(Selesai)* Seluruh view panel (`#view-market`, `#view-passive`, `#view-news`, `#view-history`, `#view-settings`, `#view-dynamic`) diseragamkan ke lebar maksimum `1200px` dengan margin otomatis agar transisi halaman tidak melompat.
- [x] **Emoji sebagai ikon di judul.** *(Selesai)* Emoji yang rentan rusak/berbeda antar-OS digantikan dengan ikon SVG modern yang konsisten dan tajam.
- [x] **Judul bagian tidak seragam.** *(Selesai)* Diselaraskan format bahasa dan penamaan seksi di dashboard dan seluruh layar view.
- [x] **Kontrol waktu disembunyikan.** *(Selesai)* Sisa kode mati `#topbar-speed-controller` dan `#days-to-payday` dibersihkan dari markup HTML.

### D. Umpan balik dan keadaan sistem
- [x] **Empty, loading, dan error state.** *(Selesai)* Empty state portofolio dan pasar dilengkapi teks penjelasan ramah dan tombol aksi langsung ("Jelajahi Pasar Saham →").
- [x] **Konfirmasi aksi finansial.** *(Selesai)* Panel order saham dan kripto memverifikasi ketersediaan dana dan kelipatan lot sebelum dieksekusi.
- [x] **Hasil aksi (toast, notifikasi).** *(Selesai)* Notifikasi toast eksekusi pembelian/penjualan kini menyebutkan detail dampak finansial secara transparan: jumlah lot/unit, harga eksekusi, total transaksi, dan sisa saldo tunai yang tersedia.
- [x] **Pusat Notifikasi.** *(Selesai)* Indikator status koneksi terpadu (Mode Lokal / Cloud) disematkan di topbar dan badge notifikasi disinkronkan.

### E. Pengalaman jangka panjang (game idle)
- [x] **Tujuan jangka pendek dan panjang kurang jelas.** *(Selesai)* Kartu onboarding 3 langkah di beranda memberikan tujuan awal yang konkret bagi pemula, disusul sistem milestone bertahap.
- [x] **Banyak sistem pasif tanpa ringkasan satu layar.** *(Selesai)* Zona Arus Kas & Karier di beranda merangkum estimasi pemasukan pasif dan gaji dengan angka hidup.
- [x] **Fitur "Donasi" dan "Transfer Dana".** *(Selesai)* Dipindahkan ke sub-menu Bank & Finansial serta Akun & Sistem, tidak lagi menumpuk setara dengan pasar utama.
- [x] **Ringkasan "Selama Kamu Pergi" (Welcome Back AFK).** *(Selesai)* Ditambahkan modal selamat datang kembali saat pemain kembali setelah absen $\ge 5$ menit, merangkum waktu absen, total kekayaan, saldo likuid, aset aktif, dan siklus ekonomi pasar saat ini.

## Prioritas UX
1. Kelompokkan ulang navigasi dan hilangkan duplikasi (Portofolio, Komoditas, Berita).
2. Perjelas beranda tanpa mengurangi isinya: zona, jangkar visual, dan tiap kartu punya tujuan, angka hidup, serta pintu. Tambahkan kartu "Mulai di sini" untuk pemain baru.
3. Buat satu set komponen: tombol, tab/chip, kartu, judul bagian. Ganti inline style.
4. Sembunyikan filter lanjutan Pasar di panel yang bisa dibuka.
5. Tambahkan penjelasan istilah (ketuk untuk info) dan tombol bantuan di tiap halaman.
6. Samakan lebar konten, penamaan menu, dan ikon (ganti emoji dengan SVG).
7. Tentukan satu janji produk (investasi, karier, atau tycoon), lalu atur fitur lain di sekitarnya.

> Catatan: keputusan seperti "jumlah menu" dan "kepadatan beranda" sebagian merupakan pilihan gaya. Beranda yang ramai dipertahankan secara sengaja; yang paling penting adalah konsistensi dan kemudahan menemukan fitur, bukan jumlah fiturnya.

> **Konteks uji (dari pemilik):** saat ini produk baru ditunjukkan ke sesama programmer. Pemain non-trader yang mencoba hanya scroll di beranda dan tidak membuka tab. Sasaran akhirnya adalah pemain yang paham trading, dan syaratnya UI jelas dan UX nyaman. Uji berikutnya sebaiknya juga mencakup 2–3 orang yang paham trading, bukan hanya programmer.


---

# Saran Perbaikan UX

Saran ini menjawab temuan Audit Tahap 2. Semuanya usulan desain, belum diimplementasikan dan belum diuji dengan pemain. Urutannya dari dampak terbesar dengan usaha paling kecil.

## 1. Navigasi: kelompokkan dan hilangkan duplikasi

**Usulan struktur sidebar (13 item menjadi 4 grup, 9 menu utama):**

| Grup | Menu | Catatan |
|---|---|---|
| (utama) | Beranda | |
| **Investasi** | Pasar, Portofolio, Pendapatan Pasif | Komoditas, Reksadana, dan Berita menjadi tab di dalam **Pasar** |
| **Bank** | Deposito, Pinjaman, Transfer | Transfer boleh dipindah ke Akun jika jarang dipakai |
| **Akun** | Riwayat, Pengaturan, Bantuan | Donasi masuk ke grup ini atau ke halaman Pengaturan |

Aturan yang dipakai:
- **Satu fitur, satu rumah.** Portofolio hanya di menu utama; hapus tab Portofolio di Pasar atau jadikan tautan pintas ke menu itu.
- Komoditas dan Berita menjadi tab Pasar. Tab Pasar menjadi: Saham, Kripto, Komoditas, Reksadana, Berita.
- Beri judul grup kecil (uppercase, `--text-muted`) agar mata bisa memindai.
- Samakan nama di desktop dan mobile. Pilih satu: **Panduan**, **Deposito**, **Pengaturan**, **Pinjaman**.

**Usulan bottom nav mobile (4 + Lainnya):** Beranda, Pasar, Portofolio, Bank. Berita pindah ke tab di Pasar. "Bank" membuka sub-halaman berisi Deposito, Pinjaman, dan Transfer. Menu "Lainnya" berisi Pasif, Riwayat, Notifikasi, Donasi, Bantuan, Pengaturan.

**Deskripsi menu "Lainnya"** ganti dari jargon menjadi manfaat:

| Sekarang | Usulan |
|---|---|
| Audit Trail | Lihat semua transaksi |
| Filantropi | Donasi untuk dapat bonus keberuntungan |
| P2P Antar Player | Kirim uang ke pemain lain |
| Bunga Majemuk | Simpan uang, dapat bunga |
| Staking & Bot | Dapat untung tanpa trading manual |

## 2. Beranda: ramai sebagai "sampul gameplay" (direvisi)

> **Revisi:** versi awal bagian ini menyarankan melipat kartu dan membatasi jumlahnya. Itu dibatalkan. Beranda yang ramai adalah keputusan desain yang disengaja: ia memperlihatkan kedalaman game dan mekanik yang tidak sempat dijelaskan. Jumlah kartu dipertahankan; yang diperbaiki adalah agar tiap kartu benar-benar bekerja sebagai sampul.

**Konteks dari uji nyata:** teman yang non-trader hanya scroll di beranda dan tidak membuka tab atau halaman lain. Artinya **beranda adalah satu-satunya layar yang pasti dilihat**. Semua yang ingin dikomunikasikan harus sampai lewat kartu itu sendiri, tanpa perlu diketuk dulu.

### Prinsip: satu kartu = satu gameplay = satu pintu
Setiap kartu menjawab tiga hal dalam 2 detik:
1. **Apa ini?** Judul dan satu kalimat tujuan dalam bahasa awam (bukan jargon trading).
2. **Keadaannya sekarang?** Satu angka atau status yang hidup.
3. **Ke mana?** Seluruh kartu bisa diketuk dan ada tanda jelas (panah "›" atau tombol kecil).

Contoh:

| Kartu | Kalimat tujuan | Angka hidup | Pintu |
|---|---|---|---|
| Staking & Bot | Uangmu bekerja tanpa trading manual | +\$X hari ini | Pendapatan Pasif |
| Deposito | Simpan uang, dapat bunga | Bunga bulan ini | Deposito |
| Top Movers | Aset yang paling bergerak hari ini | 3 aset teratas | Pasar |
| Karier | Naik jabatan untuk gaji lebih besar | Level dan XP | Karier |
| Milestone | Capai target, dapat hadiah tunai | 72% menuju berikutnya | Milestone |

### Struktur tanpa mengurangi isi
1. **Zona dengan judul kecil:** Kekayaan, Pasar, Pendapatan, Karier & Tujuan. Kartu sama, tapi mata punya jalur baca saat scroll.
2. **Satu jangkar visual:** kartu saldo/net worth paling besar dan paling terang, dengan tombol aksi **Beli Aset** dan **Top Up**. Sisanya setara tapi lebih kecil.
3. **Badge "siap":** titik atau label kecil pada kartu yang punya sesuatu untuk dilakukan (milestone siap diklaim, bot selesai, bunga masuk).
4. **Kartu terkunci menjadi teaser:** fitur yang belum terbuka tampil redup dengan syarat pembukaannya.
5. **Kartu "Langkah berikutnya"** tetap ada, sebagai salah satu kartu (bukan pengganti keramaian). Isi menyesuaikan progres, misalnya "Beli aset pertamamu".
6. **Mobile:** semua kartu tetap ada. Pakai pola `mobile.md`: carousel untuk kartu kecil dan tab footer untuk kartu sekunder.

### Karena pengguna hanya scroll
- Tampilkan **isi, bukan sekadar judul**: pratinjau (mini-chart, 2–3 baris data, angka progres) agar kartu menarik tanpa diketuk.
- Beri **bahasa awam** pada kalimat tujuan; istilah teknis (NAV, APY) cukup di dalam halaman tujuan atau lewat popover info.
- Letakkan kartu yang paling mudah dipahami orang awam (saldo, milestone, karier, berita) di bagian atas, dan kartu yang butuh pengetahuan trading di bawahnya. Pemain yang hanya scroll jadi sempat melihat sisi game yang ramah pemula dulu.
- Untuk calon pengguna non-trader, pertimbangkan **mode "Santai"** yang menyembunyikan kartu trading mentah dan hanya menampilkan hasilnya.

## 3. Onboarding pemain baru

Alur 3 langkah, tampil sebagai kartu "Mulai di sini" di beranda sampai selesai, lalu hilang dan bisa dibuka lagi dari Bantuan:

1. **Pilih profil risiko** (sudah ada kuisioner).
2. **Isi modal awal** (jelaskan: ini uang simulasi).
3. **Beli aset pertama** dengan tur singkat yang menyorot tombol Beli di Pasar.

Tambahan:
- Tampilkan progress (1/3, 2/3, 3/3) dan tombol "Lewati".
- Pada pembelian pertama, tampilkan ringkasan sederhana: "Kamu membeli 2 saham AAPL seharga \$X. Jika harga naik 10%, untungmu \$Y."
- Ganti menu "Panduan" menjadi **tombol bantuan "?" di topbar** yang membuka panduan sesuai halaman yang sedang dibuka.

## 4. Penjelasan istilah

- Tambahkan ikon info kecil di samping istilah (NAV/NAB, APY, Launchpool, Launchpad, Volatilitas, YTD, Fear & Greed).
- **Ketuk** membuka popover 1–2 kalimat (jangan hover/`title` saja, supaya jalan di mobile).
- Simpan semua definisi di satu file (`glossary.js`) agar mudah dirawat dan konsisten.
- Contoh: "APY: persentase keuntungan per tahun jika hasilnya terus diinvestasikan ulang."

## 5. Halaman Pasar: kurangi kontrol di atas daftar

Susunan baru, dari atas:
1. Tab jenis aset (Saham, Kripto, Komoditas, Reksadana, Berita).
2. Baris tunggal: **kolom pencarian**, tombol **Filter** (dengan angka filter aktif, misalnya "Filter · 2"), dan dropdown **Urutkan**.
3. Chip filter aktif di bawahnya, tiap chip bisa dihapus dengan satu ketukan. Tombol "Reset" cukup satu.
4. Daftar.

Filter sektor, risiko, dan tren masuk ke panel **Filter** (dropdown di desktop, bottom sheet di mobile). Enam tombol sort menjadi satu dropdown "Urutkan". Pada mobile, ketuk baris membuka detail (sesuai `mobile.md`).

## 6. Sistem komponen yang seragam

Definisikan satu set class di CSS, lalu ganti inline style bertahap (mulai dari halaman yang paling sering dibuka):

| Komponen | Class | Aturan |
|---|---|---|
| Tombol | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger` | Tinggi minimal 40 px (mobile), 36 px (desktop) |
| Tab/segmen | `.tabs`, `.tab` (aktif: `.is-active`) | Menggantikan `.tab-btn`, `.btn-sort`, `.movers-tab-btn`, `.footer-tab-btn`, `.btn-timeframe` |
| Chip | `.chip` | Dipakai untuk filter aktif dan sektor |
| Kartu | `.card`, `.card-title`, `.card-sub` | Satu radius, satu padding |
| Judul bagian | `.section-title` | Ikon SVG, bukan emoji |

Tipografi tiga tingkat: **angka utama** (besar, `800`), **judul** (sedang, `700`), **keterangan** (kecil, `500`, `--text-muted`). Jangan pakai ukuran di luar skala ini.

Satu lebar konten maksimum (misalnya `1200px`) untuk semua halaman, dengan padding yang sama.

## 7. Umpan balik dan kepercayaan

- **Dialog konfirmasi aksi finansial** (beli, jual, pinjam, transfer, stop bot) berisi: aset, jumlah, harga, biaya, **saldo setelah transaksi**, dan tombol Batal yang setara besar dengan tombol Konfirmasi.
- **Toast bermakna:** "Membeli 2 BTC @ \$60.000. Sisa saldo \$X", bukan "Berhasil". Beri tombol **Urungkan** jika memungkinkan (misalnya 5 detik), atau tautan ke Riwayat.
- **Tiga keadaan untuk setiap daftar/chart:**
  - Loading: skeleton, bukan layar kosong.
  - Kosong: teks singkat dan satu tombol aksi ("Belum punya aset. Jelajahi Pasar").
  - Error: pesan jelas dan tombol "Coba lagi".
- **Status koneksi:** indikator kecil (Online/Offline/Mode lokal) di topbar, karena app punya mode server dan mode lokal.
- **Notifikasi:** satu sumber data, badge sinkron di topbar dan menu mobile, kelompokkan per hari.

## 8. Motivasi dan tujuan jangka panjang (game idle)

- Satu **"Tujuan berikutnya"** menonjol di beranda (lihat butir 2), berbasis milestone yang sudah ada.
- Kartu **ringkasan pasif** satu angka di beranda.
- Saat pemain kembali setelah lama pergi, tampilkan **ringkasan "Selama kamu pergi"**: perubahan net worth, bunga/staking yang masuk, event penting. Ini memberi alasan untuk membuka app lagi.
- Rayakan pencapaian dengan animasi singkat (hormati `prefers-reduced-motion`).

## 9. Kejelasan identitas produk

Tulis satu kalimat janji produk dan pakai di layar login, README, dan `package.json`, misalnya: *"Belajar dan bermain investasi dengan uang simulasi, dari modal pertama sampai portofolio besar."* Fitur yang tidak mendukung kalimat itu (misalnya sisa elemen "tycoon" atau bisnis) disembunyikan atau dipisahkan sebagai mode lanjutan. Ganti `business-tycoon` di `package.json` bila produknya memang AuraAssets.

## 10. Aksesibilitas ringan

- Semua tombol ikon punya `aria-label` dan semua kontrol punya state fokus yang jelas (`:focus-visible`).
- Warna naik/turun selalu disertai ▲/▼ atau +/−.
- Teks informasi penting tidak memakai `--text-dim`.
- Area sentuh minimal 40 px, termasuk tombol timeframe (sekarang sekitar 20 px).

## Urutan pengerjaan yang disarankan

| Langkah | Pekerjaan | Usaha | Dampak |
|---|---|---|---|
| 1 | Samakan nama menu, ganti deskripsi jargon, perbaiki ukuran tombol kecil | Kecil | Sedang |
| 2 | Kelompokkan sidebar dan hapus duplikasi (Portofolio, Komoditas, Berita jadi tab) | Sedang | Tinggi |
| 3 | Panel Filter + dropdown Urutkan di Pasar | Sedang | Tinggi |
| 4 | Zona + jangkar visual di beranda, kalimat tujuan dan pratinjau di tiap kartu, kartu "Langkah berikutnya" | Sedang | Tinggi |
| 5 | Onboarding 3 langkah + tombol bantuan "?" | Sedang | Tinggi |
| 6 | Popover istilah (`glossary.js`) | Kecil | Sedang |
| 7 | Dialog konfirmasi dan toast bermakna, state loading/kosong/error | Sedang | Tinggi |
| 8 | Komponen seragam, migrasi inline style bertahap | Besar | Tinggi (jangka panjang) |
| 9 | Ringkasan "Selama kamu pergi" | Kecil | Sedang |

> Saran: kerjakan langkah 1–3 dulu, karena murah dan langsung terasa. Sebelum langkah 4–5, jalankan aplikasi dan minta 2–3 orang mencoba tanpa penjelasan. Dari situ kelihatan mana saran di atas yang benar-benar dibutuhkan.
