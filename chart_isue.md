# Audit Chart: Akar Masalah dan Solusi

Tanggal: 2026-11-01

Cakupan: analisis kode statis. Aplikasi belum dijalankan.

File yang dibaca: `ChartEngine.js`, `CandleGenerator.js`, `PatternTrajectoryManager.js`, `TradingPage.js` (`updateChartData`), `StockMarket.js` (`updatePrices`, `onDayPass`), dan sebagian `CryptoMarket.js`.

Belum dibaca penuh: sparkline di beranda, jalur mode server (`MarketClient`), dan detail `CryptoMarket`.

## Akar masalah utama

**Chart tidak menggambar harga yang benar-benar terjadi. Chart menggambar ulang "pola ideal" dari nol, lalu menempelkan harga live di candle terakhir.**

Ada dua sumber kebenaran yang tidak saling tahu:

| | Mesin harga (`updatePrices`) | Chart (`convertToCandles`) |
|---|---|---|
| Sumber | Random walk + drift berita + pola + mean reversion, tiap 3–5 detik | Kurva pola harian dari `PatternTrajectoryManager` + noise palsu |
| Disimpan? | `priceHistory` (maks 300 titik, hilang saat reload) | Tidak ada, dibuat ulang tiap refresh |

**Solusi inti:** jadikan chart cermin dari harga yang terjadi. Catat tick nyata, agregasi menjadi OHLC, dan gambar hasilnya. Pola dipindah ke mesin harga sebagai bias lemah. Detail ada di tiap masalah di bawah.

---

## 1. Riwayat harga asli tidak dipakai

**Masalah:** `convertToCandles(history, ...)` menerima `history`, tapi parameter itu hampir tidak dipakai (hanya fallback harga). `TradingPage` memotong `priceHistory.slice(-300)` lalu data itu diabaikan. Ribuan tick yang disimulasikan mesin tidak pernah muncul di chart.

**Solusi:**
- Buat modul `PriceHistoryStore` yang mencatat tiap tick `{t, price, volume}` per aset dari `updatePrices` (saham dan kripto), dari `marketBuy` / `marketSell`, dan dari trade server.
- Tulis fungsi `aggregateToCandles(ticks, intervalMs)` yang mengelompokkan tick ke bucket waktu. `open` = tick pertama, `close` = tick terakhir, `high` / `low` = ekstrem, `volume` = jumlah volume.
- Ganti isi `convertToCandles` agar memanggil agregasi ini. Jangan lagi memakai `PatternTrajectoryManager` di CandleGenerator.
- Simpan ke `IndexedDB` (atau `localStorage` dengan batas ukuran) agar riwayat tidak hilang saat reload. Beri batas, misalnya 1 tick per 5 detik untuk 48 jam, lalu data lama diringkas menjadi candle 1 menit, 5 menit, dan 1 jam.

---

## 2. Bentuk candle ditentukan pola, bukan pergerakan

**Masalah:** tiap candle = `basePrice × kurva_pola(progress)` + noise kecil, dan candle terakhir dipaksa sama dengan `currentPrice`. Akibatnya:
- Chart hanya berubah di candle paling kanan, sisanya hampir statis sepanjang hari.
- Candle terakhir bisa melompat dari akhir kurva ke harga live.
- Rentang Y dihitung ulang tiap refresh (`yMin/yMax` dari min/max data), sehingga sumbu ikut bergoyang.

**Solusi:**
- Setelah solusi #1, candle terakhir diperbarui dari tick yang masuk (update `high`, `low`, `close`), bukan dipaksa ke harga lain.
- Candle lama tidak diubah (immutable). Hanya candle yang sedang berjalan yang berubah.
- Stabilkan sumbu Y. Hitung rentang dari data yang terlihat dan perbarui hanya bila harga mendekati batas (atau saat user menekan "fit"). Jangan hitung ulang tiap 3 detik.
- Tandai candle yang sedang berjalan dengan gaya berbeda (misalnya garis tepi putus-putus) agar jelas bahwa ia belum final.

---

## 3. Pola 24 jam ditarik ke 24 bar yang salah

**Masalah:** pola berjalan menurut hari UTC (`floor(ts / 24 jam)`), tapi candle 1d menggambar seluruh pola (progress 0→1) di jendela 24 jam terakhir.
- Pukul 14:00 UTC mesin baru di progress ±0,58, sedangkan chart sudah menampilkan pola lengkap hingga "sekarang".
- Timeframe **1h** (30 candle × 2 menit) menarik satu pola 24 jam ke dalam 1 jam.
- **1w** dan **1m** mengulang pola 2× dan 4× (`(progress * cycleCount) % 1`), dengan "tren makro" dari `change` harian. Itu data karangan.
- Timeframe tidak konsisten: memperbesar 1d tidak menampilkan ujung kanan dari 1w.

