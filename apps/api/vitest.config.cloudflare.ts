import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityFlags: ['nodejs_compat'],
        queueConsumers: {
          COLOR_SEED_QUEUE: { maxBatchTimeout: 0.05 /* 50ms */ },
        },
      },
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.spec.ts', 'test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
