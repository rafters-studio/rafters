import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as React from 'react';
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
import { Skeleton } from '../../../src/components/skeleton/skeleton';
import { skeleton } from '../../../src/components/skeleton/skeleton.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('skeleton conformance [react]', () => {
  it('fulfills the contract: root renders and projects aria-hidden=true', () => {
    const { container } = render(<Skeleton />);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(skeleton, root, {}, {}, ['root']);
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('carries the shimmer cell utility and drops motion-reduce:animate-none (#2155)', () => {
    // #2155: migrated off the stock animate-pulse onto the shimmer cell's own
    // period utility; motion-reduce:animate-none is removed, not replaced.
    // This test owns only the class the component emits. Whether that class
    // actually compiles to a reduced-motion-exempt rule is proven below, in
    // 'compiles to a rule the reduced-motion law never reaches (#2155)',
    // against the real compiled CSS -- not by citation to another package's
    // test suite.
    render(<Skeleton data-testid="s" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-skeleton-root-waiting');
    expect(root.className).not.toContain('motion-reduce:animate-none');
    expect(root.className).toContain('bg-muted');
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
    // would make the negative assertion on the skeleton cell pass for the
    // wrong reason (nothing to be excluded from).
    render(<Skeleton data-testid="s" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    const renderedClassName = root.className;
    cleanup();

    const fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-skeleton-motion-'));
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

    const cellRule = css.match(/\.animate-skeleton-root-waiting\{([^}]*)\}/)?.[1];
    expect(
      cellRule,
      'animate-skeleton-root-waiting did not compile at all -- the class the component renders has drifted from the cell the exporter names',
    ).toBeDefined();
    expect(cellRule).toContain('animation-iteration-count:infinite');
    expect(cellRule).toMatch(/animation-duration:var\(--rafters-period-shimmer\)/);

    const reduced = (
      css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\{.*?\}\}/g) ?? []
    ).join('');
    expect(
      reduced,
      'the witness class compiled no reduced-motion block at all -- the exclusion below would prove nothing',
    ).toContain('motion-modal-in');
    expect(
      reduced,
      'a reduced-motion block zeroed the shimmer cell -- a period-kind cell must carry none',
    ).not.toContain('animate-skeleton-root-waiting');
  }, 30000);

  it('is a decorative leaf -- no children, no nested parts', () => {
    render(<Skeleton />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.children.length).toBe(0);
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('carries the shadcn data-slot for drop-in parity', () => {
    render(<Skeleton />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.getAttribute('data-slot')).toBe('skeleton');
  });

  it('consumer className merges via classy -- the shadcn sizing surface', () => {
    render(<Skeleton className="h-4 w-48" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-skeleton-root-waiting');
    expect(root.className).toContain('h-4');
    expect(root.className).toContain('w-48');
  });

  it('passes HTML attributes through and stays axe-clean inside a landmark', async () => {
    render(
      <main>
        <Skeleton className="h-12 w-12 rounded-full" data-testid="avatar" />
      </main>,
    );
    const root = body().querySelector('[data-testid="avatar"]') as HTMLElement;
    expect(root.getAttribute('data-part')).toBe('root');
    await assertAxeClean(body());
  });
});
