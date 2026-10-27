import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    // Each test spawns the CLI, and a fresh init installs fonts (#2742):
    // the exec budget (120s) plus room for the assertions.
    testTimeout: 150_000,
    hookTimeout: 150_000,
  },
});
