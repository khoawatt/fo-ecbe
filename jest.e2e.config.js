module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/e2e/**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testEnvironment: 'node'
};
