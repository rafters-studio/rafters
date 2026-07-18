/**
 * Web Component performance of the Skeleton score. The SAME score as the React
 * conformance test -- but Skeleton is a pure static, so there is no controller
 * to drive. The WC renders the placeholder markup with the shared classes and
 * the score's constant aria projection, once, and that is the whole performance.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersSkeleton } from '../../../src/components/skeleton/skeleton.element';
import { skeleton } from '../../../src/components/skeleton/skeleton.behavior';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-skeleton')) {
    customElements.define('rafters-skeleton', RaftersSkeleton);
  }
});

function mount(attrs = ''): HTMLElement {
  document.body.innerHTML = `<rafters-skeleton ${attrs}></rafters-skeleton>`;
  return document.body.querySelector('rafters-skeleton') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('skeleton conformance [wc]', () => {
  it('registers the rafters-skeleton tag on import', () => {
    expect(customElements.get('rafters-skeleton')).toBe(RaftersSkeleton);
  });

  it('renders a root placeholder carrying the shared classes', () => {
    const host = mount();
    const root = shadowRoot(host);
    expect(root).not.toBeNull();
    expect(root.className).toContain('animate-pulse');
    expect(root.className).toContain('motion-reduce:animate-none');
    expect(root.className).toContain('bg-muted');
  });

  it('fulfills the contract: root projects aria-hidden=true (like React)', () => {
    const host = mount();
    const root = shadowRoot(host);
    assertContractFulfillment(skeleton, root, {}, {}, ['root']);
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('is a decorative leaf -- no slot, no children, one declared part', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelector('slot')).toBeNull();
    const root = shadowRoot(host);
    expect(root.children.length).toBe(0);
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('carries the shadcn data-slot for drop-in parity', () => {
    const host = mount();
    expect(shadowRoot(host).getAttribute('data-slot')).toBe('skeleton');
  });

  it('is axe-clean inside a landmark', async () => {
    document.body.innerHTML = '<main><rafters-skeleton></rafters-skeleton></main>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
