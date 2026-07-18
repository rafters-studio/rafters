import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Separator } from '../../../src/components/separator/separator';
import { separator } from '../../../src/components/separator/separator.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('separator conformance [react]', () => {
  it('fulfills the contract by default: decorative rule projects role="none"', () => {
    const { container } = render(<Separator />);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(
      separator,
      root,
      {},
      { orientation: 'horizontal', decorative: true },
      ['root'],
    );
    expect(root.getAttribute('role')).toBe('none');
    // A decorative rule announces no orientation.
    expect(root.hasAttribute('aria-orientation')).toBe(false);
  });

  it('opting out projects a semantic separator carrying aria-orientation', () => {
    const { container } = render(<Separator decorative={false} orientation="vertical" />);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(separator, root, {}, { orientation: 'vertical', decorative: false }, [
      'root',
    ]);
    expect(root.getAttribute('role')).toBe('separator');
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('defaults to a horizontal rule and flips axis on orientation', () => {
    const { rerender, container } = render(<Separator />);
    let root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('h-px w-full');
    rerender(<Separator orientation="vertical" />);
    root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('h-full w-px');
    expect(root.className).not.toContain('h-px w-full');
  });

  it('consumer className merges via classy', () => {
    render(<Separator className="my-4" />);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('bg-border');
    expect(root.className).toContain('my-4');
  });

  it('is axe-clean as a decorative rule inside a landmark', async () => {
    render(
      <main>
        <p>Above</p>
        <Separator />
        <p>Below</p>
      </main>,
    );
    await assertAxeClean(body());
  });

  it('is axe-clean as a semantic separator inside a landmark', async () => {
    render(
      <main>
        <p>Above</p>
        <Separator decorative={false} />
        <p>Below</p>
      </main>,
    );
    await assertAxeClean(body());
  });

  it('has no keyboard contract -- a rule dispatches nothing', () => {
    expect(separator.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
