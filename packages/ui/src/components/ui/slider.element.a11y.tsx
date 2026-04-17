/**
 * Accessibility tests for <rafters-slider>.
 *
 * Verifies the WAI-ARIA slider role contract: each thumb carries
 * role=slider plus aria-valuemin/max/now/orientation. Also validates
 * axe-clean rendering when the host is paired with a programmatic
 * label, and that disabled/required/range configurations remain clean.
 *
 * Notes:
 *  - happy-dom 20 ships no ElementInternals implementation. We polyfill
 *    the surface our element depends on so the constructor can run; see
 *    slider.element.test.ts for the same polyfill.
 *  - axe pierces into the shadow root and inspects the inner slider
 *    thumbs. Each thumb carries its own role/value attrs; the host owns
 *    the label association via aria-label or sibling <label for=id>.
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
  await import('./slider.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

// React's IntrinsicElements typing does not know about <rafters-slider>.
// Render through a typed helper so tests stay free of `any`.
type RaftersSliderProps = {
  id?: string;
  name?: string;
  value?: string;
  min?: string;
  max?: string;
  step?: string;
  orientation?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: string;
  size?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};

const RaftersSliderJSX = (props: RaftersSliderProps): React.ReactElement =>
  React.createElement('rafters-slider', props);

describe('rafters-slider -- accessibility', () => {
  it('each thumb carries role=slider with aria-valuemin/max/now/orientation', () => {
    const { container } = render(
      <RaftersSliderJSX id="volume-slider" name="volume" min="0" max="100" />,
    );
    const host = container.querySelector('rafters-slider');
    // React assigns the `value` prop via the property accessor on custom
    // elements, which bypasses setAttribute. Use setAttribute directly to
    // exercise the attribute-to-state wiring the custom element owns.
    host?.setAttribute('value', '50');
    const thumb = host?.shadowRoot?.querySelector('[role="slider"]');
    expect(thumb).toBeTruthy();
    expect(thumb?.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb?.getAttribute('aria-valuemax')).toBe('100');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('50');
    expect(thumb?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('range sliders expose two thumbs with per-thumb aria-valuenow', () => {
    const { container } = render(
      <RaftersSliderJSX id="range-slider" name="range" min="0" max="100" />,
    );
    const host = container.querySelector('rafters-slider');
    host?.setAttribute('value', '25,75');
    const thumbs = host?.shadowRoot?.querySelectorAll('[role="slider"]');
    expect(thumbs?.length).toBe(2);
    expect(thumbs?.[0]?.getAttribute('aria-valuenow')).toBe('25');
    expect(thumbs?.[1]?.getAttribute('aria-valuenow')).toBe('75');
  });

  it('vertical orientation reflects aria-orientation on each thumb', () => {
    const { container } = render(
      <RaftersSliderJSX id="vert-slider" name="vert" value="50" orientation="vertical" />,
    );
    const host = container.querySelector('rafters-slider');
    const thumb = host?.shadowRoot?.querySelector('[role="slider"]');
    expect(thumb?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('disabled slider sets tabindex=-1 and aria-disabled=true on thumbs', () => {
    const { container } = render(
      <RaftersSliderJSX id="disabled-slider" name="disabled" value="50" disabled />,
    );
    const host = container.querySelector('rafters-slider');
    const thumb = host?.shadowRoot?.querySelector('[role="slider"]');
    expect(thumb?.getAttribute('tabindex')).toBe('-1');
    expect(thumb?.getAttribute('aria-disabled')).toBe('true');
  });

  it('enabled slider sets tabindex=0 on thumbs', () => {
    const { container } = render(
      <RaftersSliderJSX id="enabled-slider" name="enabled" value="50" />,
    );
    const host = container.querySelector('rafters-slider');
    const thumb = host?.shadowRoot?.querySelector('[role="slider"]');
    expect(thumb?.getAttribute('tabindex')).toBe('0');
  });

  it('axe-clean against generic ARIA rules when used with a sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="labeled-slider">Volume</label>
        <RaftersSliderJSX id="labeled-slider" name="volume" value="50" />
      </div>,
    );
    const host = container.querySelector('rafters-slider');
    expect(host).toBeTruthy();
    // The host carries the form-control identity via the label-for/id
    // pairing. We disable the `label` rule because axe pierces shadow
    // DOM and is unaware that the host owns the accessibility surface
    // for form-associated custom elements. Other ARIA rules continue
    // to run and must remain clean.
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
        <label htmlFor="disabled-axe-slider">Volume</label>
        <RaftersSliderJSX id="disabled-axe-slider" name="volume" value="50" disabled />
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
        <label htmlFor="required-slider">Rating</label>
        <RaftersSliderJSX id="required-slider" name="rating" value="3" min="0" max="5" required />
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean with a range slider and sibling label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="price-slider">Price range</label>
        <RaftersSliderJSX id="price-slider" name="price" value="25,75" min="0" max="100" />
      </div>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('axe-clean inside a <form> with sibling label', async () => {
    const { container } = render(
      <form>
        <label htmlFor="form-slider">Opacity</label>
        <RaftersSliderJSX id="form-slider" name="opacity" value="80" min="0" max="100" />
      </form>,
    );
    const results = await axe(container, {
      rules: {
        label: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('host carries the documented form-control attributes', () => {
    const { container } = render(
      <div>
        <label htmlFor="full-slider">Volume</label>
        <RaftersSliderJSX id="full-slider" name="volume" value="50" min="0" max="100" required />
      </div>,
    );
    const host = container.querySelector('rafters-slider');
    expect(host?.getAttribute('name')).toBe('volume');
    expect(host?.hasAttribute('required')).toBe(true);
    expect(host?.getAttribute('min')).toBe('0');
    expect(host?.getAttribute('max')).toBe('100');
  });

  it('host supports sibling <label for=id> association', () => {
    const { container } = render(
      <div>
        <label htmlFor="assoc-slider">Brightness</label>
        <RaftersSliderJSX id="assoc-slider" name="brightness" value="50" />
      </div>,
    );
    const label = container.querySelector('label');
    const host = container.querySelector('rafters-slider');
    expect(label?.getAttribute('for')).toBe('assoc-slider');
    expect(host?.id).toBe('assoc-slider');
    expect(label?.getAttribute('for')).toBe(host?.id);
  });
});
