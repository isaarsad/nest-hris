import { env } from './env.js';

export const config = {
  app: {
    host: env.HOST,
    port: env.PORT,
  },
  auth: {
    jwt: {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
    refreshToken: {
      idleDays: env.REFRESH_TOKEN_TTL_IDLE_DAYS,
      absoluteDays: env.REFRESH_TOKEN_TTL_ABSOLUTE_DAYS,
      concurrencyLeewayMs: env.REFRESH_TOKEN_CONCURRENCY_LEEWAY_MS,
    },
  },
  database: {
    type: 'postgres' as const,
    host: env.PGHOST,
    port: env.PGPORT,
    username: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
  },
};
