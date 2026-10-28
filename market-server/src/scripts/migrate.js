import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

async function runMigrations() {
  if (!env.DATABASE_URL) {
    console.error('[Migrate] DATABASE_URL is not configured in .env');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false
  });

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM _schema_migrations WHERE filename = $1',
        [file]
      );

      if (rowCount > 0) {
        console.log(`[Migrate] Skipping already applied migration: ${file}`);
        continue;
      }

      const sqlPath = path.join(MIGRATIONS_DIR, file);
      const sql = await fs.readFile(sqlPath, 'utf8');

      console.log(`[Migrate] Applying ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[Migrate] Applied ${file} successfully.`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('[Migrate] All migrations completed.');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('[Migrate] Failed:', err);
  process.exit(1);
});

