# Rencana Implementasi: Pemisahan Sektor Bisnis Baru & Pemilihan Sub-Sektor (Updated)

Dokumen ini mendefinisikan rencana teknis untuk restrukturisasi sektor bisnis utama di dalam game **AuraAssets**. Rencana ini mencakup pemisahan beberapa sektor gabungan menjadi sektor-sektor mandiri, pemindahan gameplay otomotif ke sektor manufaktur umum dengan kategori pilihan baru, penambahan mekanisme pemilihan **Sub-Sektor** dinamis (untuk Manufaktur, Transportasi, dan FnB), serta penambahan *easter egg* khusus pada sub-sektor Katering.

---

## 1. Desain Struktur Sektor & Sub-Sektor Bisnis

Berikut adalah 12 sektor bisnis beserta sub-sektor yang dapat dipilih oleh pemain saat mendirikan perusahaan:

| Sektor Utama | Key | Sub-Sektor yang Dapat Dipilih | Deskripsi Gameplay Core |
| :--- | :--- | :--- | :--- |
| **Digital Technology** | `tech` | *Tidak ada* | R&D perangkat lunak, scaling traffic server global. |
| **Media** | `media` | *Tidak ada (Gabungan)* | Mengelola industri media (stasiun TV, portal online, medsos) secara terintegrasi; mengontrol rating, mutu konten, & density iklan. |
| **Jasa Keuangan** | `finance` | *Tidak ada* | Operasional perbankan & holding keuangan. |
| **Energi & Utilitas** | `energy` | *Tidak ada* | Eksplorasi tambang dan pembangkit energi. |
| **Maskapai Penerbangan**| `aerospace` | *Tidak ada* | Pembelian armada maskapai penerbangan, terminal bandara, staffing crew, & maintenance pesawat. |
| **Manufacture** | `manufacturing`| 1. **Mobil** (`mobil`) <br> 2. **Elektronik** (`electronic`) <br> 3. **Furnitur** (`furniture`) | Mengoperasikan lini perakitan pabrik dengan target volume produksi. Kategori menentukan produk yang dirilis dan event sponsor khusus. |
| **Transportation** | `transportation`| 1. **Antar Jemput Online** (`ride_hailing`) <br> 2. **Sewa Kendaraan** (`rental`) | Mengelola armada mobil/motor operasional. Driver/kendaraan menghasilkan profit harian dengan sistem maintenance berkala. |
| **Kesehatan & Bioteknologi**| `healthcare` | *Tidak ada* | Pengelolaan rumah sakit dan riset medis. |
| **FnB** | `fnb` | 1. **Restoran Kuliner** (`restaurant`) <br> 2. **Kafe & Bistro** (`cafe`) <br> 3. **Katering Industri** (`catering`) | Mengelola bisnis makanan/minuman dengan metrik kebersihan dapur, kenyamanan ruang, dan kelezatan menu untuk menaikkan rating bintang. |
| **Retail** | `retail` | *Tidak ada* | Inventori gudang logistik dan ekspansi minimarket/megamall. |
| **Infrastructure** | `infrastructure`| *Tidak ada* | Menjadi Kontraktor proyek sipil (swasta/negara) dengan kepemilikan alat berat (Excavator, Bulldozer, Crane). |
| **Property** | `property` | *Tidak ada* | Survey kavling tanah, zoning pembangunan (Komersil, Residensial, Industri) & pasif income leasing. |

### 🎁 Easter Egg: Makan Siang Gratis (MBG)
Untuk sektor **FnB** dengan sub-sektor **Katering Industri** (`catering`):
* Jika pemain menuliskan nama bisnisnya mengandung kata **"MBG"** atau **"makan siang gratis"** (case-insensitive):
  * **Bonus Modal Awal:** Kas perusahaan akan mendapatkan suntikan dana tambahan sebesar **+$10,000,000 (10 Juta Dolar)** secara langsung di awal.
  * **Multiplier Keuntungan:** Pendapatan bulanan/keuntungan dari katering dikalikan sebesar **10x** lipat secara permanen!

---

## 2. Rincian Perubahan Kode Program

### A. Setup & Registrasi Bisnis Baru
* **File:** [SetupWizardPanel.js](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/business/panels/SetupWizardPanel.js)
* **Perubahan:**
  * Memperbarui select input `#biz-industry-select` untuk mencakup 12 pilihan industri.
  * Menampilkan dropdown sub-sektor dinamis ketika sektor `manufacturing`, `transportation`, atau `fnb` dipilih. Sektor `media` digabung dan tidak memicu dropdown sub-sektor.
  * Memperbarui pemanggilan `businessManager.startBusiness` agar turut mengirim parameter `subSector` terpilih.

### B. Konfigurasi Sektor & Core Lifecycle
* **File:** [BusinessManager.js](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/business/BusinessManager.js)
* **Perubahan:**
  * Memperbarui `this.industries` dengan ke-12 sektor baru.
  * Memperbarui fungsi `startBusiness(name, type, industryKey, customCapital, subSector = null)` agar menyimpan sub-sektor terpilih di dalam state `business.subSector` pada `gameState`.
  * Memeriksa kondisi Easter Egg: Jika `industryKey === 'fnb'`, `subSector === 'catering'`, dan nama bisnis mengandung kata "mbg" atau "makan siang gratis" (case-insensitive), tambahkan bonus **$10,000,000** ke `business.cash` yang diinisialisasi.
  * Mengimpor seluruh 12 sector engine (`src/js/business/sectors/...`).
  * Memperbarui `processMonthlyUpdate` untuk memanggil monthly tick sector engine yang sesuai.
  * Menyediakan getter state pembantu untuk sektor baru.

