/**
 * Setup standalone Studio development
 *
 * Creates a minimal .rafters structure within the studio package so Studio
 * can run without the CLI or a real project. Mirrors what `rafters init`
 * does but inlined here to avoid pulling the CLI as a dev dep.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  registryToTailwind,
  saveRegistryToDir,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';

const STUDIO_ROOT = join(import.meta.dirname, '..');
const RAFTERS_ROOT = join(STUDIO_ROOT, '.rafters');
const TOKENS_DIR = join(RAFTERS_ROOT, 'tokens');
const OUTPUT_DIR = join(RAFTERS_ROOT, 'output');

async function main(): Promise<void> {
  console.log('Setting up standalone Studio development...\n');

  await mkdir(TOKENS_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const system = generateBaseSystem();
  const registry = new TokenRegistry(system.allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
  console.log(`Generated ${registry.size()} tokens\n`);

  saveRegistryToDir(TOKENS_DIR, registry);
  const namespaces = new Set(registry.list().map((t) => t.namespace));
  console.log(`  Saved tokens across ${namespaces.size} namespaces`);

  // Studio expects two CSS files:
  // - rafters.tailwind.css: static @theme with var() refs (processed by Tailwind)
  // - rafters.vars.css: pure CSS variables (instant HMR on token changes)
  const css = registryToTailwind(registry, { includeImport: true });
  await writeFile(join(OUTPUT_DIR, 'rafters.tailwind.css'), css);
  await writeFile(join(OUTPUT_DIR, 'rafters.vars.css'), css);
  console.log('  Generated rafters.tailwind.css and rafters.vars.css');

  const config = {
    framework: 'vite',
    componentsPath: 'src/components/ui',
    primitivesPath: 'src/lib/primitives',
    cssPath: null,
    exports: {
      tailwind: true,
      typescript: false,
      dtcg: false,
      compiled: false,
    },
  };
  await writeFile(join(RAFTERS_ROOT, 'config.rafters.json'), JSON.stringify(config, null, 2));
  console.log('  Created config.rafters.json');

  console.log('\nStandalone setup complete!');
  console.log('Run: pnpm --filter=@rafters/studio dev:standalone');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
