/**
 * <rafters-badge> -- the Web Component performance of the Badge score.
 *
 * Badge is a PURE STATIC: its score holds no state, claims no keys, runs no
 * effects, and projects an EMPTY aria map, so there is nothing to bind. This
 * element imports NO `bindBadge` (there is none) -- it renders the chip markup
 * with the shared class string from `badge.classes.ts` and re-renders when
 * `variant` or `size` changes. That is the whole performance: markup + classes,
 * no controller, no projection to paint.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root. The one component-owned CSS is the structural
 * host-display shim.
 *
 * Shadow structure: a `data-part="root"` span wrapping a default `<slot>`, so
 * the label text stays in the light tree where assistive technology reads it
 * in flow -- the same accessible payload the React and Astro performances ship.
 *
 * Attributes:
 *   variant  default | primary | secondary | destructive | success | warning
 *            | info | muted | accent | outline | ghost | link
 *   size     sm | default | lg
 *
 * An unrecognised value narrows to `undefined`, and `badgeClasses` applies the
 * single `default` fallback -- this element never names the default itself.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { isBadgeSize, isBadgeVariant } from './badge.behavior';
import { badgeClasses } from './badge.classes';

export class RaftersBadge extends RaftersElement {
  /** Custom elements default to display:inline; the chip wants a flex box. */
  static override styles = ':host { display: inline-flex; }';

  static readonly observedAttributes: ReadonlyArray<string> = ['variant', 'size'];

  /** DOM APIs only -- never innerHTML. */
  override render(): Node {
    const variant = this.getAttribute('variant');
    const size = this.getAttribute('size');

    const root = document.createElement('span');
    root.setAttribute('data-part', 'root');
    root.className = badgeClasses(
      {
        variant: isBadgeVariant(variant) ? variant : undefined,
        size: isBadgeSize(size) ? size : undefined,
      },
      {},
    ).root;
    root.appendChild(document.createElement('slot'));
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-badge')) {
  customElements.define('rafters-badge', RaftersBadge);
}
