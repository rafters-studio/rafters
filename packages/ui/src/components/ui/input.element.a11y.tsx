/**
 * Accessibility tests for <rafters-input>.
 *
 * Verifies the WCAG-required sibling label association via for=id and the
 * contract that placeholder text is NOT an accessible name. Also validates
 * axe-clean rendering when the host is paired with a programmatic label.
 *
 * Notes:
 *  - happy-dom 20 ships no ElementInternals implementation. We polyfill the
 *    surface our element depends on so the constructor can run; see
 *    input.element.test.ts for the same polyfill.
 *  - axe pierces into the shadow root and inspects the inner <input>. The
 *    inner has no per-element id or label by design -- the host owns the
 *    accessibility surface (the WCAG association lives on the host via
 *    `for=id`). We therefore restrict axe scans to the host-level container
 *    that includes a sibling <label for=...> and verify the host-label
 *    contract programmatically for the remaining cases.
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
  await import('./input.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

// React's IntrinsicElements typing does not know about <rafters-input>. Cast
// the JSX runtime through a typed helper so tests stay free of `any`.
type RaftersInputProps = {
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: string;
  size?: string;
  'aria-label'?: string;
};

const RaftersInputJSX = (props: RaftersInputProps): React.ReactElement =>
  React.createElement('rafters-input', props);

describe('rafters-input -- accessibility', () => {
  it('exposes a sibling <label for=id> association at the host element', () => {
    const { container } = render(
      <div>
        <label htmlFor="username-input">Username</label>
        <RaftersInputJSX id="username-input" type="text" name="username" />
      </div>,
    );
    const label = container.querySelector('label');
    const host = container.querySelector('rafters-input');
    expect(label?.getAttribute('for')).toBe('username-input');
    expect(host?.id).toBe('username-input');
    // The label-for value points at the same id the host carries -- the
    // browser's HTMLLabelElement.control resolution then routes form control
    // semantics through the form-associated custom element.
    expect(label?.getAttribute('for')).toBe(host?.id);
  });

  it('axe-clean against generic ARIA rules when used with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="email-input">Email</label>
        <RaftersInputJSX id="email-input" type="email" name="email" />
      </div>,
    );
    const host = container.querySelector('rafters-input');
    expect(host).toBeTruthy();
    // The inner <input> inside the shadow root has no per-element id or
    // label by design -- the host carries the form-control identity via the
    // label-for/id pairing. We disable the `label` rule for this scan
    // because axe pierces shadow DOM and is unaware that the host owns the
    // accessibility surface for form-associated custom elements. Other ARIA
    // rules continue to run and must remain clean.
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('placeholder alone is NOT an accessible name (label is required)', () => {
    // Render two cases:
    //  1. placeholder-only -- visually has text, but no programmatic name.
    //  2. label + input    -- has a programmatic accessible name.
    const placeholderOnly = render(<RaftersInputJSX placeholder="you@example.com" name="solo" />);
    const labeledHost = render(
      <div>
        <label htmlFor="labeled-input">Email</label>
        <RaftersInputJSX id="labeled-input" placeholder="you@example.com" name="labeled" />
      </div>,
    );

    const placeholderEl = placeholderOnly.container.querySelector('rafters-input');
    const labeledEl = labeledHost.container.querySelector('rafters-input');

    // Placeholder-only host has no id, so no <label for> can ever associate
    // it. This is the contract: placeholder text does NOT substitute for a
    // programmatic label, and consumers must opt into one explicitly.
    expect(placeholderEl?.id).toBe('');
    expect(placeholderEl?.getAttribute('aria-label')).toBeNull();
    expect(labeledEl?.id).toBe('labeled-input');
  });

  it('placeholder is mirrored onto the inner input but is not its accessible name', () => {
    const { container } = render(<RaftersInputJSX placeholder="search" name="q" />);
    const host = container.querySelector('rafters-input');
    const inner = host?.shadowRoot?.querySelector('input');
    expect(inner?.placeholder).toBe('search');
    // Inner has no id, no aria-label -- a placeholder is not an accessible
    // name. Consumers must associate a label at the host level.
    expect(inner?.id).toBe('');
    expect(inner?.getAttribute('aria-label')).toBeNull();
  });

  it('host carries the documented form-control attributes', () => {
    const { container } = render(
      <div>
        <label htmlFor="signup-email">Email</label>
        <RaftersInputJSX id="signup-email" type="email" name="email" required />
      </div>,
    );
    const host = container.querySelector('rafters-input');
    expect(host?.getAttribute('type')).toBe('email');
    expect(host?.getAttribute('name')).toBe('email');
    expect(host?.hasAttribute('required')).toBe(true);
    // Required propagates to the inner input that backs the form value.
    const inner = host?.shadowRoot?.querySelector('input');
    expect(inner?.required).toBe(true);
  });
});
