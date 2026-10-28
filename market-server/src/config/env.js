import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z.string().optional().default(''),
  DATABASE_SSL: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),

  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_JWT_SECRET: z.string().optional().default(''),

  PRICE_SCALE: z.coerce.number().int().positive().default(100),
  DEFAULT_STARTING_BALANCE: z.coerce.number().int().nonnegative().default(10000000),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(250),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  ALLOW_DEV_HEADER_AUTH: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export default env;

