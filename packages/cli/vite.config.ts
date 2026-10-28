import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
    {
      entry: ['src/index.ts'],
      format: ['esm'],
      target: 'node22',
      platform: 'node',
      fixedExtension: false,
      deps: {
        alwaysBundle: [
          '@rafters/color-utils',
          '@rafters/composites',
          '@rafters/design-tokens',
          '@rafters/shared',
        ],
        neverBundle: ['commander', '@modelcontextprotocol/sdk'],
      },
      dts: false,
      outDir: 'dist',
    },
    {
      entry: ['src/registry/types.ts'],
      format: ['esm'],
      target: 'node22',
      platform: 'node',
      fixedExtension: false,
      // tsgo emits every file its tsconfig includes, and tsconfig.json's reach the workspace
      // packages through paths, where it would write a .d.ts beside each source.
      dts: { generator: 'tsgo', tsconfig: 'tsconfig.types.json' },
      deps: { neverBundle: ['zod'] },
      outDir: 'dist/registry',
      clean: false,
    },
    {
      // The Claude Code plugin bundle: a single self-contained .mjs file the
      // plugin ships and runs directly (no npm install, no pnpx, no dlx cache).
      // Wraps the MCP-only entry (src/plugin-entry.ts), never src/index.ts, so
      // the add/init paths stay out of the bundle.
      entry: { 'rafters-mcp.bundle': 'src/plugin-entry.ts' },
      format: ['esm'],
      target: 'node22',
      platform: 'node',
      deps: { alwaysBundle: [/.*/] },
      banner: {
        // The bundler's synthetic CJS-interop shim cannot satisfy commander's dynamic
        // require('events'); a real createRequire bound to import.meta.url does.
        js: "import { createRequire as __raftersCreateRequire } from 'node:module'; const require = __raftersCreateRequire(import.meta.url);",
      },
      dts: false,
      outDir: '../../plugin/bin',
      outExtensions: () => ({ js: '.mjs' }),
      // JSDoc in the bundled sources names packages the bundle must not carry (css-tree);
      // drop it so test/plugin-bundle.test.ts reads only code.
      outputOptions: { comments: { jsdoc: false } },
      clean: false, // must not clean sibling dist/ output from the first config entry
    },
  ],
});
