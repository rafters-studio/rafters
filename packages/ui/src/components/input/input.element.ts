/**
 * Form input component with validation states and accessibility
 *
 * @cognitive-load 4/10 - Data entry with validation feedback requires user attention
 * @attention-economics State hierarchy: default=ready, focus=active input, error=requires attention, success=validation passed
 * @trust-building Clear validation feedback, error recovery patterns, progressive enhancement
 * @accessibility Screen reader labels, validation announcements, keyboard navigation, high contrast support
 * @semantic-meaning Type-appropriate validation: email=format validation, password=security indicators, number=range constraints
 *
 * @usage-patterns
 * DO: Always pair with descriptive Label component
 * DO: Use helpful placeholders showing format examples
 * DO: Provide real-time validation for user confidence
 * DO: Use appropriate input types for sensitive data
 * NEVER: Label-less inputs, validation only on submit, unclear error messages
 *
 * @example
 * ```tsx
 * // Basic input with label
 * <Label htmlFor="email">Email</Label>
 * <Input id="email" type="email" placeholder="you@example.com" />
 *
 * // Error state
 * <Input variant="error" placeholder="Invalid input" />
 *
 * // Success state
 * <Input variant="success" defaultValue="Valid input" />
 *
 * // Sizes
 * <Input size="sm" placeholder="Small" />
 * <Input size="lg" placeholder="Large" />
 * ```
 */

/**
 * WC performance for input: the Web Component idiom of the input score. The
 * score and the DOM-native binding (bindInput, wrapInputIcons) live in
 * input.behavior.ts, shared with the Astro performance. This file adds the
 * view (input.classes.ts) and the custom-element wiring: it renders the native
 * light-DOM field from the host's attributes, then calls the same binds the
 * Astro script calls. The bind is deferred one microtask because
 * connectedCallback can fire before the light-DOM children are parsed.
 */
import type { PartIds } from '../../lib/contract';
import {
  bindInput,
  inputBehavior,
  wrapInputIcons,
  type InputConfig,
  type InputPart,
} from './input.behavior';
import { inputClassSet } from './input.classes';

export class RaftersInput extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      this.renderField();
      wrapInputIcons(this);
      this.teardown = bindInput(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  /** Render the native field from the host's attributes, once per element. */
  private renderField(): void {
    if (this.querySelector('[data-part="input"]')) return;
    const config: InputConfig = {
      disabled: this.hasAttribute('disabled'),
      readonly: this.hasAttribute('readonly'),
      required: this.hasAttribute('required'),
      invalid: this.hasAttribute('invalid'),
      startIcon: this.querySelector(':scope > [slot="start-icon"]') !== null,
      endIcon: this.querySelector(':scope > [slot="end-icon"]') !== null,
    };
    const state = inputBehavior.initialState(config);
    const classes = inputClassSet(config, state);

    // Part ids are read from the author's markup, never generated.
    const ids = {} as PartIds<InputPart>;
    for (const part of Object.keys(inputBehavior.parts) as InputPart[]) {
      ids[part] = this.querySelector<HTMLElement>(`:scope > [data-part="${part}"]`)?.id ?? '';
    }

    const field = document.createElement('input');
    field.dataset['part'] = 'input';
    field.className = config.startIcon || config.endIcon ? classes.rowInput : classes.input;
    field.type = this.getAttribute('type') ?? 'text';
    for (const name of ['name', 'placeholder'] as const) {
      const value = this.getAttribute(name);
      if (value !== null) field.setAttribute(name, value);
    }
    field.disabled = config.disabled === true;
    field.readOnly = config.readonly === true;
    field.value = this.getAttribute('value') ?? '';
    // The field carries the accessible name; the host is a generic wrapper.
    const label = this.getAttribute('aria-label');
    if (label !== null) {
      field.setAttribute('aria-label', label);
      this.removeAttribute('aria-label');
    }
    const projection = inputBehavior.aria(state, config, ids).input ?? {};
    for (const [name, value] of Object.entries(projection)) {
      if (value !== undefined) field.setAttribute(name, String(value));
    }
    this.appendChild(field);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-input')) {
  customElements.define('rafters-input', RaftersInput);
}
