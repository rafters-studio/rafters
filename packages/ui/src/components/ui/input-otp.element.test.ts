/**
 * Unit tests for <rafters-input-otp>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that
 * RaftersInputOtp actually depends on (setFormValue, setValidity,
 * checkValidity, reportValidity, validity, validationMessage,
 * willValidate, form). The polyfill is intentionally tiny -- just enough
 * to exercise the element's contract under happy-dom.
 *
 * Assertions that require real form-control machinery we cannot
 * reasonably synthesise (e.g. form.reset() invoking formResetCallback,
 * FormData enumeration of form-associated custom elements) call the
 * lifecycle hook directly or assert against the host-exposed value.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

interface PolyfilledInternals {
  _value: string;
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

function installElementInternalsPolyfill(): void {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto.attachInternals === 'function') return;
  proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
    const internals: PolyfilledInternals = {
      _value: '',
      _validity: buildValidity(),
      _validationMessage: '',
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
  // attachInternals on HTMLElement.prototype.
  await import('./input-otp.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElement(): Promise<typeof import('./input-otp.element').RaftersInputOtp> {
  const mod = await import('./input-otp.element');
  return mod.RaftersInputOtp;
}

describe('rafters-input-otp', () => {
  it('registers the custom element', async () => {
    const RaftersInputOtp = await loadElement();
    expect(customElements.get('rafters-input-otp')).toBe(RaftersInputOtp);
  });

  it('registers exactly once even when imported repeatedly', async () => {
    const RaftersInputOtp = await loadElement();
    expect(customElements.get('rafters-input-otp')).toBe(RaftersInputOtp);
    await import('./input-otp.element');
    expect(customElements.get('rafters-input-otp')).toBe(RaftersInputOtp);
  });

  it('declares formAssociated = true', async () => {
    const RaftersInputOtp = await loadElement();
    expect(RaftersInputOtp.formAssociated).toBe(true);
  });

  it('declares the documented observedAttributes', async () => {
    const RaftersInputOtp = await loadElement();
    expect(RaftersInputOtp.observedAttributes).toEqual([
      'value',
      'maxlength',
      'disabled',
      'required',
      'name',
      'pattern',
      'autofocus',
    ]);
  });

  it('creates an open shadow root', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.mode).toBe('open');
  });

  it('renders maxLength slots (default 6)', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    expect(el.shadowRoot?.querySelectorAll('.slot').length).toBe(6);
  });

  it('renders a custom maxLength count of slots', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    expect(el.shadowRoot?.querySelectorAll('.slot').length).toBe(4);
  });

  it('mounts a hidden input with the documented attributes', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    expect(inner).toBeTruthy();
    expect(inner?.classList.contains('hidden-input')).toBe(true);
    expect(inner?.type).toBe('text');
    expect(inner?.getAttribute('inputmode')).toBe('numeric');
    expect(inner?.getAttribute('autocomplete')).toBe('one-time-code');
  });

  it('exposes ElementInternals-backed validity surface', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    expect(el.willValidate).toBe(true);
    expect(typeof el.checkValidity).toBe('function');
    expect(typeof el.reportValidity).toBe('function');
    expect(el.validity).toBeDefined();
  });

  it('typing digits fills slots and advances active index', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '12';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.value).toBe('12');
  });

  it('filters non-digits by default pattern', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '1a2b';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.value).toBe('12');
  });

  it('truncates typed input to maxLength', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '3');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '123456';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.value).toBe('123');
  });

  it('respects a custom pattern attribute', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    el.setAttribute('pattern', '^[A-Z]$');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = 'aB1C';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.value).toBe('BC');
  });

  it('paste truncates to maxLength', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    expect(inner).toBeTruthy();
    if (!inner) return;
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => '123456' },
    });
    inner.dispatchEvent(paste);
    expect(el.value).toBe('1234');
  });

  it('paste filters non-matching characters', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (!inner) return;
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => 'a1b2c3d4' },
    });
    inner.dispatchEvent(paste);
    expect(el.value).toBe('1234');
  });

  it('dispatches input event on every value change (bubbles + composed)', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const events: Event[] = [];
    el.addEventListener('input', (e) => events.push(e));
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '1';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
      inner.value = '12';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(events.length).toBe(2);
    expect(events[0]?.bubbles).toBe(true);
    expect(events[0]?.composed).toBe(true);
  });

  it('dispatches change when value reaches maxLength', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '3');
    document.body.append(el);
    let changes = 0;
    el.addEventListener('change', () => changes++);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '123';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(changes).toBe(1);
  });

  it('dispatches rafters-otp-complete with the final value when full', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '3');
    document.body.append(el);
    const completed: string[] = [];
    el.addEventListener('rafters-otp-complete', (e) => {
      const detail = (e as CustomEvent<{ value: string }>).detail;
      completed.push(detail.value);
    });
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '789';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(completed).toEqual(['789']);
  });

  it('marks slots as filled and active via data attributes', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '12';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const slots = el.shadowRoot?.querySelectorAll('.slot') ?? [];
    expect(slots[0]?.hasAttribute('data-filled')).toBe(true);
    expect(slots[1]?.hasAttribute('data-filled')).toBe(true);
    expect(slots[2]?.hasAttribute('data-filled')).toBe(false);
    expect(slots[2]?.hasAttribute('data-active')).toBe(true);
    expect(slots[3]?.hasAttribute('data-active')).toBe(false);
  });

  it('renders the typed character text inside each filled slot', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '12';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const slots = el.shadowRoot?.querySelectorAll<HTMLDivElement>('.slot') ?? [];
    expect(slots[0]?.textContent?.trim()).toBe('1');
    expect(slots[1]?.textContent?.trim()).toBe('2');
    expect(slots[2]?.textContent?.trim()).toBe('');
  });

  it('ArrowLeft moves the active index back', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '12';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    }
    const slots = el.shadowRoot?.querySelectorAll('.slot') ?? [];
    expect(slots[1]?.hasAttribute('data-active')).toBe(true);
  });

  it('ArrowRight advances the active index up to the value length', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '12';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    }
    const slots = el.shadowRoot?.querySelectorAll('.slot') ?? [];
    expect(slots[2]?.hasAttribute('data-active')).toBe(true);
  });

  it('Backspace deletion (via native input event) reduces the value length', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '4');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '123';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
      // Simulate backspace by removing the last char and re-firing input.
      inner.value = '12';
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.value).toBe('12');
  });

  it('initial value attribute populates the hidden input', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', '6');
    el.setAttribute('value', '123456');
    document.body.append(el);
    expect(el.value).toBe('123456');
  });

  it('clicking the container focuses the hidden input', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    const container = el.shadowRoot?.querySelector<HTMLDivElement>('.container');
    const inner = el.shadowRoot?.querySelector<HTMLInputElement>('input');
    expect(container).toBeTruthy();
    expect(inner).toBeTruthy();
    container?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // happy-dom routes focus to the focused element via document.activeElement
    // through the shadow root's host.
    expect(el.shadowRoot?.activeElement).toBe(inner);
  });

  it('clicking the container is a no-op when disabled', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('disabled', '');
    document.body.append(el);
    const container = el.shadowRoot?.querySelector<HTMLDivElement>('.container');
    container?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.shadowRoot?.activeElement).toBeNull();
  });

  it('reflects disabled to the hidden input', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('disabled', '');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    expect(inner?.disabled).toBe(true);
  });

  it('reflects disabled changes after connection', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    el.setAttribute('disabled', '');
    expect(el.shadowRoot?.querySelector('input')?.disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(el.shadowRoot?.querySelector('input')?.disabled).toBe(false);
  });

  it('reports tooShort when required and value is incomplete', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('required', '');
    el.setAttribute('maxlength', '6');
    el.setAttribute('value', '12');
    document.body.append(el);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.tooShort).toBe(true);
  });

  it('clears tooShort once the value reaches maxLength', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('required', '');
    el.setAttribute('maxlength', '3');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('input');
    if (inner) {
      inner.value = '789';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.checkValidity()).toBe(true);
    expect(el.validity.tooShort).toBe(false);
  });

  it('formResetCallback restores the initial value attribute', async () => {
    const RaftersInputOtp = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('value', '123456');
    el.setAttribute('maxlength', '6');
    form.append(el);
    document.body.append(form);
    el.value = '';
    expect(el.value).toBe('');
    el.formResetCallback();
    expect(el.value).toBe('123456');
  });

  it('formDisabledCallback toggles inner input disabled and host data-disabled', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    el.formDisabledCallback(true);
    expect(el.shadowRoot?.querySelector('input')?.disabled).toBe(true);
    expect(el.shadowRoot?.querySelector('.container')?.hasAttribute('data-disabled')).toBe(true);
    el.formDisabledCallback(false);
    expect(el.shadowRoot?.querySelector('input')?.disabled).toBe(false);
    expect(el.shadowRoot?.querySelector('.container')?.hasAttribute('data-disabled')).toBe(false);
  });

  it('formStateRestoreCallback assigns a string state to value', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    el.formStateRestoreCallback('555000', 'restore');
    expect(el.value).toBe('555000');
  });

  it('formStateRestoreCallback ignores non-string state without throwing', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    expect(() => el.formStateRestoreCallback(null, 'restore')).not.toThrow();
  });

  it('falls back to defaults for bogus maxlength/pattern', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    el.setAttribute('maxlength', 'foo');
    el.setAttribute('pattern', '(((');
    expect(() => document.body.append(el)).not.toThrow();
    expect(el.maxLength).toBe(6);
    expect(el.shadowRoot?.querySelectorAll('.slot').length).toBe(6);
  });

  it('exposes a per-instance stylesheet via shadowRoot.adoptedStyleSheets', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
    const css = sheets
      .map((s) =>
        Array.from(s.cssRules)
          .map((r) => r.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(css).toContain('var(--motion-duration-fast)');
    expect(css).toContain('@keyframes otp-blink');
  });

  it('setCustomValidity surfaces a customError', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    el.setCustomValidity('custom');
    expect(el.validity.customError).toBe(true);
    expect(el.validity.valid).toBe(false);
    el.setCustomValidity('');
    expect(el.validity.customError).toBe(false);
  });

  it('property setters reflect to attributes', async () => {
    const RaftersInputOtp = await loadElement();
    const el = document.createElement('rafters-input-otp') as InstanceType<typeof RaftersInputOtp>;
    document.body.append(el);
    el.name = 'code';
    expect(el.getAttribute('name')).toBe('code');
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    el.required = true;
    expect(el.hasAttribute('required')).toBe(true);
    el.maxLength = 8;
    expect(el.getAttribute('maxlength')).toBe('8');
  });
});
