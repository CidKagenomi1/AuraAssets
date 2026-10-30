# AuraAssets — Panduan & Prompt Desain UI Mobile

Dokumen ini adalah **sumber kebenaran** untuk membuat atau memperbarui UI perangkat mobile AuraAssets. Semua aturan diturunkan dari program yang sudah stabil (desktop + `mobile.css` + `MobileNav.js`). Baca bagian **Aturan** sebelum mengubah apa pun, lalu gunakan bagian **Prompt** untuk meminta AI mengerjakannya.

---

## 1. Konteks Proyek (Fakta Stabil)

| Aspek | Nilai |
|---|---|
| Jenis | SPA client-side, Vanilla JS (ES Module) + Vanilla CSS, bundler Vite 5 |
| Tema | Dark, glassmorphism, aksen emerald |
| Bahasa UI | **Bahasa Indonesia** (`<html lang="id">`) |
| Font | `Inter` (400–800) lewat `var(--font-family)` |
| Chart | Plotly.js (trading/sparkline), Chart.js |
| Real-time | `socket.io-client`, Supabase (`MarketClient.js`) |
| Shell | `.app-shell` → `.app-sidebar` (desktop) + `.app-main` (`.app-topbar` + `.view-container`) + `<nav class="app-bottom-nav">` |
| Modal | `#modal-container` / `#modal-content` |
| View | `#view-home`, `#view-market`, `#view-news`, portfolio, loan, savings, history, transfer, donate, guide, settings |
| Navigasi | Tombol `.nav-btn[data-view="..."]`, dirender ulang oleh `updateMobileBottomNav()` |

### File yang boleh disentuh untuk mobile

| File | Peran |
|---|---|
| [mobile.css](src/styles/mobile.css) | **Tempat utama** override mobile (media query). |
| [MobileNav.js](src/js/ui/views/MobileNav.js) | Bottom nav + modal menu "Lainnya". |
| [main.css](src/styles/main.css) | Token desain (`:root`) + layout dasar. Jangan ubah token tanpa alasan kuat. |
| [trading.css](src/styles/trading.css) | Terminal trading (sudah punya breakpoint sendiri). |
| [compact.css](src/styles/compact.css) | Mode padat. |
| [index.html](index.html) | Struktur shell. Urutan CSS: `main → components → trading → compact → mobile` (mobile terakhir, menang). |

---

## 2. Design Tokens (WAJIB dipakai, jangan hard-code)

Semua dari `:root` di `main.css`.

```css
/* Surface */
--bg-root: #09090b;  --bg-surface: #18181b;  --bg-surface-hover: #27272a;
--bg-surface-elevated: rgba(24,24,27,.85);
--border-color: rgba(255,255,255,.16);  --border-hover: rgba(255,255,255,.3);

/* Aksen (+ varian -soft untuk latar badge/chip) */
--accent-primary:#10b981 (emerald, profit/CTA)   --accent-secondary:#6366f1 (indigo)
--accent-warning:#f59e0b (amber)   --accent-danger:#ef4444 (rose, loss)   --accent-info:#0ea5e9 (sky)

/* Teks */
--text-main:#f4f4f5  --text-muted:#a1a1aa  --text-dim:#52525b

/* Bentuk & efek */
--radius-sm:6px  --radius-md:10px  --radius-lg:16px  --radius-xl:24px  --radius-full:9999px
--shadow-sm/md/lg/glow   --transition: 200ms cubic-bezier(.4,0,.2,1)

/* Layer */
--z-sticky:100  --z-overlay:500  --z-modal:10000  --z-toast:15000
```

**Semantik warna (konsisten dengan desktop):**
- Naik / profit / aksi utama → `--accent-primary` (kelas `.text-positive`).
- Turun / rugi / destruktif → `--accent-danger`.
- Peringatan / pending → `--accent-warning`. Info / netral-biru → `--accent-info`.
- Latar kartu: gradasi halus `rgba(...)` + border `1px solid var(--border-color)`, radius `--radius-lg`.
- Label kecil: uppercase, `letter-spacing: .05em`, `font-weight: 700`, warna `--text-muted`.
- Angka uang: `font-weight: 800`, format dolar `$` (angka dirender oleh JS, jangan ubah format).

