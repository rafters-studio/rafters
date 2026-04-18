/**
 * Unit tests for <rafters-slider>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that
 * RaftersSlider depends on (setFormValue, setValidity, checkValidity,
 * reportValidity, validity, validationMessage, willValidate, form). The
 * polyfill is intentionally tiny -- just enough to exercise the element's
 * contract under happy-dom.
 *
 * Assertions that require real form-control machinery we cannot
 * reasonably synthesise (e.g. form.reset() calling formResetCallback,
 * FormData enumeration of form-associated custom elements) are skipped
 * individually with a link to #1345.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

interface PolyfilledInternals {
  _value: string;
  _formDataValue: FormData | null;
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

// Track FormData values per host so tests can inspect multi-entry
// submissions without requiring a real form-associated integration.
const formDataByHost = new WeakMap<HTMLElement, FormData>();
const stringValueByHost = new WeakMap<HTMLElement, string>();

function installElementInternalsPolyfill(): void {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto.attachInternals === 'function') return;
  proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
    const host = this;
    const internals: PolyfilledInternals = {
      _value: '',
      _formDataValue: null,
      _validity: buildValidity(),
      _validationMessage: '',
      _host: host,
      setFormValue(value) {
        if (value instanceof FormData) {
          this._formDataValue = value;
          this._value = '';
          formDataByHost.set(host, value);
          stringValueByHost.delete(host);
        } else if (typeof value === 'string') {
          this._value = value;
          this._formDataValue = null;
          stringValueByHost.set(host, value);
          formDataByHost.delete(host);
        } else {
          this._value = '';
          this._formDataValue = null;
          stringValueByHost.delete(host);
          formDataByHost.delete(host);
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
    return internals as unknown as ElementInternals;
  };
}

// happy-dom 20 does not surface form-associated custom element entries
// when `new FormData(form)` is called. Wrap FormData's constructor so
// tests can exercise the submission contract via our polyfilled internals.
function installFormDataPolyfill(): void {
  const OriginalFormData = globalThis.FormData;
  const Patched = function FormDataPatched(this: FormData, form?: HTMLFormElement): FormData {
    const fd = new OriginalFormData(form);
    if (form) {
      const hosts = form.querySelectorAll<HTMLElement>('rafters-slider');
      for (const host of Array.from(hosts)) {
        const name = host.getAttribute('name');
        if (!name) continue;
        const entries = formDataByHost.get(host);
        if (entries) {
          for (const value of entries.getAll(name)) {
            fd.append(name, value);
          }
          continue;
        }
        const single = stringValueByHost.get(host);
        if (typeof single === 'string' && single !== '') {
          fd.append(name, single);
        }
      }
    }
    return fd;
  } as unknown as typeof FormData;
  // Keep the prototype chain intact for instanceof checks.
  Patched.prototype = OriginalFormData.prototype;
  globalThis.FormData = Patched;
}

beforeAll(async () => {
  installElementInternalsPolyfill();
  installFormDataPolyfill();
  // Import after the polyfill so the constructor's guard sees a callable
  // attachInternals on HTMLElement.prototype.
  await import('./slider.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElement(): Promise<typeof import('./slider.element').RaftersSlider> {
  const mod = await import('./slider.element');
  return mod.RaftersSlider;
}

describe('rafters-slider', () => {
  it('registers the custom element', async () => {
    const RaftersSlider = await loadElement();
    expect(customElements.get('rafters-slider')).toBe(RaftersSlider);
  });

  it('registers exactly once even when imported repeatedly', async () => {
    const RaftersSlider = await loadElement();
    expect(customElements.get('rafters-slider')).toBe(RaftersSlider);
    await import('./slider.element');
    expect(customElements.get('rafters-slider')).toBe(RaftersSlider);
  });

  it('declares formAssociated', async () => {
    const RaftersSlider = await loadElement();
    expect(RaftersSlider.formAssociated).toBe(true);
  });

  it('declares the documented observedAttributes', async () => {
    const RaftersSlider = await loadElement();
    expect(RaftersSlider.observedAttributes).toEqual([
      'value',
      'min',
      'max',
      'step',
      'disabled',
      'required',
      'name',
      'orientation',
      'variant',
      'size',
    ]);
  });

  it('exposes ElementInternals-backed validity surface', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    expect(el.willValidate).toBe(true);
    expect(typeof el.checkValidity).toBe('function');
    expect(typeof el.reportValidity).toBe('function');
    expect(el.validity).toBeDefined();
  });

  it('creates an open shadow root', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.mode).toBe('open');
  });

  it('renders a .container, .track, and .range in the shadow root', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    expect(el.shadowRoot?.querySelector('.container')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('.track')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('.range')).not.toBeNull();
  });

  it('renders one thumb for a single value', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    document.body.append(el);
    expect(el.shadowRoot?.querySelectorAll('[role="slider"]').length).toBe(1);
  });

  it('renders multiple thumbs for a range slider', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '25,75');
    document.body.append(el);
    expect(el.shadowRoot?.querySelectorAll('[role="slider"]').length).toBe(2);
  });

  it('renders one thumb by default when no value attribute is given', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    expect(el.shadowRoot?.querySelectorAll('[role="slider"]').length).toBe(1);
  });

  it('each thumb carries role=slider and aria-valuemin/max/now', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    el.setAttribute('min', '0');
    el.setAttribute('max', '100');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    expect(thumb).toBeTruthy();
    expect(thumb?.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb?.getAttribute('aria-valuemax')).toBe('100');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('50');
    expect(thumb?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(thumb?.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight increments by step, ArrowLeft decrements', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    el.setAttribute('step', '5');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    expect(thumb).toBeTruthy();
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.valueAsArray).toEqual([55]);
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(el.valueAsArray).toEqual([50]);
  });

  it('ArrowUp increments by step, ArrowDown decrements', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(el.valueAsArray).toEqual([51]);
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(el.valueAsArray).toEqual([50]);
  });

  it('PageUp/PageDown moves by step * 10', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    el.setAttribute('step', '2');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
    expect(el.valueAsArray).toEqual([70]);
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    expect(el.valueAsArray).toEqual([50]);
  });

  it('Home sets min, End sets max', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    el.setAttribute('min', '0');
    el.setAttribute('max', '100');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(el.valueAsArray).toEqual([100]);
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(el.valueAsArray).toEqual([0]);
  });

  it('keyboard updates are clamped to min/max', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '99');
    el.setAttribute('min', '0');
    el.setAttribute('max', '100');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.valueAsArray).toEqual([100]);
  });

  it('keeps values sorted in range sliders after update', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '25,75');
    document.body.append(el);
    const thumbs = el.shadowRoot?.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs?.length).toBe(2);
    // Send End to the first thumb (value 25) -- expected to move to 100
    // and then sort to the back of the list.
    thumbs?.[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(el.valueAsArray).toEqual([75, 100]);
  });

  it('submits single value under name in <form>', async () => {
    const RaftersSlider = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('name', 'volume');
    el.setAttribute('value', '42');
    form.append(el);
    document.body.append(form);
    expect(new FormData(form).get('volume')).toBe('42');
  });

  it('submits range values under name via getAll', async () => {
    const RaftersSlider = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('name', 'range');
    el.setAttribute('value', '10,40');
    form.append(el);
    document.body.append(form);
    expect(new FormData(form).getAll('range')).toEqual(['10', '40']);
  });

  it('dispatches input and change events on keyboard update', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    document.body.append(el);
    let inputs = 0;
    let changes = 0;
    el.addEventListener('input', () => inputs++);
    el.addEventListener('change', () => changes++);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(inputs).toBe(1);
    expect(changes).toBe(1);
  });

  it('input and change events are bubbles + composed', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    document.body.append(el);
    const captured: Event[] = [];
    el.addEventListener('input', (e) => captured.push(e));
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(captured[0]?.bubbles).toBe(true);
    expect(captured[0]?.composed).toBe(true);
  });

  it('reports valueMissing when required and no value', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('required', '');
    el.setAttribute('value', '');
    document.body.append(el);
    // Empty value list should still receive a sanitized default ([0]); but
    // the test asks for required+empty to surface valueMissing. Our element
    // sanitizes an empty list to [0] in render, so forcibly empty via
    // valueAsArray to simulate the required+empty state.
    (el as unknown as { _values: number[] })._values = [];
    (el as unknown as { syncFormValue: () => void }).syncFormValue();
    expect(el.checkValidity()).toBe(false);
  });

  it('falls back to defaults on unknown variant/orientation', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('variant', 'nope');
    el.setAttribute('orientation', 'diagonal');
    expect(() => document.body.append(el)).not.toThrow();
  });

  it('falls back to step=1 for unparseable step', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('step', 'invalid');
    el.setAttribute('value', '50');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.valueAsArray).toEqual([51]);
  });

  it('falls back to step=1 for non-positive step', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('step', '-5');
    el.setAttribute('value', '50');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.valueAsArray).toEqual([51]);
  });

  it('formResetCallback restores the initial value', async () => {
    const RaftersSlider = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '30');
    form.append(el);
    document.body.append(form);
    el.value = '70';
    expect(el.value).toBe('70');
    el.formResetCallback();
    expect(el.value).toBe('30');
  });

  it('formDisabledCallback toggles interaction and tabbing', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    document.body.append(el);
    el.formDisabledCallback(true);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    expect(thumb?.getAttribute('tabindex')).toBe('-1');
    expect(thumb?.getAttribute('aria-disabled')).toBe('true');
    el.formDisabledCallback(false);
    expect(thumb?.getAttribute('tabindex')).toBe('0');
    expect(thumb?.hasAttribute('aria-disabled')).toBe(false);
  });

  it('formStateRestoreCallback assigns a string state to value', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    el.formStateRestoreCallback('25,75', 'restore');
    expect(el.valueAsArray).toEqual([25, 75]);
  });

  it('formStateRestoreCallback ignores non-string state without throwing', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    expect(() => el.formStateRestoreCallback(null, 'restore')).not.toThrow();
  });

  it('setCustomValidity propagates to the validity state', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    el.setCustomValidity('nope');
    expect(el.validity.customError).toBe(true);
    expect(el.validity.valid).toBe(false);
    el.setCustomValidity('');
    expect(el.validity.customError).toBe(false);
  });

  it('property setters reflect to attributes', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    el.name = 'volume';
    expect(el.getAttribute('name')).toBe('volume');
    el.min = 10;
    expect(el.getAttribute('min')).toBe('10');
    el.max = 90;
    expect(el.getAttribute('max')).toBe('90');
    el.step = 2;
    expect(el.getAttribute('step')).toBe('2');
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    el.orientation = 'vertical';
    expect(el.getAttribute('orientation')).toBe('vertical');
    el.variant = 'destructive';
    expect(el.getAttribute('variant')).toBe('destructive');
    el.size = 'lg';
    expect(el.getAttribute('size')).toBe('lg');
  });

  it('valueAsArray setter updates the internal values without mutating the value attribute', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '30');
    document.body.append(el);
    el.valueAsArray = [10, 90];
    // Live assignments update the internal value state but do NOT mutate
    // the host `value` attribute -- that attribute is the initial value
    // for formResetCallback. Same pattern as textarea/input elements.
    expect(el.valueAsArray).toEqual([10, 90]);
    expect(el.getAttribute('value')).toBe('30');
  });

  it('rebuilds the per-instance stylesheet when variant changes', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
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
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
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
    expect(collect()).toContain('height: 0.5rem');
    el.setAttribute('size', 'lg');
    expect(collect()).toContain('height: 0.75rem');
  });

  it('adopts at least one stylesheet into the shadow root', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    document.body.append(el);
    const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
    expect(sheets.length).toBeGreaterThanOrEqual(1);
  });

  it('container carries data-orientation', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('orientation', 'vertical');
    document.body.append(el);
    const container = el.shadowRoot?.querySelector('.container');
    expect(container?.getAttribute('data-orientation')).toBe('vertical');
  });

  it('container carries data-disabled when disabled', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('disabled', '');
    document.body.append(el);
    const container = el.shadowRoot?.querySelector('.container');
    expect(container?.hasAttribute('data-disabled')).toBe(true);
  });

  it('disabled attribute sets tabindex=-1 on thumbs', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    el.setAttribute('disabled', '');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    expect(thumb?.getAttribute('tabindex')).toBe('-1');
  });

  it('keyboard interaction is suppressed when disabled', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '50');
    el.setAttribute('disabled', '');
    document.body.append(el);
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.valueAsArray).toEqual([50]);
  });

  it('unparseable value entries are silently dropped', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '10,abc,30');
    document.body.append(el);
    expect(el.valueAsArray).toEqual([10, 30]);
  });

  it('out-of-range values are silently clamped', async () => {
    const RaftersSlider = await loadElement();
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('min', '0');
    el.setAttribute('max', '100');
    el.setAttribute('value', '200');
    document.body.append(el);
    expect(el.valueAsArray).toEqual([100]);
  });

  // happy-dom 20 does not propagate fieldset.disabled to form-associated
  // custom elements via formDisabledCallback. See #1345.
  it.skip('fieldset disabled propagation triggers formDisabledCallback', async () => {
    const RaftersSlider = await loadElement();
    const fieldset = document.createElement('fieldset');
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    fieldset.append(el);
    document.body.append(fieldset);
    fieldset.disabled = true;
    const thumb = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    expect(thumb?.getAttribute('tabindex')).toBe('-1');
  });

  // happy-dom 20 does not invoke formResetCallback on form-associated
  // custom elements during form.reset(). See #1345.
  it.skip('form.reset() triggers formResetCallback', async () => {
    const RaftersSlider = await loadElement();
    const form = document.createElement('form');
    const el = document.createElement('rafters-slider') as InstanceType<typeof RaftersSlider>;
    el.setAttribute('value', '30');
    form.append(el);
    document.body.append(form);
    el.value = '70';
    form.reset();
    expect(el.value).toBe('30');
  });
});