**Solusi:**
- Semua timeframe harus berasal dari **satu deret data yang sama**, diagregasi pada interval berbeda:

| Timeframe | Interval candle | Jumlah candle yang ditampilkan |
|---|---|---|
| 1h | 1 menit | 60 |
| 1d | 5–15 menit | 96–288 |
| 1w | 1 jam | 168 |
| 1m | 4 jam atau 1 hari | 120–30 |

- Hapus cabang `1w` / `1m` yang mengulang pola dan memakai `macroTrend`.
- Untuk riwayat sebelum game dimulai (backfill), simulasikan random walk **mundur** dari harga sekarang dengan parameter volatilitas aset (lihat #4). Tandai data itu sebagai "historis simulasi", lalu timpa dengan tick nyata seiring berjalannya waktu.
- Backfill bersifat deterministik per aset (seed dari simbol + tanggal) agar sama di semua perangkat, tapi tidak berulang tiap hari.

---

## 4. Kurva terlalu rapi, mirip gelombang sinus

**Masalah:** `getTargetMultiplier` menambah gelombang `sin(progress·π·6.5)` dan `sin(progress·π·14.2)`, jadi chart tampak seperti sinyal sinus. Noise per candle kecil (`volatility = min(0.025, vol·0.25)` ≈ ±0,3%), sehingga ukuran badan dan sumbu candle mirip semua, tanpa gap, tren berkelanjutan, atau cluster volatilitas. Noise di-seed dari simbol saja, jadi bentuknya sama tiap hari dan tiap refresh.

**Solusi:** hapus semua gelombang sinus. Realisme dibuat di **mesin harga** (`updatePrices`):
- **Volatility clustering:** simpan `currentVol` per aset yang berubah pelan. Contoh sederhana: `currentVol = 0.94·currentVol + 0.06·|return|·k + baseVol·0.02`. Setelah pergerakan besar, volatilitas tetap tinggi beberapa saat.
- **Regime:** tiap aset berpindah antara `trending_up`, `trending_down`, dan `sideways` dengan durasi acak (menit sampai jam). Tiap regime punya drift dan volatilitas sendiri.
- **Momentum kecil:** tambahkan sedikit autokorelasi (`r_t = 0.1·r_{t-1} + noise`) agar muncul gerakan searah beberapa tick.
- **Distribusi ekor tebal:** sesekali lonjakan (jump) kecil, terutama saat ada berita (`newsManager`).
- **Volume berkorelasi:** `volume = base × (1 + k·|return| + lonjakan berita)`, bukan dari ukuran badan candle.
- Noise memakai `Math.random()` bersih, tanpa seed tetap, kecuali untuk backfill (lihat #3).

---

## 5. Pola ideal tidak akan terlihat sebagai pola

**Masalah:**
- Pola (H&S, segitiga, double top) hanya "mengarahkan" harga lewat `drift = selisih × 0.006` per tick. Pengaruhnya dilawan random walk, mean reversion ke `basePrice` (0,002 per tick), berita, dan order flow. Harga nyata hampir tidak pernah membentuk pola itu.
- Chart yang menggambar pola sempurna berbeda dari harga nyata yang bergerak acak.
- Tiap aset mendapat pola yang berganti tiap hari UTC. Sekitar sepertiga aset kena `DOJI_CONSOLIDATION` (garis nyaris datar). Pemilihan pola memakai `hash % 100` dan `hash % 8` dari hash yang sama, jadi distribusinya bias.
- Amplitudo pola maksimal ±3–5% dan hanya 24–30 bar yang digambar, terlalu sedikit agar mata melihat pola.

**Solusi:**
- Chart **tidak boleh** menggambar pola. Pola hanya jadi **bias halus di mesin harga**: harga tetap acak, tapi dengan drift searah waypoint. Pola akan muncul sesekali dan alami.
- Pindahkan pola ke skala waktu yang lebih panjang (beberapa jam sampai beberapa hari), bukan satu siklus per hari.
- Jadikan pola sebagai **peristiwa sesekali**, bukan keadaan tetap. Mayoritas waktu aset berada di regime acak biasa (lihat #4). Hanya sesekali (misalnya 10–15% waktu) ada fase "pembentukan pola".
- Perbaiki pemilihan: pakai hash yang berbeda (atau PRNG ber-seed) untuk memilih "apakah ada pola" dan "pola apa".
- Kurangi mean reversion ke `basePrice` (0,002 per tick) atau ganti dengan mean reversion ke rata-rata bergerak jangka panjang, supaya tidak meratakan semua pola.
- Jangan pakai Doji untuk sepertiga aset. Biarkan aset tenang diwakili oleh regime `sideways` dengan volatilitas rendah.
- Pola yang terbentuk bisa ditandai (anotasi) setelah terdeteksi dari data nyata (pivot highs/lows), bukan dari rencana. `annotatePatterns` saat ini hanya menandai puncak palsu "W3".

---

## 6. Reset harian memutus kontinuitas

**Masalah:** `onDayPass()` mengatur `basePrice = price`, `high24h`, `low24h`, dan `change = 0` tiap tengah malam UTC. Semua bentuk chart dihitung relatif terhadap `basePrice`, jadi seluruh chart langsung tergambar ulang di sekitar harga baru dan hari sebelumnya hilang. "24h high/low" juga bukan rolling 24 jam.

**Solusi:**
- Setelah chart memakai data tick nyata (#1), `basePrice` tidak lagi memengaruhi bentuk chart, sehingga masalah ini hilang dengan sendirinya.
- `change24h` dihitung dari harga 24 jam lalu (rolling) dengan mencari tick di `PriceHistoryStore`, bukan dari `basePrice`.
- `high24h` / `low24h` dihitung rolling dari tick 24 jam terakhir.
- `basePrice` boleh tetap ada hanya sebagai jangkar mean reversion jangka panjang, dan jangan di-reset tiap hari. Ubah pelan (misalnya EMA) agar tidak terjadi lompatan.

---

## 7. Cara render dan interaksi

**Masalah:**
- `shape: 'spline', smoothing: 0.85` pada line chart membuat kurva melewati nilai yang tidak ada di data (overshoot).
- Sumbu X bertipe `category` dengan label jam yang di-generate. Sumbu waktu sebenarnya tidak ada, jadi gap atau jam tanpa data tidak terlihat.
- `dragmode: false`, `fixedrange: true`, dan `scrollZoom: false` mematikan zoom dan pan, sehingga chart terasa tidak responsif.
- `setData` memanggil `Plotly.react` penuh tiap 3 detik.
- Volume candle diturunkan dari ukuran badan, bukan dari transaksi.

**Solusi:**
- Ganti ke `shape: 'linear'` pada line chart. Gunakan `hv` bila ingin gaya tangga.
- Ganti `xaxis.type` ke `'date'` dengan timestamp nyata (`new Date(t)`), dan sembunyikan jam non-trading bila ada.
- Aktifkan `dragmode: 'pan'`, `scrollZoom: true`, dan `fixedrange: false` untuk sumbu X. Biarkan sumbu Y auto-fit pada rentang yang terlihat. Tambahkan tombol "Ke harga sekarang" yang mereset rentang X ke ujung kanan.
- Tampilkan 80–150 candle secara default, agar pola dan tren terbaca.
- Untuk tick live, gunakan `Plotly.extendTraces` (menambah candle baru) dan `Plotly.restyle` (memperbarui candle terakhir). Gunakan `Plotly.react` hanya saat timeframe atau tipe chart berubah. Batasi pembaruan visual ke sekitar 1 kali per detik.
- Volume dari data transaksi (lihat #4).
- Opsional: evaluasi library yang khusus untuk chart keuangan (misalnya `lightweight-charts` dari TradingView). Library ini ringan (sekitar 45 KB gzipped) dibanding Plotly (4,8 MB), mendukung candlestick, zoom, pan, dan update live secara native. Ini juga mengurangi ukuran bundel.

---

## 8. Potensi masalah yang perlu dicek

**Masalah:**
- Harga saham dibulatkan `toFixed(2)`. Perubahan per tick sekitar 0,03%, sehingga saham murah (di bawah $10) bisa terlihat datar atau berundak ($0,01). Rentang harga aset belum saya periksa.
- `getActivePattern` memanggil `cleanExpiredPatterns()` di setiap panggilan, dan ia dipanggil per aset per tick (±200 aset). Itu iterasi berulang yang tidak perlu.
- Di mode server (`authoritativeMode`), `priceHistory` terisi dari trade, tapi chart tetap memakai data sintetis, jadi trade nyata tidak pernah terlihat.

**Solusi:**
- Simpan harga internal dengan presisi lebih tinggi (misalnya 4–6 desimal, atau integer dalam satuan terkecil), dan bulatkan hanya saat ditampilkan. Untuk aset murah, kurangi tick scale atau naikkan volatilitas per tick agar pergerakan terlihat.
- Panggil `cleanExpiredPatterns()` sekali per jam (atau saat ganti hari), bukan per panggilan. Jika pola dipindah seperti #5, modul ini bisa disederhanakan.
- Di mode server, bangun candle dari riwayat trade server (`trades` / event socket) lewat `PriceHistoryStore` yang sama, dan minta riwayat awal dari server saat membuka aset.

---

## Urutan pengerjaan yang disarankan

| Langkah | Pekerjaan | Usaha | Dampak |
|---|---|---|---|
| 1 | `PriceHistoryStore` + agregasi tick menjadi candle (#1, #2, #3) | Sedang | **Sangat tinggi**. Ini inti perbaikan |
| 2 | Renderer: sumbu `date`, matikan spline, aktifkan zoom/pan, update live dengan `extendTraces` (#7) | Sedang | Tinggi |
| 3 | Rolling 24 jam untuk high/low/change, hentikan reset harian pada chart (#6) | Kecil | Sedang |
| 4 | Realisme di mesin harga: volatility clustering, regime, momentum, volume (#4) | Sedang | Tinggi |
| 5 | Pola menjadi bias langka di mesin harga, hapus gelombang sinus dan Doji massal (#5) | Sedang | Sedang |
| 6 | Backfill riwayat awal dengan random walk mundur (#3) | Kecil–Sedang | Sedang |
| 7 | Presisi harga, optimasi `cleanExpiredPatterns`, mode server (#8) | Kecil–Sedang | Sedang |
| 8 | (Opsional) Ganti Plotly dengan `lightweight-charts` | Besar | Tinggi (performa dan bundel) |

> Saran: kerjakan langkah 1 dan 2 dulu. Setelah chart menampilkan harga yang benar-benar terjadi, kamu bisa menilai apakah mesin harga (langkah 4–5) sudah terasa realistis. Tanpa itu, perbaikan lain tidak akan terlihat.

> Perubahan di mesin harga (langkah 4–5) memengaruhi ekonomi game: keuntungan bot, staking, dan sinyal trading bergantung pada pergerakan harga. Setelah mengubahnya, tes ulang keseimbangan ekonomi.



---

# Keputusan Arsitektur: Mode Server Saja & Manajemen Storage Database

> **Status Keputusan:** Dipilih arsitektur **Mode Server Saja (Authoritative Multiplayer/Global Market Engine)**. Semua harga, order book, eksekusi trade, dan pencatatan candle dikelola terpusat di server (`market-server/` + Supabase PostgreSQL). Klien/frontend murni sebagai penampil (viewer) dan pengirim order.

## 1. Analisis Beban Database: Apakah Mencatat Harga Membebani DB?

Kekhawatiran bahwa riwayat harga akan membuat database membengkak adalah **benar jika kita menyimpan setiap tick (transaksi micro-second)**, tetapi **salah jika dirancang dengan agregasi candle bertingkat (Rollup & Pruning)**.

### Perbandingan Pola Penyimpanan (untuk ±220 Aset: Saham, Kripto, Komoditas):

| Pendekatan | Data yang Masuk | Volume / Hari | Dampak ke Database |
|---|---|---|---|
| **Simpan Tiap Tick Mentah** (3–5 dtk) | 220 aset × 20.000 tick | ~4,4 juta baris/hari (~300 MB/hari) | ❌ **Sangat boros**. Database Supabase (kuota 500 MB) jebol dalam 2 hari. |
| **Simpan Candle 1-Menit Mentah Selamanya** | 220 aset × 1.440 menit | ~316.800 baris/hari (~22 MB/hari) | ⚠️ **Cepat penuh** jika dibiarkan berbulan-bulan tanpa pembersihan. |
| **Arsitektur Solusi: Agregasi di RAM + Rollup & Pruning Bertingkat** | Diolah di RAM server, di-flush 1x/menit, data lama di-rollup | **Stabil di ~120–180 MB Total** | ✅ **Sangat aman, efisien, dan cepat**. Muat di kuota free-tier Supabase. |

---

## 2. Solusi Teknis: Agregasi Server & Kebijakan Retensi (Pruning)

### A. Server Mengolah di Memori (RAM), Bukan Menembak DB Tiap Detik
1. **In-Memory Candle Accumulator:**
   - Mesin pasar server (`market-server`) menerima atau menghasilkan tick transaksi.
   - Tick **tidak langsung di-INSERT ke DB**, melainkan ditampung di memori Node.js (`activeCandleBucket`).
   - Setiap 60 detik (1 menit), server menutup bar tersebut `{ open, high, low, close, volume }` dan melakukan **Batch Insert** 1 kali untuk semua aset ke PostgreSQL.
2. **Koneksi Live WebSocket (Socket.IO):**
   - Klien yang sedang membuka chart menerima update tick candle berjalan secara real-time lewat event WebSocket `market:candle_tick`.
   - Klien tidak perlu query DB berulang-ulang saat chart aktif.

### B. Skema Tabel PostgreSQL (`market_candles`)
```sql
CREATE TABLE IF NOT EXISTS market_candles (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL, -- '1m', '1h', '1d'
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC NOT NULL,
    high NUMERIC NOT NULL,
    low NUMERIC NOT NULL,
    close NUMERIC NOT NULL,
    volume NUMERIC DEFAULT 0,
    CONSTRAINT uq_symbol_tf_time UNIQUE (symbol, timeframe, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_candles_lookup 
ON market_candles (symbol, timeframe, timestamp DESC);
```

### C. Kebijakan Retensi & Rollup (Data Pruning Otomatis)
Agar kapasitas database PostgreSQL tetap di bawah 200 MB selamanya:
1. **Candle 1-Menit (`1m`):**
   - Disimpan selama **7 hari** terakhir.
   - Dipakai untuk chart detail intraday (1h / 1d).
   - Di atas 7 hari, otomatis dihapus setelah diagregasi ke candle 1-jam.
2. **Candle 1-Jam (`1h`):**
   - Dibuat otomatis dari rollup 60 baris candle 1m.
   - 220 aset × 24 baris = hanya **5.280 baris/hari** (~0,4 MB/hari).
   - Disimpan selama **60 hari** (total hanya ~25 MB).
3. **Candle 1-Hari (`1d`):**
   - 220 aset × 1 baris = hanya **220 baris/hari** (sangat kecil, ~15 KB/hari).
   - Disimpan permanen hingga bertahun-tahun tanpa membuat database penuh.

Setiap malam jam 00:00 UTC, jalankan cron job / SQL function singkat:
```sql
-- Contoh pembersihan data kadaluarsa
DELETE FROM market_candles 
WHERE timeframe = '1m' AND timestamp < NOW() - INTERVAL '7 days';
```

---

## 3. Alur Kerja Integrasi Frontend (Klien) ke Mode Server

1. **Inisialisasi Chart saat Buka Layar Trading:**
   - Frontend memanggil REST API server:
     `GET /api/market/candles?symbol=BTC&timeframe=1d&limit=120`
   - Server mengembalikan array JSON candle murni yang sudah dihitung dari pasar server.
   - Frontend langsung merender data tersebut tanpa campur tangan `PatternTrajectoryManager` atau rumus sinus palsu.
2. **Pembaruan Live (Real-Time):**
   - Klien join room socket aset: `socket.emit('subscribe:asset', symbol)`.
   - Setiap ada trade / tick di server, server emit:
     `socket.on('candle:update', (liveCandle) => chartEngine.updateLiveCandle(liveCandle))`
   - Chart hanya memperbarui bar paling kanan secara mulus (smooth tick).
3. **Penyelarasan Timeframe:**
   - User ganti ke `1w` atau `1m`? Cukup panggil ulang API dengan query `timeframe=1h` atau `timeframe=1d`. Data yang keluar selalu konsisten dan tidak berubah bentuk secara acak.

---

## 4. Penyesuaian Langkah Pengerjaan (Khusus Mode Server)

| No | Komponen | Lokasi | Pekerjaan |
|---|---|---|---|
| 1 | **Skema DB & Rollup** | `market-server/migrations/` | Buat migrasi tabel `market_candles` dan fungsi rollup/pruning. |
| 2 | **Candle Collector Engine** | `market-server/src/modules/market/` | Buat worker in-memory penyerap trade/tick yang menulis batch candle 1m tiap menit. |
| 3 | **Candle API & Socket Room** | `market-server/src/routes/market.routes.js` | Endpoint REST query candle + event broadcast live candle via Socket.IO. |
| 4 | **Refactor Frontend Chart** | `src/js/trading/ChartEngine.js` | Hapus logika sintetis / sinus; sambungkan chart langsung ke REST API & Socket stream. |
| 5 | **Pembersihan Kode Lama** | `CandleGenerator.js` & `PatternTrajectoryManager.js` | Lepas dependensi pola palsu dari chart rendering frontend. |
