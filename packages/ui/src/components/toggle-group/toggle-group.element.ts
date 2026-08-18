/**
 * Toggle group component for grouped toggle selections
 *
 * @cognitive-load 3/10 - Multiple options with clear selection state
 * @attention-economics Option group: all options visible, selected state prominent
 * @trust-building Immediate visual feedback, clear selection state, reversible
 * @accessibility Roving focus for keyboard navigation, proper ARIA pressed states
 * @semantic-meaning Selection modes: single=mutually exclusive (like radio), multiple=independent (like checkboxes)
 *
 * @usage-patterns
 * DO: Use single mode for mutually exclusive view/format options
 * DO: Use multiple mode for independent feature toggles
 * DO: Keep options visually grouped and styled consistently
 * DO: Limit to 2-5 options for scannability
 * NEVER: More than 7 options, complex nested selections
 *
 * @example
 * ```tsx
 * // Single selection (view mode)
 * <ToggleGroup type="single" defaultValue="grid">
 *   <ToggleGroup.Item value="grid"><Grid /></ToggleGroup.Item>
 *   <ToggleGroup.Item value="list"><List /></ToggleGroup.Item>
 * </ToggleGroup>
 *
 * // Multiple selection (text formatting)
 * <ToggleGroup type="multiple">
 *   <ToggleGroup.Item value="bold"><Bold /></ToggleGroup.Item>
 *   <ToggleGroup.Item value="italic"><Italic /></ToggleGroup.Item>
 * </ToggleGroup>
 * ```
 */

/**
 * WC performance for toggle-group: the thinnest wrapper. The score AND the
 * DOM-native binding (bindToggleGroup) live in toggle-group.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<div data-part="root" role="group">` with `<button data-part="item">`
 * children, so native focus and the roving-focus effect operate on real
 * document DOM -- the WC never renders a shadow tree of its own. The bind is
 * deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed (upgrade order).
 */
import { bindToggleGroup } from './toggle-group.behavior';

export class RaftersToggleGroup extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindToggleGroup(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-toggle-group')) {
  customElements.define('rafters-toggle-group', RaftersToggleGroup);
}
