/**
 * <rafters-scroll-area> -- the Web Component performance of the ScrollArea score.
 *
 * ScrollArea is a PURE STATIC: its score projects no ARIA, holds no state, and
 * runs no effects, so there is nothing to bind. This element imports NO
 * `bindScrollArea` (there is none) -- it renders the scroll-surface markup with
 * the shared class strings and a default slot, once, from `scroll-area.classes.ts`.
 * That is the whole point of the port: a pure static's Web Component is markup +
 * classes + slots, no controller.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root. The one component-owned CSS is the structural
 * host-display shim. The `orientation` attribute mirrors the React/Astro
 * `orientation` prop through the SAME `scrollAreaClasses` projection -- one
 * score, three performances, zero drift.
 *
 * The decorative ScrollBar (shadcn's optional custom-scrollbar track) is a
 * consumer-composed light-DOM child, not a fixed shadow region: native CSS
 * scrollbar styling is preferred, so the WC ships only the scroll surface plus
 * a default slot. Only the root is a declared part (boundary 5).
 */

import { RaftersElement } from '../../primitives/rafters-element';
import type { ScrollAreaConfig, ScrollAreaOrientation } from './scroll-area.behavior';
import { scrollAreaClasses } from './scroll-area.classes';

export class RaftersScrollArea extends RaftersElement {
  static observedAttributes = ['orientation'];

  /**
   * The only component-owned CSS: the structural host-display shim. Custom
   * elements default to display:inline; the scroll surface wants a block box.
   */
  static override styles = ':host { display: block; }';

  private config(): ScrollAreaConfig {
    return {
      orientation: (this.getAttribute('orientation') ?? 'vertical') as ScrollAreaOrientation,
    };
  }

  override render(): Node {
    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = scrollAreaClasses(this.config(), {}).root;
    root.appendChild(document.createElement('slot'));
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-scroll-area')) {
  customElements.define('rafters-scroll-area', RaftersScrollArea);
}
