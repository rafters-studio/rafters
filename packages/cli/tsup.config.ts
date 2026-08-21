import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node22',
    bundle: true,
    noExternal: [
      '@rafters/color-utils',
      '@rafters/composites',
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
  {
    // The Claude Code plugin bundle: a single self-contained .mjs file the
    // plugin ships and runs directly (no npm install, no pnpx, no dlx cache).
    // Wraps the MCP-only entry (src/plugin-entry.ts), never src/index.ts, so
    // vite/lightningcss stay out of the bundle.
    entry: { 'rafters-mcp.bundle': 'src/plugin-entry.ts' },
    format: ['esm'],
    target: 'node22',
    platform: 'node',
    bundle: true,
    splitting: false,
    noExternal: [/.*/],
    banner: {
      // esbuild's synthetic CJS-interop shim cannot satisfy commander's dynamic
      // require('events'); a real createRequire bound to import.meta.url does.
      js: "import { createRequire as __raftersCreateRequire } from 'node:module'; const require = __raftersCreateRequire(import.meta.url);",
    },
    outDir: '../../plugin/bin',
    outExtension: () => ({ js: '.mjs' }),
    clean: false, // must not clean sibling dist/ output from the first config entry
    dts: false,
  },
]);
