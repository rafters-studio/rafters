/**
 * Breadcrumb -- a hierarchical location trail for wayfinding. Compose
 * Breadcrumb with BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
 * BreadcrumbPage, BreadcrumbSeparator, and BreadcrumbEllipsis; the nav
 * landmark is the contract, the family is the composition. A pure static
 * score has nothing to subscribe to: the performance is pure decoration
 * application. No useBehavior, no memory, no bind -- markup in, classes out,
 * slots through.
 *
 * @cognitive-load 2/10 - decision 0, info 1, interaction 0, disruption 0, learning 1
 * @attention-economics Tertiary support: a breadcrumb provides spatial context
 * only and must never compete with primary content. It sits above the fold as
 * a peripheral wayfinding aid; reserve its low-chroma muted text so the current
 * page reads as the sole emphasis and the trail recedes.
 * @trust-building Predictable, reliable wayfinding: the trail always mirrors the
 * site hierarchy, the current page is never a dead link, and separators never
 * imply interactivity -- routine navigation the user can trust without reading.
 * @accessibility Complete ARIA: the root is a `nav[aria-label="Breadcrumb"]`
 * landmark, the current page is `aria-current="page"` (and non-clickable via
 * `role="link" aria-disabled="true"`), and separators/ellipses are
 * `aria-hidden="true" role="presentation"` so assistive tech skips the
 * decoration. The ellipsis pairs its icon with an sr-only "More" label.
 * @semantic-meaning Wayfinding system: an ordered list of ancestor links
 * expressing navigation hierarchy and the reader's current location within it.
 *
 * @usage-patterns
 * DO: Provide spatial context and navigation hierarchy
 * DO: Mark the current page with aria-current="page" (BreadcrumbPage)
 * DO: Truncate long paths with BreadcrumbEllipsis (Miller's Law: 7+/-2 items)
 * NEVER: Use for primary actions or main navigation
 * NEVER: Show breadcrumbs on the homepage (nothing to navigate back to)
 * NEVER: Make the current page clickable
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/">Home</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbPage>Widget</BreadcrumbPage>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 * ```
 */

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
import { wrapBreadcrumbIcons } from './breadcrumb.behavior';

export class RaftersBreadcrumb extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = [];

  // display:contents so the semantic nav landmark inside the shadow is the
  // box, not the host -- the landmark stays the root, as in React/Astro.
  static override styles = ':host { display: contents; }';

  override connectedCallback(): void {
    super.connectedCallback();
    // The trail is light DOM the author composes: a link or current page child
    // marked `slot="start-icon"` / `slot="end-icon"` is wrapped in the
    // decorative wrapper that carries aria-hidden. Deferred, because
    // connectedCallback can fire before the light-DOM children are parsed.
    queueMicrotask(() => {
      if (this.isConnected) wrapBreadcrumbIcons(this);
    });
  }

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
