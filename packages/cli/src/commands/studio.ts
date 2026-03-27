/**
 * rafters studio
 *
 * Starts the Rafters Studio API server for design system services.
 * The API serves token registry endpoints (getters, setters, reset)
 * that the studio UI and other tools consume.
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

  // Find the API app -- in dev monorepo it's at apps/api
  // From dist/ -> cli/ -> packages/ -> monorepo root -> apps/api
  const devApiPath = join(__dirname, '..', '..', '..', 'apps', 'api');

  if (!existsSync(devApiPath)) {
    console.error('Studio API not found. Run from the rafters monorepo.');
    process.exit(1);
  }

  console.log('Starting Rafters Studio API...');
  console.log(`Project: ${cwd}`);
  console.log(`Tokens: ${paths.tokens}`);
  console.log('');

  const subprocess = execa('pnpm', ['dev'], {
    cwd: devApiPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      RAFTERS_PROJECT_PATH: cwd,
      RAFTERS_TOKENS_PATH: paths.tokens,
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
