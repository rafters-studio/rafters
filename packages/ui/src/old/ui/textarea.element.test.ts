/**
 * Unit tests for <rafters-textarea>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that
 * RaftersTextarea depends on (setFormValue, setValidity, checkValidity,
 * reportValidity, validity, validationMessage, willValidate, form). The
 * polyfill is intentionally tiny -- just enough to exercise the
 * element's contract under happy-dom.
 *
 * Assertions that require real form-control machinery we cannot
 * reasonably synthesise (e.g. form.reset() calling formResetCallback,
 * FormData enumeration of form-associated custom elements) are skipped
 * individually with a link to #1304.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { textareaSizeClasses, textareaVariantClasses } from './textarea.classes';

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
  // Import after the polyfill so the constructor's guard sees a
  // callable attachInternals on HTMLElement.prototype.
  await import('./textarea.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElement(): Promise<typeof import('./textarea.element').RaftersTextarea> {
  const mod = await import('./textarea.element');
  return mod.RaftersTextarea;
}

describe('rafters-textarea', () => {
  it('registers the custom element', async () => {
    const RaftersTextarea = await loadElement();
    expect(customElements.get('rafters-textarea')).toBe(RaftersTextarea);
  });

  it('registers exactly once even when imported repeatedly', async () => {
    const RaftersTextarea = await loadElement();
    expect(customElements.get('rafters-textarea')).toBe(RaftersTextarea);
    await import('./textarea.element');
    expect(customElements.get('rafters-textarea')).toBe(RaftersTextarea);
  });

  it('declares formAssociated = true', async () => {
    const RaftersTextarea = await loadElement();
    expect(RaftersTextarea.formAssociated).toBe(true);
  });

  it('declares the documented observedAttributes', async () => {
    const RaftersTextarea = await loadElement();
    expect(RaftersTextarea.observedAttributes).toEqual([
      'placeholder',
      'value',
      'disabled',
      'required',
      'name',
      'rows',
      'cols',
      'maxlength',
      'wrap',
      'resize',
      'variant',
      'size',
      'aria-invalid',
    ]);
  });

  it('creates an open shadow root', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.mode).toBe('open');
  });

  it('renders an inner textarea carrying the composed utility classes', async () => {
    const RaftersTextarea = await loadElement();
    const { composeTextareaClasses } = await import('./textarea.element');
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner).toBeTruthy();
    expect(inner?.className).toBe(composeTextareaClasses('default', 'default'));
  });

  it('exposes ElementInternals-backed validity surface', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    expect(el.willValidate).toBe(true);
    expect(typeof el.checkValidity).toBe('function');
    expect(typeof el.reportValidity).toBe('function');
    expect(el.validity).toBeDefined();
  });

  it('mirrors placeholder, rows, cols, maxlength, wrap to the inner textarea', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('placeholder', 'Type here');
    el.setAttribute('rows', '6');
    el.setAttribute('cols', '40');
    el.setAttribute('maxlength', '500');
    el.setAttribute('wrap', 'hard');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner?.placeholder).toBe('Type here');
    // happy-dom 20 returns rows/cols/maxLength as the underlying string
    // attribute. Native browsers return numbers. Coerce through Number
    // so the assertion passes under both environments.
    expect(Number(inner?.rows)).toBe(6);
    expect(Number(inner?.cols)).toBe(40);
    expect(Number(inner?.maxLength)).toBe(500);
    expect(inner?.wrap).toBe('hard');
  });

  it('falls back to wrap=soft and resize=none for unknown values without throwing', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('wrap', 'bogus');
    el.setAttribute('resize', 'sideways');
    expect(() => document.body.append(el)).not.toThrow();
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner?.wrap).toBe('soft');
    expect(inner?.style.resize).toBe('none');
  });

  it('maps resize attribute to CSS resize on the inner textarea', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('resize', 'vertical');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner?.style.resize).toBe('vertical');
  });

  it('silently drops unparseable numeric attributes (rows, cols, maxlength)', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('rows', 'abc');
    el.setAttribute('cols', '-5');
    el.setAttribute('maxlength', 'NaN');
    expect(() => document.body.append(el)).not.toThrow();
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner?.hasAttribute('rows')).toBe(false);
    expect(inner?.hasAttribute('cols')).toBe(false);
    expect(inner?.hasAttribute('maxlength')).toBe(false);
  });

  it('updates the inner textarea when host attributes change after connection', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    el.setAttribute('placeholder', 'first');
    expect(el.shadowRoot?.querySelector('textarea')?.placeholder).toBe('first');
    el.setAttribute('placeholder', 'second');
    expect(el.shadowRoot?.querySelector('textarea')?.placeholder).toBe('second');
    el.removeAttribute('placeholder');
    expect(el.shadowRoot?.querySelector('textarea')?.hasAttribute('placeholder')).toBe(false);
  });

  it('re-fires input events from the host (bubbles + composed)', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner).toBeTruthy();
    const events: Event[] = [];
    el.addEventListener('input', (e) => events.push(e));
    // Dispatch with bubbles only (no composed) so the inner event is
    // contained in the shadow tree and the host listener only sees the
    // re-fired event. Native browsers enforce the same encapsulation.
    if (inner) {
      inner.value = 'x';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(events.length).toBe(1);
    expect(events[0]?.bubbles).toBe(true);
    expect(events[0]?.composed).toBe(true);
  });

  it('re-fires change events from the host (bubbles + composed)', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    const events: Event[] = [];
    el.addEventListener('change', (e) => events.push(e));
    inner?.dispatchEvent(new Event('change', { bubbles: true }));
    expect(events.length).toBe(1);
    expect(events[0]?.bubbles).toBe(true);
    expect(events[0]?.composed).toBe(true);
  });

  it('reads value from the inner textarea via the value getter', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    if (inner) inner.value = 'live';
    expect(el.value).toBe('live');
  });

  it('writes value to the inner textarea via the value setter', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    el.value = 'set';
    expect(el.shadowRoot?.querySelector('textarea')?.value).toBe('set');
  });

  it('property setters reflect to attributes', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    el.name = 'comment';
    expect(el.getAttribute('name')).toBe('comment');
    el.placeholder = 'Say something';
    expect(el.getAttribute('placeholder')).toBe('Say something');
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    el.variant = 'destructive';
    expect(el.getAttribute('variant')).toBe('destructive');
    el.size = 'lg';
    expect(el.getAttribute('size')).toBe('lg');
    el.resize = 'both';
    expect(el.getAttribute('resize')).toBe('both');
    el.wrap = 'hard';
    expect(el.getAttribute('wrap')).toBe('hard');
  });

  it('unknown variant/size/resize attributes do not throw', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('variant', 'space-laser');
    el.setAttribute('size', 'gigantic');
    el.setAttribute('resize', 'sideways');
    expect(() => document.body.append(el)).not.toThrow();
  });

  it('recomposes the inner class string when variant changes', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    const innerClass = (): string => el.shadowRoot?.querySelector('textarea')?.className ?? '';
    expect(innerClass()).toContain(textareaVariantClasses.default);
    el.setAttribute('variant', 'destructive');
    expect(innerClass()).toContain(textareaVariantClasses.destructive);
  });

  it('recomposes the inner class string when size changes', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    const innerClass = (): string => el.shadowRoot?.querySelector('textarea')?.className ?? '';
    expect(innerClass()).toContain(textareaSizeClasses.default);
    el.setAttribute('size', 'lg');
    expect(innerClass()).toContain(textareaSizeClasses.lg);
  });

  it('applies the resize attribute as an inline CSS resize property', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner?.style.resize).toBe('none');
    el.setAttribute('resize', 'vertical');
    expect(inner?.style.resize).toBe('vertical');
  });

  it('submits with name=value inside a <form>', async () => {
    const RaftersTextarea = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('name', 'note');
    el.setAttribute('value', 'hello world');
    form.append(el);
    document.body.append(form);
    const inner = el.shadowRoot?.querySelector('textarea');
    if (inner) {
      inner.value = 'hello world';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // happy-dom 20 ships no FormData/ElementInternals integration that
    // would surface form-associated values via `new FormData(form)`.
    // Verify the value we expose to the form internals layer instead.
    // See #1304.
    expect(el.value).toBe('hello world');
  });

  it('formResetCallback restores the initial value from the value attribute', async () => {
    const RaftersTextarea = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('name', 'note');
    el.setAttribute('value', 'initial');
    form.append(el);
    document.body.append(form);
    el.value = 'changed';
    expect(el.value).toBe('changed');
    el.formResetCallback();
    expect(el.value).toBe('initial');
  });

  it('formResetCallback clears value to empty when no initial attribute', async () => {
    const RaftersTextarea = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('name', 'note');
    form.append(el);
    document.body.append(form);
    el.value = 'typed';
    el.formResetCallback();
    expect(el.value).toBe('');
  });

  it('formDisabledCallback toggles inner textarea disabled state', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    el.formDisabledCallback(true);
    expect(el.shadowRoot?.querySelector('textarea')?.disabled).toBe(true);
    el.formDisabledCallback(false);
    expect(el.shadowRoot?.querySelector('textarea')?.disabled).toBe(false);
  });

  it('formStateRestoreCallback assigns a string state to value', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    el.formStateRestoreCallback('restored draft', 'restore');
    expect(el.value).toBe('restored draft');
  });

  it('formStateRestoreCallback ignores non-string state without throwing', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    expect(() => el.formStateRestoreCallback(null, 'restore')).not.toThrow();
  });

  it('reflects required validity to host via ElementInternals', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('required', '');
    el.setAttribute('name', 'note');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    if (inner) {
      inner.value = '';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    if (inner) {
      inner.value = 'hello';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(el.checkValidity()).toBe(true);
  });

  it('setCustomValidity propagates to the validity state', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    el.setCustomValidity('nope');
    expect(el.validity.customError).toBe(true);
    expect(el.validity.valid).toBe(false);
    el.setCustomValidity('');
    expect(el.validity.customError).toBe(false);
  });

  it('aria-invalid mirrors to the inner textarea', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('aria-invalid', 'true');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner?.getAttribute('aria-invalid')).toBe('true');
  });

  it('stylesheet is adopted into the shadow root', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    document.body.append(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('disabled attribute mirrors to the inner textarea', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('disabled', '');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner?.disabled).toBe(true);
  });

  it('required attribute mirrors to the inner textarea', async () => {
    const RaftersTextarea = await loadElement();
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('required', '');
    document.body.append(el);
    const inner = el.shadowRoot?.querySelector('textarea');
    expect(inner?.required).toBe(true);
  });

  // happy-dom 20 does not propagate fieldset.disabled to form-associated
  // custom elements via formDisabledCallback. See #1304.
  it.skip('fieldset disabled propagation triggers formDisabledCallback', async () => {
    const RaftersTextarea = await loadElement();
    const fieldset = document.createElement('fieldset');
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    fieldset.append(el);
    document.body.append(fieldset);
    fieldset.disabled = true;
    expect(el.shadowRoot?.querySelector('textarea')?.disabled).toBe(true);
  });

  // happy-dom 20 does not invoke formResetCallback on form-associated
  // custom elements during form.reset(). See #1304.
  it.skip('form.reset() triggers formResetCallback', async () => {
    const RaftersTextarea = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-textarea') as InstanceType<typeof RaftersTextarea>;
    el.setAttribute('name', 'note');
    form.append(el);
    document.body.append(form);
    el.value = 'typed';
    form.reset();
    expect(el.value).toBe('');
  });
});
