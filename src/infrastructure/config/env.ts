import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

const NODE_ENV = process.env.NODE_ENV || 'development';

dotenv.config({
  path: path.resolve(process.cwd(), NODE_ENV === 'test' ? '.env.test' : '.env'),
});

const envSchema = z
  .object({
    // App
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().default(3000),

    // Database
    PGHOST: z.string().min(1),
    PGPORT: z.coerce.number().default(5432),
    PGUSER: z.string().min(1),
    PGPASSWORD: z.string().default(''),
    PGDATABASE: z.string().min(1),

    // Auth - JWT Access Token
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'Minimum of 32 characters required for security'),
    JWT_ACCESS_EXPIRES_IN: z
      .string()
      .regex(
        /^\d+[smhdwy]$/,
        'Must be a number followed by a unit (s, m, h, d, w, y), e.g., 15m',
      )
      .default('15m'),

    // Auth - Refresh Token TTL (in days)
    REFRESH_TOKEN_TTL_IDLE_DAYS: z.coerce.number().int().positive().default(7),
    REFRESH_TOKEN_TTL_ABSOLUTE_DAYS: z.coerce
      .number()
      .int()
      .positive()
      .default(30),
    REFRESH_TOKEN_CONCURRENCY_LEEWAY_MS: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(5000),
  })
  .refine(
    (data) =>
      data.REFRESH_TOKEN_TTL_ABSOLUTE_DAYS > data.REFRESH_TOKEN_TTL_IDLE_DAYS,
    {
      message:
        'REFRESH_TOKEN_TTL_ABSOLUTE_DAYS must be strictly greater than REFRESH_TOKEN_TTL_IDLE_DAYS',
      path: ['REFRESH_TOKEN_TTL_ABSOLUTE_DAYS'],
    },
  );

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');

  const formattedError = z.treeifyError(parsedEnv.error);
  console.error(JSON.stringify(formattedError, null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
