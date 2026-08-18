/**
 * Collapsible component for single expandable/collapsible sections
 *
 * @cognitive-load 2/10 - Simple show/hide toggle with clear state
 * @attention-economics Progressive disclosure: hidden content doesn't compete for attention until expanded
 * @trust-building Immediate visual feedback, reversible action, clear expanded/collapsed state
 * @accessibility Proper ARIA expanded state, keyboard toggle, screen reader announcements
 * @semantic-meaning Binary visibility: open=content visible, closed=content hidden
 *
 * @usage-patterns
 * DO: Use for single sections of optional or secondary content
 * DO: Provide clear trigger indicating expand/collapse action
 * DO: Animate height changes for smooth transitions
 * DO: Use for content that users may want to hide after reading
 * NEVER: Hide critical information, use for multiple related sections (use Accordion)
 *
 * @example
 * ```tsx
 * <Collapsible>
 *   <Collapsible.Trigger>Toggle Section</Collapsible.Trigger>
 *   <Collapsible.Content>
 *     Hidden content that can be revealed
 *   </Collapsible.Content>
 * </Collapsible>
 * ```
 */

/**
 * WC performance for collapsible: the thinnest wrapper. The score AND the
 * DOM-native binding (bindCollapsible) live in collapsible.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM parts are parsed.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<rafters-collapsible data-part="root">` with a `<button data-part="trigger">`
 * and a `<div data-part="content">`, so native focus and click operate on real
 * document DOM -- the WC never renders a shadow tree of its own.
 */
import { bindCollapsible } from './collapsible.behavior';

export class RaftersCollapsible extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindCollapsible(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-collapsible')) {
  customElements.define('rafters-collapsible', RaftersCollapsible);
}
