/**
 * <rafters-breadcrumb> -- the Web Component performance of the Breadcrumb
 * score.
 *
 * Breadcrumb is a PURE STATIC (empty ARIA projection, no state, no effects),
 * so there is nothing to bind -- this element imports no `bindBreadcrumb`
 * (there is none). Like Container, it renders once and carries no controller.
 *
 * The root IS the semantic `nav` landmark (labelled `Breadcrumb`), so
 * `render()` creates that element inside the shadow root and the host is
 * `display: contents` -- the landmark, not the custom element, is the box,
 * matching the React and Astro roots. Scope is limited to the outer landmark;
 * the list/item/link/page/separator/ellipsis children are consumer-composed
 * plain semantic light-DOM, projected through the default slot, and their
 * visual rhythm comes from the shared utility strings in breadcrumb.classes.ts
 * resolved from the compiled utility sheet RaftersElement adopts. Because those
 * children are slotted light DOM, shadow-scoped descendant rules never applied
 * to them -- there is no hand-written descendant CSS map to carry.
 *
 * Presentation resolves from the compiled utility sheet plus the token custom
 * properties inherited from the host `:root`; the only component-owned CSS is
 * the structural `:host { display: contents }` shim, which carries no token
 * reference. Auto-registers on import, idempotent against double-define; no
 * innerHTML is used.
 *
 * @cognitive-load 2/10
 * @accessibility `nav[aria-label="Breadcrumb"]` landmark on the root; slotted
 *                children retain their own semantic roles in the light tree.
 */
import { RaftersElement } from '../../primitives/rafters-element';

export class RaftersBreadcrumb extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = [];

  // display:contents so the semantic nav landmark inside the shadow is the
  // box, not the host -- the landmark stays the root, as in React/Astro.
  static override styles = ':host { display: contents; }';

  /**
   * Render the semantic `<nav aria-label="Breadcrumb" data-part="root">`
   * wrapper with a single default `<slot>`. DOM APIs only -- never innerHTML.
   * The nav carries no utility classes, matching the React/Astro roots;
   * descendant rhythm comes from breadcrumb.classes.ts on the slotted children.
   */
  override render(): Node {
    const nav = document.createElement('nav');
    nav.setAttribute('data-part', 'root');
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.appendChild(document.createElement('slot'));
    return nav;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-breadcrumb')) {
  customElements.define('rafters-breadcrumb', RaftersBreadcrumb);
}
