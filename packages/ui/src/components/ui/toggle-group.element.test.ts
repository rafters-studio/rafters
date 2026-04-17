/**
 * Unit tests for <rafters-toggle-group> and <rafters-toggle-group-item>.
 *
 * happy-dom 20 ships no ElementInternals implementation, so this file
 * installs a minimal polyfill that mirrors the browser surface that
 * RaftersToggleGroup depends on (setFormValue, setValidity, checkValidity,
 * reportValidity, validity, validationMessage, willValidate, form).
 *
 * To drive the form-submission contract in multiple mode we also patch
 * FormData so that form-associated custom elements contribute their
 * non-null form value (string or FormData) under their `name` attribute
 * -- mirroring the real browser contract. Happy-dom's native FormData only
 * walks native form control nodes.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// ============================================================================
// Polyfill scaffolding
// ============================================================================

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

const FORM_ASSOCIATED_INTERNALS = new WeakMap<HTMLElement, PolyfilledInternals>();

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
    FORM_ASSOCIATED_INTERNALS.set(this, internals);
    return internals as unknown as ElementInternals;
  };
}

/**
 * Wrap FormData so form-associated custom elements contribute their
 * non-null form value under their `name` attribute. If the value is a
 * FormData instance we copy each entry; strings contribute a single entry.
 */
function installFormDataPolyfill(): void {
  const Original = globalThis.FormData;
  if ((Original as unknown as { __raftersPatched?: boolean }).__raftersPatched) return;
  const Patched = function PatchedFormData(
    this: FormData,
    form?: HTMLFormElement,
    submitter?: HTMLElement,
  ): FormData {
    const instance =
      submitter !== undefined
        ? new Original(form, submitter as HTMLElement & { form: HTMLFormElement })
        : form !== undefined
          ? new Original(form)
          : new Original();
    if (form) {
      for (const node of Array.from(form.querySelectorAll('*'))) {
        if (!(node instanceof HTMLElement)) continue;
        const internals = FORM_ASSOCIATED_INTERNALS.get(node);
        if (!internals) continue;
        const name = node.getAttribute('name');
        if (!name) continue;
        const value = internals._value;
        if (value === null || value === undefined) continue;
        if (typeof value === 'string') {
          instance.append(name, value);
        } else if (value instanceof FormData) {
          for (const [entryKey, entryValue] of value.entries()) {
            // FormData from setFormValue uses the element's name as its key.
            // We respect whatever keys the element chose when writing.
            instance.append(entryKey || name, entryValue);
          }
        }
      }
    }
    return instance;
  } as unknown as typeof FormData;
  (Patched as unknown as { __raftersPatched?: boolean }).__raftersPatched = true;
  Patched.prototype = Original.prototype;
  globalThis.FormData = Patched;
}

beforeAll(async () => {
  installElementInternalsPolyfill();
  installFormDataPolyfill();
  await import('./toggle-group.element');
});

afterEach(() => {
  document.body.replaceChildren();
});

async function loadElements(): Promise<{
  RaftersToggleGroup: typeof import('./toggle-group.element').RaftersToggleGroup;
  RaftersToggleGroupItem: typeof import('./toggle-group.element').RaftersToggleGroupItem;
}> {
  const mod = await import('./toggle-group.element');
  return {
    RaftersToggleGroup: mod.RaftersToggleGroup,
    RaftersToggleGroupItem: mod.RaftersToggleGroupItem,
  };
}

function buildGroup(
  attrs: Record<string, string> = {},
): import('./toggle-group.element').RaftersToggleGroup {
  const group = document.createElement(
    'rafters-toggle-group',
  ) as import('./toggle-group.element').RaftersToggleGroup;
  for (const [k, v] of Object.entries(attrs)) group.setAttribute(k, v);
  return group;
}

function buildItem(
  attrs: Record<string, string> = {},
): import('./toggle-group.element').RaftersToggleGroupItem {
  const item = document.createElement(
    'rafters-toggle-group-item',
  ) as import('./toggle-group.element').RaftersToggleGroupItem;
  for (const [k, v] of Object.entries(attrs)) item.setAttribute(k, v);
  return item;
}

