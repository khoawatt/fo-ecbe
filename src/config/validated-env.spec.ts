import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './validated-env.js';

describe('validateEnvironment', () => {
  const validEnv: Record<string, string> = {
    NODE_ENV: 'test',
    PORT: '3000',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: ['unit', 'test', 'credential'].join('-'),
    DB_NAME: 'fo_ecbe_test',
    JWT_ACCESS_SECRET: 'synthetic-unit-test-secret-at-least-32-bytes'
  };

  it('accepts a complete valid configuration', () => {
    const result = validateEnvironment(validEnv);

    expect(result).toMatchObject({
      NODE_ENV: 'test',
      PORT: 3000,
      DB_HOST: '127.0.0.1',
      DB_PORT: 5432,
      DB_USERNAME: 'postgres',
      DB_NAME: 'fo_ecbe_test',
      BCRYPT_SALT_ROUNDS: 12
    });
  });

  it('defaults bcrypt rounds to 12 and rejects values outside integer 10 to 15', () => {
    expect(validateEnvironment(validEnv).BCRYPT_SALT_ROUNDS).toBe(12);
    expect(validateEnvironment({ ...validEnv, BCRYPT_SALT_ROUNDS: '15' }).BCRYPT_SALT_ROUNDS).toBe(15);
    for (const invalid of ['9', '16', '12.5', 'abc']) {
      expect(() => validateEnvironment({ ...validEnv, BCRYPT_SALT_ROUNDS: invalid })).toThrow(/BCRYPT_SALT_ROUNDS/);
    }
  });

  it('fails fast when a required runtime variable is missing', () => {
    const invalidEnv = { ...validEnv };
    delete invalidEnv.DB_NAME;

    expect(() => validateEnvironment(invalidEnv)).toThrow(/DB_NAME/);
  });

  it('validates the JWT secret and access-token lifetime', () => {
    expect(validateEnvironment(validEnv).JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(validateEnvironment(validEnv).JWT_ACCESS_ISSUER).toBe('fo-ecbe');
    expect(validateEnvironment(validEnv).JWT_ACCESS_AUDIENCE).toBe('fo-ecbe-api');
    for (const secret of [undefined, 'too-short']) {
      expect(() => validateEnvironment({ ...validEnv, JWT_ACCESS_SECRET: secret })).toThrow(/JWT_ACCESS_SECRET/);
    }
    for (const ttl of ['0', '901', '1.5', 'invalid']) {
      expect(() => validateEnvironment({ ...validEnv, JWT_ACCESS_TTL_SECONDS: ttl })).toThrow(/JWT_ACCESS_TTL_SECONDS/);
    }
    expect(validateEnvironment({ ...validEnv, JWT_ACCESS_TTL_SECONDS: '600' }).JWT_ACCESS_TTL_SECONDS).toBe(600);
  });
});
