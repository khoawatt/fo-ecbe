import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12)
}));
