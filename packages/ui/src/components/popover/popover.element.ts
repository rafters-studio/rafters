/**
 * Popover component for contextual floating content
 *
 * Built on the Float primitive for consistent positioning across all overlay components.
 * Portal is automatically included - no need to wrap content in Popover.Portal.
 *
 * @cognitive-load 4/10 - Contextual content requiring focus but not blocking workflow
 * @attention-economics Partial attention: appears on trigger, dismisses on outside click or escape
 * @trust-building Predictable positioning, easy dismissal, non-blocking interaction
 * @accessibility Focus management, escape key dismissal, outside click closes, screen reader announcements
 * @semantic-meaning Contextual enhancement: additional info, controls, or options related to trigger
 *
 * @usage-patterns
 * DO: Use for contextual actions or information related to trigger element
 * DO: Position intelligently to avoid viewport edges
 * DO: Allow dismissal via escape key and outside click
 * DO: Keep content focused and relevant to trigger
 * NEVER: Critical information, primary navigation, complex multi-step forms
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal is included automatically
 * <Popover>
 *   <Popover.Trigger asChild>
 *     <Button variant="outline">Open</Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     Popover content here
 *   </Popover.Content>
 * </Popover>
 *
 * // Or with explicit Portal (for custom container)
 * <Popover>
 *   <Popover.Trigger asChild>
 *     <Button>Open</Button>
 *   </Popover.Trigger>
 *   <Popover.Portal container={customContainer}>
 *     <Popover.Content>Content</Popover.Content>
 *   </Popover.Portal>
 * </Popover>
 * ```
 */

/**
 * WC performance for popover: the thinnest wrapper. The score AND the
 * DOM-native binding (bindPopover) live in popover.behavior.ts, shared with the
 * Astro performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindPopover } from './popover.behavior';

export class RaftersPopover extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // Target parity: the Astro/React root is an unclassed <div> (block), but a
    // custom element defaults to display:inline. Pin block so the WC host lays
    // out identically to the other two performances (#2004).
    this.style.display = 'block';
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindPopover(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-popover')) {
  customElements.define('rafters-popover', RaftersPopover);
}
