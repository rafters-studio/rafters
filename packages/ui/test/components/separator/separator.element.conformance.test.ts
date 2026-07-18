/**
 * Web Component performance of the Separator score. The SAME score as the
 * React conformance test -- Separator is a static score (role/orientation are
 * a pure function of config), so there is no controller to drive. The WC
 * renders the rule markup with the shared classes and paints the resolved aria
 * projection, once. `decorative` is presence-based here (attribute semantics,
 * faithful to the oracle).
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { separator } from '../../../src/components/separator/separator.behavior';
import { RaftersSeparator } from '../../../src/components/separator/separator.element';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-separator')) {
    customElements.define('rafters-separator', RaftersSeparator);
  }
});

function mount(attrs = ''): HTMLElement {
  document.body.innerHTML = `<main><rafters-separator ${attrs}></rafters-separator></main>`;
  return document.body.querySelector('rafters-separator') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('separator conformance [wc]', () => {
  it('renders a root rule carrying the shared classes', () => {
    const root = shadowRoot(mount());
    expect(root).not.toBeNull();
    expect(root.className).toContain('shrink-0');
    expect(root.className).toContain('bg-border');
    expect(root.className).toContain('h-px w-full');
  });

  it('fulfills the contract by default: decorative rule projects role="none"', () => {
    const root = shadowRoot(mount());
    assertContractFulfillment(
      separator,
      root,
      {},
      { orientation: 'horizontal', decorative: true },
      ['root'],
    );
    expect(root.getAttribute('role')).toBe('none');
    expect(root.hasAttribute('aria-orientation')).toBe(false);
  });

  it('a present decorative attribute opts into the semantic role/aria-orientation pair', () => {
    const host = mount();
    host.setAttribute('decorative', '');
    const root = shadowRoot(host);
    assertContractFulfillment(
      separator,
      root,
      {},
      { orientation: 'horizontal', decorative: false },
      ['root'],
    );
    expect(root.getAttribute('role')).toBe('separator');
    expect(root.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('decorative="false" stays decorative -- faithful to the oracle contract', () => {
    const host = mount('decorative="false"');
    const root = shadowRoot(host);
    expect(root.getAttribute('role')).toBe('none');
    expect(root.hasAttribute('aria-orientation')).toBe(false);
  });

  it('aria-orientation mirrors orientation for a semantic rule', () => {
    const host = mount('decorative orientation="vertical"');
    const root = shadowRoot(host);
    expect(root.getAttribute('role')).toBe('separator');
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('orientation flips the visual axis through the same projection', () => {
    const host = mount();
    expect(shadowRoot(host).className).toContain('h-px w-full');
    host.setAttribute('orientation', 'vertical');
    expect(shadowRoot(host).className).toContain('h-full w-px');
  });

  it('falls back to horizontal for an unknown orientation', () => {
    const root = shadowRoot(mount('orientation="diagonal"'));
    expect(root.className).toContain('h-px w-full');
  });

  it('only root is a declared part and there is no slot -- a rule has no content', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelectorAll('[data-part]')).toHaveLength(1);
    expect(host.shadowRoot?.querySelector('slot')).toBeNull();
  });

  it('is axe-clean as both a decorative and a semantic rule', async () => {
    expect((await axe(document.body)).violations).toEqual([]);
    const host = mount('decorative');
    void host;
    expect((await axe(document.body)).violations).toEqual([]);
  });
});
