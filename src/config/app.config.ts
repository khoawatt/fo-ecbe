import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
  jwtAccessIssuer: process.env.JWT_ACCESS_ISSUER ?? 'fo-ecbe',
  jwtAccessAudience: process.env.JWT_ACCESS_AUDIENCE ?? 'fo-ecbe-api',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 604800),
  jwtRefreshIssuer: process.env.JWT_REFRESH_ISSUER ?? 'fo-ecbe',
  jwtRefreshAudience: process.env.JWT_REFRESH_AUDIENCE ?? 'fo-ecbe-refresh'
}));
