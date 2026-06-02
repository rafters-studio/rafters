import { afterEach, describe, expect, it } from 'vitest';
import { badgeSizeClasses, badgeVariantClasses } from './badge.classes';
import { composeBadgeClasses, RaftersBadge } from './badge.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function innerClass(el: Element): string {
  return el.shadowRoot?.querySelector('span')?.className ?? '';
}

describe('<rafters-badge>', () => {
  it('registers the rafters-badge tag on import', () => {
    expect(customElements.get('rafters-badge')).toBe(RaftersBadge);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./badge.element')).resolves.toBeDefined();
    await expect(import('./badge.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-badge')).toBe(RaftersBadge);
  });

  it('renders a single span containing a slot', () => {
    const el = document.createElement('rafters-badge');
    document.body.appendChild(el);
    const span = el.shadowRoot?.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.children.length).toBe(1);
    expect(span?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('applies base + default variant + default size classes', () => {
    const el = document.createElement('rafters-badge');
    document.body.appendChild(el);
    expect(innerClass(el)).toBe(composeBadgeClasses('default', 'default'));
  });

  it('falls back to default variant for unknown values', () => {
    const el = document.createElement('rafters-badge');
    el.setAttribute('variant', 'nonsense');
    document.body.appendChild(el);
    expect(innerClass(el)).toContain(badgeVariantClasses.default);
  });

  it('falls back to default size for unknown values', () => {
    const el = document.createElement('rafters-badge');
    el.setAttribute('size', 'gigantic');
    document.body.appendChild(el);
    expect(innerClass(el)).toContain(badgeSizeClasses.default);
  });

  it('reflects variant attribute changes to the inner class string', () => {
    const el = document.createElement('rafters-badge');
    document.body.appendChild(el);
    el.setAttribute('variant', 'destructive');
    expect(innerClass(el)).toContain(badgeVariantClasses.destructive);
  });

  it('reflects size attribute changes to the inner class string', () => {
    const el = document.createElement('rafters-badge');
    document.body.appendChild(el);
    el.setAttribute('size', 'lg');
    expect(innerClass(el)).toContain(badgeSizeClasses.lg);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'badge.element.ts'), 'utf-8');
    expect(source).not.toMatch(/var\(/);
  });
});
