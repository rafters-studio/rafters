import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node22',
    bundle: true,
    noExternal: [
      '@rafters/color-utils',
      '@rafters/design-tokens',
      '@rafters/shared',
      '@rafters/studio',
    ],
    external: ['commander', '@modelcontextprotocol/sdk', 'vite'],
    outDir: 'dist',
    clean: true,
  },
  {
    entry: ['src/registry/types.ts'],
    format: ['esm'],
    target: 'node22',
    dts: true,
    bundle: true,
    external: ['zod'],
    outDir: 'dist/registry',
    clean: false,
  },
]);
