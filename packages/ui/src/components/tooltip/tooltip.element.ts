/**
 * Contextual tooltip component with smart timing and accessibility
 *
 * @cognitive-load 2/10 - Contextual help without interrupting user workflow
 * @attention-economics Non-intrusive assistance: Smart delays prevent accidental triggers while ensuring help availability
 * @trust-building Reliable contextual guidance that builds user confidence through progressive disclosure
 * @accessibility Keyboard navigation, screen reader support, focus management, escape key handling
 * @semantic-meaning Contextual assistance: help=functionality explanation, definition=terminology clarification, action=shortcuts and outcomes, status=system state
 *
 * @usage-patterns
 * DO: Explain functionality without overwhelming users
 * DO: Clarify terminology contextually when needed
 * DO: Show shortcuts and expected action outcomes
 * DO: Provide feedback on system state changes
 * NEVER: Include essential information that should be visible by default
 *
 * @example
 * ```tsx
 * <Tooltip.Provider>
 *   <Tooltip>
 *     <Tooltip.Trigger asChild>
 *       <Button>Hover me</Button>
 *     </Tooltip.Trigger>
 *     <Tooltip.Content>
 *       Helpful tooltip text
 *     </Tooltip.Content>
 *   </Tooltip>
 * </Tooltip.Provider>
 * ```
 */

/**
 * WC performance for tooltip: the thinnest wrapper. The score AND the DOM-native
 * binding (bindTooltip) live in tooltip.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindTooltip } from './tooltip.behavior';

export class RaftersTooltip extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // Target parity: the Astro/React root is an unclassed <div> (block), but a
    // custom element defaults to display:inline. Pin block so the WC host lays
    // out identically to the other two performances (#2004).
    this.style.display = 'block';
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindTooltip(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-tooltip')) {
  customElements.define('rafters-tooltip', RaftersTooltip);
}
