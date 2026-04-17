/**
 * Unit tests for <rafters-toggle>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that the
 * RaftersToggle element actually depends on (setFormValue, setValidity,
 * checkValidity, reportValidity, validity, validationMessage, willValidate,
 * form). The polyfill also bridges `setFormValue` into the form's FormData
 * enumeration so `new FormData(form)` reflects pressed/unpressed state the
 * way a browser with real form-associated custom element support would.
 *
 * For assertions that require real form-control machinery we cannot
 * reasonably synthesise (e.g. fieldset.disabled propagation triggering
 * formDisabledCallback), the assertion is skipped with a link to #1303.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

interface PolyfilledInternals {
  _value: string | null;
  _validity: ValidityState;
  _validationMessage: string;
  _host: HTMLElement;
  setFormValue: (value: string | File | FormData | null) => void;
  setValidity: (flags: Partial<ValidityState>, message?: string, anchor?: HTMLElement) => void;
  checkValidity: () => boolean;
  reportValidity: () => boolean;
  validity: ValidityState;
  validationMessage: string;
  willValidate: boolean;
  form: HTMLFormElement | null;
}

type ValidityFlagKey = Exclude<keyof ValidityState, 'valid'>;

const VALIDITY_FLAG_KEYS: ReadonlyArray<ValidityFlagKey> = [
  'valueMissing',
  'typeMismatch',
  'patternMismatch',
  'tooLong',
  'tooShort',
  'rangeUnderflow',
  'rangeOverflow',
  'stepMismatch',
  'badInput',
  'customError',
];

function buildValidity(flags: Partial<ValidityState> = {}): ValidityState {
  const merged: Record<string, boolean> = {
    valueMissing: false,
    typeMismatch: false,
    patternMismatch: false,
    tooLong: false,
    tooShort: false,
    rangeUnderflow: false,
    rangeOverflow: false,
    stepMismatch: false,
    badInput: false,
    customError: false,
    valid: true,
  };
  let invalid = false;
  for (const key of VALIDITY_FLAG_KEYS) {
    const value = flags[key];
    if (typeof value === 'boolean') {
      merged[key] = value;
    }
    if (merged[key]) invalid = true;
  }
  merged.valid = !invalid;
  return merged as unknown as ValidityState;
}

const FORM_VALUE_REGISTRY: WeakMap<HTMLElement, string | null> = new WeakMap();

function installElementInternalsPolyfill(): void {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto.attachInternals !== 'function') {
    proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
      const internals: PolyfilledInternals = {
        _value: null,
        _validity: buildValidity(),
        _validationMessage: '',
        _host: this,
        setFormValue(value) {
          const resolved = typeof value === 'string' ? value : value === null ? null : '';
          this._value = resolved;
          FORM_VALUE_REGISTRY.set(this._host, resolved);
        },
        setValidity(flags, message = '', _anchor) {
          this._validity = buildValidity(flags);
          this._validationMessage = this._validity.valid ? '' : message;
        },
        checkValidity() {
          return this._validity.valid;
        },
        reportValidity() {
          return this._validity.valid;
        },
        get validity() {
          return this._validity;
        },
        get validationMessage() {
          return this._validationMessage;
        },
        get willValidate() {
          return true;
        },
        get form() {
          let parent: Node | null = this._host.parentNode;
          while (parent) {
            if (parent instanceof HTMLFormElement) return parent;
            parent = parent.parentNode;
          }
          return null;
        },
      };
      return internals as unknown as ElementInternals;
    };
  }

  // happy-dom 20 does not enumerate form-associated custom elements into
  // FormData. Monkey-patch FormData's constructor and `get` to consult the
  // FORM_VALUE_REGISTRY for any rafters-toggle descendants of the form.
  const OriginalFormData = globalThis.FormData;
  if (
    OriginalFormData &&
    !(OriginalFormData as unknown as { __raftersPatched?: boolean }).__raftersPatched
  ) {
    const patched = function PatchedFormData(form?: HTMLFormElement): FormData {
      const instance = new OriginalFormData(form);
      if (form) {
        const hosts = form.querySelectorAll('rafters-toggle');
        for (const host of Array.from(hosts)) {
          const name = host.getAttribute('name');
          if (!name) continue;
          const value = FORM_VALUE_REGISTRY.get(host as HTMLElement);
          if (value != null) {
            instance.append(name, value);
          }
        }
      }
      return instance;
    } as unknown as typeof FormData;
    (patched as unknown as { __raftersPatched?: boolean }).__raftersPatched = true;
    patched.prototype = OriginalFormData.prototype;
    globalThis.FormData = patched;
  }
}

beforeAll(async () => {
  installElementInternalsPolyfill();
  // Import after the polyfill so the constructor's guard sees a callable
  // attachInternals function on HTMLElement.prototype.
  await import('./toggle.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElement(): Promise<typeof import('./toggle.element').RaftersToggle> {
  const mod = await import('./toggle.element');
  return mod.RaftersToggle;
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

describe('rafters-toggle', () => {
  it('registers the custom element', async () => {
    const RaftersToggle = await loadElement();
    expect(customElements.get('rafters-toggle')).toBe(RaftersToggle);
  });

  it('registers idempotently on re-import', async () => {
    const RaftersToggle = await loadElement();
    expect(customElements.get('rafters-toggle')).toBe(RaftersToggle);
    await import('./toggle.element');
    expect(customElements.get('rafters-toggle')).toBe(RaftersToggle);
  });

  it('declares formAssociated', async () => {
    const RaftersToggle = await loadElement();
    expect(RaftersToggle.formAssociated).toBe(true);
  });

  it('declares the documented observedAttributes', async () => {
    const RaftersToggle = await loadElement();
    expect(RaftersToggle.observedAttributes).toEqual([
      'pressed',
      'disabled',
      'name',
      'value',
      'variant',
      'size',
    ]);
  });

  it('mounts an inner <button class="toggle"> with type=button', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner).toBeTruthy();
    expect(inner?.className).toBe('toggle');
    expect(inner?.getAttribute('type')).toBe('button');
  });

  it('renders a slot for consumer content', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    const slot = el.shadowRoot?.querySelector('slot');
    expect(slot).toBeTruthy();
  });

  it('toggles pressed on click and reflects aria-pressed', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner).toBeTruthy();
    inner?.click();
    expect(el.pressed).toBe(true);
    expect(inner?.getAttribute('aria-pressed')).toBe('true');
    expect(inner?.getAttribute('data-state')).toBe('on');
    inner?.click();
    expect(el.pressed).toBe(false);
    expect(inner?.getAttribute('aria-pressed')).toBe('false');
    expect(inner?.getAttribute('data-state')).toBe('off');
  });

  it('initial pressed attribute renders as pressed', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.setAttribute('pressed', '');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner?.getAttribute('aria-pressed')).toBe('true');
    expect(inner?.getAttribute('data-state')).toBe('on');
  });

  it('dispatches change event on toggle (bubbles + composed)', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    let changes = 0;
    el.addEventListener('change', () => {
      changes += 1;
    });
    el.shadowRoot?.querySelector('button')?.click();
    expect(changes).toBe(1);
    el.shadowRoot?.querySelector('button')?.click();
    expect(changes).toBe(2);
  });

  it('change event escapes the shadow root (composed)', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    let bodyReceived = 0;
    document.body.addEventListener('change', () => {
      bodyReceived += 1;
    });
    el.shadowRoot?.querySelector('button')?.click();
    expect(bodyReceived).toBe(1);
  });

  it('does not toggle when disabled', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.toggleAttribute('disabled', true);
    document.body.append(el);
    el.shadowRoot?.querySelector('button')?.click();
    expect(el.pressed).toBe(false);
  });

  it('reflects disabled to the inner button', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.toggleAttribute('disabled', true);
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner?.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(inner?.disabled).toBe(false);
  });

  it('submits name=value when pressed inside <form>', async () => {
    const RaftersToggle = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.setAttribute('name', 'bold');
    el.setAttribute('value', 'yes');
    form.append(el);
    document.body.append(form);
    el.pressed = true;
    expect(new FormData(form).get('bold')).toBe('yes');
  });

  it('defaults submitted value to "on" when no value attribute is set', async () => {
    const RaftersToggle = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.setAttribute('name', 'italic');
    form.append(el);
    document.body.append(form);
    el.pressed = true;
    expect(new FormData(form).get('italic')).toBe('on');
  });

  it('omits unpressed value from FormData', async () => {
    const RaftersToggle = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.setAttribute('name', 'bold');
    form.append(el);
    document.body.append(form);
    expect(new FormData(form).get('bold')).toBeNull();
  });

  it('formResetCallback restores initial pressed', async () => {
    const RaftersToggle = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.setAttribute('pressed', '');
    form.append(el);
    document.body.append(form);
    el.pressed = false;
    el.formResetCallback();
    expect(el.pressed).toBe(true);
  });

  it('formResetCallback with no initial pressed restores to unpressed', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    el.pressed = true;
    el.formResetCallback();
    expect(el.pressed).toBe(false);
  });

  it('formDisabledCallback toggles inner button disabled', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    el.formDisabledCallback(true);
    expect(el.shadowRoot?.querySelector('button')?.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(el.shadowRoot?.querySelector('button')?.disabled).toBe(false);
  });

  it('formStateRestoreCallback restores pressed when state is non-null', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    el.formStateRestoreCallback('on', 'restore');
    expect(el.pressed).toBe(true);
  });

  it('formStateRestoreCallback unsets pressed when state is null', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.setAttribute('pressed', '');
    document.body.append(el);
    el.formStateRestoreCallback(null, 'restore');
    expect(el.pressed).toBe(false);
  });

  it('falls back to default variant/size on unknown values', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    el.setAttribute('variant', 'weird');
    el.setAttribute('size', 'huge');
    expect(() => document.body.append(el)).not.toThrow();
    expect(el.variant).toBe('default');
    expect(el.size).toBe('default');
  });

  it('property setters reflect to attributes', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    el.name = 'bold';
    expect(el.getAttribute('name')).toBe('bold');
    el.value = 'yes';
    expect(el.getAttribute('value')).toBe('yes');
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    el.pressed = true;
    expect(el.hasAttribute('pressed')).toBe(true);
    el.variant = 'destructive';
    expect(el.getAttribute('variant')).toBe('destructive');
    el.size = 'lg';
    expect(el.getAttribute('size')).toBe('lg');
  });

  it('pressed getter reads the attribute', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    expect(el.pressed).toBe(false);
    el.setAttribute('pressed', '');
    expect(el.pressed).toBe(true);
  });

  it('value defaults to "on" when no attribute is set', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    expect(el.value).toBe('on');
  });

  it('rebuilds the per-instance stylesheet when variant changes', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    expect(collectCss(el)).toContain('var(--color-primary)');
    el.setAttribute('variant', 'destructive');
    expect(collectCss(el)).toContain('var(--color-destructive)');
  });

  it('rebuilds the per-instance stylesheet when size changes', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    expect(collectCss(el)).toContain('height: 2.5rem');
    el.setAttribute('size', 'lg');
    expect(collectCss(el)).toContain('height: 2.75rem');
  });

  it('exposes ElementInternals-backed validity surface', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    expect(el.willValidate).toBe(true);
    expect(typeof el.checkValidity).toBe('function');
    expect(typeof el.reportValidity).toBe('function');
    expect(el.validity).toBeDefined();
  });

  it('setCustomValidity propagates to the validity state', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    el.setCustomValidity('nope');
    expect(el.validity.customError).toBe(true);
    expect(el.validity.valid).toBe(false);
    el.setCustomValidity('');
    expect(el.validity.customError).toBe(false);
  });

  it('shadow root adopts the per-instance stylesheet', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('stylesheet uses only --motion-duration / --motion-ease tokens', async () => {
    const RaftersToggle = await loadElement();
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    document.body.append(el);
    const css = collectCss(el);
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('source contains no direct var() literals in either .ts file', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const elementSource = await fs.readFile(path.resolve(__dirname, 'toggle.element.ts'), 'utf-8');
    expect(elementSource).not.toMatch(/[^a-zA-Z_]var\(/);
    const stylesSource = await fs.readFile(path.resolve(__dirname, 'toggle.styles.ts'), 'utf-8');
    expect(stylesSource).not.toMatch(/[^a-zA-Z_]var\(/);
  });

  // happy-dom 20 does not propagate fieldset.disabled to form-associated
  // custom elements via the formDisabledCallback hook. See #1303.
  it.skip('fieldset disabled propagation triggers formDisabledCallback', async () => {
    const RaftersToggle = await loadElement();
    const fieldset = document.createElement('fieldset');
    const el = document.createElement('rafters-toggle') as InstanceType<typeof RaftersToggle>;
    fieldset.append(el);
    document.body.append(fieldset);
    fieldset.disabled = true;
    expect(el.shadowRoot?.querySelector('button')?.disabled).toBe(true);
  });
});
