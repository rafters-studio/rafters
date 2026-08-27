/**
 * Navigation menu component for site-level navigation with expandable sections
 *
 * Behavior (which menu is open, arrow-key navigation across triggers, roving tabindex,
 * hover-intent open/close, Escape + outside-click dismiss, and ARIA / visibility
 * reflection) lives in the framework-agnostic createNavigationMenu controller, which
 * composes the shared primitives (selection-group + roving-focus + dismissable-layer).
 * React renders structural markup and delegates via a callback ref - the same controller
 * the Astro and web-component wrappers use, so behavior cannot drift between frameworks.
 *
 * Trigger and Content render NO open-derived attributes that the controller owns once
 * mounted (it reflects aria-expanded / data-state / hidden before paint); they render
 * only a static, non-reactive initial state for SSR so the server HTML is correct and
 * re-renders cannot clobber the controller. The decorative Viewport and Indicator are
 * the exception: they subscribe to the controller's open value to size / position
 * themselves, since that chrome has no server-rendered markup to drive it.
 *
 * All Tailwind utilities live in navigation-menu.classes.ts; active / open styling is
 * driven off data-state / data-active set by the controller, not inline utilities.
 *
 * @cognitive-load 5/10 - Navigation requires scanning and decision-making but with predictable patterns
 * @attention-economics Primary navigation: visible structure, expandable sections reveal content on demand
 * @trust-building Predictable hover/click behavior, clear visual indicators, smooth transitions
 * @accessibility Full keyboard support (arrows, escape), proper ARIA navigation role, focus management
 * @semantic-meaning Site navigation with expandable sections for mega-menu style content organization
 *
 * @usage-patterns
 * DO: Use for primary site navigation with grouped content
 * DO: Keep top-level items to 7 or fewer (Miller's Law)
 * DO: Provide clear visual indicator for active/current item
 * DO: Ensure content panels are logically organized
 * DO: Support both hover and click interactions for accessibility
 * NEVER: Use for contextual actions (use DropdownMenu instead)
 * NEVER: Nest more than 2 levels deep
 * NEVER: Hide critical navigation behind expandable sections only
 *
 * @example
 * ```tsx
 * <NavigationMenu>
 *   <NavigationMenu.List>
 *     <NavigationMenu.Item value="products">
 *       <NavigationMenu.Trigger>Products</NavigationMenu.Trigger>
 *       <NavigationMenu.Content>
 *         <NavigationMenu.Link href="/products/widgets">Widgets</NavigationMenu.Link>
 *         <NavigationMenu.Link href="/products/gadgets">Gadgets</NavigationMenu.Link>
 *       </NavigationMenu.Content>
 *     </NavigationMenu.Item>
 *     <NavigationMenu.Item>
 *       <NavigationMenu.Link href="/about">About</NavigationMenu.Link>
 *     </NavigationMenu.Item>
 *   </NavigationMenu.List>
 *   <NavigationMenu.Viewport />
 * </NavigationMenu>
 * ```
 */

/**
 * WC performance for navigation-menu: the thinnest wrapper. All behavior --
 * including the DOM binding -- lives in navigation-menu.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 */
import { bindNavigationMenu } from './navigation-menu.behavior';

export class RaftersNavigationMenu extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'navigation');
    // Target parity (#2148): the Astro and React roots are `<nav data-part="root">`,
    // and the panel's dismissal rule is scoped by that marker, so the host has
    // to carry it too or an Escape could not force the panel back down.
    if (!this.hasAttribute('data-part')) this.dataset['part'] = 'root';
    // connectedCallback can fire before the light-DOM children are parsed
    // (upgrade order), so bind on the next microtask when the parts exist.
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindNavigationMenu(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-navigation-menu')) {
  customElements.define('rafters-navigation-menu', RaftersNavigationMenu);
}
