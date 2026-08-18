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
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <Switch id="notifications" />
 *   <Label htmlFor="notifications">Enable notifications</Label>
 * </div>
 * ```
 */

/**
 * WC performance for switch: the thinnest wrapper. The score AND the DOM-native
 * binding (bindSwitch) live in switch.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides a real inner
 * <button role="switch" data-part="root"> so native Enter/Space activation is
 * preserved -- the WC never renders a shadow tree of its own. The bind is
 * deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed (upgrade order).
 */
import { bindSwitch } from './switch.behavior';

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
