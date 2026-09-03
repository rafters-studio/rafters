/**
 * Web Component performance of the Spinner score. The SAME score as the React
 * conformance test -- but Spinner is a pure static, so there is no controller
 * to drive. The WC renders the ring markup with the shared classes and the
 * projected label, once, and that is the whole performance.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersSpinner } from '../../../src/components/spinner/spinner.element';
import { spinner } from '../../../src/components/spinner/spinner.behavior';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-spinner')) {
    customElements.define('rafters-spinner', RaftersSpinner);
  }
});

function mount(attrs = ''): HTMLElement {
  document.body.innerHTML = `<main><rafters-spinner ${attrs}></rafters-spinner></main>`;
  return document.body.querySelector('rafters-spinner') as HTMLElement;
}

function shadowRoot(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('spinner conformance [wc]', () => {
  it('registers the rafters-spinner tag on import', () => {
    expect(customElements.get('rafters-spinner')).toBe(RaftersSpinner);
  });

  it('renders an output root carrying the shared spinner classes', () => {
    const root = shadowRoot(mount());
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('output');
    expect(root.className).toContain('animate-spin-spin');
    expect(root.className).not.toContain('motion-reduce:animate-none');
  });

  it('fulfills the contract: root projects aria-label="Loading" (like React)', () => {
    const root = shadowRoot(mount());
    assertContractFulfillment(spinner, root, {}, {}, ['root']);
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBe('Loading');
  });

  it('root is the only declared part', () => {
    const host = mount();
    const parts = host.shadowRoot?.querySelectorAll('[data-part]') ?? [];
    expect(parts).toHaveLength(1);
  });

  it('size and variant attributes mirror the React props through the same projection', () => {
    const root = shadowRoot(mount('size="lg" variant="destructive"'));
    expect(root.className).toContain('h-8 w-8 border-3');
    expect(root.className).toContain('border-destructive border-r-transparent');
  });

  it('falls back to default size/variant for unknown attribute values', () => {
    const root = shadowRoot(mount('size="gigantic" variant="nonsense"'));
    expect(root.className).toContain('h-6 w-6 border-2');
    expect(root.className).toContain('border-primary border-r-transparent');
  });

  it('re-renders the ring when size changes after connect', () => {
    const host = mount();
    expect(shadowRoot(host).className).toContain('h-6 w-6');
    host.setAttribute('size', 'lg');
    expect(shadowRoot(host).className).toContain('h-8 w-8');
  });

  it('is axe-clean inside a landmark', async () => {
    mount();
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
