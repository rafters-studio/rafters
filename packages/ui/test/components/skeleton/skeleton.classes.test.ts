import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import {
  skeletonBaseClasses,
  skeletonClasses,
} from '../../../src/components/skeleton/skeleton.classes';

function root(): string {
  return skeletonClasses({}, {}).root;
}

describe('skeleton classes', () => {
  it('carries the shimmer cell utility, not the stock animate-pulse', () => {
    expect(root()).toContain('animate-pulse-shimmer');
    expect(root().split(/[\s:]+/)).not.toContain('animate-pulse');
  });

  it('never stops the shimmer under reduced motion -- period cells are exempt', () => {
    // #2155: motion-reduce:animate-none is removed, not replaced. The loop
    // slows only if a designer retunes period-shimmer; reduced motion never
    // stops it (the compiled-layer guarantee lives at
    // packages/design-tokens/test/exporters/motion-utilities.test.ts, the
    // "reduced motion zeroes every tier-kind cell and no period-kind cell"
    // case).
    expect(root()).not.toContain('motion-reduce:animate-none');
  });

  // `skeleton / root / content ready` assigns a fade-out (tier `fast`, curve
  // role `exit`) that Skeleton cannot key off anything: no config, no state,
  // and "content ready" is the consumer unmounting the element. A
  // `data-[state=ready]:` hook would name a state nothing sets -- the dead
  // class #2225 removed elsewhere -- so the row is reported, not faked.
  it('names no content-ready fade, since no state drives one', () => {
    expect(root()).not.toContain('animate-fade-out-fast-exit');
    expect(root()).not.toContain('data-[state=');
  });

  it('is a rounded, muted surface (semantic token, not a raw colour utility)', () => {
    expect(root()).toContain('rounded-md');
    expect(root()).toContain('bg-muted');
  });

  it('is a single constant class string -- no config, no variant channel', () => {
    expect(root()).toBe(skeletonBaseClasses);
  });

  it('compiles to a rule the reduced-motion law never reaches (#2155)', async () => {
    // Ported from the React spec (#2329): a React render's DOM
    // is not needed here -- `skeletonBaseClasses` IS the literal class the
    // component renders, since skeletonClasses() has no config/state
    // channel. This proves that class compiles to a loop the reduced-motion
    // law is exempt from -- a property of the compiled CSS, not of any
    // framework's output. The literal class is scanned by a real Tailwind +
    // @rafters/design-tokens compile, and the resulting sheet is inspected
    // as text (no jsdom/happy-dom CSS engine involved -- happy-dom silently
    // drops every @layer-wrapped rule, so a getComputedStyle or CSSOM
    // assertion against real compiled output would pass vacuously
    // regardless of what the sheet actually says).
    //
    // motion-modal-in rides along in the fixture purely as a witness: a
    // tier-kind class known (packages/design-tokens/test/exporters/
    // motion-css-golden.test.ts) to compile a real reduced-motion block. Its
    // presence in `reduced` below is what proves the reduced-motion
    // mechanism fired at all in this compile -- without it, an empty
    // `reduced` string would make the negative assertion on the skeleton
    // cell pass for the wrong reason (nothing to be excluded from).
    const fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-skeleton-motion-'));
    let css: string;
    try {
      writeFileSync(
        join(fixtureDir, 'probe.classes.ts'),
        `export const x = '${skeletonBaseClasses} motion-modal-in';\n`,
      );
      const registry = new TokenRegistry(generateBaseSystem({}).allTokens, [
        scalePlugin,
        contrastPlugin,
        statePlugin,
        invertPlugin,
      ]);
      css = await registryToCompiled(registry, { contentSources: [fixtureDir] });
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }

    const cellRule = css.match(/\.animate-pulse-shimmer\{([^}]*)\}/)?.[1];
    expect(
      cellRule,
      'animate-pulse-shimmer did not compile at all -- the class the component renders has drifted from the cell the exporter names',
    ).toBeDefined();
    // The loop is the animation SHORTHAND Tailwind generates from the
    // `--animate-*` key, so both the period and `infinite` ride inside the
    // key's value rather than standing as longhand declarations on the rule.
    expect(cellRule, 'the loop rule is not built on the key').toContain(
      'animation:var(--animate-pulse-shimmer)',
    );
    expect(css, 'the loop key does not run forever on its period leaf').toMatch(
      /--animate-pulse-shimmer:[^;]*var\(--rafters-period-shimmer\)[^;]*\binfinite\b/,
    );

    const reduced = (
      css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\{.*?\}\}/g) ?? []
    ).join('');
    // THE WITNESS IS THE LAW ITSELF. The reduced-motion rule is written on
    // the LEAVES now -- one `:root` override zeroing every duration and
    // delay -- so a sheet carrying it proves the mechanism fired, which is
    // what makes the exclusion below meaningful.
    expect(
      reduced,
      'no reduced-motion block compiled at all -- the exclusion below would prove nothing',
    ).toMatch(/--rafters-duration-[a-z]+:\s*0/);
    expect(reduced, 'the loop period was zeroed -- work loops slow, they never stop').not.toContain(
      '--rafters-period-shimmer',
    );
  }, 30000);
});
