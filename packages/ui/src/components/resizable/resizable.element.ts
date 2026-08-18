/**
 * Resizable panel component for split-pane layouts with drag handles
 *
 * @cognitive-load 3/10 - Familiar split-pane pattern; drag affordance is intuitive
 * @attention-economics Low attention cost: panels remain visible, resize is reversible
 * @trust-building Immediate visual feedback, keyboard accessible, maintains ratios
 * @accessibility Keyboard resizing via arrow keys, proper focus indicators, ARIA attributes
 * @semantic-meaning Layout control: code editors, settings panels, comparison views
 *
 * @usage-patterns
 * DO: Use for content that benefits from adjustable space allocation
 * DO: Provide sensible default sizes and min/max constraints
 * DO: Persist user preferences for panel sizes
 * DO: Support both horizontal and vertical orientations
 * DO: Make handles keyboard accessible
 * NEVER: Nested resizable panels more than 2 levels deep
 * NEVER: Panels smaller than usable minimums
 * NEVER: Resize handles that are too small to target
 *
 * @example
 * ```tsx
 * <Resizable.PanelGroup direction="horizontal">
 *   <Resizable.Panel defaultSize={25} minSize={10}>
 *     <Sidebar />
 *   </Resizable.Panel>
 *   <Resizable.Handle />
 *   <Resizable.Panel defaultSize={75}>
 *     <MainContent />
 *   </Resizable.Panel>
 * </Resizable.PanelGroup>
 * ```
 */

/**
 * WC performance for resizable: the thinnest wrapper. The score AND the
 * DOM-native binding (bindResizable) live in resizable.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real group with its
 * panel/handle children -- each panel carrying its data-panel-min/max/default
 * and each handle its role=separator + aria-valuenow -- so the pointer surface
 * and the separators exist before any JS; the WC never renders a shadow tree of
 * its own. The bind is deferred one microtask because connectedCallback can fire
 * before the light-DOM children are parsed (upgrade order).
 */
import { bindResizable } from './resizable.behavior';

export class RaftersResizable extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindResizable(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-resizable')) {
  customElements.define('rafters-resizable', RaftersResizable);
}
