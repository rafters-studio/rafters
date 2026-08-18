/**
 * Tabbed interface component with keyboard navigation and ARIA compliance
 *
 * Behavior (selection state, arrow/Home/End navigation, roving tabindex, ARIA and
 * visibility reflection) lives in the framework-agnostic createTabs controller, which
 * composes the shared primitives (selection-group + roving-focus). React renders the
 * markup and delegates to the controller via a callback ref - the same controller the
 * Astro and web-component wrappers use, so behavior cannot drift between frameworks.
 *
 * @cognitive-load 4/10 - Content organization with state management requires cognitive processing
 * @attention-economics Content organization: visible=current context, hidden=available contexts, active=user focus
 * @trust-building Persistent selection, clear active indication, predictable navigation patterns
 * @accessibility Arrow key navigation, tab focus management, panel association, screen reader support
 * @semantic-meaning Structure: tablist=navigation, tab=option, tabpanel=content, selected=current view
 *
 * @usage-patterns
 * DO: Use for related content showing different views of same data/context
 * DO: Provide clear, descriptive, scannable tab names (7±2 maximum)
 * NEVER: More than 7 tabs, unrelated content sections, unclear active state
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <Tabs.List>
 *     <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
 *     <Tabs.Trigger value="details">Details</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="overview">Overview content</Tabs.Content>
 *   <Tabs.Content value="details">Details content</Tabs.Content>
 * </Tabs>
 * ```
 */

/**
 * WC performance for tabs: the thinnest wrapper. The score AND the DOM-native
 * binding (bindTabs) live in tabs.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<div data-part="root">` with a `[data-part="list"][role="tablist"]` of
 * `<button data-part="trigger">`s and `[data-part="panel"]` panels, so native
 * focus and the roving-focus primitive operate on real document DOM -- the WC
 * never renders a shadow tree of its own. The bind is deferred one microtask
 * because connectedCallback can fire before the light-DOM children are parsed
 * (upgrade order).
 */
import { bindTabs } from './tabs.behavior';

export class RaftersTabs extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindTabs(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-tabs')) {
  customElements.define('rafters-tabs', RaftersTabs);
}