function innerButton(item: Element): HTMLButtonElement | null {
  const btn = item.shadowRoot?.querySelector('button') ?? null;
  return btn instanceof HTMLButtonElement ? btn : null;
}

// ============================================================================
// Tests
// ============================================================================

describe('rafters-toggle-group registration', () => {
  it('registers both custom elements', async () => {
    const { RaftersToggleGroup, RaftersToggleGroupItem } = await loadElements();
    expect(customElements.get('rafters-toggle-group')).toBe(RaftersToggleGroup);
    expect(customElements.get('rafters-toggle-group-item')).toBe(RaftersToggleGroupItem);
  });

  it('registers idempotently on repeated imports', async () => {
    const { RaftersToggleGroup, RaftersToggleGroupItem } = await loadElements();
    await import('./toggle-group.element');
    expect(customElements.get('rafters-toggle-group')).toBe(RaftersToggleGroup);
    expect(customElements.get('rafters-toggle-group-item')).toBe(RaftersToggleGroupItem);
  });

  it('declares formAssociated on the group', async () => {
    const { RaftersToggleGroup } = await loadElements();
    expect(RaftersToggleGroup.formAssociated).toBe(true);
  });

  it('declares the documented observedAttributes on the group', async () => {
    const { RaftersToggleGroup } = await loadElements();
    expect(RaftersToggleGroup.observedAttributes).toEqual([
      'type',
      'value',
      'disabled',
      'required',
      'name',
      'variant',
      'size',
      'orientation',
    ]);
  });

  it('declares the documented observedAttributes on the item', async () => {
    const { RaftersToggleGroupItem } = await loadElements();
    expect(RaftersToggleGroupItem.observedAttributes).toEqual(['value', 'pressed', 'disabled']);
  });
});

describe('rafters-toggle-group DOM + stylesheet', () => {
  it('applies role="group" and data-orientation to the host', async () => {
    await loadElements();
    const group = buildGroup();
    document.body.append(group);
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('reflects vertical orientation on data-orientation', async () => {
    await loadElements();
    const group = buildGroup({ orientation: 'vertical' });
    document.body.append(group);
    expect(group.getAttribute('data-orientation')).toBe('vertical');
  });

  it('renders a .group wrapper with a default <slot>', async () => {
    await loadElements();
    const group = buildGroup();
    document.body.append(group);
    const wrapper = group.shadowRoot?.querySelector('.group');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.querySelector('slot')).toBeTruthy();
  });

  it('adopts a per-instance CSSStyleSheet on the shadow root', async () => {
    await loadElements();
    const group = buildGroup();
    document.body.append(group);
    const sheets = group.shadowRoot?.adoptedStyleSheets ?? [];
    const text = sheets
      .map((sheet) =>
        Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(text).toContain('var(--radius-lg)');
  });

  it('rebuilds the stylesheet when variant changes', async () => {
    await loadElements();
    const group = buildGroup({ variant: 'default' });
    document.body.append(group);
    const collect = (): string => {
      const sheets = group.shadowRoot?.adoptedStyleSheets ?? [];
      return sheets
        .map((sheet) =>
          Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n'),
        )
        .join('\n');
    };
    expect(collect()).toContain('var(--color-muted)');
    group.setAttribute('variant', 'outline');
    expect(collect()).not.toContain('var(--color-muted)');
  });
});

describe('rafters-toggle-group-item DOM + stylesheet', () => {
  it('renders a <button class="item"> in the shadow root', async () => {
    await loadElements();
    const item = buildItem({ value: 'a' });
    document.body.append(item);
    const button = innerButton(item);
    expect(button).toBeTruthy();
    expect(button?.classList.contains('item')).toBe(true);
    expect(button?.getAttribute('type')).toBe('button');
  });

  it('reflects pressed state via aria-pressed and data-state', async () => {
    await loadElements();
    const item = buildItem({ value: 'a' });
    document.body.append(item);
    const button = innerButton(item);
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    expect(button?.getAttribute('data-state')).toBe('off');
    item.setAttribute('pressed', '');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.getAttribute('data-state')).toBe('on');
  });

  it('disables the inner button when host is disabled', async () => {
    await loadElements();
    const item = buildItem({ value: 'a', disabled: '' });
    document.body.append(item);
    expect(innerButton(item)?.disabled).toBe(true);
  });

  it('adopts a per-instance stylesheet with font-size token', async () => {
    await loadElements();
    const item = buildItem({ value: 'a' });
    document.body.append(item);
    const sheets = item.shadowRoot?.adoptedStyleSheets ?? [];
    const text = sheets
      .map((sheet) =>
        Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n'),
      )
      .join('\n');
    expect(text).toContain('var(--font-size-label-large)');
    expect(text).toContain('var(--motion-duration-base)');
    expect(text).toContain('var(--motion-ease-standard)');
  });
});

describe('rafters-toggle-group single-mode selection', () => {
  it('single mode sets value to clicked item and toggles off on second click', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    const a = buildItem({ value: 'a' });
    group.append(a);
    document.body.append(group);
    innerButton(a)?.click();
    expect(group.value).toBe('a');
    innerButton(a)?.click();
    expect(group.value).toBe('');
  });

  it('single mode swaps selection between items', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    const a = buildItem({ value: 'a' });
    const b = buildItem({ value: 'b' });
    group.append(a, b);
    document.body.append(group);
    innerButton(a)?.click();
    expect(group.value).toBe('a');
    innerButton(b)?.click();
    expect(group.value).toBe('b');
    expect(a.pressed).toBe(false);
    expect(b.pressed).toBe(true);
  });

  it('ignores clicks on disabled items', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    const a = buildItem({ value: 'a', disabled: '' });
    group.append(a);
    document.body.append(group);
    innerButton(a)?.click();
    expect(group.value).toBe('');
  });

  it('defaults to single when type attribute is missing', async () => {
    await loadElements();
    const group = buildGroup();
    document.body.append(group);
    expect(group.type).toBe('single');
  });

  it('falls back to single on unknown type', async () => {
    await loadElements();
    const group = buildGroup({ type: 'weird' });
    document.body.append(group);
    expect(group.type).toBe('single');
  });
});

