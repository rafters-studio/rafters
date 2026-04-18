/**
 * Accessibility tests for <rafters-toggle-group> and
 * <rafters-toggle-group-item>.
 *
 * Verifies that the group exposes role="group", individual items reflect
 * aria-pressed, and axe reports no violations when paired with a
 * group-labelling aria-label/aria-labelledby. axe-core descends into open
 * shadow roots automatically.
 *
 * Notes:
 *  - happy-dom 20 ships no ElementInternals implementation. We polyfill
 *    the surface our element depends on so the constructor can run; see
 *    toggle-group.element.test.ts for the same polyfill.
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
  await import('./toggle-group.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

// React's IntrinsicElements typing does not know about <rafters-toggle-group>.
// Cast the JSX runtime through a typed helper so tests stay free of `any`.
type GroupProps = {
  id?: string;
  name?: string;
  type?: 'single' | 'multiple';
  value?: string;
  variant?: string;
  size?: string;
  orientation?: 'horizontal' | 'vertical';
  required?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children?: React.ReactNode;
};

type ItemProps = {
  value: string;
  pressed?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

const GroupJSX = (props: GroupProps): React.ReactElement =>
  React.createElement('rafters-toggle-group', props);

const ItemJSX = (props: ItemProps): React.ReactElement =>
  React.createElement('rafters-toggle-group-item', props);

describe('rafters-toggle-group -- accessibility', () => {
  it('exposes role="group" on the host', () => {
    const { container } = render(
      <GroupJSX aria-label="View mode" type="single">
        <ItemJSX value="grid">Grid</ItemJSX>
        <ItemJSX value="list">List</ItemJSX>
      </GroupJSX>,
    );
    const host = container.querySelector('rafters-toggle-group');
    expect(host?.getAttribute('role')).toBe('group');
  });

  it('reflects orientation via data-orientation', () => {
    const { container } = render(
      <GroupJSX aria-label="View mode" type="single" orientation="vertical">
        <ItemJSX value="grid">Grid</ItemJSX>
      </GroupJSX>,
    );
    const host = container.querySelector('rafters-toggle-group');
    expect(host?.getAttribute('data-orientation')).toBe('vertical');
  });

  it('items expose aria-pressed', () => {
    const { container } = render(
      <GroupJSX aria-label="Text formatting" type="multiple">
        <ItemJSX value="bold">Bold</ItemJSX>
        <ItemJSX value="italic">Italic</ItemJSX>
      </GroupJSX>,
    );
    const item = container.querySelector('rafters-toggle-group-item');
    const button = item?.shadowRoot?.querySelector('button');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
  });

  it('axe-clean when labelled with aria-label', async () => {
    const { container } = render(
      <GroupJSX aria-label="View mode" type="single">
        <ItemJSX value="grid">Grid</ItemJSX>
        <ItemJSX value="list">List</ItemJSX>
      </GroupJSX>,
    );
    const results = await axe(container, {
      rules: {
        // Form-associated custom elements route identity through the host,
        // so the axe label rule (which expects a native control) is disabled.
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean when labelled via aria-labelledby', async () => {
    const { container } = render(
      <div>
        <span id="fmt-label">Text formatting</span>
        <GroupJSX aria-labelledby="fmt-label" type="multiple">
          <ItemJSX value="bold">Bold</ItemJSX>
          <ItemJSX value="italic">Italic</ItemJSX>
        </GroupJSX>
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean for a required group', async () => {
    const { container } = render(
      <GroupJSX aria-label="Priority" type="single" required>
        <ItemJSX value="low">Low</ItemJSX>
        <ItemJSX value="high">High</ItemJSX>
      </GroupJSX>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('disabled items expose disabled to assistive tech via inner button', () => {
    const { container } = render(
      <GroupJSX aria-label="View mode" type="single">
        <ItemJSX value="grid">Grid</ItemJSX>
        <ItemJSX value="list" disabled>
          List
        </ItemJSX>
      </GroupJSX>,
    );
    const items = container.querySelectorAll('rafters-toggle-group-item');
    const second = items[1];
    const button = second?.shadowRoot?.querySelector('button');
    expect(button?.disabled).toBe(true);
  });
});
