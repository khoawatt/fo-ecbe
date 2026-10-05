import { validateEnvironment } from './validated-env';

describe('validateEnvironment', () => {
  const validEnv = {
    NODE_ENV: 'test',
    PORT: '3000',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'postgres',
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
      DB_NAME: 'fo_ecbe_test'
    });
  });

  it('fails fast when a required runtime variable is missing', () => {
    const { DB_NAME: _removed, ...invalidEnv } = validEnv;

    expect(() => validateEnvironment(invalidEnv)).toThrow(
      /DB_NAME/
    );
  });
});