describe('rafters-toggle-group multiple-mode selection', () => {
  it('multiple mode toggles item presence', async () => {
    await loadElements();
    const group = buildGroup({ type: 'multiple' });
    const a = buildItem({ value: 'a' });
    const b = buildItem({ value: 'b' });
    group.append(a, b);
    document.body.append(group);
    innerButton(a)?.click();
    innerButton(b)?.click();
    expect(group.value).toContain('a');
    expect(group.value).toContain('b');
    innerButton(a)?.click();
    expect(group.value).not.toContain('a');
    expect(group.value).toContain('b');
  });

  it('multiple mode CSV reflects insertion order', async () => {
    await loadElements();
    const group = buildGroup({ type: 'multiple' });
    const a = buildItem({ value: 'bold' });
    const b = buildItem({ value: 'italic' });
    group.append(a, b);
    document.body.append(group);
    innerButton(b)?.click();
    innerButton(a)?.click();
    expect(group.value).toBe('italic,bold');
  });

  it('multiple mode updates pressed attribute on items', async () => {
    await loadElements();
    const group = buildGroup({ type: 'multiple' });
    const a = buildItem({ value: 'a' });
    const b = buildItem({ value: 'b' });
    group.append(a, b);
    document.body.append(group);
    innerButton(a)?.click();
    expect(a.pressed).toBe(true);
    expect(b.pressed).toBe(false);
    innerButton(b)?.click();
    expect(a.pressed).toBe(true);
    expect(b.pressed).toBe(true);
  });
});

describe('rafters-toggle-group events', () => {
  it('dispatches change and input events on value change', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    const a = buildItem({ value: 'a' });
    group.append(a);
    document.body.append(group);
    let changes = 0;
    let inputs = 0;
    group.addEventListener('change', () => {
      changes++;
    });
    group.addEventListener('input', () => {
      inputs++;
    });
    innerButton(a)?.click();
    expect(changes).toBe(1);
    expect(inputs).toBe(1);
  });

  it('dispatches rafters-toggle-group-change custom event with detail', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    const a = buildItem({ value: 'hello' });
    group.append(a);
    document.body.append(group);
    let detail: { value: string; type: string } | null = null;
    group.addEventListener('rafters-toggle-group-change', (event: Event) => {
      if (event instanceof CustomEvent) {
        detail = event.detail as { value: string; type: string };
      }
    });
    innerButton(a)?.click();
    expect(detail).toEqual({ value: 'hello', type: 'single' });
  });
});

