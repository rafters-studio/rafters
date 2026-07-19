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

  it('carries the spinning ring with the reduced-motion opt-out', () => {
    render(<Spinner />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('animate-spin');
    expect(root.className).toContain('motion-reduce:animate-none');
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
    expect(root.className).toContain('animate-spin');
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
