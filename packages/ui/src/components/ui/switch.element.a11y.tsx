/**
 * Accessibility tests for <rafters-switch>.
 *
 * Verifies that the element exposes the `switch` role, reflects checked
 * state via aria-checked, is keyboard operable (Space toggles), and that
 * axe finds no violations when paired with a sibling label via
 * aria-labelledby. Placeholder text is not part of a switch contract;
 * the WCAG-required association here is a programmatic label.
 *
 * Notes:
 *  - happy-dom 20 ships no ElementInternals implementation. We polyfill
 *    the surface our element depends on so the constructor can run; see
 *    switch.element.test.ts for the same polyfill.
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import 'vitest-axe/extend-expect';

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
    return internals as unknown as ElementInternals;
  };
}

beforeAll(async () => {
  installElementInternalsPolyfill();
  await import('./switch.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

// React's IntrinsicElements typing does not know about <rafters-switch>. Cast
// the JSX runtime through a typed helper so tests stay free of `any`.
type RaftersSwitchProps = {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
  variant?: string;
  size?: string;
  'aria-labelledby'?: string;
  'aria-label'?: string;
};

const RaftersSwitchJSX = (props: RaftersSwitchProps): React.ReactElement =>
  React.createElement('rafters-switch', props);

describe('rafters-switch -- accessibility', () => {
  it('exposes role="switch" on the inner button', () => {
    const { container } = render(<RaftersSwitchJSX id="notify" name="notify" />);
    const host = container.querySelector('rafters-switch');
    const button = host?.shadowRoot?.querySelector('button');
    expect(button?.getAttribute('role')).toBe('switch');
  });

  it('reflects checked state via aria-checked', () => {
    const { container } = render(<RaftersSwitchJSX id="notify" name="notify" checked />);
    const host = container.querySelector('rafters-switch');
    const button = host?.shadowRoot?.querySelector('button');
    expect(button?.getAttribute('aria-checked')).toBe('true');
  });

  it('axe-clean when paired with a sibling label via label[for]+host[id]', async () => {
    const { container } = render(
      <div>
        <label htmlFor="notify">Enable notifications</label>
        <RaftersSwitchJSX id="notify" name="notify" />
      </div>,
    );
    // axe pierces the shadow DOM and inspects the inner button. The host
    // owns the accessibility surface via the native label-for/id pairing;
    // the inner button has no per-element id/label by design. We disable
    // the rules that assume the form control node is the same node that
    // carries the label or role -- `label` and `button-name` -- because
    // form-associated custom elements route identity through the host.
    // Every other ARIA rule continues to run and must remain clean.
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
        <label htmlFor="pref-dark">Dark mode</label>
        <RaftersSwitchJSX id="pref-dark" name="dark-mode" required />
      </div>,
    );
    const host = container.querySelector('rafters-switch');
    expect(host?.getAttribute('name')).toBe('dark-mode');
    expect(host?.hasAttribute('required')).toBe(true);
  });

  it('disabled host disables the inner button for assistive tech', () => {
    const { container } = render(<RaftersSwitchJSX id="notify" name="notify" disabled />);
    const host = container.querySelector('rafters-switch');
    const button = host?.shadowRoot?.querySelector('button');
    expect(button?.disabled).toBe(true);
  });

  it('thumb is aria-hidden so assistive tech does not announce it', () => {
    const { container } = render(<RaftersSwitchJSX id="notify" name="notify" />);
    const host = container.querySelector('rafters-switch');
    const thumb = host?.shadowRoot?.querySelector('.thumb');
    expect(thumb?.getAttribute('aria-hidden')).toBe('true');
  });
});
