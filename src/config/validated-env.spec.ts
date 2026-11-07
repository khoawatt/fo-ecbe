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
    DB_NAME: 'fo_ecbe_test'
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
});