### C. Inisiatif Strategis Sektor
* **File:** [IndustryInitiatives.js](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/business/IndustryInitiatives.js)
* **Perubahan:**
  * Memetakan inisiatif strategis unik untuk ke-12 sektor baru agar masing-masing memiliki 3 program upgrade premium yang relevan.

### D. Pasar Lelang & M&A
* **File:** [BusinessAuctions.js](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/business/BusinessAuctions.js)
* **Perubahan:**
  * Menyelaraskan konstanta `AUCTION_INDUSTRIES` agar mencakup industri baru sehingga lelang korporat menghasilkan deal di 12 sektor ini.
  * Menyelaraskan mapping `COMPANY_SUFFIXES` agar memiliki akhiran nama PT yang sesuai.

### E. Dashboard Utama & Pengendali Tab
* **File:** [BusinessPage.js](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/business/BusinessPage.js)
* **Perubahan:**
  * Memperbarui logika render tombol Tab Ops/Manajerial agar menampilkan label tab yang disesuaikan untuk ke-12 sektor.
  * Merutekan tampilan tab ke panel operasional spesifik sektor baru.
  * Melakukan binding event-event UI untuk panel-panel baru tersebut.

### F. Terminology Kemitraan Holding
* **File:** [SubsidiaryPanel.js](file:///d:/Data%20Project/Personal%20Project/AuraAssets/src/js/business/panels/SubsidiaryPanel.js)
* **Perubahan:**
  * Memastikan terminologi "Supplier" untuk Ritel/FnB, "Fendor" untuk Infrastruktur/Property, dan "Anak Perusahaan" untuk industri lainnya.

---

## 3. Implementasi Detail Gameplay Sektor & Sub-Sektor Baru

### 🏭 Sektor `manufacturing` (Manufacture)
* **Mekanisme:**
  * Sub-sektor dipilih saat setup (`mobil`, `electronic`, `furniture`).
  * Pilihan sub-sektor menentukan katalog model perakitan yang tersedia di panel Ops secara permanen.
  * **Mobil:** Memproduksi Sedan, SUV, Hypercar. Sponsor: Balapan GP.
  * **Elektronik:** Memproduksi Smartphone, Laptop, Server AI. Sponsor: Esports Tournament.
  * **Furnitur:** Memproduksi Kursi, Meja, Workstation Set. Sponsor: International Design Expo.

### 🚗 Sektor `transportation` (Transportation)
* **Mekanisme:**
  * Sub-sektor dipilih saat setup (`ride_hailing` atau `rental`).
  * **Ride-Hailing:** Fokus pada jumlah order driver online, tarif per km, dan rating kenyamanan perjalanan.
  * **Rental:** Fokus pada penyewaan unit harian/bulanan dengan margin lebih tinggi per kendaraan tetapi volume transaksi lebih rendah.
  * Kedua sub-sektor menggunakan sistem maintenance armada.

### 🎥 Sektor `media` (Media)
* **Mekanisme:**
  * Sektor media menggabungkan platform TV, media sosial, dan berita online secara holistik.
  * Aksi: Produksi konten premium (menaikkan mutu) dan ekspansi server transmisi (meningkatkan batas audiens).
  * Kepadatan Iklan (Low, Med, High) menentukan profit vs kenyamanan audiens.

### 🍳 Sektor `fnb` (FnB)
* **Mekanisme:**
  * Sub-sektor dipilih saat setup (`restaurant`, `cafe`, `catering`).
  * Pilihan menentukan tema menu makanan/minuman.
  * Metrik kualitas: Kebersihan, Kenyamanan, Kelezatan.
  * Kebersihan dan kenyamanan menyusut setiap bulan karena pemakaian dapur & ruang makan, menuntut aksi maintenance berkala.
  * **Easter Egg logic:** Pada monthly tick katering (`catering`), jika nama perusahaan adalah MBG / makan siang gratis, kalikan hasil profit bulanan dengan 10x lipat sebelum dialirkan ke kas utama.

### 🏗️ Sektor `infrastructure` (Infrastructure - Kontraktor)
* **Mekanisme:**
  * Beroperasi sebagai kontraktor proyek sipil.
  * Aset: Excavator, Bulldozer, Tower Crane.
  * Mengajukan penawaran proyek dari Pemerintah atau Swasta. Setiap proyek membutuhkan alat berat tertentu dan durasi waktu pengerjaan.

### 🏢 Sektor `property` (Property)
* **Mekanisme:**
  * Mewarisi gameplay lama `InfrastructureSector` secara utuh (survey tanah kosong, zonasi pembangunan, pasif income sewa).

---

## 4. Rencana Verifikasi (Verification Plan)

### Pengujian Fungsional
1. **Pemeriksaan Setup Wizard:** Pilih sektor `FnB`, pilih sub-sektor `Katering Industri`, lalu daftarkan nama bisnis dengan "Makan Siang Gratis". Verifikasi bahwa kas inisialisasi bertambah 10 Juta Dolar secara otomatis.
2. **Kesesuaian Aksi di Dashboard:** Lakukan setup dan verifikasi bahwa dashboard ops memuat template ops panel yang sesuai dengan sub-sektor yang dipilih.
3. **Monthly Tick Processing:** Jalankan month pass dan periksa laporan kas ledger bulanan untuk memverifikasi pemasukan dari sub-sektor baru.

### Pengujian Integrasi & Build
* Jalankan `check.ps1` untuk memvalidasi markup tag HTML `index.html`.
* Lakukan run build produksi (`npm run build`) untuk memastikan kompilasi bundle Vite bebas error.
