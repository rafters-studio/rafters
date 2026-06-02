import { afterEach, describe, expect, it } from 'vitest';
import './kbd.element';
import { kbdBaseClasses } from './kbd.classes';
import { composeKbdClasses, RaftersKbd } from './kbd.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(): HTMLElement {
  const el = document.createElement('rafters-kbd');
  document.body.appendChild(el);
  return el;
}

function innerClass(el: Element): string {
  return el.shadowRoot?.querySelector('kbd')?.className ?? '';
}

describe('<rafters-kbd>', () => {
  it('registers the rafters-kbd tag on import', () => {
    expect(customElements.get('rafters-kbd')).toBe(RaftersKbd);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./kbd.element')).resolves.toBeDefined();
    await expect(import('./kbd.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-kbd')).toBe(RaftersKbd);
  });

  it('renders a single kbd containing a slot', () => {
    const el = mount();
    const inner = el.shadowRoot?.querySelector('kbd');
    expect(inner).not.toBeNull();
    expect(inner?.tagName.toLowerCase()).toBe('kbd');
    expect(inner?.children.length).toBe(1);
    expect(inner?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('applies the base kbd classes to the inner element', () => {
    const el = mount();
    expect(innerClass(el)).toBe(composeKbdClasses());
    expect(innerClass(el)).toBe(kbdBaseClasses);
  });

  it('observedAttributes is empty', () => {
    expect(RaftersKbd.observedAttributes).toEqual([]);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'kbd.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
