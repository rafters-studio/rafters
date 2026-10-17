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
import { bindCollapsible } from './collapsible.behavior';

export class RaftersCollapsible extends HTMLElement {
  #teardown: (() => void) | null = null;
  #generation = 0;

  connectedCallback(): void {
    const generation = ++this.#generation;
    // Light-DOM children may not be parsed yet; bind on the next microtask.
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected || this.#teardown) return;
      this.#teardown = bindCollapsible(this);
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#teardown?.();
    this.#teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-collapsible')) {
  customElements.define('rafters-collapsible', RaftersCollapsible);
}
