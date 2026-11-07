/**
 * Dependency Installation
 *
 * Installs npm dependencies using the detected package manager.
 * Based on shadcn's approach using execa.
 */

import { execa } from 'execa';
import ora from 'ora';
import { getPackageManager, type PackageManager } from './get-package-manager.js';
import { log } from './ui.js';

export interface UpdateDependenciesOptions {
  cwd: string;
  silent?: boolean;
}

/**
 * Install dependencies using the appropriate package manager
 */
export async function updateDependencies(
  dependencies: string[],
  devDependencies: string[],
  options: UpdateDependenciesOptions,
): Promise<void> {
  const { cwd, silent } = options;

  // Deduplicate
  const deps = [...new Set(dependencies)];
  const devDeps = [...new Set(devDependencies)];

  if (deps.length === 0 && devDeps.length === 0) {
    return;
  }

  const packageManager = await getPackageManager(cwd, { withFallback: true });

  const spinner = silent ? null : ora('Installing dependencies...').start();

  try {
    // Install regular dependencies
    if (deps.length > 0) {
      await installWithPackageManager(packageManager, deps, { cwd, dev: false });
    }

    // Install dev dependencies
    if (devDeps.length > 0) {
      await installWithPackageManager(packageManager, devDeps, { cwd, dev: true });
    }

    spinner?.succeed('Dependencies installed.');
  } catch (error) {
    spinner?.fail('Failed to install dependencies.');
    throw error;
  }
}

/**
 * The arguments to the package manager that install these dependencies
 */
export function installArgs(
  packageManager: PackageManager,
  dependencies: string[],
  dev: boolean,
): string[] {
  const devFlag = dev ? ['-D'] : [];

  switch (packageManager) {
    case 'npm':
      return ['install', ...devFlag, ...dependencies];

    case 'deno':
      // Deno requires npm: prefix
      return ['add', ...devFlag, ...dependencies.map((dep) => `npm:${dep}`)];

    default:
      // pnpm, yarn, bun all use 'add' command
      return ['add', ...devFlag, ...dependencies];
  }
}

/**
 * Run the appropriate install command for the package manager
 */
async function installWithPackageManager(
  packageManager: PackageManager,
  dependencies: string[],
  options: { cwd: string; dev: boolean },
): Promise<void> {
  const { cwd, dev } = options;
  const args = installArgs(packageManager, dependencies, dev);
  try {
    await execa(packageManager, args, { cwd });
  } catch (error) {
    // npm refuses any install into a tree that already has a peer conflict,
    // such as create-vite's typescript-eslint against TypeScript 7 (#2937).
    // Retry once with --legacy-peer-deps and say which conflict it was.
    const stderr = errorStderr(error);
    if (packageManager !== 'npm' || !stderr.includes('ERESOLVE')) throw error;
    log({
      event: 'add:deps:legacy-peer-deps',
      message: `npm refused the install on an existing peer conflict; retrying with --legacy-peer-deps. ${peerConflict(stderr)}`,
    });
    await execa(packageManager, [...args, '--legacy-peer-deps'], { cwd });
  }
}

function errorStderr(error: unknown): string {
  if (error instanceof Error && 'stderr' in error && typeof error.stderr === 'string') {
    return error.stderr;
  }
  return '';
}

/** The lines of npm's ERESOLVE report that name the installed package and the peer it breaks. */
function peerConflict(stderr: string): string {
  return stderr
    .split('\n')
    .map((line) => line.replace(/^npm (?:error|ERR!)\s*/, '').trim())
    .filter((line) => line.startsWith('Found: ') || /^peer .+ from /.test(line))
    .join('; ');
}
