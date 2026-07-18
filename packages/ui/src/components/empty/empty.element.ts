/**
 * <rafters-empty> -- the Web Component performance of the Empty score.
 *
 * Empty is a PURE STATIC: its score projects no ARIA, holds no state, and runs
 * no effects, so there is nothing to bind. This element imports NO `bindEmpty`
 * (there is none) -- it only renders the placeholder markup with the shared
 * class strings and named slots, once, from `empty.classes.ts`. That is the
 * same finding the card port recorded: a pure static's Web Component is markup
 * + classes + slots, no controller.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root; the only component-owned CSS is the structural
 * host-display shim.
 *
 * Structure: a single `data-part="root"` wrapper (the centered column) nesting
 * four fixed named-slot regions -- icon, title, description, action -- plus a
 * trailing default slot for anything else the consumer composes. Only the root
 * is a declared part (boundary 5); the sub-wrappers carry classes but no
 * data-part.
 *
 * Fixed slot regions are always present -- a bind-free static cannot hide an
 * unfilled region without a slotchange listener (which would be a bind, the
 * thing this component exists to prove it does not need). An unused region is
 * empty space; that is the accepted cost of a no-bind multi-region static WC.
 * This supersedes the oracle's parallel hand-written descendant CSS map, which
 * never applied to light-tree slotted children and is therefore dropped.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  emptyActionClasses,
  emptyClasses,
  emptyDescriptionClasses,
  emptyIconClasses,
  emptyTitleClasses,
} from './empty.classes';

/** A named-slot wrapper: a div carrying the shared class string, a `data-slot`
 *  marker matching the React/Astro targets, and a single named `<slot>`. Pure
 *  structure, no behaviour. */
function slotRegion(className: string, slotName: string): HTMLElement {
  const region = document.createElement('div');
  if (className) region.className = className;
  region.setAttribute('data-slot', `empty-${slotName}`);
  const slot = document.createElement('slot');
  slot.setAttribute('name', slotName);
  region.appendChild(slot);
  return region;
}

export class RaftersEmpty extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = [];

  /**
   * The only component-owned CSS: the structural host-display shim. Custom
   * elements default to display:inline; the placeholder wants the host to be a
   * block so its centered column fills the available width.
   */
  static override styles = ':host { display: block; }';

  override render(): Node {
    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = emptyClasses({}, {}).root;

    root.appendChild(slotRegion(emptyIconClasses, 'icon'));
    root.appendChild(slotRegion(emptyTitleClasses, 'title'));
    root.appendChild(slotRegion(emptyDescriptionClasses, 'description'));
    root.appendChild(slotRegion(emptyActionClasses, 'action'));
    root.appendChild(document.createElement('slot'));

    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-empty')) {
  customElements.define('rafters-empty', RaftersEmpty);
}
