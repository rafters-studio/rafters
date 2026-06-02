import { afterEach, describe, expect, it } from 'vitest';
import './label.element';
import { labelVariantClasses } from './label.classes';
import { composeLabelClasses, RaftersLabel } from './label.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function innerClass(el: Element): string {
  return el.shadowRoot?.querySelector('label')?.className ?? '';
}

describe('<rafters-label>', () => {
  it('registers the rafters-label tag on import', () => {
    expect(customElements.get('rafters-label')).toBe(RaftersLabel);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./label.element')).resolves.toBeDefined();
    await expect(import('./label.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-label')).toBe(RaftersLabel);
  });

  it('renders a single label containing a slot', () => {
    const el = document.createElement('rafters-label');
    document.body.appendChild(el);
    const inner = el.shadowRoot?.querySelector('label');
    expect(inner).not.toBeNull();
    expect(inner?.tagName.toLowerCase()).toBe('label');
    expect(inner?.children.length).toBe(1);
    expect(inner?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('applies base + default variant classes', () => {
    const el = document.createElement('rafters-label');
    document.body.appendChild(el);
    expect(innerClass(el)).toBe(composeLabelClasses('default'));
  });

  it('falls back to default variant for unknown values', () => {
    const el = document.createElement('rafters-label');
    el.setAttribute('variant', 'nonsense');
    document.body.appendChild(el);
    expect(innerClass(el)).toContain(labelVariantClasses.default);
  });

  it('reflects variant attribute changes to the inner class string', () => {
    const el = document.createElement('rafters-label');
    document.body.appendChild(el);
    el.setAttribute('variant', 'destructive');
    expect(innerClass(el)).toContain(labelVariantClasses.destructive);
  });

  it('forwards the for attribute to the inner label element', () => {
    const el = document.createElement('rafters-label');
    el.setAttribute('for', 'email');
    document.body.appendChild(el);
    const inner = el.shadowRoot?.querySelector('label');
    expect(inner?.getAttribute('for')).toBe('email');
  });

  it('updates the inner for attribute when the host attribute changes', () => {
    const el = document.createElement('rafters-label');
    document.body.appendChild(el);
    const inner = el.shadowRoot?.querySelector('label');
    expect(inner?.getAttribute('for')).toBeNull();
    el.setAttribute('for', 'email');
    expect(inner?.getAttribute('for')).toBe('email');
    el.removeAttribute('for');
    expect(inner?.getAttribute('for')).toBeNull();
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'label.element.ts'), 'utf-8');
    expect(source).not.toMatch(/var\(/);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersLabel.observedAttributes).toEqual(['variant', 'for']);
  });
});
