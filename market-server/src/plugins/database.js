import fp from 'fastify-plugin';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Parse PostgreSQL INT8 (OID 20) as safe JavaScript numbers
pg.types.setTypeParser(20, (val) => {
  if (val === null) return null;
  const num = Number(val);
  return Number.isSafeInteger(num) ? num : val;
});

export class DatabaseClient {
  constructor(pool) {
    this.pool = pool;
  }

  async query(text, params = []) {
    return this.pool.query(text, params);
  }

  async withTransaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck() {
    const res = await this.pool.query('SELECT 1 AS ok');
    return res.rows[0]?.ok === 1;
  }

  async close() {
    await this.pool.end();
  }
}

async function databasePlugin(fastify, options = {}) {
  if (options.db) {
    fastify.decorate('db', options.db);
    fastify.decorate('supabase', options.supabase || null);
    return;
  }

  if (!env.DATABASE_URL) {
    fastify.log.warn('DATABASE_URL is not set. Database plugin initialized in unconfigured state.');
    fastify.decorate('db', null);
    fastify.decorate('supabase', null);
    return;
  }

  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    fastify.log.error({ err }, 'Unexpected PostgreSQL pool error');
  });

  const db = new DatabaseClient(pool);
  fastify.decorate('db', db);

  if (env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)) {
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    fastify.decorate('supabase', supabase);
  } else {
    fastify.decorate('supabase', null);
  }

  fastify.addHook('onClose', async () => {
    await db.close();
  });
}

export default fp(databasePlugin, {
  name: 'database-plugin'
});

