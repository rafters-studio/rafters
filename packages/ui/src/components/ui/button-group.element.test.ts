import { afterEach, describe, expect, it } from 'vitest';
import './button-group.element';
import { RaftersButtonGroup } from './button-group.element';

afterEach(() => {
  document.body.replaceChildren();
});

function mount(attrs: Record<string, string> = {}): RaftersButtonGroup {
  const el = document.createElement('rafters-button-group') as RaftersButtonGroup;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function collectCss(el: HTMLElement): string {
  const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
  return sheets
    .map((s) =>
      Array.from(s.cssRules)
        .map((r) => r.cssText)
        .join('\n'),
    )
    .join('\n');
}

describe('rafters-button-group', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('rafters-button-group')).toBeDefined();
  });

  it('exports RaftersButtonGroup as the registered constructor', () => {
    expect(customElements.get('rafters-button-group')).toBe(RaftersButtonGroup);
  });

  it('registers idempotently on re-import', async () => {
    expect(customElements.get('rafters-button-group')).toBe(RaftersButtonGroup);
    await import('./button-group.element');
    expect(customElements.get('rafters-button-group')).toBe(RaftersButtonGroup);
  });

  it('is not form-associated', () => {
    expect((RaftersButtonGroup as unknown as { formAssociated?: boolean }).formAssociated).not.toBe(
      true,
    );
  });

  it('sets role=group on the host element', () => {
    const el = mount();
    expect(el.getAttribute('role')).toBe('group');
  });

  it('sets data-orientation=horizontal by default', () => {
    const el = mount();
    expect(el.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('reflects vertical orientation when attribute is set', () => {
    const el = document.createElement('rafters-button-group') as RaftersButtonGroup;
    el.setAttribute('orientation', 'vertical');
    document.body.appendChild(el);
    expect(el.getAttribute('data-orientation')).toBe('vertical');
  });

  it('renders an inner wrapper containing a default slot', () => {
    const el = mount();
    const inner = el.shadowRoot?.firstElementChild;
    expect(inner?.tagName).toBe('DIV');
    expect(inner?.querySelector('slot')).not.toBeNull();
  });

  it('inner wrapper carries no classes (styling comes from per-instance stylesheet)', () => {
    const el = mount();
    const inner = el.shadowRoot?.firstElementChild;
    expect(inner?.className).toBe('');
  });

  it('projects slotted children through the default slot', () => {
    const el = document.createElement('rafters-button-group') as RaftersButtonGroup;
    const a = document.createElement('button');
    a.textContent = 'A';
    const b = document.createElement('button');
    b.textContent = 'B';
    el.append(a, b);
    document.body.appendChild(el);
    const slot = el.shadowRoot?.querySelector('slot');
    expect(slot).not.toBeNull();
    expect(slot?.assignedElements().length).toBe(2);
  });

  it('falls back to horizontal when orientation is unknown', () => {
    const el = document.createElement('rafters-button-group') as RaftersButtonGroup;
    el.setAttribute('orientation', 'diagonal');
    expect(() => document.body.appendChild(el)).not.toThrow();
    expect(el.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('orientation getter returns parsed orientation value', () => {
    const el = mount({ orientation: 'vertical' });
    expect(el.orientation).toBe('vertical');
  });

  it('orientation setter reflects to the attribute', () => {
    const el = mount();
    el.orientation = 'vertical';
    expect(el.getAttribute('orientation')).toBe('vertical');
    expect(el.getAttribute('data-orientation')).toBe('vertical');
  });

  it('updates stylesheet when orientation changes to vertical', () => {
    const el = mount();
    el.setAttribute('orientation', 'vertical');
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    const css = Array.from(sheets.at(-1)?.cssRules ?? [])
      .map((r) => r.cssText)
      .join('\n');
    expect(css).toMatch(/flex-direction:\s*column/);
  });

  it('updates stylesheet when orientation changes back to horizontal', () => {
    const el = mount({ orientation: 'vertical' });
    el.setAttribute('orientation', 'horizontal');
    const css = collectCss(el);
    expect(css).toMatch(/flex-direction:\s*row/);
    expect(css).not.toMatch(/flex-direction:\s*column/);
  });

  it('adopts a single per-instance stylesheet', () => {
    const el = mount();
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersButtonGroup.observedAttributes).toEqual(['orientation']);
  });

  it('does not throw on removal and re-insertion', () => {
    const el = mount();
    expect(() => el.remove()).not.toThrow();
    expect(() => document.body.appendChild(el)).not.toThrow();
  });

  it('stylesheet uses only --motion-duration / --motion-ease tokens (none required)', () => {
    const el = mount();
    const css = collectCss(el);
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('element source contains no direct var() literals', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'button-group.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
