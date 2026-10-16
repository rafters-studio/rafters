/**
 * Toggle button component for stateful button interactions
 *
 * @cognitive-load 2/10 - Clear binary state with button affordance
 * @attention-economics State toggle: pressed state visually distinct, immediate feedback
 * @trust-building Immediate visual feedback, reversible action, clear pressed/unpressed state
 * @accessibility aria-pressed state, keyboard toggle (Space/Enter), visible focus ring
 * @semantic-meaning Binary toggle button: on=active/enabled, off=inactive/disabled
 *
 * @usage-patterns
 * DO: Use for toolbar buttons that toggle features (bold, italic, etc.)
 * DO: Use for view mode toggles (grid/list view)
 * DO: Make pressed state visually distinct
 * DO: Use icons with text labels for clarity
 * NEVER: Use for form submissions, use for navigation
 *
 * @example
 * ```html
 * <rafters-toggle>
 *   <button type="button" data-part="root" aria-label="Toggle bold" aria-pressed="false">
 *     <span data-part="label">B</span>
 *   </button>
 * </rafters-toggle>
 * ```
 */

/**
 * WC performance for toggle. The score and the DOM-native binding (bindToggle)
 * live in toggle.behavior.ts, shared with the Astro performance; this file only
 * adapts that binding to the custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides a real inner
 * <button data-part="root"> so native Enter/Space activation is preserved, and
 * the element renders no shadow tree. Children marked slot="start-icon" /
 * slot="end-icon" are wrapped by wrapToggleIcons before the bind. The bind is
 * deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed. There is no form association: form
 * participation, where needed, comes from the native button.
 */
import { bindToggle, wrapToggleIcons } from './toggle.behavior';

export class RaftersToggle extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (!root) return;
      wrapToggleIcons(this, root);
      this.teardown = bindToggle(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-toggle')) {
  customElements.define('rafters-toggle', RaftersToggle);
}
