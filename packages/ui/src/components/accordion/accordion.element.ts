/**
 * Accordion component for progressive disclosure of content sections
 *
 * Behavior (expansion state, ArrowUp/Down/Home/End navigation, roving tabindex, ARIA
 * and visibility reflection) lives in the framework-agnostic createAccordion controller,
 * which composes the shared primitives (selection-group + roving-focus). React renders
 * markup and delegates via a callback ref - the same controller the Astro and
 * web-component wrappers use, so behavior cannot drift between frameworks.
 *
 * @cognitive-load 3/10 - Progressive disclosure reduces information overload
 * @attention-economics Content hierarchy: headers compete for scanning attention, expanded content demands focus
 * @trust-building Predictable expand/collapse behavior, persistent state for user control
 * @accessibility Keyboard navigation (arrow keys, Enter/Space), proper ARIA expanded states, focus management
 * @semantic-meaning Structure: single=mutually exclusive, multiple=independent sections, collapsible=fully closeable
 *
 * @usage-patterns
 * DO: Use for FAQs, settings groups, or long-form content organization
 * DO: Use single mode when sections are mutually exclusive
 * DO: Use multiple mode for independent content sections
 * NEVER: Hide critical information in collapsed sections, nest accordions deeply
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>Section 1</Accordion.Trigger>
 *     <Accordion.Content>Content for section 1</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion>
 * ```
 */

/**
 * WC performance for accordion: the thinnest wrapper. The score AND the
 * DOM-native binding (bindAccordion) live in accordion.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<div data-part="root">` with its section markup, so native focus and the
 * composed roving-focus primitive operate on real document DOM -- the WC never
 * renders a shadow tree of its own. The bind is deferred one microtask because
 * connectedCallback can fire before the light-DOM children are parsed (upgrade
 * order).
 */
import { bindAccordion } from './accordion.behavior';

export class RaftersAccordion extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindAccordion(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-accordion')) {
  customElements.define('rafters-accordion', RaftersAccordion);
}
