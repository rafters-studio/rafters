/**
 * rafters check
 *
 * Runs the rafters-check bin the project itself has installed and passes its
 * output and exit code through. The check lives in @rafters/veneer, which the
 * CLI does not depend on: a rafters install must not bring typescript and the
 * Astro language server to every project.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execa } from 'execa';
import { getPackageManager } from '../utils/get-package-manager.js';
import { installArgs } from '../utils/update-dependencies.js';

/** Exit code for a check that could not run, as distinct from 1, a check with findings. */
const COULD_NOT_RUN = 2;

/** The nearest rafters-check bin at or above `start`, so a workspace root's bin serves its packages. */
function findBin(start: string): string | null {
  let dir = start;
  for (;;) {
    const bin = join(dir, 'node_modules', '.bin', 'rafters-check');
    if (existsSync(bin)) return bin;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function check(root?: string): Promise<void> {
  const project = resolve(root ?? process.cwd());
  const bin = findBin(project);

  if (bin === null) {
    const packageManager = await getPackageManager(project);
    const install = installArgs(packageManager, ['@rafters/veneer'], true).join(' ');
    process.stderr.write(
      `rafters-check is not installed. Install it with: ${packageManager} ${install}\n`,
    );
    process.exitCode = COULD_NOT_RUN;
    return;
  }

  const result = await execa(bin, root === undefined ? [] : [root], {
    stdio: 'inherit',
    reject: false,
  });
  // No exit code: the bin never started or a signal ended it, and nothing else reports that.
  if (result.exitCode === undefined) process.stderr.write(`${result.message}\n`);
  process.exitCode = result.exitCode ?? COULD_NOT_RUN;
}
