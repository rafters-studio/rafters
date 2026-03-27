/**
 * rafters studio
 *
 * Starts the Rafters Studio -- a Vite dev server with the token registry
 * API embedded as a plugin. HMR pushes token changes to the browser
 * instantly. CSS output regenerates on every change.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { getRaftersPaths } from '../utils/paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function studio(): Promise<void> {
  const cwd = process.cwd();
  const paths = getRaftersPaths(cwd);

  if (!existsSync(paths.root)) {
    console.error('No .rafters/ directory found. Run "rafters init" first.');
    process.exit(1);
  }

  // Find studio package -- dist/ -> cli/ -> packages/ then peer studio/
  const studioPath = join(__dirname, '..', '..', 'studio');

  if (!existsSync(studioPath)) {
    console.error(
      'Studio package not found. Install @rafters/studio or run from the rafters monorepo.',
    );
    process.exit(1);
  }

  console.log('Starting Rafters Studio...');
  console.log(`Project: ${cwd}`);
  console.log(`Tokens: ${paths.tokens}`);
  console.log('');

  const subprocess = execa('pnpm', ['dev'], {
    cwd: studioPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      RAFTERS_PROJECT_PATH: cwd,
      RAFTERS_TOKENS_PATH: paths.tokens,
      // tsx/esm resolves .js imports to .ts files in workspace packages
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--import tsx/esm'].filter(Boolean).join(' '),
    },
  });

  process.on('SIGINT', () => {
    subprocess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    subprocess.kill('SIGTERM');
  });

  await subprocess;
}
