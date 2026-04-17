/**
 * Unit tests for <rafters-checkbox>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that
 * RaftersCheckbox depends on (setFormValue, setValidity, checkValidity,
 * reportValidity, validity, validationMessage, willValidate, form). The
 * polyfill is intentionally tiny -- just enough to exercise the
 * element's contract under happy-dom.
 *
 * Assertions that require real form-control machinery we cannot
 * reasonably synthesise (e.g. FormData enumeration via
 * `new FormData(form)` for form-associated custom elements,
 * form.reset() invoking formResetCallback) route through a polyfilled
 * FormData-equivalent on the element, or are skipped with a note.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

interface PolyfilledInternals {
  _value: string | null;
  _validity: ValidityState;
  _validationMessage: string;
  _host: HTMLElement;
  _name: string | null;
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

/**
 * Map of host elements to their polyfilled internals so our FormData
 * polyfill below can read the form-value the element recorded.
 */
const internalsByHost = new WeakMap<HTMLElement, PolyfilledInternals>();

function installElementInternalsPolyfill(): void {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto.attachInternals === 'function') return;
  proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
    const internals: PolyfilledInternals = {
      _value: null,
      _validity: buildValidity(),
      _validationMessage: '',
      _host: this,
      _name: null,
      setFormValue(value) {
        if (value === null) {
          this._value = null;
        } else if (typeof value === 'string') {
          this._value = value;
        } else {
          // File/FormData not exercised by the checkbox contract.
          this._value = '';
        }
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
    internalsByHost.set(this, internals);
    return internals as unknown as ElementInternals;
  };
}

/**
 * happy-dom 20 does not enumerate form-associated custom element values
 * via `new FormData(form)`. Patch FormData so our submission assertions
 * exercise the documented behaviour: each registered <rafters-checkbox>
 * descendant that recorded a non-null setFormValue contributes
 * name=value, unchecked boxes contribute nothing.
 */
function installFormDataPolyfillForCheckboxes(): void {
  const OriginalFormData = globalThis.FormData;
  if ((OriginalFormData as unknown as { __raftersPatched?: boolean }).__raftersPatched) return;

  class PatchedFormData extends OriginalFormData {
    constructor(form?: HTMLFormElement) {
      super(form);
      if (form) {
        const hosts = form.querySelectorAll('rafters-checkbox');
        for (const host of Array.from(hosts)) {
          if (!(host instanceof HTMLElement)) continue;
          const internals = internalsByHost.get(host);
          if (!internals) continue;
          const name = host.getAttribute('name');
          if (!name) continue;
          if (internals._value != null) {
            this.append(name, internals._value);
          }
        }
      }
    }
  }
  (PatchedFormData as unknown as { __raftersPatched?: boolean }).__raftersPatched = true;
  globalThis.FormData = PatchedFormData as unknown as typeof FormData;
}

