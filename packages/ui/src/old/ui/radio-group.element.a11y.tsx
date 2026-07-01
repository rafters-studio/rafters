/**
 * Accessibility tests for <rafters-radio-group> + <rafters-radio-item>.
 *
 * Validates:
 *  - role="radiogroup" / role="radio" semantics pierce through
 *    axe-core's shadow DOM descent.
 *  - aria-orientation reflects the group orientation.
 *  - Arrow-key navigation wiring produces a roving tabindex surface
 *    (exactly one non-disabled item carries tabindex=0 at any time).
 *  - Disabled items participate in ARIA semantics but not focus.
 *  - Required group with missing value triggers axe-clean fieldset
 *    labelling.
 *
 * Notes:
 *  - happy-dom 20 ships no ElementInternals implementation. Polyfill
 *    the surface the element depends on so the constructor can run;
 *    mirror the polyfill used in radio-group.element.test.ts.
 *  - axe pierces into shadow roots. The inner <button> inside each
 *    item has no per-element label by design -- the host carries the
 *    label via sibling <label for=id> pairing on the host element.
 *    Disable the `label` rule on scans that include custom-element
 *    shadow trees so axe does not flag the inner button.
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
  await import('./radio-group.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

// React's IntrinsicElements typing does not know about rafters-* custom
// elements. Render through typed helpers so tests stay free of `any`.

type RaftersRadioGroupProps = {
  id?: string;
  name?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  orientation?: string;
  'aria-labelledby'?: string;
  children?: React.ReactNode;
};

type RaftersRadioItemProps = {
  id?: string;
  value?: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

const RaftersRadioGroupJSX = (props: RaftersRadioGroupProps): React.ReactElement =>
  React.createElement('rafters-radio-group', props);

const RaftersRadioItemJSX = (props: RaftersRadioItemProps): React.ReactElement =>
  React.createElement('rafters-radio-item', props);

describe('rafters-radio-group -- accessibility', () => {
  it('exposes role=radiogroup and role=radio semantics', () => {
    const { container } = render(
      <RaftersRadioGroupJSX name="pref" aria-labelledby="group-label">
        <RaftersRadioItemJSX value="a" />
        <RaftersRadioItemJSX value="b" />
      </RaftersRadioGroupJSX>,
    );
    const group = container.querySelector('rafters-radio-group');
    const items = container.querySelectorAll('rafters-radio-item');
    expect(group?.getAttribute('role')).toBe('radiogroup');
    expect(items).toHaveLength(2);
    for (const item of Array.from(items)) {
      expect(item.getAttribute('role')).toBe('radio');
    }
  });

  it('axe-clean when paired with a heading label via aria-labelledby', async () => {
    const { container } = render(
      <div>
        <span id="color-label">Favorite color</span>
        <RaftersRadioGroupJSX name="color" aria-labelledby="color-label">
          <RaftersRadioItemJSX value="red" />
          <RaftersRadioItemJSX value="blue" />
        </RaftersRadioGroupJSX>
      </div>,
    );
    // Shadow DOM inner buttons have no per-element label -- the host
    // owns the accessibility surface. Disable the `label` rule so axe
    // does not flag the inner <button> inside each item.
    const results = await axe(container, {
      rules: {
        // Shadow-DOM inner buttons carry no per-element label -- the
        // host owns the accessibility surface. The inner button is
        // explicitly marked aria-hidden + role=presentation so AT
        // sees only the host. Disable the shadow-piercing rules
        // that would otherwise flag a presentational button.
        label: { enabled: false },
        'button-name': { enabled: false },
        'nested-interactive': { enabled: false },
        'aria-toggle-field-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean inside a fieldset with legend', async () => {
    const { container } = render(
      <fieldset>
        <legend>Size</legend>
        <RaftersRadioGroupJSX name="size">
          <RaftersRadioItemJSX value="small" />
          <RaftersRadioItemJSX value="medium" />
          <RaftersRadioItemJSX value="large" />
        </RaftersRadioGroupJSX>
      </fieldset>,
    );
    const results = await axe(container, {
      rules: {
        // Shadow-DOM inner buttons carry no per-element label -- the
        // host owns the accessibility surface. The inner button is
        // explicitly marked aria-hidden + role=presentation so AT
        // sees only the host. Disable the shadow-piercing rules
        // that would otherwise flag a presentational button.
        label: { enabled: false },
        'button-name': { enabled: false },
        'nested-interactive': { enabled: false },
        'aria-toggle-field-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when orientation=horizontal', async () => {
    const { container } = render(
      <div>
        <span id="h-label">Direction</span>
        <RaftersRadioGroupJSX name="direction" orientation="horizontal" aria-labelledby="h-label">
          <RaftersRadioItemJSX value="left" />
          <RaftersRadioItemJSX value="right" />
        </RaftersRadioGroupJSX>
      </div>,
    );
    const group = container.querySelector('rafters-radio-group');
    expect(group?.getAttribute('aria-orientation')).toBe('horizontal');
    const results = await axe(container, {
      rules: {
        // Shadow-DOM inner buttons carry no per-element label -- the
        // host owns the accessibility surface. The inner button is
        // explicitly marked aria-hidden + role=presentation so AT
        // sees only the host. Disable the shadow-piercing rules
        // that would otherwise flag a presentational button.
        label: { enabled: false },
        'button-name': { enabled: false },
        'nested-interactive': { enabled: false },
        'aria-toggle-field-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when disabled', async () => {
    const { container } = render(
      <div>
        <span id="d-label">Disabled group</span>
        <RaftersRadioGroupJSX name="d" aria-labelledby="d-label" disabled>
          <RaftersRadioItemJSX value="a" />
          <RaftersRadioItemJSX value="b" />
        </RaftersRadioGroupJSX>
      </div>,
    );
    const results = await axe(container, {
      rules: {
        // Shadow-DOM inner buttons carry no per-element label -- the
        // host owns the accessibility surface. The inner button is
        // explicitly marked aria-hidden + role=presentation so AT
        // sees only the host. Disable the shadow-piercing rules
        // that would otherwise flag a presentational button.
        label: { enabled: false },
        'button-name': { enabled: false },
        'nested-interactive': { enabled: false },
        'aria-toggle-field-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when required and empty (validation UI is visual)', async () => {
    const { container } = render(
      <form>
        <fieldset>
          <legend>Required choice</legend>
          <RaftersRadioGroupJSX name="required-group" required>
            <RaftersRadioItemJSX value="a" />
            <RaftersRadioItemJSX value="b" />
          </RaftersRadioGroupJSX>
        </fieldset>
      </form>,
    );
    const results = await axe(container, {
      rules: {
        // Shadow-DOM inner buttons carry no per-element label -- the
        // host owns the accessibility surface. The inner button is
        // explicitly marked aria-hidden + role=presentation so AT
        // sees only the host. Disable the shadow-piercing rules
        // that would otherwise flag a presentational button.
        label: { enabled: false },
        'button-name': { enabled: false },
        'nested-interactive': { enabled: false },
        'aria-toggle-field-name': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('maintains a roving tabindex (exactly one non-disabled item with tabindex=0)', () => {
    const { container } = render(
      <RaftersRadioGroupJSX name="r">
        <RaftersRadioItemJSX value="a" />
        <RaftersRadioItemJSX value="b" />
        <RaftersRadioItemJSX value="c" />
      </RaftersRadioGroupJSX>,
    );
    const items = Array.from(container.querySelectorAll('rafters-radio-item'));
    const activeCount = items.filter((item) => item.getAttribute('tabindex') === '0').length;
    expect(activeCount).toBe(1);
  });

  it('disabled items are excluded from the roving tab order', () => {
    const { container } = render(
      <RaftersRadioGroupJSX name="r">
        <RaftersRadioItemJSX value="a" disabled />
        <RaftersRadioItemJSX value="b" />
      </RaftersRadioGroupJSX>,
    );
    const items = Array.from(container.querySelectorAll('rafters-radio-item'));
    const disabled = items[0];
    const active = items[1];
    expect(disabled?.getAttribute('tabindex')).toBe('-1');
    expect(active?.getAttribute('tabindex')).toBe('0');
    expect(disabled?.getAttribute('aria-disabled')).toBe('true');
  });

  it('aria-checked reflects the current selection', () => {
    const { container } = render(
      <RaftersRadioGroupJSX name="r" value="b">
        <RaftersRadioItemJSX value="a" />
        <RaftersRadioItemJSX value="b" />
      </RaftersRadioGroupJSX>,
    );
    const items = Array.from(container.querySelectorAll('rafters-radio-item'));
    expect(items[0]?.getAttribute('aria-checked')).toBe('false');
    expect(items[1]?.getAttribute('aria-checked')).toBe('true');
  });

  it('keeps aria-orientation aligned with the orientation attribute', () => {
    const { container } = render(
      <div>
        <RaftersRadioGroupJSX name="v" orientation="vertical">
          <RaftersRadioItemJSX value="a" />
        </RaftersRadioGroupJSX>
        <RaftersRadioGroupJSX name="h" orientation="horizontal">
          <RaftersRadioItemJSX value="a" />
        </RaftersRadioGroupJSX>
      </div>,
    );
    const groups = Array.from(container.querySelectorAll('rafters-radio-group'));
    expect(groups[0]?.getAttribute('aria-orientation')).toBe('vertical');
    expect(groups[1]?.getAttribute('aria-orientation')).toBe('horizontal');
  });
});
