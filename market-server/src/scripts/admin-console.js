/**
 * AURA ASSETS - DEVELOPER GOD CONSOLE (CLI)
 * 
 * Tool kendali ekonomi dan pasar interaktif berbasis terminal (tanpa emoji).
 * Digunakan untuk:
 * - Airdrop stimulus dana global atas nama institusi keuangan (random pick).
 * - Pump dan Dump aset pasar berbasis timer (harga kembali normal secara natural).
 * - Suntik saldo langsung ke akun tertentu.
 * - Monitoring statistik sirkulasi uang (M2).
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

// Load .env relative to market-server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qdqifdomtwuqvvyzglog.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const PRICE_SCALE = parseInt(process.env.PRICE_SCALE || '100', 10);

const INSTITUTIONS = [
  'Federal Reserve (Bank Sentral AS)',
  'JPMorgan Chase & Co.',
  'Bank of America',
  'BlackRock Financial Management',
  'Goldman Sachs Group',
  'Citigroup Institutional',
  'Morgan Stanley Investment',
  'UBS Wealth Management'
];

const CRYPTO_LIST = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'TRX', 'AVAX', 'SUI', 'LINK'];
const STOCK_LIST = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ', 'SOXX'];

let supabase = null;
let pgPool = null;

function getRandomInstitution() {
  const index = Math.floor(Math.random() * INSTITUTIONS.length);
  return INSTITUTIONS[index];
}

async function initClients() {
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  if (DATABASE_URL) {
    pgPool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
}

async function closeClients() {
  if (pgPool) {
    try {
      await pgPool.end();
    } catch (e) {}
  }
}

// --------------------------------------------------------------------------
// 1. GLOBAL STIMULUS / AIRDROP (INSTITUTIONAL)
// --------------------------------------------------------------------------
async function handleAirdrop(rl) {
  console.log('\n--- [1] DONASI / STIMULUS GLOBAL (INSTITUTIONAL AIRDROP) ---');
  
  const donor = getRandomInstitution();
  console.log(`[INFO] Lembaga Pengirim (Sistem Terpilih): ${donor}`);

  const rawAmount = await rl.question('Masukkan Nominal Dana per Pemain ($) [contoh: 25000]: ');
  const amount = parseFloat(rawAmount.trim());
  if (isNaN(amount) || amount <= 0) {
    console.log('[ERROR] Nominal tidak valid. Operasi dibatalkan.');
    return;
  }

  const rawNote = await rl.question('Keterangan / Berita (Opsional, tekan Enter untuk default): ');
  const note = rawNote.trim() || `Program Penyaluran Likuiditas Pasar oleh ${donor}`;

  console.log('\n[MEMPROSES] Menyalurkan stimulus ke database dan siaran real-time...');

  let accountsUpdated = 0;
  // 1. Update Database (Postgres)
  if (pgPool) {
    try {
      const scaledAmount = Math.round(amount * PRICE_SCALE);
      const res = await pgPool.query(
        'UPDATE accounts SET available_balance = available_balance + $1, updated_at = NOW()',
        [scaledAmount]
      );
      accountsUpdated = res.rowCount || 0;
    } catch (err) {
      console.log(`[PERINGATAN] Gagal update tabel accounts di DB: ${err.message}`);
    }
  }

  // 2. Broadcast via Supabase Realtime Channel
  if (supabase) {
    try {
      const channel = supabase.channel('aura_transfers_and_grants');
      await channel.subscribe();

      const grantPayload = {
        id: 'grant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        donor: donor,
        totalAmount: amount * 100,
        perPlayerGrant: amount,
        note: note,
        timestamp: Date.now(),
        gameDate: new Date().toLocaleDateString('id-ID')
      };

      await channel.send({
        type: 'broadcast',
        event: 'community_grant',
        payload: grantPayload
      });

      // Lepas subscription channel
      await supabase.removeChannel(channel);
    } catch (err) {
      console.log(`[PERINGATAN] Gagal broadcast Supabase Realtime: ${err.message}`);
    }
  }

  console.log('------------------------------------------------------');
  console.log(`[SUKSES] Stimulus sebesar $${amount.toLocaleString()} per akun berhasil disalurkan.`);
  console.log(`[PENGIRIM] ${donor}`);
  console.log(`[PESAN] "${note}"`);
  if (accountsUpdated > 0) {
    console.log(`[DATABASE] ${accountsUpdated} akun di database telah diperbarui saldonya.`);
  }
  console.log('------------------------------------------------------');
}

// --------------------------------------------------------------------------
// 2. PUMP ASSET (DENGAN DECAY TIMER ALAMI)
// --------------------------------------------------------------------------
async function handlePumpAsset(rl) {
  console.log('\n--- [2] POMPA HARGA ASET (PUMP ASSET) ---');
  console.log('Kripto Populer: ' + CRYPTO_LIST.join(', '));
  console.log('Saham Populer : ' + STOCK_LIST.join(', '));

  const rawSymbol = await rl.question('Masukkan Simbol Aset [contoh: BTC atau NVDA]: ');
  const symbol = rawSymbol.trim().toUpperCase();
  if (!symbol) {
    console.log('[ERROR] Simbol tidak boleh kosong.');
    return;
  }

  const isCrypto = CRYPTO_LIST.includes(symbol);

  const rawBoost = await rl.question('Persentase Lonjakan (%) [contoh: 50, 100, 200]: ');
  const boost = parseFloat(rawBoost.trim().replace('+', ''));
  if (isNaN(boost) || boost <= 0) {
    console.log('[ERROR] Persentase tidak valid.');
    return;
  }

  const rawDuration = await rl.question('Durasi Intervensi (Menit) [contoh: 5]: ');
  const duration = parseInt(rawDuration.trim(), 10);
  if (isNaN(duration) || duration <= 0) {
    console.log('[ERROR] Durasi tidak valid.');
    return;
  }

  const donor = getRandomInstitution();
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  const headline = `[PASAR] ${donor} merilis laporan akumulasi strategis pada ${symbol}, memicu lonjakan volume beli institusional.`;

  console.log('\n[MEMPROSES] Menerbitkan intervensi pasar ke sistem berita & sentimen...');

  if (supabase) {
    const record = {
      id: `pump_${symbol}_${Date.now()}`,
      market: isCrypto ? 'crypto' : 'stock',
      type: 'positive',
      headline: headline,
      ticker_target: isCrypto ? null : symbol,
      target_asset: isCrypto ? symbol : null,
      sector: isCrypto ? 'crypto' : 'broad_market',
      impact_percent: boost,
      duration_minutes: duration,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    };

    const { error } = await supabase.from('market_events').insert(record);
    if (error) {
      console.log(`[ERROR] Gagal memasukkan market event: ${error.message}`);
      return;
    }
  }

  console.log('------------------------------------------------------');
  console.log(`[SUKSES] Intervensi Pump pada ${symbol} berhasil diaktifkan!`);
  console.log(`[DAMPAK] +${boost}% selama ${duration} Menit`);
  console.log(`[BERITA] "${headline}"`);
  console.log(`[INFO] Selesai pada: ${endTime.toLocaleTimeString('id-ID')}`);
  console.log('[CATATAN] Saat durasi habis, pergerakan harga akan kembali normal secara bertahap.');
  console.log('------------------------------------------------------');
}

// --------------------------------------------------------------------------
// 3. DUMP ASSET (DENGAN DECAY TIMER ALAMI)
// --------------------------------------------------------------------------
async function handleDumpAsset(rl) {
  console.log('\n--- [3] BANTING HARGA ASET (DUMP ASSET) ---');
  console.log('Kripto Populer: ' + CRYPTO_LIST.join(', '));
  console.log('Saham Populer : ' + STOCK_LIST.join(', '));

  const rawSymbol = await rl.question('Masukkan Simbol Aset [contoh: BTC atau TSLA]: ');
  const symbol = rawSymbol.trim().toUpperCase();
  if (!symbol) {
    console.log('[ERROR] Simbol tidak boleh kosong.');
    return;
  }

  const isCrypto = CRYPTO_LIST.includes(symbol);

  const rawDrop = await rl.question('Persentase Penurunan (%) [contoh: 40, 75]: ');
  const drop = parseFloat(rawDrop.trim().replace('-', ''));
  if (isNaN(drop) || drop <= 0) {
    console.log('[ERROR] Persentase tidak valid.');
    return;
  }

  const rawDuration = await rl.question('Durasi Intervensi (Menit) [contoh: 5]: ');
  const duration = parseInt(rawDuration.trim(), 10);
  if (isNaN(duration) || duration <= 0) {
    console.log('[ERROR] Durasi tidak valid.');
    return;
  }

  const donor = getRandomInstitution();
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  const headline = `[PASAR] ${donor} melakukan penyesuaian portofolio dan rebalancing skala besar pada aset ${symbol}.`;

  console.log('\n[MEMPROSES] Menerbitkan intervensi penurunan pasar...');

  if (supabase) {
    const record = {
      id: `dump_${symbol}_${Date.now()}`,
      market: isCrypto ? 'crypto' : 'stock',
      type: 'negative',
      headline: headline,
      ticker_target: isCrypto ? null : symbol,
      target_asset: isCrypto ? symbol : null,
      sector: isCrypto ? 'crypto' : 'broad_market',
      impact_percent: -Math.abs(drop),
      duration_minutes: duration,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    };

    const { error } = await supabase.from('market_events').insert(record);
    if (error) {
      console.log(`[ERROR] Gagal memasukkan market event: ${error.message}`);
      return;
    }
  }

  console.log('------------------------------------------------------');
  console.log(`[SUKSES] Intervensi Dump pada ${symbol} berhasil diaktifkan!`);
  console.log(`[DAMPAK] -${drop}% selama ${duration} Menit`);
  console.log(`[BERITA] "${headline}"`);
  console.log(`[INFO] Selesai pada: ${endTime.toLocaleTimeString('id-ID')}`);
  console.log('[CATATAN] Saat durasi habis, pergerakan harga akan kembali normal secara bertahap.');
  console.log('------------------------------------------------------');
}

// --------------------------------------------------------------------------
// 4. CUSTOM MARKET EVENT / MACRO HEADLINE
// --------------------------------------------------------------------------
async function handleCustomEvent(rl) {
  console.log('\n--- [4] BUAT CUSTOM EVENT / BERITA PASAR (CUSTOM EVENT) ---');
  
  const donor = getRandomInstitution();
  console.log(`[INFO] Sumber / Institusi Terkait (Sistem Terpilih): ${donor}`);

  console.log('\nPilih Tipe Pasar:');
  console.log('[1] Saham AS (Stocks)');
  console.log('[2] Kripto (Crypto)');
  console.log('[3] Makro Global (Saham & Kripto Bersamaan)');
  const mktChoice = (await rl.question('Pilihan [1-3]: ')).trim();

  let marketType = 'stock';
  if (mktChoice === '2') marketType = 'crypto';
  else if (mktChoice === '3') marketType = 'both';

  const rawHeadline = await rl.question('\nJudul Berita / Breaking News [tekan Enter untuk judul otomatis]: ');
  let headline = rawHeadline.trim();

  let sector = 'broad_market';
  let ticker_target = null;
  let target_asset = null;

  if (marketType === 'stock' || marketType === 'both') {
    if (marketType === 'stock') {
      console.log('\nPilih Target Pasar Saham:');
      console.log('[1] Seluruh Pasar Saham (Broad Market / S&P 500)');
      console.log('[2] Sektor Big Tech & AI (AAPL, MSFT, NVDA, META, GOOGL)');
      console.log('[3] Sektor Semikonduktor & Chips (SOXX)');
      console.log('[4] Sektor Perbankan & Finansial (XLF)');
      console.log('[5] Saham Tertentu (Ketik Simbol)');
      const tChoice = (await rl.question('Pilihan [1-5]: ')).trim();

      if (tChoice === '2') {
        sector = 'technology';
        ticker_target = 'BIG_TECH';
      } else if (tChoice === '3') {
        sector = 'semiconductors';
        ticker_target = 'SOXX';
      } else if (tChoice === '4') {
        sector = 'banking';
        ticker_target = 'XLF';
      } else if (tChoice === '5') {
        const sym = (await rl.question('Masukkan Simbol Saham [contoh: TSLA]: ')).trim().toUpperCase();
        sector = 'specific';
        ticker_target = sym || 'SPY';
      } else {
        sector = 'broad_market';
        ticker_target = 'SPY';
      }
    } else {
      sector = 'broad_market';
      ticker_target = 'SPY';
    }
  }

  if (marketType === 'crypto' || marketType === 'both') {
    if (marketType === 'crypto') {
      console.log('\nPilih Target Pasar Kripto:');
      console.log('[1] Seluruh Pasar Kripto (Total Market)');
      console.log('[2] Koin Top 10 (BTC, ETH, SOL, BNB, XRP, dll)');
      console.log('[3] Koin Tertentu (Ketik Simbol)');
      const cChoice = (await rl.question('Pilihan [1-3]: ')).trim();

      if (cChoice === '2') {
        sector = 'crypto_top';
        target_asset = 'TOP_10_INDEX';
      } else if (cChoice === '3') {
        const cSym = (await rl.question('Masukkan Simbol Koin [contoh: BTC]: ')).trim().toUpperCase();
        sector = 'crypto_specific';
        target_asset = cSym || 'BTC';
      } else {
        sector = 'crypto';
        target_asset = 'TOTAL_MARKET';
      }
    } else {
      sector = 'crypto';
      target_asset = 'TOTAL_MARKET';
    }
  }

  console.log('\nPilih Arah Sentimen:');
  console.log('[1] Positif / Bullish (Kenaikan Harga)');
  console.log('[2] Negatif / Bearish (Penurunan Harga)');
  const sentChoice = (await rl.question('Pilihan [1-2]: ')).trim();
  const isPos = sentChoice !== '2';

  const rawPercent = await rl.question('\nPersentase Dampak Pasar (%) [contoh: 15, 30]: ');
  let percent = parseFloat(rawPercent.trim().replace('+', '').replace('-', ''));
  if (isNaN(percent) || percent <= 0) percent = 15;
  const impact_percent = isPos ? percent : -percent;

  const rawDuration = await rl.question('Durasi Event (Menit) [contoh: 5, 10]: ');
  let duration = parseInt(rawDuration.trim(), 10);
  if (isNaN(duration) || duration <= 0) duration = 5;

  if (!headline) {
    const directionWord = isPos ? 'Penguatan' : 'Koreksi Tekanan';
    headline = `[BREAKING] ${donor} merilis pernyataan resmi terkait kebijakan pasar, memicu ${directionWord.toLowerCase()} sentimen investor.`;
  }

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  console.log('\n[MEMPROSES] Menerbitkan custom event ke Supabase & Realtime Cloud...');

  if (supabase) {
    const records = [];

    if (marketType === 'stock' || marketType === 'both') {
      records.push({
        id: `custom_stock_${Date.now()}`,
        market: 'stock',
        type: isPos ? 'positive' : 'negative',
        headline: headline,
        ticker_target: ticker_target,
        target_asset: null,
        sector: sector,
        impact_percent: impact_percent,
        duration_minutes: duration,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });
    }

    if (marketType === 'crypto' || marketType === 'both') {
      records.push({
        id: `custom_crypto_${Date.now()}`,
        market: 'crypto',
        type: isPos ? 'positive' : 'negative',
        headline: headline,
        ticker_target: null,
        target_asset: target_asset,
        sector: sector === 'broad_market' ? 'crypto' : sector,
        impact_percent: impact_percent,
        duration_minutes: duration,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });
    }

    const { error } = await supabase.from('market_events').insert(records);
    if (error) {
      console.log(`[ERROR] Gagal memasukkan custom event: ${error.message}`);
      return;
    }
  }

  console.log('------------------------------------------------------');
  console.log('[SUKSES] Custom Event Berhasil Diterbitkan ke Seluruh Pemain!');
  console.log(`[JUDUL] "${headline}"`);
  console.log(`[SUMBER] ${donor}`);
  console.log(`[PASAR] ${marketType.toUpperCase()} | Sentimen: ${isPos ? 'BULLISH (+)' : 'BEARISH (-)'}`);
  console.log(`[DAMPAK] ${impact_percent > 0 ? '+' : ''}${impact_percent}% selama ${duration} Menit`);
  console.log(`[SELESAI PADA] ${endTime.toLocaleTimeString('id-ID')}`);
  console.log('[CATATAN] Harga akan terpengaruh secara halus dan berangsur kembali normal saat waktu habis.');
  console.log('------------------------------------------------------');
}

// --------------------------------------------------------------------------
// 5. DIRECT CREDIT TO SPECIFIC ACCOUNT
// --------------------------------------------------------------------------
async function handleDirectCredit(rl) {
  console.log('\n--- [5] SUNTIK SALDO AKUN TERTENTU (DIRECT CREDIT) ---');

  const username = (await rl.question('Masukkan Username Akun Pemain: ')).trim();
  if (!username) {
    console.log('[ERROR] Username tidak boleh kosong.');
    return;
  }

  const rawAmount = await rl.question('Masukkan Jumlah Saldo Tambahan ($): ');
  const amount = parseFloat(rawAmount.trim());
  if (isNaN(amount) || amount <= 0) {
    console.log('[ERROR] Jumlah tidak valid.');
    return;
  }

  const donor = getRandomInstitution();
  const scaledAmount = Math.round(amount * PRICE_SCALE);

  console.log(`\n[MEMPROSES] Menyuntikkan dana $${amount.toLocaleString()} ke @${username}...`);

  let dbSuccess = false;
  let newBalance = null;

  if (pgPool) {
    try {
      const res = await pgPool.query(
        `UPDATE accounts 
         SET available_balance = available_balance + $1, updated_at = NOW() 
         WHERE LOWER(username) = LOWER($2)
         RETURNING username, available_balance`,
        [scaledAmount, username]
      );

      if (res.rowCount > 0) {
        dbSuccess = true;
        newBalance = (Number(res.rows[0].available_balance) / PRICE_SCALE).toLocaleString();
      } else {
        console.log(`[INFO] Akun @${username} belum ditemukan di tabel accounts server.`);
      }
    } catch (err) {
      console.log(`[PERINGATAN] Error database: ${err.message}`);
    }
  }

  // Kirim broadcast transfer agar jika user sedang online di client, langsung dapat notif
  if (supabase) {
    try {
      const channel = supabase.channel('aura_transfers_and_grants');
      await channel.subscribe();

      await channel.send({
        type: 'broadcast',
        event: 'player_transfer',
        payload: {
          id: 'transfer_' + Date.now(),
          from: donor,
          to: username,
          amount: amount,
          note: `Hibah Dana Khusus dari ${donor}`,
          gameDate: new Date().toLocaleDateString('id-ID')
        }
      });

      await supabase.removeChannel(channel);
    } catch (err) {
      console.log(`[PERINGATAN] Gagal kirim sinyal real-time: ${err.message}`);
    }
  }

  console.log('------------------------------------------------------');
  console.log(`[SUKSES] Dana sebesar $${amount.toLocaleString()} telah dikirimkan ke @${username}.`);
  console.log(`[LEMBAGA] ${donor}`);
  if (dbSuccess && newBalance !== null) {
    console.log(`[SALDO AKUN DI DATABASE] Saldo baru: $${newBalance}`);
  }
  console.log('------------------------------------------------------');
}

// --------------------------------------------------------------------------
// 6. GLOBAL ECONOMIC STATS
// --------------------------------------------------------------------------
async function handleEconomyStats() {
  console.log('\n--- [6] RINGKASAN EKONOMI GLOBAL (CIRCULATING SUPPLY) ---');

  if (!pgPool) {
    console.log('[ERROR] Koneksi database PostgreSQL tidak tersedia.');
    return;
  }

  try {
    const accRes = await pgPool.query(`
      SELECT 
        COUNT(*) as total_accounts,
        COALESCE(SUM(available_balance), 0) as total_available,
        COALESCE(SUM(locked_balance), 0) as total_locked
      FROM accounts
    `);

    const stats = accRes.rows[0];
    const totalM2 = (Number(stats.total_available) + Number(stats.total_locked)) / PRICE_SCALE;
    const available = Number(stats.total_available) / PRICE_SCALE;
    const locked = Number(stats.total_locked) / PRICE_SCALE;

    console.log(`Total Akun Terdaftar        : ${stats.total_accounts}`);
    console.log(`Total Uang Beredar (M2)     : $ ${totalM2.toLocaleString()}`);
    console.log(`- Saldo Tersedia (Cash)     : $ ${available.toLocaleString()}`);
    console.log(`- Saldo Terkunci (Order Book): $ ${locked.toLocaleString()}`);

    // Tampilkan berita pasar aktif
    if (supabase) {
      const nowIso = new Date().toISOString();
      const { data: activeEvents } = await supabase
        .from('market_events')
        .select('id, market, type, ticker_target, target_asset, impact_percent, end_time')
        .gt('end_time', nowIso)
        .order('start_time', { ascending: false });

      console.log('\nIntervensi / Berita Pasar Aktif Saat Ini:');
      if (!activeEvents || activeEvents.length === 0) {
        console.log('  (Tidak ada intervensi aktif - Pasar berjalan dalam ritme normal)');
      } else {
        activeEvents.forEach((ev, i) => {
          const target = ev.ticker_target || ev.target_asset || ev.market;
          const sign = ev.impact_percent > 0 ? '+' : '';
          const sisaMenit = Math.max(1, Math.round((new Date(ev.end_time).getTime() - Date.now()) / 60000));
          console.log(`  ${i + 1}. [${ev.market.toUpperCase()}] ${target}: ${sign}${ev.impact_percent}% (Sisa waktu: ${sisaMenit} menit)`);
        });
      }
    }
  } catch (err) {
    console.log(`[ERROR] Gagal memuat ringkasan ekonomi: ${err.message}`);
  }
}

// --------------------------------------------------------------------------
// MAIN MENU LOOP
// --------------------------------------------------------------------------
async function main() {
  await initClients();

  const rl = readline.createInterface({ input, output });

  let running = true;
  rl.on('close', () => {
    running = false;
  });

  while (running) {
    console.log('\n======================================================');
    console.log('           AURA ASSETS - ADMIN CONSOLE                ');
    console.log('======================================================');
    console.log('[1] Donasi / Stimulus Global (Institutional Airdrop)');
    console.log('[2] Pompa Harga Aset (Pump Asset)');
    console.log('[3] Banting Harga Aset (Dump Asset)');
    console.log('[4] Buat Custom Event / Berita Pasar (Custom Event)');
    console.log('[5] Suntik Saldo Akun Tertentu (Direct Credit)');
    console.log('[6] Ringkasan Ekonomi Global (Circulating Supply)');
    console.log('[7] Keluar');
    console.log('======================================================');

    let choice = '';
    try {
      choice = (await rl.question('Pilih Operasi [1-7]: ')).trim();
    } catch (err) {
      if (err.code === 'ERR_USE_AFTER_CLOSE') {
        break;
      }
      throw err;
    }

    switch (choice) {
      case '1':
        await handleAirdrop(rl);
        break;
      case '2':
        await handlePumpAsset(rl);
        break;
      case '3':
        await handleDumpAsset(rl);
        break;
      case '4':
        await handleCustomEvent(rl);
        break;
      case '5':
        await handleDirectCredit(rl);
        break;
      case '6':
        await handleEconomyStats();
        break;
      case '7':
        console.log('\n[KELUAR] Menutup sesi Admin Console. Sampai jumpa.');
        running = false;
        break;
      default:
        console.log('[PERINGATAN] Pilihan tidak valid. Masukkan angka 1 sampai 7.');
        break;
    }
  }

  rl.close();
  await closeClients();
}

main().catch(async (err) => {
  if (err.code !== 'ERR_USE_AFTER_CLOSE') {
    console.error('[FATAL ERROR]', err);
  }
  await closeClients();
  process.exit(1);
});
