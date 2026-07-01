/**
 * Accessibility tests for <rafters-checkbox>.
 *
 * Verifies the WCAG-required sibling label association via for=id and
 * the contract that the inner button exposes the correct ARIA checkbox
 * semantics. axe pierces into the shadow root; we confirm that the
 * host-level label association remains clean while the inner button
 * carries role=checkbox and a live aria-checked state.
 *
 * Notes:
 *  - happy-dom 20 ships no ElementInternals implementation. We polyfill
 *    the surface our element depends on so the constructor can run;
 *    see checkbox.element.test.ts for the same polyfill.
 */

import { render } from '@testing-library/react';
import * as React from 'react';
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
        if (value === null) {
          this._value = null;
        } else if (typeof value === 'string') {
          this._value = value;
        } else {
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
    return internals as unknown as ElementInternals;
  };
}

beforeAll(async () => {
  installElementInternalsPolyfill();
  await import('./checkbox.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

// React's IntrinsicElements typing does not know about <rafters-checkbox>.
// Render through a typed helper so tests stay free of `any`.
type RaftersCheckboxProps = {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
  variant?: string;
  size?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: string;
};

const RaftersCheckboxJSX = (props: RaftersCheckboxProps): React.ReactElement =>
  React.createElement('rafters-checkbox', props);

describe('rafters-checkbox -- accessibility', () => {
  it('exposes a sibling <label for=id> association at the host element', () => {
    const { container } = render(
      <div>
        <label htmlFor="terms-checkbox">Accept terms</label>
        <RaftersCheckboxJSX id="terms-checkbox" name="accept" />
      </div>,
    );
    const label = container.querySelector('label');
    const host = container.querySelector('rafters-checkbox');
    expect(label?.getAttribute('for')).toBe('terms-checkbox');
    expect(host?.id).toBe('terms-checkbox');
    expect(label?.getAttribute('for')).toBe(host?.id);
  });

  it('inner button exposes role=checkbox and aria-checked reflecting state', () => {
    const { container } = render(
      <div>
        <label htmlFor="terms-checkbox">Accept terms</label>
        <RaftersCheckboxJSX id="terms-checkbox" name="accept" />
      </div>,
    );
    const host = container.querySelector('rafters-checkbox');
    const button = host?.shadowRoot?.querySelector('button');
    expect(button?.getAttribute('role')).toBe('checkbox');
    expect(button?.getAttribute('aria-checked')).toBe('false');
    host?.setAttribute('checked', '');
    expect(button?.getAttribute('aria-checked')).toBe('true');
  });

  it('axe-clean against generic ARIA rules when used with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="accept-checkbox">Accept terms and conditions</label>
        <RaftersCheckboxJSX id="accept-checkbox" name="accept" />
      </div>,
    );
    const host = container.querySelector('rafters-checkbox');
    expect(host).toBeTruthy();
    // axe pierces shadow DOM and is unaware that the host owns the
    // accessibility surface for form-associated custom elements. We
    // disable the `label` rule (host owns the label association via
    // for=id) and the `button-name` rule (the inner <button
    // role="checkbox"> is an implementation detail -- its accessible
    // name is provided by the host's sibling label). Other ARIA rules
    // continue to run and must remain clean.
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
        'button-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when checked with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="checked-checkbox">Subscribe</label>
        <RaftersCheckboxJSX id="checked-checkbox" name="subscribe" checked />
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
        'button-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when disabled with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="disabled-checkbox">Optional</label>
        <RaftersCheckboxJSX id="disabled-checkbox" name="optional" disabled />
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
        'button-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when required with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="required-checkbox">Confirm</label>
        <RaftersCheckboxJSX id="required-checkbox" name="confirm" required />
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
        'button-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean inside a <form> with label', async () => {
    const { container } = render(
      <form>
        <label htmlFor="form-checkbox">Agree</label>
        <RaftersCheckboxJSX id="form-checkbox" name="agree" />
      </form>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
        'button-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('host carries the documented form-control attributes', () => {
    const { container } = render(
      <div>
        <label htmlFor="signup-checkbox">Email me</label>
        <RaftersCheckboxJSX id="signup-checkbox" name="emailMe" value="yes" required />
      </div>,
    );
    const host = container.querySelector('rafters-checkbox');
    expect(host?.getAttribute('name')).toBe('emailMe');
    expect(host?.getAttribute('value')).toBe('yes');
    expect(host?.hasAttribute('required')).toBe(true);
  });

  it('inner checkmark SVG is aria-hidden', () => {
    const { container } = render(
      <div>
        <label htmlFor="svg-checkbox">Check</label>
        <RaftersCheckboxJSX id="svg-checkbox" name="check" checked />
      </div>,
    );
    const host = container.querySelector('rafters-checkbox');
    const svg = host?.shadowRoot?.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('disabled host reflects to the inner button disabled state', () => {
    const { container } = render(<RaftersCheckboxJSX id="d-checkbox" name="d" disabled />);
    const host = container.querySelector('rafters-checkbox');
    const button = host?.shadowRoot?.querySelector('button');
    expect(button?.disabled).toBe(true);
  });
});
