/**
 * Astro performance of the Spinner score. Spinner is a PURE STATIC -- the
 * score projects one constant ARIA attribute, holds no state, runs no effects
 * -- so its Astro file ships NO <script> and there is NO bindSpinner. This
 * test renders the server markup and asserts the one contract a static busy
 * indicator carries: the output root, the projected aria-label, the ring
 * classes, and axe cleanliness. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Spinner from '../../../src/components/spinner/spinner.astro';
import { spinner } from '../../../src/components/spinner/spinner.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Spinner, { props });
  // A spinner is inline content, not a landmark; the page around it supplies
  // the landmark so the axe best-practice region rule is satisfied.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('spinner conformance [astro]', () => {
  it('renders an output root carrying the shared spinner classes', async () => {
    const root = partElement(await render(), 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('output');
    expect(root.className).toContain('animate-spin-spin');
    expect(root.className).not.toContain('motion-reduce:animate-none');
  });

  it('fulfills the contract: root projects aria-label="Loading", no explicit role', async () => {
    const root = partElement(await render(), 'root') as HTMLElement;
    assertContractFulfillment(spinner, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBe('Loading');
  });

  it('size and variant mirror the React/WC props through the same projection', async () => {
    const root = partElement(
      await render({ size: 'lg', variant: 'destructive' }),
      'root',
    ) as HTMLElement;
    expect(root.className).toContain('h-8 w-8 border-3');
    expect(root.className).toContain('border-destructive border-r-transparent');
  });

  it('root is the only declared part', async () => {
    const parts = (await render()).querySelectorAll('[data-part]');
    expect(parts).toHaveLength(1);
  });

  it('is axe-clean rendered inside a landmark', async () => {
    await assertAxeClean(await render());
  });
});
