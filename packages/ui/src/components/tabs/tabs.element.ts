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
import { bindTabs, wrapTabsIcons } from './tabs.behavior';

/**
 * `<rafters-tabs>`: the root part, bound to the light-DOM list, triggers and
 * panels that tabs.astro renders. No shadow root. A `value` attribute makes it
 * controlled (the same as React's `value`); without one it is uncontrolled.
 */
export class RaftersTabs extends HTMLElement {
  static observedAttributes = ['value'];

  #teardown: (() => void) | null = null;
  #generation = 0;

  connectedCallback(): void {
    const generation = ++this.#generation;
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected) return;
      this.#bind();
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#unbind();
  }

  attributeChangedCallback(): void {
    // Rebind so the projection repaints at once; the bind reads `value` fresh.
    if (this.#teardown === null) return;
    this.#unbind();
    this.#bind();
  }

  #bind(): void {
    wrapTabsIcons(this);
    this.#teardown = bindTabs(this);
  }

  #unbind(): void {
    this.#teardown?.();
    this.#teardown = null;
  }
}

if (!customElements.get('rafters-tabs')) {
  customElements.define('rafters-tabs', RaftersTabs);
}
