/**
 * A consumer type-checks color-utils from its entry alone (#2937): the package
 * ships `.ts` source, so `skipLibCheck` does not cover it, and this package's
 * tsconfig `include` (which picks up the ambient `.d.ts` files) is not in play.
 * Each case compiles with the flags a fresh project of that kind sets.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageDir = join(import.meta.dirname, '..');

/** create-vite react-ts, tsconfig.app.json. */
const VITE_REACT = [
  '--target',
  'es2023',
  '--module',
  'esnext',
  '--moduleResolution',
  'bundler',
  '--allowImportingTsExtensions',
  '--verbatimModuleSyntax',
  '--moduleDetection',
  'force',
  '--noUnusedLocals',
  '--noUnusedParameters',
  '--erasableSyntaxOnly',
  '--noFallthroughCasesInSwitch',
];

/** create-astro, astro/tsconfigs/strict. */
const ASTRO = [
  '--target',
  'esnext',
  '--module',
  'esnext',
  '--moduleResolution',
  'bundler',
  '--allowImportingTsExtensions',
  '--resolveJsonModule',
  '--verbatimModuleSyntax',
  '--isolatedModules',
  '--forceConsistentCasingInFileNames',
  '--esModuleInterop',
  '--allowJs',
];

function typecheck(flags: readonly string[]): string {
  const tsc = join(packageDir, 'node_modules', '.bin', 'tsc');
  const args = [
    '--ignoreConfig',
    '--noEmit',
    '--strict',
    '--skipLibCheck',
    '--types',
    'node',
    ...flags,
    'src/index.ts',
  ];
  try {
    execFileSync(tsc, args, { cwd: packageDir, encoding: 'utf-8' });
    return '';
  } catch (err: unknown) {
    return err instanceof Error && 'stdout' in err ? String(err.stdout) : String(err);
  }
}

describe('consumer type-check', () => {
  it('compiles src/index.ts as a fresh Vite React project does', () => {
    expect(typecheck(VITE_REACT)).toBe('');
  }, 60_000);

  it('compiles src/index.ts as a fresh Astro project does', () => {
    expect(typecheck(ASTRO)).toBe('');
  }, 60_000);
});
