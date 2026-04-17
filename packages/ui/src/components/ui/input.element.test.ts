/**
 * Unit tests for <rafters-input>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that the
 * RaftersInput element actually depends on (setFormValue, setValidity,
 * checkValidity, reportValidity, validity, validationMessage, willValidate,
 * form). The polyfill is intentionally tiny -- just enough to exercise the
 * element's contract under happy-dom.
 *
 * For assertions that require real form-control machinery we cannot
 * reasonably synthesise (e.g. fieldset.disabled propagation triggering
 * formDisabledCallback), the assertion is skipped with a link to #1303.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

interface PolyfilledInternals {
  _value: string;
  _validity: ValidityState;
  _validationMessage: string;
  _form: HTMLFormElement | null;
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
  // happy-dom's native ValidityState exposes its fields via getters that do
  // not appear in Object.keys. Read each documented flag explicitly so a
  // native ValidityState passed in is mirrored faithfully.
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

function installElementInternalsPolyfill(): void {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto.attachInternals === 'function') return;
  proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
    const internals: PolyfilledInternals = {
      _value: '',
      _validity: buildValidity(),
      _validationMessage: '',
      _form: null,
      _host: this,
      setFormValue(value) {
        this._value = typeof value === 'string' ? value : '';
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

beforeAll(async () => {
  installElementInternalsPolyfill();
  // Import after the polyfill so the constructor's guard sees a callable
  // attachInternals function on HTMLElement.prototype.
  await import('./input.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElement(): Promise<typeof import('./input.element').RaftersInput> {
  const mod = await import('./input.element');
  return mod.RaftersInput;
}

describe('rafters-input', () => {
  it('registers the custom element', async () => {
    const RaftersInput = await loadElement();
    expect(customElements.get('rafters-input')).toBe(RaftersInput);
  });

  it('registers exactly once even when imported repeatedly', async () => {
    const RaftersInput = await loadElement();
    expect(customElements.get('rafters-input')).toBe(RaftersInput);
    await import('./input.element');
    expect(customElements.get('rafters-input')).toBe(RaftersInput);
  });

  it('declares formAssociated', async () => {
    const RaftersInput = await loadElement();
    expect(RaftersInput.formAssociated).toBe(true);
  });

  it('declares the documented observedAttributes', async () => {
    const RaftersInput = await loadElement();
    expect(RaftersInput.observedAttributes).toEqual([
      'type',
      'placeholder',
      'value',
      'disabled',
      'required',
      'name',
      'variant',
      'size',
    ]);
  });

  it('exposes ElementInternals-backed validity surface', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    expect(el.willValidate).toBe(true);
    expect(typeof el.checkValidity).toBe('function');
    expect(typeof el.reportValidity).toBe('function');
    expect(el.validity).toBeDefined();
  });

  it('mounts an inner <input class="input"> in the shadow root', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    expect(inner).toBeTruthy();
    expect(inner?.classList.contains('input')).toBe(true);
  });

  it('mirrors host attributes onto the inner <input>', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    el.setAttribute('type', 'email');
    el.setAttribute('placeholder', 'you@example.com');
    el.setAttribute('value', 'a@b.co');
    el.setAttribute('name', 'email');
    el.toggleAttribute('disabled', true);
    el.toggleAttribute('required', true);
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    expect(inner?.type).toBe('email');
    expect(inner?.placeholder).toBe('you@example.com');
    expect(inner?.value).toBe('a@b.co');
    expect(inner?.name).toBe('email');
    expect(inner?.disabled).toBe(true);
    expect(inner?.required).toBe(true);
  });

  it('falls back to type="text" for unknown type and never throws', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    el.setAttribute('type', 'totally-made-up');
    document.body.append(el);
    expect(el.shadowRoot?.querySelector('input')?.type).toBe('text');
  });

  it('falls back to type="text" when the type attribute is removed', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    el.setAttribute('type', 'email');
    document.body.append(el);
    el.removeAttribute('type');
    expect(el.shadowRoot?.querySelector('input')?.type).toBe('text');
  });

  it('updates the inner input when host attributes change after connection', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    el.setAttribute('placeholder', 'first');
    expect(el.shadowRoot?.querySelector('input')?.placeholder).toBe('first');
    el.setAttribute('placeholder', 'second');
    expect(el.shadowRoot?.querySelector('input')?.placeholder).toBe('second');
    el.removeAttribute('placeholder');
    expect(el.shadowRoot?.querySelector('input')?.hasAttribute('placeholder')).toBe(false);
  });

  it('re-fires input events from the host (bubbles + composed)', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    expect(inner).toBeTruthy();
    let hostCount = 0;
    el.addEventListener('input', () => {
      hostCount++;
    });
    if (inner) {
      inner.value = 'hi';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(hostCount).toBe(1);
  });

  it('re-fires change events from the host', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    let hostCount = 0;
    el.addEventListener('change', () => {
      hostCount++;
    });
    inner?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(hostCount).toBe(1);
  });

  it('reads value from the inner input via the value getter', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) inner.value = 'live';
    expect(el.value).toBe('live');
  });

  it('writes value to the inner input via the value setter', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    el.value = 'set';
    expect(el.shadowRoot?.querySelector('input')?.value).toBe('set');
  });

  it('property setters reflect to attributes', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    el.name = 'username';
    expect(el.getAttribute('name')).toBe('username');
    el.placeholder = 'enter name';
    expect(el.getAttribute('placeholder')).toBe('enter name');
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    el.variant = 'destructive';
    expect(el.getAttribute('variant')).toBe('destructive');
    el.size = 'lg';
    expect(el.getAttribute('size')).toBe('lg');
  });

  it('unknown variant attribute does not throw and stylesheet falls back to default', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    el.setAttribute('variant', 'rainbow');
    el.setAttribute('size', 'huge');
    expect(() => document.body.append(el)).not.toThrow();
  });

  it('rebuilds the per-instance stylesheet when variant changes', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
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
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
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
    expect(collect()).toContain('height: 2.5rem');
    el.setAttribute('size', 'lg');
    expect(collect()).toContain('height: 3rem');
  });

  it('submits with name=value inside a <form>', async () => {
    const RaftersInput = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    el.setAttribute('name', 'email');
    el.setAttribute('value', 'a@b.co');
    form.append(el);
    document.body.append(form);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = 'a@b.co';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // happy-dom 20 ships no FormData/ElementInternals integration that would
    // surface form-associated values via `new FormData(form)`. Verify the
    // value we expose to the form internals layer instead.
    // See #1303.
    expect(el.value).toBe('a@b.co');
  });

  it('formResetCallback restores initial value', async () => {
    const RaftersInput = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    el.setAttribute('name', 'q');
    el.setAttribute('value', 'initial');
    form.append(el);
    document.body.append(form);
    el.value = 'changed';
    expect(el.value).toBe('changed');
    el.formResetCallback();
    expect(el.value).toBe('initial');
  });

  it('formDisabledCallback toggles inner input disabled', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    el.formDisabledCallback(true);
    expect(el.shadowRoot?.querySelector('input')?.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(el.shadowRoot?.querySelector('input')?.disabled).toBe(false);
  });

  it('formStateRestoreCallback assigns a string state to value', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    el.formStateRestoreCallback('restored', 'restore');
    expect(el.value).toBe('restored');
  });

  it('formStateRestoreCallback ignores non-string state without throwing', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    expect(() => el.formStateRestoreCallback(null, 'restore')).not.toThrow();
  });

  it('reflects required validity to host via ElementInternals', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    el.setAttribute('required', '');
    el.setAttribute('name', 'q');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    if (inner) {
      inner.value = 'x';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.checkValidity()).toBe(true);
  });

  it('setCustomValidity propagates to the validity state', async () => {
    const RaftersInput = await loadElement();
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    document.body.append(el);
    el.setCustomValidity('nope');
    expect(el.validity.customError).toBe(true);
    expect(el.validity.valid).toBe(false);
    el.setCustomValidity('');
    expect(el.validity.customError).toBe(false);
  });

  // happy-dom 20 does not propagate fieldset.disabled to form-associated
  // custom elements via the formDisabledCallback hook. See #1303.
  it.skip('fieldset disabled propagation triggers formDisabledCallback', async () => {
    const RaftersInput = await loadElement();
    const fieldset = document.createElement('fieldset');
    const el = document.createElement('rafters-input') as InstanceType<typeof RaftersInput>;
    fieldset.append(el);
    document.body.append(fieldset);
    fieldset.disabled = true;
    expect(el.shadowRoot?.querySelector('input')?.disabled).toBe(true);
  });
});
