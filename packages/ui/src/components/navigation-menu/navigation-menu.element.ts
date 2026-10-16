/**
 * Navigation menu component for site-level navigation with expandable sections
 *
 * Behavior (which menu is open, arrow-key navigation across triggers, roving tabindex,
 * hover / focus open and close, Escape + outside-click dismiss, and ARIA reflection)
 * lives in the framework-agnostic createNavigationMenu controller, which composes the
 * shared primitives (selection-group + roving-focus + dismissable-layer).
 * React renders structural markup and delegates via a callback ref - the same controller
 * the Astro and web-component wrappers use, so behavior cannot drift between frameworks.
 * VISIBILITY is not in that list any more (#2148): the panel is revealed by the item's
 * own :hover / :focus-within in navigation-menu.classes.ts, over the motion matrix's
 * duration / curve / delay tokens, so it opens with JavaScript turned off.
 *
 * Trigger and Content render NO open-derived attributes that the controller owns once
 * mounted (it reflects aria-expanded / data-state before paint); they render
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
import { bindNavigationMenu, wrapNavigationMenuIcons } from './navigation-menu.behavior';

/**
 * The behavior-carrying Web Component performance: light DOM, no shadow root.
 * One microtask after connecting it wraps slotted icons, then binds the score
 * to the `nav[data-part="root"]` markup the Astro component renders. The bind
 * returns its teardown, which disconnect calls.
 */
export class RaftersNavigationMenu extends HTMLElement {
  #teardown: (() => void) | undefined;
  #generation = 0;

  connectedCallback(): void {
    const generation = ++this.#generation;
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected) return;
      const root = this.querySelector<HTMLElement>('nav[data-part="root"]');
      if (!root) return;
      this.#teardown?.();
      wrapNavigationMenuIcons(root);
      this.#teardown = bindNavigationMenu(root);
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#teardown?.();
    this.#teardown = undefined;
  }
}

if (!customElements.get('rafters-navigation-menu')) {
  customElements.define('rafters-navigation-menu', RaftersNavigationMenu);
}
