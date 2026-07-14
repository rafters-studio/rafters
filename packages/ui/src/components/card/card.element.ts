/**
 * <rafters-card> -- the Web Component performance of the Card score.
 *
 * Card is a PURE STATIC: its score projects no ARIA, holds no state, and runs
 * no effects, so there is nothing to bind. This element imports NO
 * `bindCard` (there is none) -- it only renders the surface markup with the
 * shared class strings and named slots, once, from `card.classes.ts`. That is
 * the whole point of the card port: a pure static's Web Component is markup +
 * classes + slots, no controller.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root; the only component-owned CSS is the structural
 * host-display shim. The `fill` attribute mirrors the React/Astro `fill` prop
 * through the SAME `cardClasses` projection -- one score, three performances,
 * zero drift.
 *
 * Structure: a single `data-part="root"` wrapper (the surface) containing
 * named slots for header, title, description, content, footer, and action,
 * plus a default slot for unnamed children. Only the root is a declared part
 * (boundary 5); the sub-wrappers carry classes but no data-part.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  cardActionClasses,
  cardClasses,
  cardContentClasses,
  cardDescriptionClasses,
  cardFooterClasses,
  cardHeaderClasses,
  cardTitleClasses,
} from './card.classes';

/** A named-slot wrapper: a div carrying the shared class string and a single
 *  named `<slot>`. Exported shape is internal -- pure structure, no behaviour. */
function slotRegion(className: string, slotName: string): HTMLElement {
  const region = document.createElement('div');
  region.className = className;
  const slot = document.createElement('slot');
  slot.setAttribute('name', slotName);
  region.appendChild(slot);
  return region;
}

export class RaftersCard extends RaftersElement {
  static observedAttributes = ['fill'];

  /**
   * The only component-owned CSS: the structural host-display shim. Custom
   * elements default to display:inline; the card wants the host to be a block.
   */
  static override styles = ':host { display: block; }';

  override render(): Node {
    const fill = this.getAttribute('fill') ?? undefined;

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = cardClasses({ fill }, {}).root;

    root.appendChild(slotRegion(cardHeaderClasses, 'header'));
    root.appendChild(slotRegion(cardTitleClasses, 'title'));
    root.appendChild(slotRegion(cardDescriptionClasses, 'description'));
    root.appendChild(slotRegion(cardContentClasses, 'content'));
    root.appendChild(slotRegion(cardFooterClasses, 'footer'));
    root.appendChild(slotRegion(cardActionClasses, 'action'));
    root.appendChild(document.createElement('slot'));

    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-card')) {
  customElements.define('rafters-card', RaftersCard);
}
