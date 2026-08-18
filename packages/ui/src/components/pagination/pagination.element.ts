/**
 * Navigation component for paginated content
 *
 * @cognitive-load 4/10 - Moderate complexity with page calculations, but clear visual patterns
 * @attention-economics Secondary navigation: Supports content discovery without competing with primary content. Use sparingly at bottom of paginated lists.
 * @trust-building Predictable navigation patterns build user confidence. Clear current page indication prevents disorientation. Disabled states prevent invalid actions.
 * @accessibility Complete ARIA support with nav landmark, aria-current="page", aria-label descriptions, and keyboard navigation
 * @semantic-meaning Page-based navigation system for large data sets. Ellipsis indicates hidden pages. Visual distinction between active and inactive states.
 *
 * @usage-patterns
 * DO: Place at bottom of paginated content for natural flow
 * DO: Show current page clearly with aria-current="page"
 * DO: Use ellipsis to truncate large page ranges (7+/-2 items visible)
 * DO: Disable Previous/Next at boundaries
 * NEVER: Use pagination for small datasets (prefer infinite scroll or full display)
 * NEVER: Hide the current page number from users
 * NEVER: Allow navigation to invalid page numbers
 *
 * @example
 * ```tsx
 * // Basic composable pagination
 * <Pagination>
 *   <PaginationContent>
 *     <PaginationItem>
 *       <PaginationPrevious href="/page/1" />
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationLink href="/page/1">1</PaginationLink>
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationLink href="/page/2" isActive>2</PaginationLink>
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationEllipsis />
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationNext href="/page/3" />
 *     </PaginationItem>
 *   </PaginationContent>
 * </Pagination>
 *
 * // Button-style pagination (onClick handlers)
 * <Pagination>
 *   <PaginationContent>
 *     <PaginationItem>
 *       <PaginationPrevious onClick={() => setPage(page - 1)} disabled={page === 1} />
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationLink onClick={() => setPage(1)} isActive={page === 1}>1</PaginationLink>
 *     </PaginationItem>
 *     <PaginationItem>
 *       <PaginationNext onClick={() => setPage(page + 1)} disabled={page === totalPages} />
 *     </PaginationItem>
 *   </PaginationContent>
 * </Pagination>
 * ```
 */

/**
 * <rafters-pagination> -- the Web Component performance of the Pagination
 * score.
 *
 * Pagination is a PURE STATIC (empty ARIA projection, no state, no effects), so
 * there is nothing to bind -- this element imports no `bindPagination` (there
 * is none). Like Container and Breadcrumb, it renders once and carries no
 * controller.
 *
 * The root IS the semantic `nav` landmark (labelled `Pagination`), so
 * `render()` creates that element inside the shadow root and the host is
 * `display: contents` -- the landmark, not the custom element, is the box,
 * matching the React and Astro roots. Scope is limited to the outer landmark;
 * the content/item/link/previous/next/ellipsis children are consumer-composed
 * plain semantic light-DOM, projected through the default slot, and their
 * visual rhythm comes from the shared utility strings in pagination.classes.ts
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
 * @cognitive-load 4/10
 * @accessibility `nav[aria-label="Pagination"]` landmark on the root; slotted
 *                children retain their own semantic roles in the light tree
 *                (the current page's `aria-current`, the disabled Prev/Next, and
 *                the hidden ellipsis).
 */
import { RaftersElement } from '../../primitives/rafters-element';

export class RaftersPagination extends RaftersElement {
  static readonly observedAttributes: ReadonlyArray<string> = [];

  // display:contents so the semantic nav landmark inside the shadow is the
  // box, not the host -- the landmark stays the root, as in React/Astro.
  static override styles = ':host { display: contents; }';

  /**
   * Render the semantic `<nav aria-label="Pagination" data-part="root">`
   * wrapper with a single default `<slot>`. DOM APIs only -- never innerHTML.
   * The nav carries no utility classes; descendant rhythm comes from
   * pagination.classes.ts on the slotted children.
   */
  override render(): Node {
    const nav = document.createElement('nav');
    nav.setAttribute('data-part', 'root');
    nav.setAttribute('aria-label', 'Pagination');
    nav.appendChild(document.createElement('slot'));
    return nav;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-pagination')) {
  customElements.define('rafters-pagination', RaftersPagination);
}
