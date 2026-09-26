import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import { spinnerClasses } from '../../../src/components/spinner/spinner.classes';

function root(config: Parameters<typeof spinnerClasses>[0]): string {
  return spinnerClasses(config, {}).root;
}

describe('spinner classes', () => {
  it('always carries the spinning ring cell utility, not the stock animate-spin', () => {
    const classes = root({});
    const tokens = classes.split(/\s+/);
    expect(classes).toContain('inline-block');
    expect(classes).toContain('rounded-full');
    expect(classes).toContain('animate-spin-spin');
    // `animate-spin-spin` itself contains the substring `animate-spin`,
    // so this must check for the OLD utility as a whole class token, not a
    // substring match.
    expect(tokens).not.toContain('animate-spin');
  });

  it('never stops spinning under reduced motion -- period cells are exempt', () => {
    // #2155: motion-reduce:animate-none is removed, not replaced. The loop
    // slows only if a designer retunes period-spin; reduced motion never
    // stops it (the compiled-layer guarantee lives at
    // packages/design-tokens/test/exporters/motion-utilities.test.ts, the
    // "reduced motion zeroes every tier-kind cell and no period-kind cell"
    // case).
    expect(root({})).not.toContain('motion-reduce:animate-none');
  });

  it('defaults to the default size and the primary variant ring', () => {
    const classes = root({});
    expect(classes).toContain('h-6 w-6 border-2');
    expect(classes).toContain('border-primary border-r-transparent');
  });

  it('size selects the ring box and stroke', () => {
    expect(root({ size: 'sm' })).toContain('h-4 w-4 border-2');
    expect(root({ size: 'lg' })).toContain('h-8 w-8 border-3');
  });

  it('variant colours the ring with a semantic role token and a transparent arc', () => {
    expect(root({ variant: 'destructive' })).toContain('border-destructive border-r-transparent');
    expect(root({ variant: 'success' })).toContain('border-success border-r-transparent');
    expect(root({ variant: 'muted' })).toContain('border-muted-foreground border-r-transparent');
  });

  it('never emits a raw arbitrary value', () => {
    expect(root({ size: 'lg', variant: 'info' })).not.toMatch(/\[[a-z0-9.#]+\]/);
  });
});

describe('spinner classes compile (#2155)', () => {
  it('compiles to a rule the reduced-motion law never reaches', async () => {
    // The class-string tests above prove what the classes function emits; they
    // cannot prove that class compiles to a loop the reduced-motion law is
    // exempt from -- that is a property of the compiled CSS. This test proves
    // it directly: the literal class the classes function returns is scanned
    // by a real Tailwind + @rafters/design-tokens compile, and the resulting
    // sheet is inspected as text (no jsdom/happy-dom CSS engine involved --
    // happy-dom silently drops every @layer-wrapped rule, so a
    // getComputedStyle or CSSOM assertion against real compiled output would
    // pass vacuously regardless of what the sheet actually says).
    //
    // motion-modal-in rides along in the fixture purely as a witness: a
    // tier-kind class known (packages/design-tokens/test/exporters/
    // motion-css-golden.test.ts) to compile a real reduced-motion block. Its
    // presence in `reduced` below is what proves the reduced-motion mechanism
    // fired at all in this compile -- without it, an empty `reduced` string
    // would make the negative assertion on the spinner cell pass for the
    // wrong reason (nothing to be excluded from).
    const renderedClassName = root({});

    const fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-spinner-motion-'));
    let css: string;
    try {
      writeFileSync(
        join(fixtureDir, 'probe.classes.ts'),
        `export const x = '${renderedClassName} motion-modal-in';\n`,
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

    const cellRule = css.match(/\.animate-spin-spin\{([^}]*)\}/)?.[1];
    expect(
      cellRule,
      'animate-spin-spin did not compile at all -- the class the component renders has drifted from the cell the exporter names',
    ).toBeDefined();
    // The loop is the animation SHORTHAND Tailwind generates from the
    // `--animate-*` key, so both the period and `infinite` ride inside the key's
    // value rather than standing as longhand declarations on the rule.
    expect(cellRule, 'the loop rule is not built on the key').toContain(
      'animation:var(--animate-spin-spin)',
    );
    expect(css, 'the loop key does not run forever on its period leaf').toMatch(
      /--animate-spin-spin:[^;]*var\(--rafters-period-spin\)[^;]*\binfinite\b/,
    );

    const reduced = (
      css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\{.*?\}\}/g) ?? []
    ).join('');
    // THE WITNESS IS THE LAW ITSELF. The reduced-motion rule is written on the
    // LEAVES now -- one `:root` override that zeroes every duration and delay --
    // so a compiled sheet that carries it is proof the mechanism fired, and the
    // exclusion below is then meaningful. (It used to witness on
    // `motion-modal-in`'s own block, which is a different rule: that one re-sets
    // transition-property to drop transforms, a cross-fade substitution rather
    // than the zero.)
    expect(
      reduced,
      'no reduced-motion block compiled at all -- the exclusion below would prove nothing',
    ).toMatch(/--rafters-duration-[a-z]+:\s*0/);
    expect(reduced, 'the loop period was zeroed -- work loops slow, they never stop').not.toContain(
      '--rafters-period-spin',
    );
  }, 30000);
});
