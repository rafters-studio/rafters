/**
 * Checkbox component for binary selections in forms
 *
 * @cognitive-load 2/10 - Simple binary choice with clear visual state
 * @attention-economics Low attention demand: passive until interaction, clear checked/unchecked states
 * @trust-building Immediate visual feedback, reversible action, clear association with label
 * @accessibility Keyboard toggle (Space), proper ARIA checked state, visible focus indicator
 * @semantic-meaning Binary selection: checked=enabled/selected, unchecked=disabled/deselected
 *
 * @usage-patterns
 * DO: Always pair with a descriptive Label component
 * DO: Use for optional settings or multi-select lists
 * DO: Group related checkboxes visually
 * DO: Provide immediate visual feedback on state change
 * NEVER: Use for mutually exclusive options (use RadioGroup instead)
 *
 * @example
 * ```html
 * <rafters-checkbox name="terms" aria-label="Accept terms and conditions"></rafters-checkbox>
 * ```
 */
import {
  bindCheckbox,
  checkbox,
  checkboxSubmitValue,
  formValueAttrs,
  isCheckboxChecked,
  type CheckboxConfig,
  type CheckboxPart,
  type CheckboxSize,
  type CheckboxVariant,
  type CheckedState,
} from './checkbox.behavior';
import { checkboxClasses } from './checkbox.classes';
import type { PartIds } from '../../lib/contract';

const SVG_NS = 'http://www.w3.org/2000/svg';

const VARIANTS: ReadonlyArray<CheckboxVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
];
const SIZES: ReadonlyArray<CheckboxSize> = ['sm', 'default', 'lg'];

function parseVariant(value: string | null): CheckboxVariant {
  return VARIANTS.find((variant) => variant === value) ?? 'default';
}

function parseSize(value: string | null): CheckboxSize {
  return SIZES.find((size) => size === value) ?? 'default';
}

/** The host `checked` attribute is the seed: bare or `true` checks, `indeterminate` is mixed. */
function parseChecked(value: string | null): CheckedState {
  if (value === null || value === 'false') return false;
  return value === 'indeterminate' ? 'indeterminate' : true;
}

function glyph(className: string, pathData: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('d', pathData);
  svg.appendChild(path);
  return svg;
}

let instanceCount = 0;

export class RaftersCheckbox extends HTMLElement {
  #teardown: (() => void) | null = null;
  #generation = 0;

  connectedCallback(): void {
    this.#render();
    // Gotcha 3: light-DOM children may not be parsed yet -- bind on the next microtask.
    // A disconnect before it runs bumps the generation, so a stale bind is skipped.
    const generation = ++this.#generation;
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.#teardown = bindCheckbox(root);
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#teardown?.();
    this.#teardown = null;
    this.replaceChildren();
  }

  #render(): void {
    this.replaceChildren();
    const config: CheckboxConfig = {
      defaultChecked: parseChecked(this.getAttribute('checked')),
      disabled: this.hasAttribute('disabled'),
      required: this.hasAttribute('required'),
      name: this.getAttribute('name') ?? undefined,
      value: this.getAttribute('value') ?? undefined,
      variant: parseVariant(this.getAttribute('variant')),
      size: parseSize(this.getAttribute('size')),
    };
    const state = checkbox.initialState(config);
    const classes = checkboxClasses(config, state);

    const uid = `rafters-checkbox-${++instanceCount}`;
    const ids = {} as PartIds<CheckboxPart>;
    for (const part of Object.keys(checkbox.parts) as CheckboxPart[]) ids[part] = `${uid}-${part}`;
    const aria = checkbox.aria(state, config, ids);

    const root = document.createElement('button');
    root.type = 'button';
    root.setAttribute('data-part', 'root');
    root.id = ids.root;
    root.className = classes.root;
    root.disabled = config.disabled ?? false;
    for (const [name, value] of Object.entries(aria.root ?? {})) {
      if (value !== undefined) root.setAttribute(name, String(value));
    }
    if (config.name !== undefined) root.setAttribute('name', config.name);
    if (config.value !== undefined) root.setAttribute('value', config.value);
    for (const name of ['aria-label', 'aria-labelledby']) {
      const value = this.getAttribute(name);
      if (value !== null) root.setAttribute(name, value);
    }
    root.append(glyph(classes.check, 'M5 13l4 4L19 7'), glyph(classes.dash, 'M5 12h14'));
    this.appendChild(root);

    const hidden = config.name
      ? formValueAttrs({ name: config.name, value: checkboxSubmitValue(config) })
      : null;
    if (hidden) {
      const input = document.createElement('input');
      input.setAttribute('data-part', 'hidden-input');
      input.type = hidden.type;
      input.name = hidden.name;
      input.value = hidden.value;
      input.readOnly = true;
      input.disabled = !isCheckboxChecked(state, config) || (config.disabled ?? false);
      this.appendChild(input);
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-checkbox')) {
  customElements.define('rafters-checkbox', RaftersCheckbox);
}
