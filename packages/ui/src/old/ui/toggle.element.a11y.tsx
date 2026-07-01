/**
 * Accessibility tests for <rafters-toggle>.
 *
 * Verifies that axe has no complaints when the host is used as a press-toggle
 * button with either a visible label, an aria-label, or an icon+aria-label
 * pair, and across every documented variant/size combination.
 *
 * happy-dom 20 ships no ElementInternals implementation. We polyfill the
 * surface our element depends on so the constructor can run; see
 * toggle.element.test.ts for the same polyfill.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import 'vitest-axe/extend-expect';

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

function installElementInternalsPolyfill(): void {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto.attachInternals === 'function') return;
  proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
    const internals: PolyfilledInternals = {
      _value: null,
      _validity: buildValidity(),
      _validationMessage: '',
      _host: this,
      setFormValue(value) {
        this._value = typeof value === 'string' ? value : value === null ? null : '';
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
  await import('./toggle.element');
});

let container: HTMLElement;

function mountContainer(): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function buildToggle(
  attrs: Record<string, string> = {},
  text: string | null = 'Toggle',
): HTMLElement {
  const host = document.createElement('rafters-toggle');
  for (const [k, v] of Object.entries(attrs)) host.setAttribute(k, v);
  if (text !== null) host.textContent = text;
  container.appendChild(host);
  return host;
}

const VARIANTS = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
  'outline',
  'ghost',
] as const;

const SIZES = ['sm', 'default', 'lg'] as const;

describe('<rafters-toggle> - Accessibility', () => {
  it('has no violations with default configuration (visible text label)', async () => {
    mountContainer();
    buildToggle({}, 'Bold');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when aria-label provides the accessible name', async () => {
    mountContainer();
    buildToggle({ 'aria-label': 'Toggle bold' }, 'B');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in pressed state', async () => {
    mountContainer();
    buildToggle({ pressed: '' }, 'Bold');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    mountContainer();
    buildToggle({ disabled: '' }, 'Bold');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations across every variant', async () => {
    for (const variant of VARIANTS) {
      mountContainer();
      buildToggle({ variant }, 'Bold');
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }
  });

  it('has no violations across every size', async () => {
    for (const size of SIZES) {
      mountContainer();
      buildToggle({ size }, 'Bold');
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }
  });

  it('has no violations when placed inside a <form> with name + value', async () => {
    mountContainer();
    const form = document.createElement('form');
    const host = document.createElement('rafters-toggle');
    host.setAttribute('name', 'bold');
    host.setAttribute('value', 'yes');
    host.textContent = 'Bold';
    form.appendChild(host);
    container.appendChild(form);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations for a toolbar of toggles', async () => {
    mountContainer();
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Text formatting');

    for (const label of ['Bold', 'Italic', 'Underline']) {
      const host = document.createElement('rafters-toggle');
      host.textContent = label;
      toolbar.appendChild(host);
    }

    container.appendChild(toolbar);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
