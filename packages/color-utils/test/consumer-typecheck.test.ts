/**
 * A consumer type-checks color-utils from its entry alone (#2937): the package
 * ships `.ts` source, so `skipLibCheck` does not cover it, and this package's
 * tsconfig `include` (which picks up the ambient `.d.ts` files) is not in play.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageDir = join(import.meta.dirname, '..');

describe('consumer type-check', () => {
  it('compiles src/index.ts with no tsconfig', () => {
    const tsc = join(packageDir, 'node_modules', '.bin', 'tsc');
    const args = [
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--module',
      'preserve',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2022',
      '--types',
      'node',
      'src/index.ts',
    ];
    let output = '';
    try {
      execFileSync(tsc, args, { cwd: packageDir, encoding: 'utf-8' });
    } catch (err: unknown) {
      output = err instanceof Error && 'stdout' in err ? String(err.stdout) : String(err);
    }
    expect(output).toBe('');
  }, 60_000);
});