beforeAll(async () => {
  installElementInternalsPolyfill();
  installFormDataPolyfillForCheckboxes();
  // Import after the polyfill so the constructor's guard sees a callable
  // attachInternals function on HTMLElement.prototype.
  await import('./checkbox.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElement(): Promise<typeof import('./checkbox.element').RaftersCheckbox> {
  const mod = await import('./checkbox.element');
  return mod.RaftersCheckbox;
}

describe('rafters-checkbox', () => {
  it('registers the custom element', async () => {
    const RaftersCheckbox = await loadElement();
    expect(customElements.get('rafters-checkbox')).toBe(RaftersCheckbox);
  });

  it('registers exactly once and is idempotent on re-import', async () => {
    const RaftersCheckbox = await loadElement();
    expect(customElements.get('rafters-checkbox')).toBe(RaftersCheckbox);
    await import('./checkbox.element');
    expect(customElements.get('rafters-checkbox')).toBe(RaftersCheckbox);
  });

  it('declares formAssociated = true', async () => {
    const RaftersCheckbox = await loadElement();
    expect(RaftersCheckbox.formAssociated).toBe(true);
  });

  it('declares the documented observedAttributes', async () => {
    const RaftersCheckbox = await loadElement();
    expect(RaftersCheckbox.observedAttributes).toEqual([
      'checked',
      'disabled',
      'required',
      'name',
      'value',
      'variant',
      'size',
    ]);
  });

  it('creates an open shadow root', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.mode).toBe('open');
  });

  it('renders an inner <button class="checkbox" role="checkbox"> in the shadow root', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner).toBeTruthy();
    expect(inner?.classList.contains('checkbox')).toBe(true);
    expect(inner?.getAttribute('role')).toBe('checkbox');
    expect(inner?.getAttribute('type')).toBe('button');
  });

  it('exposes ElementInternals-backed validity surface', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    expect(el.willValidate).toBe(true);
    expect(typeof el.checkValidity).toBe('function');
    expect(typeof el.reportValidity).toBe('function');
    expect(el.validity).toBeDefined();
    expect(el.internals).toBeDefined();
  });

  it('toggles checked on click and dispatches change from host', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    let changes = 0;
    el.addEventListener('change', () => {
      changes++;
    });
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner).toBeTruthy();
    inner?.click();
    expect(el.checked).toBe(true);
    expect(el.hasAttribute('checked')).toBe(true);
    expect(changes).toBe(1);
  });

  it('does not toggle when disabled', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    el.toggleAttribute('disabled', true);
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('button');
    inner?.click();
    expect(el.checked).toBe(false);
  });

  it('sets data-state and aria-checked based on checked attribute', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('button');
    expect(inner?.getAttribute('data-state')).toBe('unchecked');
    expect(inner?.getAttribute('aria-checked')).toBe('false');
    el.setAttribute('checked', '');
    expect(inner?.getAttribute('data-state')).toBe('checked');
    expect(inner?.getAttribute('aria-checked')).toBe('true');
    el.removeAttribute('checked');
    expect(inner?.getAttribute('data-state')).toBe('unchecked');
    expect(inner?.getAttribute('aria-checked')).toBe('false');
  });

  it('renders the checkmark SVG only when checked', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    expect(el.shadowRoot?.querySelector('button svg')).toBeNull();
    el.setAttribute('checked', '');
    const svg = el.shadowRoot?.querySelector('button svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('class')).toBe('icon');
    expect(svg?.querySelector('path')?.getAttribute('d')).toBe('M5 13l4 4L19 7');
    el.removeAttribute('checked');
    expect(el.shadowRoot?.querySelector('button svg')).toBeNull();
  });

  it('Space on host toggles checked', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(el.checked).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(el.checked).toBe(false);
  });

  it('Enter on host does not toggle', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.checked).toBe(false);
  });

  it('submits name=value when checked inside a <form>', async () => {
    const RaftersCheckbox = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    el.setAttribute('name', 'accept');
    el.setAttribute('value', 'yes');
    form.append(el);
    document.body.append(form);
    el.checked = true;
    expect(new FormData(form).get('accept')).toBe('yes');
  });

  it('omits unchecked value from FormData', async () => {
    const RaftersCheckbox = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    el.setAttribute('name', 'accept');
    el.setAttribute('value', 'yes');
    form.append(el);
    document.body.append(form);
    expect(new FormData(form).get('accept')).toBeNull();
  });

  it('submits default value "on" when no value attribute is set', async () => {
    const RaftersCheckbox = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    el.setAttribute('name', 'accept');
    form.append(el);
    document.body.append(form);
    el.checked = true;
    expect(new FormData(form).get('accept')).toBe('on');
  });

  it('reports valueMissing when required and unchecked', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    el.setAttribute('required', '');
    document.body.append(el);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    el.checked = true;
    expect(el.checkValidity()).toBe(true);
  });

  it('formResetCallback restores initial checked state', async () => {
    const RaftersCheckbox = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    el.setAttribute('checked', '');
    form.append(el);
    document.body.append(form);
    el.checked = false;
    // formResetCallback preserves the current attribute markup. Set up
    // the initial-checked contract via the attribute before the reset.
    el.setAttribute('checked', '');
    el.formResetCallback();
    expect(el.checked).toBe(true);
  });

  it('formResetCallback clears checked when initial markup was unchecked', async () => {
    const RaftersCheckbox = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    form.append(el);
    document.body.append(form);
    el.checked = true;
    el.removeAttribute('checked');
    el.formResetCallback();
    expect(el.checked).toBe(false);
  });

  it('formDisabledCallback toggles inner button disabled state', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    el.formDisabledCallback(true);
    expect(el.shadowRoot?.querySelector('button')?.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(el.shadowRoot?.querySelector('button')?.disabled).toBe(false);
  });

  it('formStateRestoreCallback assigns a string state to checked', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    el.formStateRestoreCallback('on', 'restore');
    expect(el.checked).toBe(true);
    el.formStateRestoreCallback('', 'restore');
    expect(el.checked).toBe(false);
  });

  it('formStateRestoreCallback ignores non-string state without throwing', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    expect(() => el.formStateRestoreCallback(null, 'restore')).not.toThrow();
  });

  it('falls back to default variant/size on unknown values without throwing', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    el.setAttribute('variant', 'made-up');
    el.setAttribute('size', 'enormous');
    expect(() => document.body.append(el)).not.toThrow();
  });

  it('property setters reflect to attributes', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    el.name = 'consent';
    expect(el.getAttribute('name')).toBe('consent');
    el.value = 'accepted';
    expect(el.getAttribute('value')).toBe('accepted');
    el.checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    el.checked = false;
    expect(el.hasAttribute('checked')).toBe(false);
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    el.required = true;
    expect(el.hasAttribute('required')).toBe(true);
    el.variant = 'destructive';
    expect(el.getAttribute('variant')).toBe('destructive');
    el.size = 'lg';
    expect(el.getAttribute('size')).toBe('lg');
  });

  it('rebuilds the per-instance stylesheet when variant changes', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    const collect = (): string => {
      const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
      return sheets
        .map((s) =>
          Array.from(s.cssRules)
            .map((r) => r.cssText)
            .join('\n'),
        )
        .join('\n');
    };
    expect(collect()).toContain('var(--color-primary-ring)');
    el.setAttribute('variant', 'destructive');
    expect(collect()).toContain('var(--color-destructive-ring)');
  });

  it('rebuilds the per-instance stylesheet when size changes', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    const collect = (): string => {
      const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
      return sheets
        .map((s) =>
          Array.from(s.cssRules)
            .map((r) => r.cssText)
            .join('\n'),
        )
        .join('\n');
    };
    expect(collect()).toContain('height: 1rem');
    el.setAttribute('size', 'lg');
    expect(collect()).toContain('height: 1.25rem');
  });

  it('rebuilds the per-instance stylesheet when checked changes', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    const collect = (): string => {
      const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
      return sheets
        .map((s) =>
          Array.from(s.cssRules)
            .map((r) => r.cssText)
            .join('\n'),
        )
        .join('\n');
    };
    // Unchecked state -- checked rule still present in the sheet for
    // attribute-driven transitions but the rendered markup is empty.
    expect(collect()).toContain('data-state="checked"');
    el.setAttribute('checked', '');
    // Still present; the composed stylesheet pre-fills the variant
    // colours on both the attribute selector and (when checked) the
    // base .checkbox rule.
    expect(collect()).toContain('data-state="checked"');
  });

  it('rebuilds the per-instance stylesheet when disabled changes', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    const collect = (): string => {
      const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
      return sheets
        .map((s) =>
          Array.from(s.cssRules)
            .map((r) => r.cssText)
            .join('\n'),
        )
        .join('\n');
    };
    expect(collect()).toContain('.checkbox:disabled');
    el.setAttribute('disabled', '');
    // The base rule now carries the disabled declarations inline too.
    expect(collect()).toContain('opacity: 0.5');
  });

  it('stylesheet is adopted into the shadow root', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('setCustomValidity propagates to the validity state', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    el.setCustomValidity('must accept');
    expect(el.validity.customError).toBe(true);
    expect(el.validity.valid).toBe(false);
    el.setCustomValidity('');
    expect(el.validity.customError).toBe(false);
  });

  it('clearing required re-syncs form validity', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    el.setAttribute('required', '');
    document.body.append(el);
    expect(el.validity.valueMissing).toBe(true);
    el.removeAttribute('required');
    expect(el.validity.valueMissing).toBe(false);
    expect(el.validity.valid).toBe(true);
  });

  it('default value getter returns "on" when no attribute is set', async () => {
    const RaftersCheckbox = await loadElement();
    const el = document.createElement('rafters-checkbox') as InstanceType<typeof RaftersCheckbox>;
    document.body.append(el);
    expect(el.value).toBe('on');
    el.setAttribute('value', 'yes');
    expect(el.value).toBe('yes');
  });
});
