import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

const NODE_ENV = process.env.NODE_ENV || 'development';

dotenv.config({
  path: path.resolve(process.cwd(), NODE_ENV === 'test' ? '.env.test' : '.env'),
});

const envSchema = z.object({
  // App
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3000),

  // Database
  PGHOST: z.string().min(1),
  PGPORT: z.coerce.number().default(5432),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().default(''),
  PGDATABASE: z.string().min(1),

  // Auth
  ACCESS_TOKEN_KEY: z.string().min(8),
  REFRESH_TOKEN_KEY: z.string().min(8),
  ACCESS_TOKEN_AGE: z.string().default('15m'),
  PRE_AUTH_TOKEN_KEY: z.string().min(8),
  PRE_AUTH_TOKEN_AGE: z.string().default('5m'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');

  const formattedError = z.treeifyError(parsedEnv.error);
  console.error(JSON.stringify(formattedError, null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
