/**
 * <rafters-skeleton> -- the Web Component performance of the Skeleton score.
 *
 * Skeleton is a PURE STATIC: its score holds no state and runs no effects, so
 * there is nothing to bind. This element imports NO `bindSkeleton` (there is
 * none) -- it renders the placeholder markup with the shared classes, once,
 * from `skeleton.classes.ts`. That is the whole performance: markup + classes,
 * no controller.
 *
 * The score's projection is CONSTANT but NOT empty -- Skeleton is decorative,
 * so its root carries `aria-hidden="true"`. The element applies exactly the
 * projection the score returns, so the Web Component hides itself from assistive
 * tech identically to the React and Astro performances -- one score, three
 * performances, zero drift. (The oracle set `aria-hidden` on the Web Component
 * only; the score now guarantees it everywhere.)
 *
 * Skeleton is a decorative LEAF: the shadow root holds a single inner div and
 * NO `<slot>` -- there is no content to project. Presentation resolves from the
 * compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus the
 * token custom properties inherited from the host :root. The one component-owned
 * CSS is the structural host-display shim.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { skeleton } from './skeleton.behavior';
import { skeletonClasses } from './skeleton.classes';

export class RaftersSkeleton extends RaftersElement {
  /** Custom elements default to display:inline; the placeholder wants a block box. */
  static override styles = ':host { display: block; }';

  /**
   * Render a single decorative div carrying the shared classes and the score's
   * constant aria projection. No slot -- Skeleton is a purely decorative leaf.
   * DOM APIs only -- never innerHTML.
   */
  override render(): Node {
    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.setAttribute('data-slot', 'skeleton');
    root.className = skeletonClasses({}, {}).root;
    const aria = skeleton.aria({}, {}, { root: '' }).root;
    if (aria) {
      for (const [name, value] of Object.entries(aria)) {
        if (value !== undefined) root.setAttribute(name, String(value));
      }
    }
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-skeleton')) {
  customElements.define('rafters-skeleton', RaftersSkeleton);
}
