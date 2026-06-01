import { afterEach, describe, expect, it } from 'vitest';
import './button.element';
import { buttonBaseClasses, buttonSizeClasses, buttonVariantClasses } from './button.classes';
import { composeButtonClasses, RaftersButton } from './button.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-button');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe('rafters-button', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('rafters-button')).toBeDefined();
  });

  it('exports RaftersButton as the registered constructor', () => {
    expect(customElements.get('rafters-button')).toBe(RaftersButton);
  });

  it('renders an inner <button> with type="button" by default', () => {
    const el = mount();
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner).toBeTruthy();
    expect(inner?.getAttribute('type')).toBe('button');
  });

  it('reflects disabled to the inner button', () => {
    const el = mount({ disabled: '' });
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner?.disabled).toBe(true);

    el.removeAttribute('disabled');
    const refreshed = el.shadowRoot?.querySelector('button');
    expect(refreshed?.disabled).toBe(false);
  });

  it('applies type=submit when attribute is set', () => {
    const el = mount({ type: 'submit' });
    expect(el.shadowRoot?.querySelector('button')?.getAttribute('type')).toBe('submit');
  });

  it('applies type=reset when attribute is set', () => {
    const el = mount({ type: 'reset' });
    expect(el.shadowRoot?.querySelector('button')?.getAttribute('type')).toBe('reset');
  });

  it('falls back to type=button for unknown type values', () => {
    const el = mount({ type: 'bogus' });
    expect(el.shadowRoot?.querySelector('button')?.getAttribute('type')).toBe('button');
  });

  it('falls back to default variant/size for unknown values without throwing', () => {
    expect(() => mount({ variant: 'made-up', size: 'enormous' })).not.toThrow();
  });

  it('bubbles click events from inner button to host', () => {
    const el = mount();
    let received = 0;
    el.addEventListener('click', () => {
      received += 1;
    });
    el.shadowRoot?.querySelector('button')?.click();
    expect(received).toBe(1);
  });

  it('does not fire click when disabled', () => {
    const el = mount({ disabled: '' });
    let received = 0;
    el.addEventListener('click', () => {
      received += 1;
    });
    el.shadowRoot?.querySelector('button')?.click();
    expect(received).toBe(0);
  });

  it('renders a default <slot> for consumer content', () => {
    const el = mount();
    el.textContent = 'Save';
    const slot = el.shadowRoot?.querySelector('slot');
    expect(slot).toBeTruthy();
  });

  // --- Class-string parity: the WC must apply the exact same utility classes
  // --- the Astro target consumes from button.classes.ts. This drift guard
  // --- replaces the old per-instance-CSS assertions.

  it('inner button applies base + default variant + default size classes', () => {
    const el = mount();
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner?.className).toBe(composeButtonClasses('default', 'default'));
    expect(inner?.className).toContain(buttonBaseClasses);
    expect(inner?.className).toContain(buttonVariantClasses.default);
    expect(inner?.className).toContain(buttonSizeClasses.default);
  });

  it('applies the variant class string when variant attribute changes', () => {
    const el = mount();
    el.setAttribute('variant', 'destructive');
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner?.className).toContain(buttonVariantClasses.destructive);
  });

  it('applies the size class string when size attribute changes', () => {
    const el = mount();
    el.setAttribute('size', 'lg');
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner?.className).toContain(buttonSizeClasses.lg);
  });

  it('composeButtonClasses matches the Astro composition order (base, variant, size)', () => {
    expect(composeButtonClasses('secondary', 'sm')).toBe(
      `${buttonBaseClasses} ${buttonVariantClasses.secondary} ${buttonSizeClasses.sm}`,
    );
  });

  it('rebuilds inner button type when type attribute changes', () => {
    const el = mount();
    expect(el.shadowRoot?.querySelector('button')?.getAttribute('type')).toBe('button');
    el.setAttribute('type', 'submit');
    expect(el.shadowRoot?.querySelector('button')?.getAttribute('type')).toBe('submit');
    el.setAttribute('type', 'bogus');
    expect(el.shadowRoot?.querySelector('button')?.getAttribute('type')).toBe('button');
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersButton.observedAttributes).toEqual(['variant', 'size', 'disabled', 'type']);
  });

  it('importing the module twice does not throw', async () => {
    await import('./button.element');
    await import('./button.element');
    expect(customElements.get('rafters-button')).toBe(RaftersButton);
  });

  it('adopts at least the host-display shim stylesheet', () => {
    const el = mount();
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    const css = sheets.flatMap((s) => Array.from(s.cssRules).map((r) => r.cssText)).join('\n');
    expect(css).toContain(':host');
    expect(css).toContain('inline-flex');
  });

  it('source contains no direct var() literals', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const elementSource = await fs.readFile(path.resolve(__dirname, 'button.element.ts'), 'utf-8');
    expect(elementSource).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
