/**
 * Toggle switch component for on/off binary states
 *
 * @cognitive-load 2/10 - Clear binary state with immediate visual feedback
 * @attention-economics Low attention: thumb position communicates state instantly
 * @trust-building Immediate state change, reversible action, physical metaphor (light switch)
 * @accessibility Keyboard toggle (Space), proper ARIA checked state, motion for state transition
 * @semantic-meaning Binary toggle: on=enabled/active, off=disabled/inactive. Use for settings with immediate effect
 *
 * @usage-patterns
 * DO: Use for settings that take effect immediately
 * DO: Pair with descriptive label explaining what the switch controls
 * DO: Use when action is reversible without consequence
 * DO: Position consistently (left of label or right-aligned)
 * NEVER: Use for form submissions, use for actions requiring confirmation
 *
 * @example
 * ```html
 * <rafters-switch>
 *   <button type="button" role="switch" data-part="root" aria-label="Notifications" aria-checked="false">
 *     <span data-part="thumb"></span>
 *   </button>
 * </rafters-switch>
 * ```
 */
import { bindSwitch } from './switch.behavior';

/**
 * WC performance for switch: a light-DOM enhancer. The author or server
 * provides the switch markup (a `<button role="switch" data-part="root">`
 * holding a thumb); this element finds the root and calls `bindSwitch`. No
 * shadow tree and no observed attributes. The bind is deferred one microtask
 * because connectedCallback can fire before the light-DOM children are parsed.
 */
export class RaftersSwitch extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindSwitch(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-switch')) {
  customElements.define('rafters-switch', RaftersSwitch);
}
