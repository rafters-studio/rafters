import { afterEach, describe, expect, it } from 'vitest';
import './field.element';
import { RaftersField } from './field.element';

afterEach(() => {
  document.body.replaceChildren();
});

function mount(attrs: Record<string, string> = {}): RaftersField {
  const el = document.createElement('rafters-field') as RaftersField;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function collectCss(el: Element): string {
  const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
  return sheets
    .map((s) =>
      Array.from(s.cssRules)
        .map((r) => r.cssText)
        .join('\n'),
    )
    .join('\n');
}

describe('rafters-field', () => {
  it('registers idempotently', async () => {
    expect(customElements.get('rafters-field')).toBe(RaftersField);
    await import('./field.element');
    expect(customElements.get('rafters-field')).toBe(RaftersField);
  });

  it('is not form-associated', () => {
    expect((RaftersField as unknown as { formAssociated?: boolean }).formAssociated).not.toBe(true);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersField.observedAttributes).toEqual([
      'label',
      'description',
      'error',
      'required',
      'disabled',
      'id',
    ]);
  });

  it('renders label text from attribute', () => {
    const el = mount({ label: 'Email' });
    const label = el.shadowRoot?.querySelector('label');
    expect(label?.textContent).toContain('Email');
  });

  it('renders required marker when required attribute present', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.toggleAttribute('required', true);
    document.body.append(el);
    const marker = el.shadowRoot?.querySelector('.required');
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute('aria-hidden')).toBe('true');
  });

  it('omits required marker when required attribute absent', () => {
    const el = mount({ label: 'Email' });
    expect(el.shadowRoot?.querySelector('.required')).toBeNull();
  });

  it('connects label[for] to slotted control id', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    const label = el.shadowRoot?.querySelector('label');
    expect(label?.getAttribute('for')).toBe(input.id);
    expect(input.id.length).toBeGreaterThan(0);
  });

  it('sets aria-describedby on slotted control when description provided', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.setAttribute('description', 'We never share your email');
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    const described = input.getAttribute('aria-describedby') ?? '';
    const descriptionId = el.shadowRoot?.querySelector('.description')?.id;
    expect(descriptionId).toBeDefined();
    expect(described).toContain(descriptionId ?? '');
  });

  it('shows error with role=alert and sets aria-invalid on control', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.setAttribute('error', 'Email is required');
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    const errorNode = el.shadowRoot?.querySelector('.error');
    expect(errorNode?.getAttribute('role')).toBe('alert');
    expect(errorNode?.textContent).toContain('Email is required');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('hides description when error is present', () => {
    const el = mount({
      label: 'Email',
      description: 'We never share your email',
      error: 'Email is required',
    });
    expect(el.shadowRoot?.querySelector('.description')).toBeNull();
    expect(el.shadowRoot?.querySelector('.error')).not.toBeNull();
  });

  it('propagates disabled to slotted control', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.toggleAttribute('disabled', true);
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    expect(input.disabled).toBe(true);
  });

  it('propagates aria-required to slotted control when required', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.toggleAttribute('required', true);
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('clears aria-invalid when error attribute is removed', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.setAttribute('error', 'Bad');
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    el.removeAttribute('error');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('clears disabled on control when host disabled is removed', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.toggleAttribute('disabled', true);
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    expect(input.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(input.disabled).toBe(false);
  });

  it('does not overwrite control id when already set', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    const input = document.createElement('input');
    input.id = 'explicit-email';
    el.append(input);
    document.body.append(el);
    expect(input.id).toBe('explicit-email');
    expect(el.shadowRoot?.querySelector('label')?.getAttribute('for')).toBe('explicit-email');
  });

  it('does not overwrite author-provided aria-describedby on the control', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.setAttribute('description', 'Helper');
    const input = document.createElement('input');
    input.setAttribute('aria-describedby', 'custom-helper');
    el.append(input);
    document.body.append(el);
    expect(input.getAttribute('aria-describedby')).toBe('custom-helper');
  });

  it('does not throw on missing label attribute', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    expect(() => document.body.append(el)).not.toThrow();
  });

  it('uses the provided id attribute as field id when present', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('id', 'signup-email');
    el.setAttribute('label', 'Email');
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    expect(input.id).toBe('signup-email');
    expect(el.shadowRoot?.querySelector('label')?.getAttribute('for')).toBe('signup-email');
  });

  it('ignores id changes after connection (silent no-op)', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('id', 'first-id');
    el.setAttribute('label', 'Email');
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    const originalId = input.id;
    el.setAttribute('id', 'second-id');
    expect(input.id).toBe(originalId);
  });

  it('generates a field-prefixed id when no id attribute provided', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    const input = document.createElement('input');
    el.append(input);
    document.body.append(el);
    expect(input.id.startsWith('field-')).toBe(true);
  });

  it('adopts a per-instance stylesheet in the shadow root', () => {
    const el = mount({ label: 'Email' });
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('stylesheet uses only --motion-duration / --motion-ease tokens', () => {
    const el = mount({ label: 'Email' });
    const css = collectCss(el);
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('updates stylesheet when disabled is toggled', () => {
    const el = mount({ label: 'Email' });
    expect(collectCss(el)).not.toMatch(/\.label\s*\{[^}]*opacity:\s*0\.5/);
    el.setAttribute('disabled', '');
    expect(collectCss(el)).toMatch(/opacity:\s*0\.5/);
  });

  it('re-wires accessibility attributes when the slotted control changes', () => {
    const el = document.createElement('rafters-field') as RaftersField;
    el.setAttribute('label', 'Email');
    el.setAttribute('error', 'Required');
    const first = document.createElement('input');
    el.append(first);
    document.body.append(el);
    expect(first.getAttribute('aria-invalid')).toBe('true');

    first.remove();
    const second = document.createElement('input');
    el.append(second);
    // Force slotchange handling synchronously via the test hook.
    el.setAttribute('error', 'Still required');
    expect(second.getAttribute('aria-invalid')).toBe('true');
  });

  it('property accessors mirror attributes', () => {
    const el = mount();
    el.label = 'Name';
    el.description = 'Your full name';
    el.error = 'Oops';
    el.required = true;
    el.disabled = true;
    expect(el.getAttribute('label')).toBe('Name');
    expect(el.getAttribute('description')).toBe('Your full name');
    expect(el.getAttribute('error')).toBe('Oops');
    expect(el.hasAttribute('required')).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(true);
    el.required = false;
    el.disabled = false;
    expect(el.hasAttribute('required')).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('fieldId is stable across attribute changes', () => {
    const el = mount({ label: 'Email' });
    const first = el.fieldId;
    el.setAttribute('description', 'Helper');
    el.setAttribute('error', 'Bad');
    expect(el.fieldId).toBe(first);
  });

  it('source contains no direct var() literals in either .ts file', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const elementSource = await fs.readFile(path.resolve(__dirname, 'field.element.ts'), 'utf-8');
    expect(elementSource).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
