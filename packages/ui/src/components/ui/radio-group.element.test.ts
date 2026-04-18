/**
 * Unit tests for <rafters-radio-group> + <rafters-radio-item>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that
 * RaftersRadioGroup depends on (setFormValue, setValidity,
 * checkValidity, reportValidity, validity, validationMessage,
 * willValidate, form). The polyfill is intentionally tiny -- just
 * enough to exercise the element's contract under happy-dom.
 *
 * Assertions that require real form-control machinery we cannot
 * reasonably synthesise (FormData enumeration via `new FormData(form)`
 * for form-associated custom elements, form.reset() invoking
 * formResetCallback) route through a polyfilled FormData-equivalent
 * on the element, or invoke the lifecycle callback directly.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

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

/**
 * Map of host elements to their polyfilled internals so the FormData
 * polyfill below can read the form-value the element recorded.
 */
const internalsByHost = new WeakMap<HTMLElement, PolyfilledInternals>();

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
          // File/FormData not exercised by the radio-group contract.
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
    internalsByHost.set(this, internals);
    return internals as unknown as ElementInternals;
  };
}

/**
 * happy-dom 20 does not enumerate form-associated custom-element
 * values via `new FormData(form)`. Patch FormData so our submission
 * assertions exercise the documented behaviour: each registered
 * <rafters-radio-group> descendant that recorded a non-empty
 * setFormValue contributes name=value; empty groups contribute
 * nothing. happy-dom does not fire formResetCallback from
 * form.reset() either, so we wrap HTMLFormElement.prototype.reset to
 * call the callback manually on every rafters-radio-group child.
 */
function installFormPolyfillsForRadioGroups(): void {
  const OriginalFormData = globalThis.FormData;
  if (!(OriginalFormData as unknown as { __raftersRadioPatched?: boolean }).__raftersRadioPatched) {
    class PatchedFormData extends OriginalFormData {
      constructor(form?: HTMLFormElement) {
        super(form);
        if (form) {
          const hosts = form.querySelectorAll('rafters-radio-group');
          for (const host of Array.from(hosts)) {
            if (!(host instanceof HTMLElement)) continue;
            const internals = internalsByHost.get(host);
            if (!internals) continue;
            const name = host.getAttribute('name');
            if (!name) continue;
            if (internals._value != null && internals._value !== '') {
              this.append(name, internals._value);
            }
          }
        }
      }
    }
    (PatchedFormData as unknown as { __raftersRadioPatched?: boolean }).__raftersRadioPatched =
      true;
    globalThis.FormData = PatchedFormData as unknown as typeof FormData;
  }

  const formProto = HTMLFormElement.prototype as unknown as Record<string, unknown>;
  if (!(formProto.__raftersRadioResetPatched as boolean | undefined)) {
    const originalReset = formProto.reset as (this: HTMLFormElement) => void;
    formProto.reset = function patchedReset(this: HTMLFormElement): void {
      if (typeof originalReset === 'function') {
        originalReset.call(this);
      }
      const hosts = this.querySelectorAll('rafters-radio-group');
      for (const host of Array.from(hosts)) {
        if (!(host instanceof HTMLElement)) continue;
        const callback = (host as unknown as { formResetCallback?: () => void }).formResetCallback;
        if (typeof callback === 'function') {
          callback.call(host);
        }
      }
    };
    formProto.__raftersRadioResetPatched = true;
  }
}