---

## 3. Breakpoint (ikuti yang sudah ada)

| Lebar | Perilaku |
|---|---|
| `≤ 1200px` / `≤ 1024px` | Laptop kecil / tablet landscape: kurangi kolom. |
| `≤ 992px` | **Sidebar hilang, bottom nav tampil**, `.app-main` diberi `padding-bottom: calc(70px + env(safe-area-inset-bottom))`. |
| `≤ 768px` | **Mode mobile utama**: font dasar `13px`, grid kolaps, modal jadi bottom sheet, topbar `56px`. |
| `≤ 600px` / `≤ 540px` / `≤ 480px` | Ponsel: grid 2-kolom → 1 kolom, kartu lebih rapat. |
| `≤ 360px` | Ponsel sangat kecil: pastikan tidak overflow. |

Pendekatan: **desktop-first dengan `max-width`** (bukan mobile-first). Jangan campur dengan `min-width` kecuali menyangkut elemen baru yang berdiri sendiri.

Target uji wajib: **360×640, 375×667, 390×844, 412×915, 768×1024**.

---

## 4. Aturan Wajib (MUST)

### 4.1 Layout & Overflow
1. **Tidak boleh ada scroll horizontal pada halaman.** `body, html { overflow-x: hidden }` sudah ada; jangan bergantung padanya untuk menutupi bug — perbaiki sumbernya (`min-width: 0`, `max-width: 100%`, `box-sizing: border-box`).
2. Satu kolom utama. Grid `1fr 1fr`, `2fr 1fr`, `minmax(≥400px)` **wajib** kolaps ke `1fr` di ≤768px (sudah ditangani oleh selector atribut `[style*="grid-template-columns..."]`; komponen baru sebaiknya memakai class, bukan inline style).
3. Baris kartu KPI/statistik kecil → **carousel horizontal** (`display:flex; overflow-x:auto; scroll-snap-type:x mandatory; flex:0 0 ~78%`), bukan tumpukan vertikal yang sangat panjang. Sembunyikan scrollbar (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`).
4. Tabel → `display:block; overflow-x:auto; -webkit-overflow-scrolling:touch`, font `.78rem`, `th/td` padding `.4rem .5rem`, `white-space:nowrap`. Alternatif lebih baik untuk data penting: ubah baris menjadi **kartu** (simbol + harga + % perubahan).
5. Sidebar sub-navigasi (mis. `.dashboard-sidebar`) → **strip tab horizontal** yang bisa digeser (`flex-direction:row; overflow-x:auto; flex-shrink:0` pada item).
6. Tab pill panjang (`.tab-group`, `.biz-tab-group`) → strip scroll horizontal, **bukan** di-wrap bertumpuk; item `flex-shrink:0`.
7. Header halaman yang berisi judul + tab: `position: sticky; top: 0; z-index: 10`.

### 4.2 Touch & Interaksi
8. Target sentuh **minimal 40×40px** (`input, select, textarea, button { min-height: 40px }`); tombol ikon topbar `36–40px`.
9. Tidak ada interaksi yang hanya bisa lewat **hover**. Sediakan state `:active` dan jangan sembunyikan aksi di balik tooltip (`title`).
10. Pertahankan `-webkit-tap-highlight-color: transparent` dan `touch-action: manipulation` pada elemen interaktif baru (tambahkan selector-nya ke blok "TOUCH HIGHLIGHT REMOVAL").
11. Ukuran font input ≥ `14px` (`.875rem`) agar iOS tidak auto-zoom saat fokus.
12. Slider `input[type=range]` harus punya thumb besar & mudah digeser.
13. Container scroll internal pakai `-webkit-overflow-scrolling: touch`. Hindari scroll bersarang vertikal di dalam vertikal; jika tak terhindarkan beri `max-height` jelas (mis. `68vh`).

### 4.3 Navigasi
14. Di ≤992px navigasi utama = **bottom nav** (`.app-bottom-nav`), dirender dari `MobileNav.js`:
    - Item utama maksimal **4 + "Lainnya"**: `home`, `market`, `portfolio`, `news`. Item yang ada di `role.hiddenNav` disembunyikan (kecuali `home`).
    - Hanya ikon (tanpa label) di bar; item aktif = **lingkaran emerald** 42px, `translateY(-4px)`, ikon hitam, bayangan emerald.
    - Tinggi bar `52px`, latar `rgba(24,24,27,.95)`.
    - Menu "Lainnya" menjadi highlight bila view aktif **bukan** salah satu item utama.
15. Fitur sekunder (loan, savings, history, transfer, donate, guide, settings) masuk ke **modal "Lainnya"** (`showMobileMenu`) berupa kartu dengan `label`, `tag`, `desc`, warna `bg/color/borderColor` per grup. Tambahan view baru → daftarkan di `navItems` pada `showMobileMenu`, jangan membuat bar kedua.
16. Hormati `data-feature` (fitur terkunci per role) dan `roleManager.getRoleData()`; mobile tidak boleh membuka fitur yang disembunyikan desktop.
17. Pindah view lewat callback `onViewSwitch(view)` — **jangan** memanggil DOM `display` manual.

### 4.4 Safe Area & Ruang Layar
18. Konten tidak boleh tertutup bottom nav: `.app-main` memakai `padding-bottom: calc(70px + env(safe-area-inset-bottom))`. Elemen `fixed/sticky` bawah baru wajib menambah `env(safe-area-inset-bottom)`.
19. Pengecualian: terminal trading menghilangkan celah 70px saat terbuka (lihat komentar di `trading.css`). Jangan hapus perilaku ini.
20. Gunakan `100dvh` (fallback `100vh`) untuk elemen setinggi layar, karena address bar mobile berubah.
21. Topbar: ≤768px tinggi `56px`, padding `0 .75rem`; ≤480px boleh `height:auto` + wrap. Hanya ikon pertama & terakhir di `.topbar-right` yang ditampilkan di mobile; sisanya `display:none`. Sembunyikan info sekunder (tanggal panjang, kontrol kecepatan) bila sempit.

### 4.5 Modal, Toast, Overlay
22. Modal = **bottom sheet**: `align-items:flex-end`, `max-width:100%`, `max-height:92vh`, radius atas `--radius-lg`, konten scroll internal, padding `.5rem` pada container.
23. Toast: full-width (`left/right: .75rem`), posisi `bottom: 5rem` (di atas bottom nav), `z-index: var(--z-toast)`.
24. Gunakan variabel `--z-*`; jangan membuat z-index acak. Bottom nav & modal tidak boleh saling menutupi secara salah.

### 4.6 Tipografi & Kerapatan
25. Basis `13px` di ≤768px. Judul bagian `.section-title` ≈ `.95–1.05rem`; label `.62–.75rem`; angka hero maksimal ≈ `2rem` di ponsel (desktop `3rem` → turunkan).
26. Teks panjang: `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` + `min-width:0` pada flex child (contoh: ticker berita di widget Market Pulse).
27. Padding kartu mobile `.75–1rem`, gap `.5–.85rem`.

### 4.7 Chart & Data Real-time
28. Chart harus responsif: Plotly `{responsive:true}` dan `Plotly.Plots.resize()` saat `resize`/`orientationchange`. Tinggi tetap & wajar (sparkline ≈ `115px`; terminal `≥ 260px`).
29. Matikan/ringankan fitur berat di mobile: rentang x lebih sedikit, tanpa hover-tooltip, legenda dipindah ke bawah/disembunyikan, `displayModeBar:false`.
30. Jangan mem-bypass `MarketClient.js`/socket; UI mobile hanya konsumen data yang sama. Render ulang lewat pola yang ada (injeksi dari `HomeScreen.js`, `ViewManager.js`), hindari `innerHTML` penuh pada frekuensi tinggi tanpa throttle.
31. Daftar panjang (100 saham / 90 kripto): gunakan baris ringkas (`MarketRows.js`) + filter/search yang sudah ada; di mobile ubah kontrol filter jadi **satu baris scroll horizontal** (chip sektor `.market-sector-pills`) dan `select` full-width.

### 4.8 Kinerja & Aksesibilitas
32. Kurangi `backdrop-filter`/blur dan bayangan besar pada elemen yang banyak/di-scroll. Animasi hanya `transform`/`opacity`; hormati `prefers-reduced-motion`.
33. Kontras teks ≥ 4.5:1 pada latar gelap (`--text-dim` hanya untuk dekorasi, bukan informasi penting).
34. Tombol hanya-ikon wajib punya `title`/`aria-label`.
35. Jangan hanya mengandalkan warna merah/hijau — sertakan tanda `▲/▼` atau `+/−`.

---

## 5. Larangan (MUST NOT)

- ❌ Mengubah logika bisnis, perhitungan ekonomi, `GameState`, `market-server/`, atau skema DB demi UI.
- ❌ Menghapus/mengubah desain desktop (>992px). Semua perubahan **dibungkus media query** `max-width`.
- ❌ Menambah framework/library UI (React, Tailwind, Bootstrap, dst.). Tetap Vanilla JS + CSS.
- ❌ Mengganti token warna/font/radius, atau menaruh warna hex baru bila token tersedia.
- ❌ Memakai emoji sebagai ikon fungsional baru (ikon = SVG inline bergaya sama: `stroke="currentColor"`, `stroke-width="2"`, `round` caps; atau `Icons.js`).
- ❌ `!important` berlebihan pada komponen **baru** (file lama memang memakainya untuk menimpa inline style; komponen baru pakai class yang spesifik).
- ❌ Inline style baru untuk layout responsif — pakai class di CSS agar bisa dioverride.
- ❌ Membuat file CSS baru tanpa perlu; tambahkan ke `mobile.css` dengan header seksi bergaya `/* ── NAMA SEKSI ── */`.
- ❌ Menghapus komentar/dokumentasi yang sudah ada.
- ❌ Hardcode teks Inggris; semua copy UI **Bahasa Indonesia** (istilah pasar seperti *Gainers, Losers, Signal, Portfolio* tetap sesuai kebiasaan app).

---

## 6. Pola Komponen Mobile Standar

**Kartu hero saldo** — `padding:1rem`, angka `2rem`, tombol "Laporan Keuangan" tetap di pojok kanan atas (kecil), sparkline lebar penuh (`margin: 0 -1rem`), pilihan timeframe `1D 1W 1M YTD 1Y` di tengah.

**Widget Home** — urutan vertikal: Saldo → Fear & Greed → Top Movers (tab Gainers/Losers `flex:1`) → Kilas Berita → Cashflow → Karier → Milestone/Transaksi (pakai `.mobile-footer-tabs` untuk berpindah, bukan dua kolom).

**Pasar** — tab (Stocks/Crypto/Reksa Dana/Pasif/Portfolio) sebagai strip scroll; search full-width di atas; filter tren & risiko berdampingan 50/50 atau satu baris scroll; sort sebagai chip scroll; hasil sebagai daftar kartu ringkas; ketuk baris → buka detail/terminal.

**Terminal trading** — chart di atas, panel order di bawah (1 kolom), tombol Beli/Jual lebar penuh & sticky di dasar (di atas safe area), input jumlah dengan tombol cepat `25% 50% 75% 100%`.

**Modal/form** — bottom sheet, judul + tombol tutup (≥40px) di header sticky, tombol aksi utama lebar penuh di bawah.

**Daftar transaksi/riwayat** — baris 2 tingkat: kiri (nama + waktu), kanan (nominal berwarna + status).

**Empty/loading state** — teks muted ringkas + ikon SVG; loading memakai `.loading-bar` / skeleton, bukan spinner kosong.

---

## 7. Alur Kerja yang Wajib Diikuti AI

1. **Baca dulu**: `mobile.css`, `MobileNav.js`, bagian `:root` `main.css`, dan file view/panel yang akan diubah.
2. **Cari sumber masalah** (inline style? grid? lebar tetap?) sebelum menimpa dengan `!important`.
3. **Ubah minimal**: tambah/ubah aturan di seksi yang sesuai pada `mobile.css`; hanya sentuh JS bila struktur DOM memang harus berbeda.
4. **Pastikan desktop tidak berubah** (semua di dalam `@media (max-width: …)`).
5. **Verifikasi**: `npm run dev`, DevTools mode device pada ukuran target (§3), cek tidak ada scroll horizontal, bottom nav tidak menutupi konten, modal bisa discroll, chart ter-resize, fitur role-locked tetap tersembunyi. Jalankan `npm run build` tanpa error.
6. **Laporkan**: daftar file + seksi yang diubah, ukuran layar yang diuji, dan hal yang belum bisa diuji.

### Checklist Review (centang sebelum selesai)

- [ ] Tanpa scroll horizontal di 360px
- [ ] Semua tombol/input ≥ 40px, tanpa hover-only
- [ ] Hanya token desain yang dipakai
- [ ] Bottom nav ≤ 4 item + Lainnya; item baru masuk modal Lainnya
- [ ] Konten tidak tertutup bottom nav / notch (`safe-area`)
- [ ] Modal = bottom sheet, `max-height:92vh`, scroll internal
- [ ] Chart responsif & ter-resize saat rotasi
- [ ] Desktop tidak berubah (`>992px`)
- [ ] Copy Bahasa Indonesia, ikon SVG, kontras cukup
- [ ] `npm run build` sukses

---

## 8. Prompt Siap Pakai

> Ganti bagian dalam `[...]`. Selalu sertakan **Prompt Dasar** sebagai pembuka.

### 8.1 Prompt Dasar (selalu dipakai di awal)

```text
Kamu adalah front-end engineer senior untuk proyek AuraAssets (Vanilla JS ES Module + Vanilla CSS + Vite, tema dark glassmorphism, bahasa UI Indonesia).
Baca dan patuhi sepenuhnya file mobile.md di root proyek (token desain, breakpoint, aturan MUST/MUST NOT, pola komponen, checklist).
Batasan keras:
- Jangan ubah logika bisnis, GameState, market-server, atau tampilan desktop (>992px). Semua perubahan UI mobile dibungkus media query max-width.
- Hanya pakai CSS variable dari :root (main.css). Tanpa framework baru. Ikon pakai SVG inline.
- Tambahkan CSS ke src/styles/mobile.css di seksi yang sesuai (header "/* ── NAMA ── */"); ubah JS (mis. MobileNav.js) hanya bila perlu.
- Pertahankan semua komentar yang sudah ada.
Setelah selesai: jalankan npm run build, ringkas file yang diubah, dan sebutkan ukuran layar yang diuji (360, 375, 390, 412, 768).
```

### 8.2 Audit & Perbaikan Halaman yang Ada

```text
[Prompt Dasar]

Tugas: audit dan perbaiki tampilan mobile untuk halaman/view [NAMA VIEW, mis. "Pasar (#view-market)"].
Langkah:
1. Baca index.html bagian view tsb, file JS yang me-render-nya ([path file]), dan aturan terkait di mobile.css.
2. Daftar masalah nyata (overflow, target sentuh <40px, grid tidak kolaps, teks terpotong, tertutup bottom nav, kontras).
3. Perbaiki satu per satu dengan perubahan minimal sesuai mobile.md §4 dan pola §6.
4. Tampilkan tabel "masalah → perbaikan → file:baris".
```

### 8.3 Membuat Halaman / Panel Baru

```text
[Prompt Dasar]

Tugas: buat tampilan mobile untuk fitur baru "[NAMA FITUR]" yang menampilkan [DATA/AKSI UTAMA].
Spesifikasi:
- Daftarkan di modal "Lainnya" (showMobileMenu → navItems) dengan label, tag, desc, group, warna bg/color/borderColor dan ikon SVG; hormati data-feature & role.hiddenNav.
- Struktur: header sticky (judul + tab scroll), konten kartu 1 kolom, KPI sebagai carousel scroll-snap, aksi utama tombol lebar penuh.
- Gunakan class (bukan inline style) untuk layout; dukung loading, empty, dan error state.
- Semua teks Bahasa Indonesia.
Keluaran: markup/JS render, CSS di mobile.css, dan daftar skenario uji.
```

### 8.4 Bottom Navigation / Menu "Lainnya"

```text
[Prompt Dasar]

Tugas: ubah [bottom nav | modal Lainnya] di src/js/ui/views/MobileNav.js dan mobile.css.
Perubahan: [mis. tambah grup "Bisnis" di modal Lainnya, tambah badge notifikasi pada ikon].
Aturan: maksimal 4 item utama + "Lainnya"; item aktif = lingkaran emerald 42px; bar tinggi 52px + env(safe-area-inset-bottom); ikon-only dengan aria-label; jangan memanggil display manual — gunakan onViewSwitch.
```

### 8.5 Terminal Trading / Chart

```text
[Prompt Dasar]

Tugas: optimalkan terminal trading ([ChartEngine.js / OrderPanel.js / TradingSignalPanel.js]) untuk ponsel.
Syarat: chart di atas (responsive:true, resize saat orientationchange, modebar nonaktif), panel order 1 kolom, tombol Beli/Jual sticky di atas safe area, tombol persen cepat 25/50/75/100, daftar order ringkas. Pertahankan perilaku "tanpa celah 70px saat terminal terbuka" di trading.css. Jangan sentuh MarketClient/socket.
```

### 8.6 Tabel → Kartu

```text
[Prompt Dasar]

Tugas: di ≤768px ubah tabel [NAMA TABEL] menjadi daftar kartu 2 tingkat (kiri: nama+waktu, kanan: nominal berwarna + status). Pertahankan tabel di desktop. Implementasi cukup lewat CSS (display:block pada tr/td + data-label) bila memungkinkan; JS hanya jika wajib. Nominal naik/turun memakai --accent-primary/--accent-danger plus tanda ▲/▼.
```

### 8.7 QA Responsif Menyeluruh

```text
[Prompt Dasar]

Tugas: lakukan QA responsif seluruh aplikasi. Jalankan npm run dev, uji tiap view di 360×640, 375×667, 390×844, 412×915, 768×1024 (portrait & landscape).
Cek: scroll horizontal, tumpang tindih dengan topbar/bottom nav, modal & toast, chart resize, target sentuh, font input (tanpa auto-zoom iOS), safe area.
Keluaran: laporan per view (OK / masalah + bukti), lalu perbaiki semua masalah berprioritas tinggi sesuai mobile.md dan verifikasi ulang.
```

---

## 9. Catatan Utang Teknis (jangan diperparah)

- Banyak komponen lama memakai **inline style** + override `[style*="..."]` dan `!important` di `mobile.css`. Itu dibiarkan agar stabil; saat menyentuh komponen, **migrasikan secara bertahap** ke class tanpa mengubah tampilan desktop.
- `index.html` memuat Plotly dari CDN **dan** bundel npm — jangan menambah pemuatan ketiga.
- Elemen kontrol waktu (`.topbar-speed-controller`) disembunyikan; jangan ditampilkan ulang di mobile tanpa keputusan produk.

