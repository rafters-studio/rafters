import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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

  it('carries the spinning ring cell utility and never stops under reduced motion (#2155)', () => {
    // #2155: migrated off the stock animate-spin onto the busy cell's own
    // period utility; motion-reduce:animate-none is removed, not replaced.
    // The class the component emits is what this test owns -- the guarantee
    // that a period-kind cell carries no reduced-motion media block at all
    // lives at the compiled layer instead:
    // packages/design-tokens/test/exporters/motion-utilities.test.ts, the
    // "reduced motion zeroes every tier-kind cell and no period-kind cell"
    // case, and motion-css-golden.test.ts's `block('period-spin')`
    // assertion containing no `prefers-reduced-motion`.
    render(<Spinner />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-spinner-root-busy');
    expect(root.className).not.toContain('motion-reduce:animate-none');
  });

  it('size and variant drive the class projection', () => {
    render(<Spinner size="lg" variant="destructive" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('h-8 w-8 border-3');
    expect(root.className).toContain('border-destructive border-r-transparent');
  });

  it('consumer className merges via classy', () => {
    render(<Spinner className="ml-2" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-spinner-root-busy');
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
