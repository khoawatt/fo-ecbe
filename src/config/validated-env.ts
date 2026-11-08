import { envSchema } from './env.schema.js';

export interface ValidatedEnv {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  BCRYPT_SALT_ROUNDS: number;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  JWT_ACCESS_ISSUER: string;
  JWT_ACCESS_AUDIENCE: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_TTL_SECONDS: number;
  JWT_REFRESH_ISSUER: string;
  JWT_REFRESH_AUDIENCE: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}

export function validateEnvironment(env: NodeJS.ProcessEnv): ValidatedEnv {
  const { value, error } = envSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  });
  if (error) throw new Error(`Invalid environment configuration: ${error.message}`);
  if (value.JWT_REFRESH_SECRET === value.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }
  if (value.JWT_REFRESH_AUDIENCE === value.JWT_ACCESS_AUDIENCE) {
    throw new Error('Refresh audience must differ from access audience');
  }
  return value as ValidatedEnv;
}
