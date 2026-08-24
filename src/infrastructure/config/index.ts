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
      idle: env.REFRESH_TOKEN_TTL_IDLE_DAYS,
      absolute: env.REFRESH_TOKEN_TTL_ABSOLUTE_DAYS,
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