beforeAll(async () => {
  installElementInternalsPolyfill();
  installFormPolyfillsForRadioGroups();
  // Import after the polyfill so the constructor's guard sees a
  // callable attachInternals on HTMLElement.prototype.
  await import('./radio-group.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElements(): Promise<{
  Group: typeof import('./radio-group.element').RaftersRadioGroup;
  Item: typeof import('./radio-group.element').RaftersRadioItem;
}> {
  const mod = await import('./radio-group.element');
  return { Group: mod.RaftersRadioGroup, Item: mod.RaftersRadioItem };
}

describe('rafters-radio-group', () => {
  it('registers both custom elements', async () => {
    const { Group, Item } = await loadElements();
    expect(customElements.get('rafters-radio-group')).toBe(Group);
    expect(customElements.get('rafters-radio-item')).toBe(Item);
  });

  it('registers exactly once even when imported repeatedly', async () => {
    const { Group, Item } = await loadElements();
    expect(customElements.get('rafters-radio-group')).toBe(Group);
    expect(customElements.get('rafters-radio-item')).toBe(Item);
    await import('./radio-group.element');
    expect(customElements.get('rafters-radio-group')).toBe(Group);
    expect(customElements.get('rafters-radio-item')).toBe(Item);
  });

  it('declares formAssociated on the group only', async () => {
    const { Group, Item } = await loadElements();
    expect(Group.formAssociated).toBe(true);
    expect((Item as unknown as { formAssociated?: boolean }).formAssociated).not.toBe(true);
  });

  it('declares the documented observedAttributes on the group', async () => {
    const { Group } = await loadElements();
    expect(Group.observedAttributes).toEqual([
      'value',
      'disabled',
      'required',
      'name',
      'orientation',
    ]);
  });

  it('declares the documented observedAttributes on the item', async () => {
    const { Item } = await loadElements();
    expect(Item.observedAttributes).toEqual(['value', 'disabled', 'checked']);
  });

  it('creates open shadow roots on both elements', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const item = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    group.append(item);
    document.body.append(group);
    expect(group.shadowRoot).not.toBeNull();
    expect(group.shadowRoot?.mode).toBe('open');
    expect(item.shadowRoot).not.toBeNull();
    expect(item.shadowRoot?.mode).toBe('open');
  });

  it('renders a <div class="group"> with a slot in the group shadow root', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    document.body.append(group);
    const container = group.shadowRoot?.querySelector('div.group');
    expect(container).toBeTruthy();
    expect(container?.querySelector('slot')).toBeTruthy();
  });

  it('renders a <button class="radio"> with an indicator span in the item shadow root', async () => {
    const { Item } = await loadElements();
    const item = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    document.body.append(item);
    const button = item.shadowRoot?.querySelector('button.radio');
    expect(button).toBeTruthy();
    expect(button?.querySelector('span.indicator')).toBeTruthy();
    expect(button?.querySelector('span.indicator')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('sets role="radiogroup" and aria-orientation on connect', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    document.body.append(group);
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('sets role="radio" on items and initial tabindex="-1"', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const item = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    group.append(item);
    document.body.append(group);
    expect(item.getAttribute('role')).toBe('radio');
    // The first non-disabled item gets tabindex=0 (enter point); this
    // one is alone so it is the active item.
    expect(item.getAttribute('tabindex')).toBe('0');
  });

  it('exposes ElementInternals-backed validity surface', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    document.body.append(group);
    expect(group.willValidate).toBe(true);
    expect(typeof group.checkValidity).toBe('function');
    expect(typeof group.reportValidity).toBe('function');
    expect(group.validity).toBeDefined();
    expect(group.internals).toBeDefined();
  });

  it('updates value when an item is clicked and dispatches change', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'b');
    group.append(a, b);
    document.body.append(group);
    let changes = 0;
    group.addEventListener('change', () => {
      changes++;
    });
    const innerButton = b.shadowRoot?.querySelector('button');
    expect(innerButton).toBeTruthy();
    innerButton?.click();
    expect(group.value).toBe('b');
    expect(changes).toBe(1);
    expect(a.getAttribute('aria-checked')).toBe('false');
    expect(b.getAttribute('aria-checked')).toBe('true');
  });

  it('dispatches input and change events (bubbles + composed)', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    group.append(a);
    document.body.append(group);
    let inputs = 0;
    let changes = 0;
    group.addEventListener('input', () => {
      inputs++;
    });
    group.addEventListener('change', () => {
      changes++;
    });
    a.shadowRoot?.querySelector('button')?.click();
    expect(inputs).toBe(1);
    expect(changes).toBe(1);
  });

  it('does not re-fire change when the same item is clicked twice (radios do not toggle off)', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    group.append(a);
    document.body.append(group);
    let changes = 0;
    group.addEventListener('change', () => {
      changes++;
    });
    a.shadowRoot?.querySelector('button')?.click();
    a.shadowRoot?.querySelector('button')?.click();
    expect(changes).toBe(1);
    expect(group.value).toBe('a');
  });

  it('submits as name=value in <form>', async () => {
    const { Group, Item } = await loadElements();
    const form = document.createElement('form');
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('name', 'choice');
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'first');
    group.append(a);
    form.append(group);
    document.body.append(form);
    group.value = 'first';
    expect(new FormData(form).get('choice')).toBe('first');
  });

  it('omits an empty group from FormData', async () => {
    const { Group, Item } = await loadElements();
    const form = document.createElement('form');
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('name', 'choice');
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'first');
    group.append(a);
    form.append(group);
    document.body.append(form);
    // No value set -> nothing appended.
    expect(new FormData(form).get('choice')).toBeNull();
  });

  it('reports valueMissing when required and empty', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('required', '');
    document.body.append(group);
    expect(group.checkValidity()).toBe(false);
    expect(group.validity.valueMissing).toBe(true);
  });

  it('clears valueMissing once a value is set', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('required', '');
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    group.append(a);
    document.body.append(group);
    expect(group.validity.valueMissing).toBe(true);
    group.value = 'a';
    expect(group.validity.valueMissing).toBe(false);
    expect(group.checkValidity()).toBe(true);
  });

  it('formResetCallback restores the initial value attribute', async () => {
    const { Group, Item } = await loadElements();
    const form = document.createElement('form');
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('value', 'init');
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'init');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'other');
    group.append(a, b);
    form.append(group);
    document.body.append(form);
    group.value = 'other';
    expect(group.value).toBe('other');
    form.reset();
    expect(group.value).toBe('init');
  });

  it('formResetCallback clears value when no initial attribute was set', async () => {
    const { Group, Item } = await loadElements();
    const form = document.createElement('form');
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    group.append(a);
    form.append(group);
    document.body.append(form);
    group.value = 'a';
    expect(group.value).toBe('a');
    form.reset();
    expect(group.value).toBe('');
  });

  it('formDisabledCallback propagates disabled to all items', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'b');
    group.append(a, b);
    document.body.append(group);
    group.formDisabledCallback(true);
    expect(a.hasAttribute('disabled')).toBe(true);
    expect(b.hasAttribute('disabled')).toBe(true);
    group.formDisabledCallback(false);
    expect(a.hasAttribute('disabled')).toBe(false);
    expect(b.hasAttribute('disabled')).toBe(false);
  });

  it('group disabled attribute propagates to items', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    group.append(a);
    document.body.append(group);
    group.toggleAttribute('disabled', true);
    expect(a.hasAttribute('disabled')).toBe(true);
  });

  it('formStateRestoreCallback assigns a string state to value', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    document.body.append(group);
    group.formStateRestoreCallback('restored', 'restore');
    expect(group.value).toBe('restored');
  });

  it('formStateRestoreCallback ignores non-string state without throwing', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    document.body.append(group);
    expect(() => group.formStateRestoreCallback(null, 'restore')).not.toThrow();
  });

  it('ignores clicks on disabled items', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    a.toggleAttribute('disabled', true);
    group.append(a);
    document.body.append(group);
    a.shadowRoot?.querySelector('button')?.click();
    expect(group.value).toBe('');
  });

  it('ignores clicks when the group is disabled', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.toggleAttribute('disabled', true);
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    group.append(a);
    document.body.append(group);
    a.shadowRoot?.querySelector('button')?.click();
    expect(group.value).toBe('');
  });

  it('arrow down moves focus to the next non-disabled item', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'b');
    group.append(a, b);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // b now carries the roving tabindex=0.
    expect(b.getAttribute('tabindex')).toBe('0');
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  it('arrow up wraps from the first item to the last', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'b');
    group.append(a, b);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(b.getAttribute('tabindex')).toBe('0');
  });

  it('arrow right/left also navigate (for horizontal radios)', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('orientation', 'horizontal');
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'b');
    group.append(a, b);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(b.getAttribute('tabindex')).toBe('0');
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(a.getAttribute('tabindex')).toBe('0');
  });

  it('Home and End jump to the first and last items', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'b');
    const c = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    c.setAttribute('value', 'c');
    group.append(a, b, c);
    document.body.append(group);
    b.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(c.getAttribute('tabindex')).toBe('0');
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(a.getAttribute('tabindex')).toBe('0');
  });

  it('Space selects the focused item', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'b');
    group.append(a, b);
    document.body.append(group);
    // Simulate tabbing into b: give b tabindex=0 and focus it.
    b.setAttribute('tabindex', '0');
    b.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(group.value).toBe('b');
  });

  it('Enter also selects the focused item', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    group.append(a);
    document.body.append(group);
    a.setAttribute('tabindex', '0');
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(group.value).toBe('a');
  });

  it('falls back to vertical orientation on unknown value', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('orientation', 'diagonal');
    expect(() => document.body.append(group)).not.toThrow();
    expect(group.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('reflects horizontal orientation on aria-orientation', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('orientation', 'horizontal');
    document.body.append(group);
    expect(group.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('rebuilds the per-instance stylesheet when orientation changes', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    document.body.append(group);
    const collect = (): string => {
      const sheets = group.shadowRoot?.adoptedStyleSheets ?? [];
      return sheets
        .map((s) =>
          Array.from(s.cssRules)
            .map((r) => r.cssText)
            .join('\n'),
        )
        .join('\n');
    };
    expect(collect()).toMatch(/display:\s*grid/);
    group.setAttribute('orientation', 'horizontal');
    expect(collect()).toMatch(/display:\s*flex/);
  });

  it('rebuilds the item stylesheet when checked toggles', async () => {
    const { Item } = await loadElements();
    const item = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    document.body.append(item);
    const collect = (): string => {
      const sheets = item.shadowRoot?.adoptedStyleSheets ?? [];
      return sheets
        .map((s) =>
          Array.from(s.cssRules)
            .map((r) => r.cssText)
            .join('\n'),
        )
        .join('\n');
    };
    expect(collect()).toMatch(/\.indicator[^{]*\{[^}]*display:\s*none/);
    item.toggleAttribute('checked', true);
    expect(collect()).toMatch(/\.indicator[^{]*\{[^}]*display:\s*block/);
  });

  it('property setters reflect to attributes', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    document.body.append(group);
    group.name = 'choice';
    expect(group.getAttribute('name')).toBe('choice');
    group.value = 'a';
    expect(group.getAttribute('value')).toBe('a');
    group.value = '';
    expect(group.hasAttribute('value')).toBe(false);
    group.disabled = true;
    expect(group.hasAttribute('disabled')).toBe(true);
    group.disabled = false;
    expect(group.hasAttribute('disabled')).toBe(false);
    group.required = true;
    expect(group.hasAttribute('required')).toBe(true);
    group.orientation = 'horizontal';
    expect(group.getAttribute('orientation')).toBe('horizontal');
  });

  it('item property setters reflect to attributes', async () => {
    const { Item } = await loadElements();
    const item = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    document.body.append(item);
    item.value = 'x';
    expect(item.getAttribute('value')).toBe('x');
    item.value = '';
    expect(item.hasAttribute('value')).toBe(false);
    item.disabled = true;
    expect(item.hasAttribute('disabled')).toBe(true);
    item.checked = true;
    expect(item.hasAttribute('checked')).toBe(true);
  });

  it('items carry aria-checked and data-state mirroring the group value', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    group.append(a);
    document.body.append(group);
    expect(a.getAttribute('aria-checked')).toBe('false');
    expect(a.getAttribute('data-state')).toBe('unchecked');
    group.value = 'a';
    expect(a.getAttribute('aria-checked')).toBe('true');
    expect(a.getAttribute('data-state')).toBe('checked');
  });

  it('disabled item carries aria-disabled="true"', async () => {
    const { Item } = await loadElements();
    const item = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    item.toggleAttribute('disabled', true);
    document.body.append(item);
    expect(item.getAttribute('aria-disabled')).toBe('true');
  });

  it('setCustomValidity sets customError and clears it on empty message', async () => {
    const { Group } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    document.body.append(group);
    group.setCustomValidity('nope');
    expect(group.validity.customError).toBe(true);
    expect(group.validity.valid).toBe(false);
    group.setCustomValidity('');
    expect(group.validity.customError).toBe(false);
  });

  it('keyboard navigation skips disabled items', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'a');
    const b = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    b.setAttribute('value', 'b');
    b.toggleAttribute('disabled', true);
    const c = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    c.setAttribute('value', 'c');
    group.append(a, b, c);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // b is disabled so focus jumps to c.
    expect(c.getAttribute('tabindex')).toBe('0');
    expect(b.getAttribute('tabindex')).toBe('-1');
  });

  it('the group exposes the initial value as the current value', async () => {
    const { Group, Item } = await loadElements();
    const group = document.createElement('rafters-radio-group') as InstanceType<typeof Group>;
    group.setAttribute('value', 'preset');
    const a = document.createElement('rafters-radio-item') as InstanceType<typeof Item>;
    a.setAttribute('value', 'preset');
    group.append(a);
    document.body.append(group);
    expect(group.value).toBe('preset');
    expect(a.getAttribute('aria-checked')).toBe('true');
  });
});
