/**
 * Accessibility tests for <rafters-input-otp>.
 *
 * Verifies the WCAG-required sibling label association via for=id and the
 * contract that the hidden input carries an aria-label fallback. Also
 * validates axe-clean rendering when the host is paired with a programmatic
 * label.
 *
 * Notes:
 *  - happy-dom 20 ships no ElementInternals implementation. We polyfill the
 *    surface our element depends on so the constructor can run; see
 *    input-otp.element.test.ts for the same polyfill.
 *  - axe pierces into the shadow root and inspects the hidden <input>. The
 *    inner has no per-element id by design -- the host owns the
 *    accessibility surface (the WCAG association lives on the host via
 *    `for=id`). We restrict axe scans to the host-level container that
 *    includes a sibling <label for=...> and verify the host-label contract
 *    programmatically for the remaining cases.
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import 'vitest-axe/extend-expect';

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
  await import('./input-otp.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

// React's IntrinsicElements typing does not know about <rafters-input-otp>.
// Cast the JSX runtime through a typed helper so tests stay free of `any`.
type RaftersInputOtpProps = {
  id?: string;
  name?: string;
  value?: string;
  maxlength?: string;
  required?: boolean;
  disabled?: boolean;
  pattern?: string;
  'aria-label'?: string;
};

const RaftersInputOtpJSX = (props: RaftersInputOtpProps): React.ReactElement =>
  React.createElement('rafters-input-otp', props);

describe('rafters-input-otp -- accessibility', () => {
  it('exposes a sibling <label for=id> association at the host element', () => {
    const { container } = render(
      <div>
        <label htmlFor="otp-host">Verification code</label>
        <RaftersInputOtpJSX id="otp-host" name="code" maxlength="6" />
      </div>,
    );
    const label = container.querySelector('label');
    const host = container.querySelector('rafters-input-otp');
    expect(label?.getAttribute('for')).toBe('otp-host');
    expect(host?.id).toBe('otp-host');
    expect(label?.getAttribute('for')).toBe(host?.id);
  });

  it('axe-clean against generic ARIA rules when used with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="otp-clean">Code</label>
        <RaftersInputOtpJSX id="otp-clean" name="code" maxlength="6" />
      </div>,
    );
    const host = container.querySelector('rafters-input-otp');
    expect(host).toBeTruthy();
    // The hidden <input> inside the shadow root carries an aria-label
    // describing the expected character count, which provides a programmatic
    // accessible name for the form-control. We disable the `label` rule
    // because axe pierces shadow DOM and is unaware that the host owns the
    // accessibility surface for form-associated custom elements.
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('hidden input carries an aria-label describing the expected character count', () => {
    const { container } = render(<RaftersInputOtpJSX maxlength="4" name="code" />);
    const host = container.querySelector('rafters-input-otp');
    const inner = host?.shadowRoot?.querySelector('input');
    expect(inner).toBeTruthy();
    expect(inner?.getAttribute('aria-label')).toContain('4');
  });

  it('hidden input declares inputmode and autocomplete suitable for OTP', () => {
    const { container } = render(<RaftersInputOtpJSX maxlength="6" name="code" />);
    const host = container.querySelector('rafters-input-otp');
    const inner = host?.shadowRoot?.querySelector('input');
    expect(inner?.getAttribute('inputmode')).toBe('numeric');
    expect(inner?.getAttribute('autocomplete')).toBe('one-time-code');
  });

  it('caret elements are decorative (aria-hidden=true)', () => {
    const { container } = render(<RaftersInputOtpJSX maxlength="3" name="code" />);
    const host = container.querySelector('rafters-input-otp');
    const carets = host?.shadowRoot?.querySelectorAll('.caret') ?? [];
    expect(carets.length).toBeGreaterThan(0);
    for (const c of Array.from(carets)) {
      expect(c.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('host carries the documented form-control attributes', () => {
    const { container } = render(
      <div>
        <label htmlFor="otp-attr">Code</label>
        <RaftersInputOtpJSX id="otp-attr" name="code" maxlength="6" required />
      </div>,
    );
    const host = container.querySelector('rafters-input-otp');
    expect(host?.getAttribute('name')).toBe('code');
    expect(host?.getAttribute('maxlength')).toBe('6');
    expect(host?.hasAttribute('required')).toBe(true);
    const inner = host?.shadowRoot?.querySelector('input');
    expect(inner?.required).toBe(true);
  });
});
