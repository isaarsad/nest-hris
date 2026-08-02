import { env } from './env.js';

export const config = {
  app: {
    host: env.HOST,
    port: env.PORT,
  },
  auth: {
    jwtStrategy: 'nesthris',
    accessTokenKey: env.ACCESS_TOKEN_KEY,
    refreshTokenKey: env.REFRESH_TOKEN_KEY,
    accessTokenAge: env.ACCESS_TOKEN_AGE,
    preAuthTokenKey: env.PRE_AUTH_TOKEN_KEY,
    preAuthTokenAge: env.PRE_AUTH_TOKEN_AGE,
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
