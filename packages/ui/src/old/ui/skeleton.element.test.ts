import { afterEach, describe, expect, it } from 'vitest';
import './skeleton.element';
import { skeletonBaseClasses, skeletonVariantClasses } from './skeleton.classes';
import { composeSkeletonClasses, RaftersSkeleton } from './skeleton.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-skeleton');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function innerClass(el: Element): string {
  return el.shadowRoot?.querySelector('div')?.className ?? '';
}

describe('<rafters-skeleton>', () => {
  it('registers the rafters-skeleton tag on import', () => {
    expect(customElements.get('rafters-skeleton')).toBe(RaftersSkeleton);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./skeleton.element')).resolves.toBeDefined();
    await expect(import('./skeleton.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-skeleton')).toBe(RaftersSkeleton);
  });

  it('renders a single div[aria-hidden=true] with no slot', () => {
    const el = mount();
    const root = el.shadowRoot;
    expect(root).not.toBeNull();
    const div = root?.querySelector('div');
    expect(div).not.toBeNull();
    expect(div?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.querySelector('slot')).toBeNull();
    expect(root?.childNodes.length).toBe(1);
    expect(div?.children.length).toBe(0);
  });

  it('applies base + default variant classes', () => {
    const el = mount();
    expect(innerClass(el)).toBe(composeSkeletonClasses('default'));
  });

  it('falls back to default variant for unknown values', () => {
    const el = mount({ variant: 'nonsense' });
    const css = innerClass(el);
    expect(css).toContain(skeletonVariantClasses.default);
    expect(css).not.toContain(skeletonVariantClasses.primary);
    expect(css).not.toContain(skeletonVariantClasses.destructive);
  });

  it('reflects variant attribute changes to the inner class string', () => {
    const el = mount();
    el.setAttribute('variant', 'destructive');
    expect(innerClass(el)).toContain(skeletonVariantClasses.destructive);
  });

  it('carries the pulse animation utilities including the reduced-motion opt-out', () => {
    const el = mount();
    const css = innerClass(el);
    expect(css).toContain('animate-pulse');
    expect(css).toContain('motion-reduce:animate-none');
    expect(css).toContain(skeletonBaseClasses);
  });

  it('reflects primary variant to the primary-subtle background class', () => {
    const el = mount({ variant: 'primary' });
    expect(innerClass(el)).toContain(skeletonVariantClasses.primary);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'skeleton.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersSkeleton.observedAttributes).toEqual(['variant']);
  });
});
