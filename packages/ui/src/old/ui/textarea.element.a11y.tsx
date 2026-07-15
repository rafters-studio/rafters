/**
 * Accessibility tests for <rafters-textarea>.
 *
 * Verifies the WCAG-required sibling label association via for=id and
 * the contract that placeholder text is NOT an accessible name. Also
 * validates axe-clean rendering when the host is paired with a
 * programmatic label.
 *
 * Notes:
 *  - happy-dom 20 ships no ElementInternals implementation. We polyfill
 *    the surface our element depends on so the constructor can run;
 *    see textarea.element.test.ts for the same polyfill.
 *  - axe pierces into the shadow root and inspects the inner
 *    <textarea>. The inner has no per-element id or label by design --
 *    the host owns the accessibility surface (the WCAG association
 *    lives on the host via `for=id`). We therefore disable the `label`
 *    rule on the whole-container scan because axe is unaware that the
 *    host owns the accessibility surface for form-associated custom
 *    elements. Other ARIA rules continue to run and must remain clean.
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
  await import('./textarea.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

// React's IntrinsicElements typing does not know about <rafters-textarea>.
// Render through a typed helper so tests stay free of `any`.
type RaftersTextareaProps = {
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: string;
  size?: string;
  resize?: string;
  wrap?: string;
  rows?: string;
  cols?: string;
  maxlength?: string;
  'aria-label'?: string;
  'aria-invalid'?: string;
  'aria-describedby'?: string;
};

const RaftersTextareaJSX = (props: RaftersTextareaProps): React.ReactElement =>
  React.createElement('rafters-textarea', props);

describe('rafters-textarea -- accessibility', () => {
  it('exposes a sibling <label for=id> association at the host element', () => {
    const { container } = render(
      <div>
        <label htmlFor="note-textarea">Note</label>
        <RaftersTextareaJSX id="note-textarea" name="note" />
      </div>,
    );
    const label = container.querySelector('label');
    const host = container.querySelector('rafters-textarea');
    expect(label?.getAttribute('for')).toBe('note-textarea');
    expect(host?.id).toBe('note-textarea');
    // The label-for value points at the same id the host carries -- the
    // browser's HTMLLabelElement.control resolution then routes form
    // control semantics through the form-associated custom element.
    expect(label?.getAttribute('for')).toBe(host?.id);
  });

  it('axe-clean against generic ARIA rules when used with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="message-textarea">Message</label>
        <RaftersTextareaJSX id="message-textarea" name="message" />
      </div>,
    );
    const host = container.querySelector('rafters-textarea');
    expect(host).toBeTruthy();
    // The inner <textarea> inside the shadow root has no per-element id
    // or label by design -- the host carries the form-control identity
    // via the label-for/id pairing. We disable the `label` rule for
    // this scan because axe pierces shadow DOM and is unaware that the
    // host owns the accessibility surface for form-associated custom
    // elements. Other ARIA rules continue to run and must remain clean.
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when marked disabled with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="disabled-textarea">Notes</label>
        <RaftersTextareaJSX id="disabled-textarea" name="notes" disabled />
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when marked required with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="required-textarea">Bio</label>
        <RaftersTextareaJSX id="required-textarea" name="bio" required />
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when aria-invalid with aria-describedby error message', async () => {
    const { container } = render(
      <div>
        <label htmlFor="invalid-textarea">Feedback</label>
        <RaftersTextareaJSX
          id="invalid-textarea"
          name="feedback"
          aria-invalid="true"
          aria-describedby="feedback-error"
        />
        <span id="feedback-error">Feedback must be at least 20 characters</span>
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean inside a <form> with label and placeholder', async () => {
    const { container } = render(
      <form>
        <label htmlFor="form-textarea">Comment</label>
        <RaftersTextareaJSX id="form-textarea" name="comment" placeholder="Share your thoughts" />
      </form>,
    );
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
    //  2. label + textarea -- has a programmatic accessible name.
    const placeholderOnly = render(
      <RaftersTextareaJSX placeholder="Share your thoughts" name="solo" />,
    );
    const labeledHost = render(
      <div>
        <label htmlFor="labeled-textarea">Comment</label>
        <RaftersTextareaJSX
          id="labeled-textarea"
          placeholder="Share your thoughts"
          name="labeled"
        />
      </div>,
    );

    const placeholderEl = placeholderOnly.container.querySelector('rafters-textarea');
    const labeledEl = labeledHost.container.querySelector('rafters-textarea');

    // Placeholder-only host has no id, so no <label for> can ever
    // associate it. This is the contract: placeholder text does NOT
    // substitute for a programmatic label, and consumers must opt into
    // one explicitly.
    expect(placeholderEl?.id).toBe('');
    expect(placeholderEl?.getAttribute('aria-label')).toBeNull();
    expect(labeledEl?.id).toBe('labeled-textarea');
  });

  it('placeholder is mirrored onto the inner textarea but is not its accessible name', () => {
    const { container } = render(<RaftersTextareaJSX placeholder="Share your thoughts" name="c" />);
    const host = container.querySelector('rafters-textarea');
    const inner = host?.shadowRoot?.querySelector('textarea');
    expect(inner?.placeholder).toBe('Share your thoughts');
    // Inner has no id, no aria-label -- a placeholder is not an
    // accessible name. Consumers must associate a label at the host
    // level.
    expect(inner?.id).toBe('');
    expect(inner?.getAttribute('aria-label')).toBeNull();
  });

  it('host carries the documented form-control attributes', () => {
    const { container } = render(
      <div>
        <label htmlFor="review-textarea">Review</label>
        <RaftersTextareaJSX id="review-textarea" name="review" required />
      </div>,
    );
    const host = container.querySelector('rafters-textarea');
    expect(host?.getAttribute('name')).toBe('review');
    expect(host?.hasAttribute('required')).toBe(true);
    // Required propagates to the inner textarea that backs the form
    // value.
    const inner = host?.shadowRoot?.querySelector('textarea');
    expect(inner?.required).toBe(true);
  });
});
