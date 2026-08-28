/**
 * HoverCard component for rich preview content on hover
 *
 * @cognitive-load 3/10 - Contextual preview that supplements rather than replaces visible content
 * @attention-economics Glanceable enrichment: provides additional context without requiring action
 * @trust-building Predictable reveal timing, stable positioning, non-disruptive appearance
 * @accessibility Focus management, keyboard triggerable via focus, escape to dismiss, role="dialog" with aria-describedby
 * @semantic-meaning Rich preview: profile cards, link previews, contextual details that enhance understanding
 *
 * @usage-patterns
 * DO: Show supplementary information like user profiles, link previews, or contextual details
 * DO: Trust the system hover-intent delay -- it is a token the stylesheet applies, not a per-instance tuning knob
 * DO: Keep content focused and scannable - users glance, not read
 * DO: Position intelligently to avoid viewport edges
 * NEVER: Essential information that should always be visible
 * NEVER: Interactive forms or multi-step workflows (use Popover instead)
 * NEVER: Time-sensitive content that disappears before user can read it
 *
 * @example
 * ```tsx
 * <HoverCard>
 *   <HoverCard.Trigger asChild>
 *     <a href="/user/john">@john</a>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <div className="flex gap-4">
 *       <Avatar src="/john.jpg" />
 *       <div>
 *         <h4>John Doe</h4>
 *         <p>Software Engineer</p>
 *       </div>
 *     </div>
 *   </HoverCard.Content>
 * </HoverCard>
 * ```
 */

/**
 * WC performance for hover-card: the thinnest wrapper. The score AND the
 * DOM-native binding (bindHoverCard) live in hover-card.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindHoverCard } from './hover-card.behavior';

export class RaftersHoverCard extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // Target parity: the Astro/React root is an unclassed <div> (block), but a
    // custom element defaults to display:inline. Pin block so the WC host lays
    // out identically to the other two performances (#2004).
    this.style.display = 'block';
    // Target parity, second half (#2148): the CSS reveal rule is scoped by the
    // `data-hover-card` marker the Astro and React roots carry, so the host has
    // to carry it too or the stylesheet has no root to hang `:hover` off.
    this.dataset['hoverCard'] = '';
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindHoverCard(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-hover-card')) {
  customElements.define('rafters-hover-card', RaftersHoverCard);
}
