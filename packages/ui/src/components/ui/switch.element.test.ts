/**
 * Unit tests for <rafters-switch>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that the
 * RaftersSwitch element depends on (setFormValue, setValidity,
 * checkValidity, reportValidity, validity, validationMessage, willValidate,
 * form). To drive the form-submission contract (`new FormData(form).get(name)`),
 * the polyfill also tracks every internals instance, associates it with its
 * host, and wraps FormData's constructor so that host elements with a name
 * and a non-null form value contribute their value to the resulting
 * FormData. This mirrors the browser's standard form-association protocol
 * well enough to exercise the element's contract in happy-dom.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// ============================================================================
// Polyfill scaffolding
// ============================================================================

interface PolyfilledInternals {
  _value: string | File | FormData | null;
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

// Tracks every polyfilled internals instance so FormData can walk the tree
// under a form and discover values contributed by custom elements.
const FORM_ASSOCIATED_INTERNALS = new WeakMap<HTMLElement, PolyfilledInternals>();

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
          this._value = value;
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
      FORM_ASSOCIATED_INTERNALS.set(this, internals);
      return internals as unknown as ElementInternals;
    };
  }
}

// Wrap FormData so that form-associated custom elements contribute their
// non-null form value under their `name` attribute -- mirroring the real
// browser contract. Happy-dom's native FormData only walks native form
// control nodes; we append whatever our internals polyfill collected.
function installFormDataPolyfill(): void {
  const Original = globalThis.FormData;
  if ((Original as unknown as { __raftersPatched?: boolean }).__raftersPatched) return;
  const Patched = function PatchedFormData(
    this: FormData,
    form?: HTMLFormElement,
    submitter?: HTMLElement,
  ): FormData {
    const instance =
      submitter !== undefined
        ? new Original(form, submitter as HTMLElement & { form: HTMLFormElement })
        : form !== undefined
          ? new Original(form)
          : new Original();
    if (form) {
      for (const node of Array.from(form.querySelectorAll('*'))) {
        if (!(node instanceof HTMLElement)) continue;
        const internals = FORM_ASSOCIATED_INTERNALS.get(node);
        if (!internals) continue;
        const name = node.getAttribute('name');
        if (!name) continue;
        const value = internals._value;
        if (value === null || value === undefined) continue;
        if (typeof value === 'string') {
          instance.append(name, value);
        }
      }
    }
    return instance;
  } as unknown as typeof FormData;
  (Patched as unknown as { __raftersPatched?: boolean }).__raftersPatched = true;
  Patched.prototype = Original.prototype;
  globalThis.FormData = Patched;
}

beforeAll(async () => {
  installElementInternalsPolyfill();
  installFormDataPolyfill();
  await import('./switch.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElement(): Promise<typeof import('./switch.element').RaftersSwitch> {
  const mod = await import('./switch.element');
  return mod.RaftersSwitch;
}

// ============================================================================
// Tests
// ============================================================================

describe('rafters-switch', () => {
  it('registers the custom element', async () => {
    const RaftersSwitch = await loadElement();
    expect(customElements.get('rafters-switch')).toBe(RaftersSwitch);
  });

  it('registers exactly once even when imported repeatedly', async () => {
    const RaftersSwitch = await loadElement();
    expect(customElements.get('rafters-switch')).toBe(RaftersSwitch);
    await import('./switch.element');
    expect(customElements.get('rafters-switch')).toBe(RaftersSwitch);
  });

  it('declares formAssociated', async () => {
    const RaftersSwitch = await loadElement();
    expect(RaftersSwitch.formAssociated).toBe(true);
  });

  it('declares the documented observedAttributes', async () => {
    const RaftersSwitch = await loadElement();
    expect(RaftersSwitch.observedAttributes).toEqual([
      'checked',
      'disabled',
      'required',
      'name',
      'value',
      'variant',
      'size',
    ]);
  });

  it('exposes ElementInternals-backed validity surface', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    expect(el.willValidate).toBe(true);
    expect(typeof el.checkValidity).toBe('function');
    expect(typeof el.reportValidity).toBe('function');
    expect(el.validity).toBeDefined();
  });

  it('mounts a <button role="switch"> with a thumb span in the shadow root', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    const button = el.shadowRoot?.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('role')).toBe('switch');
    expect(button?.classList.contains('track')).toBe(true);
    const thumb = button?.querySelector('.thumb');
    expect(thumb).toBeTruthy();
    expect(thumb?.getAttribute('aria-hidden')).toBe('true');
  });

  it('reflects checked state via aria-checked and data-state', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    const button = el.shadowRoot?.querySelector('button');
    expect(button?.getAttribute('aria-checked')).toBe('false');
    expect(button?.getAttribute('data-state')).toBe('unchecked');
    el.checked = true;
    expect(button?.getAttribute('aria-checked')).toBe('true');
    expect(button?.getAttribute('data-state')).toBe('checked');
  });

  it('toggles on click and dispatches change', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    let changes = 0;
    el.addEventListener('change', () => {
      changes++;
    });
    const button = el.shadowRoot?.querySelector('button');
    button?.click();
    expect(el.checked).toBe(true);
    expect(changes).toBe(1);
    button?.click();
    expect(el.checked).toBe(false);
    expect(changes).toBe(2);
  });

  it('does not toggle when disabled', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.toggleAttribute('disabled', true);
    document.body.append(el);
    el.shadowRoot?.querySelector('button')?.click();
    expect(el.checked).toBe(false);
  });

  it('toggles on Space key (keydown on the inner button)', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    const button = el.shadowRoot?.querySelector('button');
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    button?.dispatchEvent(event);
    expect(el.checked).toBe(true);
  });

  it('submits name=value when checked inside a <form>', async () => {
    const RaftersSwitch = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.setAttribute('name', 'notifications');
    el.setAttribute('value', 'on');
    form.append(el);
    document.body.append(form);
    el.checked = true;
    expect(new FormData(form).get('notifications')).toBe('on');
  });

  it('defaults submitted value to "on" when no value attribute is provided', async () => {
    const RaftersSwitch = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.setAttribute('name', 'notifications');
    form.append(el);
    document.body.append(form);
    el.checked = true;
    expect(new FormData(form).get('notifications')).toBe('on');
  });

  it('omits unchecked value from FormData', async () => {
    const RaftersSwitch = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.setAttribute('name', 'notifications');
    form.append(el);
    document.body.append(form);
    expect(new FormData(form).get('notifications')).toBeNull();
  });

  it('submits a custom value when the value attribute is set', async () => {
    const RaftersSwitch = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.setAttribute('name', 'tier');
    el.setAttribute('value', 'pro');
    el.toggleAttribute('checked', true);
    form.append(el);
    document.body.append(form);
    expect(new FormData(form).get('tier')).toBe('pro');
  });

  it('reports valueMissing when required and unchecked', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.setAttribute('required', '');
    document.body.append(el);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
  });

  it('clears valueMissing once required switch is checked', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.setAttribute('required', '');
    document.body.append(el);
    el.checked = true;
    expect(el.checkValidity()).toBe(true);
    expect(el.validity.valueMissing).toBe(false);
  });

  it('formResetCallback restores initial checked attribute state', async () => {
    const RaftersSwitch = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.setAttribute('checked', '');
    form.append(el);
    document.body.append(form);
    expect(el.checked).toBe(true);
    el.checked = false;
    expect(el.checked).toBe(false);
    el.formResetCallback();
    expect(el.checked).toBe(true);
  });

  it('formResetCallback returns to unchecked when checked was absent initially', async () => {
    const RaftersSwitch = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    form.append(el);
    document.body.append(form);
    el.checked = true;
    el.formResetCallback();
    expect(el.checked).toBe(false);
  });

  it('formDisabledCallback toggles inner button disabled', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    el.formDisabledCallback(true);
    expect(el.shadowRoot?.querySelector('button')?.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(el.shadowRoot?.querySelector('button')?.disabled).toBe(false);
  });

  it('formStateRestoreCallback marks the switch checked when state is a string', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    el.formStateRestoreCallback('on', 'restore');
    expect(el.checked).toBe(true);
    el.formStateRestoreCallback(null, 'restore');
    expect(el.checked).toBe(false);
  });

  it('falls back to default variant/size on unknown values', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    el.setAttribute('variant', 'galactic');
    el.setAttribute('size', 'huge');
    expect(() => document.body.append(el)).not.toThrow();
  });

  it('property setters reflect to attributes', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    el.name = 'notify';
    expect(el.getAttribute('name')).toBe('notify');
    el.value = 'yes';
    expect(el.getAttribute('value')).toBe('yes');
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    el.required = true;
    expect(el.hasAttribute('required')).toBe(true);
    el.checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    el.variant = 'destructive';
    expect(el.getAttribute('variant')).toBe('destructive');
    el.size = 'lg';
    expect(el.getAttribute('size')).toBe('lg');
  });

  it('rebuilds the per-instance stylesheet when variant changes', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
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
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
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
    expect(collect()).toContain('width: 2.75rem');
    el.setAttribute('size', 'lg');
    expect(collect()).toContain('width: 3.5rem');
  });

  it('dispatches a composed, bubbling change event on toggle', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    let caught: Event | null = null;
    document.body.addEventListener('change', (event) => {
      caught = event;
    });
    el.shadowRoot?.querySelector('button')?.click();
    const captured = caught as Event | null;
    expect(captured).not.toBeNull();
    expect(captured?.bubbles).toBe(true);
    expect(captured?.composed).toBe(true);
  });

  it('setCustomValidity propagates to the validity state', async () => {
    const RaftersSwitch = await loadElement();
    const el = document.createElement('rafters-switch') as InstanceType<typeof RaftersSwitch>;
    document.body.append(el);
    el.setCustomValidity('nope');
    expect(el.validity.customError).toBe(true);
    expect(el.validity.valid).toBe(false);
    el.setCustomValidity('');
    expect(el.validity.customError).toBe(false);
  });
});
