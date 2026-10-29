import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { DATABASE_URL, DATABASE_SSL } = process.env;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is missing in market-server/.env');
  process.exit(1);
}

// 1. Parse Stocks from StockMarket.js
function getStocksData() {
  const stockMarketPath = path.resolve(__dirname, '../../../src/js/trading/StockMarket.js');
  const content = fs.readFileSync(stockMarketPath, 'utf8');
  
  const startIdx = content.indexOf('const stocks = {');
  const endIdx = content.indexOf('        };', startIdx);
  const codeBlock = content.slice(startIdx + 'const stocks = '.length, endIdx + 10);
  
  // Clean evaluate object
  const fn = new Function(`return ${codeBlock}`);
  const stocksObj = fn();
  
  return Object.entries(stocksObj).map(([symbol, data]) => ({
    symbol,
    name: data.name,
    price: data.price,
    basePrice: data.basePrice,
    volatility: data.volatility,
    sector: data.sector
  }));
}

// 2. Parse Cryptos from CryptoMarket.js
function getCryptosData() {
  const cryptoMarketPath = path.resolve(__dirname, '../../../src/js/trading/CryptoMarket.js');
  const content = fs.readFileSync(cryptoMarketPath, 'utf8');
  
  const startIdx = content.indexOf('const cryptos = {');
  const endIdx = content.indexOf('        };', startIdx);
  const codeBlock = content.slice(startIdx + 'const cryptos = '.length, endIdx + 10);
  
  const fn = new Function(`return ${codeBlock}`);
  const cryptosObj = fn();
  
  return Object.entries(cryptosObj).map(([symbol, data]) => ({
    symbol,
    name: data.name,
    price: data.price,
    basePrice: data.basePrice,
    volatility: data.volatility,
    sector: data.sector || 'General',
    category: data.category || '',
    icon: data.icon || '🪙'
  }));
}

async function run() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  const stocks = getStocksData();
  const cryptos = getCryptosData();
  console.log(`Found ${stocks.length} stocks and ${cryptos.length} cryptos to seed.`);

  await client.query('BEGIN');

  try {
    // 1. Seed All 75 Stocks
    console.log('Seeding all 75 Stocks into `stocks` and `market_state`...');
    for (const s of stocks) {
      const priceMinor = Math.round(s.basePrice * 100);
      const stockRes = await client.query(`
        INSERT INTO stocks (symbol, name, sector, tick_size, lot_size, base_price, shares_outstanding)
        VALUES ($1, $2, $3, 1, 1, $4, 1000000000)
        ON CONFLICT (symbol) DO UPDATE SET
          name = EXCLUDED.name,
          sector = EXCLUDED.sector,
          base_price = EXCLUDED.base_price
        RETURNING id, symbol, base_price;
      `, [s.symbol, s.name, s.sector, priceMinor]);

      const stockRow = stockRes.rows[0];
      await client.query(`
        INSERT INTO market_state (stock_id, symbol, last_price, previous_close, high_24h, low_24h, volume_24h)
        VALUES ($1, $2, $3, $3, $3, $3, 0)
        ON CONFLICT (stock_id) DO UPDATE SET
          last_price = EXCLUDED.last_price,
          previous_close = EXCLUDED.previous_close;
      `, [stockRow.id, stockRow.symbol, stockRow.base_price]);
    }
    console.log(`✅ Successfully seeded ${stocks.length} stocks!`);

    // 2. Create and Seed Cryptos Table
    console.log('Creating and Seeding `cryptos` and `crypto_market_state` tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cryptos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        sector TEXT NOT NULL DEFAULT 'Layer 1 (L1)',
        category TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '🪙',
        base_price NUMERIC(24, 8) NOT NULL CHECK (base_price > 0),
        volatility NUMERIC(6, 4) NOT NULL DEFAULT 0.05,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crypto_market_state (
        crypto_id UUID PRIMARY KEY REFERENCES cryptos(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL UNIQUE,
        last_price NUMERIC(24, 8) NOT NULL,
        previous_close NUMERIC(24, 8) NOT NULL,
        high_24h NUMERIC(24, 8) NOT NULL,
        low_24h NUMERIC(24, 8) NOT NULL,
        volume_24h NUMERIC(24, 8) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const c of cryptos) {
      const cryptoRes = await client.query(`
        INSERT INTO cryptos (symbol, name, sector, category, icon, base_price, volatility)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (symbol) DO UPDATE SET
          name = EXCLUDED.name,
          sector = EXCLUDED.sector,
          category = EXCLUDED.category,
          icon = EXCLUDED.icon,
          base_price = EXCLUDED.base_price,
          volatility = EXCLUDED.volatility
        RETURNING id, symbol, base_price;
      `, [c.symbol, c.name, c.sector, c.category, c.icon, c.basePrice, c.volatility]);

      const cryptoRow = cryptoRes.rows[0];
      await client.query(`
        INSERT INTO crypto_market_state (crypto_id, symbol, last_price, previous_close, high_24h, low_24h, volume_24h)
        VALUES ($1, $2, $3, $3, $3, $3, 0)
        ON CONFLICT (crypto_id) DO UPDATE SET
          last_price = EXCLUDED.last_price,
          previous_close = EXCLUDED.previous_close;
      `, [cryptoRow.id, cryptoRow.symbol, cryptoRow.base_price]);
    }
    console.log(`✅ Successfully seeded ${cryptos.length} cryptos!`);

    await client.query('COMMIT');
    console.log('🎉 All stocks and cryptos successfully committed to Supabase!');

    // Generate SQL file for user's record
    const sqlPath = path.resolve(__dirname, '../../migrations/004_seed_all_stocks_and_cryptos.sql');
    let sqlContent = `-- Migration 004: Seed All 75 Stocks and 102 Cryptos\n\n`;
    sqlContent += `-- 1. ALL 75 STOCKS\n`;
    sqlContent += `INSERT INTO stocks (symbol, name, sector, tick_size, lot_size, base_price, shares_outstanding)\nVALUES\n`;
    sqlContent += stocks.map(s => `  ('${s.symbol}', '${s.name.replace(/'/g, "''")}', '${s.sector}', 1, 1, ${Math.round(s.basePrice * 100)}, 1000000000)`).join(',\n') + '\n';
    sqlContent += `ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name, sector = EXCLUDED.sector, base_price = EXCLUDED.base_price;\n\n`;
    
    sqlContent += `-- 2. CRYPTO TABLES & 102 CRYPTOS\n`;
    sqlContent += `CREATE TABLE IF NOT EXISTS cryptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'Layer 1 (L1)',
  category TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🪙',
  base_price NUMERIC(24, 8) NOT NULL CHECK (base_price > 0),
  volatility NUMERIC(6, 4) NOT NULL DEFAULT 0.05,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);\n\n`;
    sqlContent += `INSERT INTO cryptos (symbol, name, sector, category, icon, base_price, volatility)\nVALUES\n`;
    sqlContent += cryptos.map(c => `  ('${c.symbol}', '${c.name.replace(/'/g, "''")}', '${c.sector}', '${c.category.replace(/'/g, "''")}', '${c.icon}', ${c.basePrice}, ${c.volatility})`).join(',\n') + '\n';
    sqlContent += `ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name, sector = EXCLUDED.sector, category = EXCLUDED.category, icon = EXCLUDED.icon, base_price = EXCLUDED.base_price, volatility = EXCLUDED.volatility;\n`;

    fs.writeFileSync(sqlPath, sqlContent, 'utf8');
    console.log(`Generated migration script at ${sqlPath}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding transaction rolled back due to error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});