describe('rafters-toggle-group form submission', () => {
  it('submits a single value in single mode', async () => {
    await loadElements();
    const form = document.createElement('form');
    const group = buildGroup({ type: 'single', name: 'view' });
    const a = buildItem({ value: 'grid' });
    group.append(a);
    form.append(group);
    document.body.append(form);
    innerButton(a)?.click();
    expect(new FormData(form).get('view')).toBe('grid');
  });

  it('submits all selected values in multiple mode via getAll', async () => {
    await loadElements();
    const form = document.createElement('form');
    const group = buildGroup({ type: 'multiple', name: 'tools' });
    const a = buildItem({ value: 'bold' });
    const b = buildItem({ value: 'italic' });
    group.append(a, b);
    form.append(group);
    document.body.append(form);
    innerButton(a)?.click();
    innerButton(b)?.click();
    const data = new FormData(form);
    expect(data.getAll('tools')).toEqual(['bold', 'italic']);
  });

  it('omits unnamed groups from FormData', async () => {
    await loadElements();
    const form = document.createElement('form');
    const group = buildGroup({ type: 'single' });
    const a = buildItem({ value: 'grid' });
    group.append(a);
    form.append(group);
    document.body.append(form);
    innerButton(a)?.click();
    expect(new FormData(form).get('view')).toBeNull();
  });
});

describe('rafters-toggle-group validity', () => {
  it('reports valueMissing when required and empty', async () => {
    await loadElements();
    const group = buildGroup();
    group.setAttribute('required', '');
    document.body.append(group);
    expect(group.checkValidity()).toBe(false);
    expect(group.validity.valueMissing).toBe(true);
  });

  it('clears valueMissing once a value is selected', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    group.setAttribute('required', '');
    const a = buildItem({ value: 'a' });
    group.append(a);
    document.body.append(group);
    innerButton(a)?.click();
    expect(group.checkValidity()).toBe(true);
    expect(group.validity.valueMissing).toBe(false);
  });

  it('exposes willValidate, checkValidity, reportValidity, validationMessage', async () => {
    await loadElements();
    const group = buildGroup();
    document.body.append(group);
    expect(group.willValidate).toBe(true);
    expect(typeof group.checkValidity).toBe('function');
    expect(typeof group.reportValidity).toBe('function');
    expect(typeof group.validationMessage).toBe('string');
  });

  it('setCustomValidity records a custom error', async () => {
    await loadElements();
    const group = buildGroup();
    document.body.append(group);
    group.setCustomValidity('nope');
    expect(group.checkValidity()).toBe(false);
    expect(group.validity.customError).toBe(true);
  });
});

describe('rafters-toggle-group form lifecycle', () => {
  it('formResetCallback restores initial value attribute', async () => {
    await loadElements();
    const form = document.createElement('form');
    const group = buildGroup({ type: 'single', value: 'init' });
    form.append(group);
    document.body.append(form);
    group.value = 'changed';
    group.formResetCallback();
    expect(group.value).toBe('init');
  });

  it('formResetCallback resets multi-mode groups too', async () => {
    await loadElements();
    const form = document.createElement('form');
    const group = buildGroup({ type: 'multiple', value: 'a,b' });
    const a = buildItem({ value: 'a' });
    const b = buildItem({ value: 'b' });
    group.append(a, b);
    form.append(group);
    document.body.append(form);
    group.value = 'a';
    group.formResetCallback();
    expect(group.value).toBe('a,b');
  });

  it('formDisabledCallback propagates disabled to items', async () => {
    await loadElements();
    const group = buildGroup();
    const a = buildItem({ value: 'a' });
    group.append(a);
    document.body.append(group);
    group.formDisabledCallback(true);
    expect(a.hasAttribute('data-group-disabled')).toBe(true);
    expect(innerButton(a)?.disabled).toBe(true);
    group.formDisabledCallback(false);
    expect(a.hasAttribute('data-group-disabled')).toBe(false);
  });

  it('formStateRestoreCallback assigns value from string state', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    document.body.append(group);
    group.formStateRestoreCallback('a', 'restore');
    expect(group.value).toBe('a');
    group.formStateRestoreCallback(null, 'restore');
    expect(group.value).toBe('');
  });
});

