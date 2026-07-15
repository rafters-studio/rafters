import { afterEach, describe, expect, it } from 'vitest';
import './spinner.element';
import { spinnerBaseClasses, spinnerSizeClasses, spinnerVariantClasses } from './spinner.classes';
import { composeSpinnerClasses, RaftersSpinner } from './spinner.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-spinner');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function innerClass(el: Element): string {
  return el.shadowRoot?.querySelector('output')?.className ?? '';
}

describe('<rafters-spinner>', () => {
  it('registers the rafters-spinner tag on import', () => {
    expect(customElements.get('rafters-spinner')).toBe(RaftersSpinner);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./spinner.element')).resolves.toBeDefined();
    await expect(import('./spinner.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-spinner')).toBe(RaftersSpinner);
  });

  it('renders an output[aria-label=Loading] with a sr-only Loading span', () => {
    const el = mount();
    const root = el.shadowRoot;
    expect(root).not.toBeNull();
    const output = root?.querySelector('output');
    expect(output).not.toBeNull();
    expect(output?.getAttribute('aria-label')).toBe('Loading');
    const sr = output?.querySelector('span.sr-only');
    expect(sr).not.toBeNull();
    expect(sr?.textContent).toBe('Loading');
    // Output hosts exactly one child: the sr-only span.
    expect(output?.children.length).toBe(1);
    // Shadow root hosts exactly one top-level element.
    expect(root?.childNodes.length).toBe(1);
  });

  it('applies base + default variant + default size classes', () => {
    const el = mount();
    expect(innerClass(el)).toBe(composeSpinnerClasses('default', 'default'));
  });

  it('falls back to default size/variant for unknown values', () => {
    const el = mount({ size: 'gigantic', variant: 'nonsense' });
    const css = innerClass(el);
    expect(css).toContain(spinnerVariantClasses.default);
    expect(css).toContain(spinnerSizeClasses.default);
  });

  it('reflects size attribute changes to the inner class string', () => {
    const el = mount();
    el.setAttribute('size', 'lg');
    expect(innerClass(el)).toContain(spinnerSizeClasses.lg);
  });

  it('reflects variant attribute changes to the inner class string', () => {
    const el = mount();
    el.setAttribute('variant', 'destructive');
    expect(innerClass(el)).toContain(spinnerVariantClasses.destructive);
  });

  it('carries the spin animation utilities including the reduced-motion opt-out', () => {
    const el = mount();
    const css = innerClass(el);
    expect(css).toContain('animate-spin');
    expect(css).toContain('motion-reduce:animate-none');
    expect(css).toContain(spinnerBaseClasses);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'spinner.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersSpinner.observedAttributes).toEqual(['size', 'variant']);
  });
});
