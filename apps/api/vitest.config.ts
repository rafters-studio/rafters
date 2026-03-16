import path from 'node:path';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.jsonc' },
      miniflare: {
        compatibilityDate: '2025-09-06',
        compatibilityFlags: ['nodejs_compat'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@scalar/hono-api-reference': path.resolve(__dirname, './test/mocks/scalar.ts'),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    // Vitest 4 fails on unhandled rejections (v3 warned). AI binding mock
    // produces "Cannot read properties of undefined (reading 'run')" during
    // test teardown. Remove once AI bindings are properly mocked.
    dangerouslyIgnoreUnhandledErrors: true,
  },
});
