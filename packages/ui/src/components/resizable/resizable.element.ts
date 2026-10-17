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
import { bindResizable } from './resizable.behavior';

/**
 * Light-DOM enhancer over author markup: one microtask after connect it binds
 * the resizable group the author wrote inside it. No shadow root, no parts of
 * its own, no events other than the bind's `input`.
 */
export class RaftersResizable extends HTMLElement {
  #teardown: (() => void) | null = null;
  #connection = 0;

  connectedCallback(): void {
    const connection = ++this.#connection;
    queueMicrotask(() => {
      if (connection !== this.#connection || !this.isConnected || this.#teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (!root) return;
      this.#teardown = bindResizable(root);
    });
  }

  disconnectedCallback(): void {
    this.#connection++;
    this.#teardown?.();
    this.#teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-resizable')) {
  customElements.define('rafters-resizable', RaftersResizable);
}
