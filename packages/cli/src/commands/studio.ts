/**
 * rafters studio
 *
 * Starts the Rafters Studio -- a Vite dev server with the token registry
 * API embedded as a plugin. HMR pushes token changes to the browser.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { getRaftersPaths } from '../utils/paths.js';

export async function studio(): Promise<void> {
  const cwd = process.cwd();
  const paths = getRaftersPaths(cwd);

  if (!existsSync(paths.root)) {
    console.error('No .rafters/ directory found. Run "rafters init" first.');
    process.exit(1);
  }

  console.log('Starting Rafters Studio...');
  console.log(`Project: ${cwd}`);
  console.log(`Tokens: ${paths.tokens}`);
  console.log('');

  process.env.RAFTERS_PROJECT_PATH = cwd;
  process.env.RAFTERS_TOKENS_PATH = paths.tokens;

  const studioApiPath = import.meta.resolve('@rafters/studio/api/vite-plugin');
  const studioRoot = resolve(new URL(studioApiPath).pathname, '..', '..', '..');

  const server = await createServer({
    configFile: resolve(studioRoot, 'vite.config.ts'),
    configLoader: 'runner',
    root: studioRoot,
  });

  await server.listen();
  server.printUrls();
}
