/**
 * <rafters-breadcrumb> -- Web Component wayfinding container.
 *
 * Framework-target for the Breadcrumb outer <nav> wrapper, parallel to
 * breadcrumb.tsx (React) and breadcrumb.astro (Astro). Scope is limited to the
 * outer container; the list/item/link/page/separator/ellipsis children are
 * deferred -- consumers compose plain semantic children into the default slot.
 *
 * Matching the framework targets, the outer nav carries NO utility classes of
 * its own. The descendant visual rhythm (list, item, link, page, separator,
 * ellipsis) is carried by the shared utility class strings in
 * breadcrumb.classes.ts on the consumer-supplied children, resolved from the
 * shared compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus
 * the token custom properties inherited from the host :root. Those children are
 * slotted light-DOM content, so shadow-scoped descendant rules never applied to
 * them -- the parallel hand-written CSS map is therefore dropped.
 *
 * The only irreducible shadow-scoped CSS is the `:host` block-layout shim,
 * which lives in `static styles`. It carries no token reference.
 *
 * Shadow DOM structure: a single semantic nav with aria-label, wrapping a
 * default slot.
 *
 * Attributes: none. No attribute-driven variants on the outer nav.
 *
 * Auto-registers on import and is idempotent against double-define. No
 * innerHTML is used.
 *
 * @cognitive-load 2/10
 * @accessibility aria-label="Breadcrumb" on the nav element; slotted children
 *                retain their own semantic roles in the light tree.
 */

import { RaftersElement } from '../../primitives/rafters-element';

export class RaftersBreadcrumb extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = [];

  /**
   * Irreducible shadow-scoped CSS: the host block-layout shim. Custom elements
   * default to inline display; the nav needs the host to behave as a block.
   */
  static override styles = ':host { display: block; }';

  /**
   * Render the semantic <nav aria-label="Breadcrumb"> wrapper with a single
   * default <slot>. DOM APIs only -- never innerHTML. The nav carries no
   * utility classes, matching the React/Astro targets; descendant rhythm comes
   * from breadcrumb.classes.ts on the slotted children.
   */
  override render(): Node {
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Breadcrumb');
    const slot = document.createElement('slot');
    nav.appendChild(slot);
    return nav;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-breadcrumb')) {
  customElements.define('rafters-breadcrumb', RaftersBreadcrumb);
}