describe('rafters-toggle-group keyboard navigation', () => {
  it('ArrowRight moves focus to the next item when horizontal', async () => {
    await loadElements();
    const group = buildGroup({ orientation: 'horizontal' });
    const a = buildItem({ value: 'a' });
    const b = buildItem({ value: 'b' });
    group.append(a, b);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(b);
  });

  it('ArrowDown moves focus when vertical', async () => {
    await loadElements();
    const group = buildGroup({ orientation: 'vertical' });
    const a = buildItem({ value: 'a' });
    const b = buildItem({ value: 'b' });
    group.append(a, b);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(b);
  });

  it('ArrowLeft loops to the last item when at the first', async () => {
    await loadElements();
    const group = buildGroup();
    const a = buildItem({ value: 'a' });
    const b = buildItem({ value: 'b' });
    group.append(a, b);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(b);
  });

  it('Space toggles the focused item', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    const a = buildItem({ value: 'a' });
    group.append(a);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(group.value).toBe('a');
  });

  it('Enter toggles the focused item', async () => {
    await loadElements();
    const group = buildGroup({ type: 'single' });
    const a = buildItem({ value: 'a' });
    group.append(a);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(group.value).toBe('a');
  });

  it('skips disabled items during arrow navigation', async () => {
    await loadElements();
    const group = buildGroup();
    const a = buildItem({ value: 'a' });
    const b = buildItem({ value: 'b', disabled: '' });
    const c = buildItem({ value: 'c' });
    group.append(a, b, c);
    document.body.append(group);
    a.focus();
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(c);
  });
});

describe('rafters-toggle-group property surface', () => {
  it('property setters reflect to attributes', async () => {
    await loadElements();
    const group = buildGroup();
    document.body.append(group);
    group.type = 'multiple';
    expect(group.getAttribute('type')).toBe('multiple');
    group.value = 'a,b';
    expect(group.getAttribute('value')).toBe('a,b');
    group.name = 'tools';
    expect(group.getAttribute('name')).toBe('tools');
    group.disabled = true;
    expect(group.hasAttribute('disabled')).toBe(true);
    group.disabled = false;
    expect(group.hasAttribute('disabled')).toBe(false);
    group.required = true;
    expect(group.hasAttribute('required')).toBe(true);
    group.variant = 'outline';
    expect(group.getAttribute('variant')).toBe('outline');
    group.size = 'lg';
    expect(group.getAttribute('size')).toBe('lg');
    group.orientation = 'vertical';
    expect(group.getAttribute('orientation')).toBe('vertical');
  });

  it('item property setters reflect to attributes', async () => {
    await loadElements();
    const item = buildItem();
    document.body.append(item);
    item.value = 'x';
    expect(item.getAttribute('value')).toBe('x');
    item.pressed = true;
    expect(item.hasAttribute('pressed')).toBe(true);
    item.pressed = false;
    expect(item.hasAttribute('pressed')).toBe(false);
    item.disabled = true;
    expect(item.hasAttribute('disabled')).toBe(true);
  });

  it('exposes the ElementInternals instance on the group', async () => {
    await loadElements();
    const group = buildGroup();
    document.body.append(group);
    expect(group.internals).toBeDefined();
  });

  it('falls back to default on unknown variant/size/orientation', async () => {
    await loadElements();
    const group = buildGroup({ variant: 'neon', size: 'huge', orientation: 'diagonal' });
    expect(() => document.body.append(group)).not.toThrow();
    expect(group.variant).toBe('default');
    expect(group.size).toBe('default');
    expect(group.orientation).toBe('horizontal');
  });
});
