/**
 * Interactive button component for user actions
 *
 * @cognitive-load 3/10 - Simple action trigger with clear visual hierarchy
 * @attention-economics Size hierarchy: sm=tertiary actions, default=secondary interactions, lg=primary calls-to-action. Primary variant commands highest attention - use sparingly (maximum 1 per section)
 * @trust-building Destructive actions require confirmation patterns. Loading states prevent double-submission. Visual feedback reinforces user actions.
 * @accessibility WCAG AAA compliant with 44px minimum touch targets, high contrast ratios, and screen reader optimization
 * @semantic-meaning Variant mapping: default=main actions, secondary=supporting actions, destructive=irreversible actions with safety patterns
 *
 * @usage-patterns
 * DO: Primary: Main user goal, maximum 1 per section
 * DO: Secondary: Alternative paths, supporting actions
 * DO: Destructive: Permanent actions, requires confirmation patterns
 * NEVER: Multiple primary buttons competing for attention
 *
 * @example
 * ```tsx
 * // Primary action - highest attention, use once per section
 * <Button variant="default">Save Changes</Button>
 *
 * // Destructive action - requires confirmation UX
 * <Button variant="destructive">Delete Account</Button>
 *
 * // Loading state - prevents double submission
 * <Button loading>Processing...</Button>
 * ```
 */

/**
 * WC performance for button: the thinnest wrapper. The score AND the DOM-native
 * binding (bindButton) live in button.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides a real inner
 * <button data-part="root"> so native Enter/Space activation is preserved --
 * the WC never renders a shadow tree of its own. The bind is deferred one
 * microtask because connectedCallback can fire before the light-DOM children
 * are parsed (upgrade order).
 */
import { bindButton } from './button.behavior';

export class RaftersButton extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindButton(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button')) {
  customElements.define('rafters-button', RaftersButton);
}
