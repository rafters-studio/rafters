import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { Spinner } from '../../../src/components/spinner/spinner';
import { spinner } from '../../../src/components/spinner/spinner.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('spinner conformance [react]', () => {
  it('fulfills the contract: root renders and projects aria-label="Loading"', () => {
    const { container } = render(<Spinner />);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(spinner, root, {}, {}, ['root']);
    // role=status is native to <output>; the score states no explicit role.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.tagName.toLowerCase()).toBe('output');
    expect(root.getAttribute('aria-label')).toBe('Loading');
  });

  it('carries the spinning ring cell utility and drops motion-reduce:animate-none (#2155)', () => {
    // #2155: migrated off the stock animate-spin onto the busy cell's own
    // period utility; motion-reduce:animate-none is removed, not replaced.
    // This test owns only the class the component emits. Whether that class
    // actually compiles to a reduced-motion-exempt rule is proven below, in
    // 'compiles to a rule the reduced-motion law never reaches (#2155)',
    // against the real compiled CSS -- not by citation to another package's
    // test suite.
    render(<Spinner />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-spin-spin');
    expect(root.className).not.toContain('motion-reduce:animate-none');
  });

  it('compiles to a rule the reduced-motion law never reaches (#2155)', async () => {
    // The class-string test above proves what the component emits; it cannot
    // prove that class compiles to a loop the reduced-motion law is exempt
    // from -- that is a property of the compiled CSS, not of React output.
    // This test proves it directly: the literal class the component renders
    // is scanned by a real Tailwind + @rafters/design-tokens compile, and the
    // resulting sheet is inspected as text (no jsdom/happy-dom CSS engine
    // involved -- happy-dom silently drops every @layer-wrapped rule, so a
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
    render(<Spinner />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    const renderedClassName = root.className;
    cleanup();

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

  it('size and variant drive the class projection', () => {
    render(<Spinner size="lg" variant="destructive" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('h-8 w-8 border-3');
    expect(root.className).toContain('border-destructive border-r-transparent');
  });

  it('consumer className merges via classy', () => {
    render(<Spinner className="ml-2" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-spin-spin');
    expect(root.className).toContain('ml-2');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    expect(spinner.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });

  it('is axe-clean inside a landmark', async () => {
    render(
      <main>
        <Spinner />
      </main>,
    );
    await assertAxeClean(body());
  });
});
