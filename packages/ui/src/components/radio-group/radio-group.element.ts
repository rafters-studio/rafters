/**
 * Radio group component for mutually exclusive selections
 *
 * @cognitive-load 3/10 - Clear single choice from visible options
 * @attention-economics Options visible simultaneously: enables comparison, reduces memory load
 * @trust-building Immediate visual feedback, reversible selection, clear current state
 * @accessibility Arrow key navigation between options, proper ARIA radiogroup, roving tabindex
 * @semantic-meaning Mutually exclusive choice: only one option can be selected at a time
 *
 * @usage-patterns
 * DO: Use for 2-5 mutually exclusive options
 * DO: Make all options visible for easy comparison
 * DO: Use descriptive labels for each option
 * DO: Pre-select the most common or safest option when appropriate
 * NEVER: More than 7 options (use Select instead), independent selections (use Checkbox)
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option-1">
 *   <div className="flex items-center gap-2">
 *     <RadioGroup.Item value="option-1" id="r1" />
 *     <Label htmlFor="r1">Option 1</Label>
 *   </div>
 *   <div className="flex items-center gap-2">
 *     <RadioGroup.Item value="option-2" id="r2" />
 *     <Label htmlFor="r2">Option 2</Label>
 *   </div>
 * </RadioGroup>
 * ```
 */

/**
 * WC performance for radio-group: the thinnest wrapper. The score AND the
 * DOM-native binding (bindRadioGroup) live in radio-group.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<div data-part="root" role="radiogroup">` with `<button data-part="item">`
 * children, so native focus and the roving-focus effect operate on real
 * document DOM -- the WC never renders a shadow tree of its own. The bind is
 * deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed (upgrade order).
 */
import { bindRadioGroup } from './radio-group.behavior';

export class RaftersRadioGroup extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindRadioGroup(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-radio-group')) {
  customElements.define('rafters-radio-group', RaftersRadioGroup);
}
