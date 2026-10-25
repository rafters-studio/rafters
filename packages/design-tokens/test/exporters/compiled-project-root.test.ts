/**
 * The compiled and documentation sheets resolve @tailwindcss/cli from the
 * project first (#2843). rafters no longer depends on the CLI, and under
 * `pnpm dlx rafters` its own location never reaches the project's
 * node_modules. Here the CLI is unresolvable from this package's location and
 * resolvable only from the workspace root, the stand-in for the project.
 */

import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { generateBaseSystem } from '../../src/generators/index.js';
import {
  REGISTRY_PLUGINS,
  registryToCompiled,
  registryToDocumentation,
  TokenRegistry,
} from '../../src/index.js';

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    ...actual,
    createRequire: (from: string | URL) => {
      const real = actual.createRequire(from);
      const realResolve = real.resolve;
      const ownLocation = String(from).startsWith('file:');
      const resolve = (request: string, options?: { paths?: string[] }): string => {
        if (ownLocation && request === '@tailwindcss/cli/package.json') {
          throw Object.assign(new Error(`Cannot find module '${request}'`), {
            code: 'MODULE_NOT_FOUND',
          });
        }
        return realResolve(request, options);
      };
      return Object.assign(real, { resolve });
    },
  };
});

const PROJECT_ROOT = join(import.meta.dirname, '../../../..');

function baseRegistry(): TokenRegistry {
  return new TokenRegistry(generateBaseSystem({}).allTokens, REGISTRY_PLUGINS);
}

describe('@tailwindcss/cli resolves from the project (#2843)', () => {
  it('compiles the standalone sheet with the CLI installed only in the project', async () => {
    const css = await registryToCompiled(baseRegistry(), { projectRoot: PROJECT_ROOT });
    expect(css.length).toBeGreaterThan(0);
  });

  it('compiles the documentation sheet with the CLI installed only in the project', async () => {
    const css = await registryToDocumentation(baseRegistry(), { projectRoot: PROJECT_ROOT });
    expect(css.length).toBeGreaterThan(0);
  });

  it('fails naming the CLI when the project does not provide it', async () => {
    await expect(registryToCompiled(baseRegistry())).rejects.toThrow(
      'Failed to resolve @tailwindcss/cli',
    );
  });

  it('fails the documentation sheet naming the CLI and saying to install it in the project', async () => {
    await expect(registryToDocumentation(baseRegistry())).rejects.toThrow(
      'Failed to resolve @tailwindcss/cli -- the documentation export needs it installed in your project',
    );
  });
});
