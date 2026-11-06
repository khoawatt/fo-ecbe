import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.integration-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000
  }
});
