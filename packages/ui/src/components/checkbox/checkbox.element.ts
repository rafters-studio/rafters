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
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <Checkbox id="terms" />
 *   <Label htmlFor="terms">Accept terms and conditions</Label>
 * </div>
 * ```
 */

/**
 * WC performance for checkbox: the thinnest wrapper. The score AND the
 * DOM-native binding (bindCheckbox) live in checkbox.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides a real inner
 * `<button data-part="root" role="checkbox">` so native Enter/Space activation
 * is preserved, and a sibling `<input data-part="hidden-input">` carries the
 * value into a form. The WC never renders a shadow tree of its own. The bind is
 * deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed (upgrade order).
 */
import { bindCheckbox } from './checkbox.behavior';

export class RaftersCheckbox extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindCheckbox(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-checkbox')) {
  customElements.define('rafters-checkbox', RaftersCheckbox);
}
