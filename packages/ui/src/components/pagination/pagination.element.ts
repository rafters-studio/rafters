/**
 * Pagination -- page-based navigation for large data sets. Compose Pagination
 * with PaginationContent, PaginationItem, PaginationLink, PaginationPrevious,
 * PaginationNext, and PaginationEllipsis; the nav landmark is the contract, the
 * family is the composition. A pure static score has nothing to subscribe to:
 * the performance is pure decoration application. No useBehavior, no memory, no
 * bind -- markup in, classes out, slots through.
 *
 * @cognitive-load 4/10 - decision 1, information 2, interaction 1, disruption 0,
 * learning 0. A row of page controls; the reader reads the current page and the
 * boundary state, then makes one navigation decision. The ellipsis and the
 * disabled Prev/Next add a little information to parse, but the affordance is
 * universally learned and never disruptive.
 * @attention-economics Secondary navigation: supports content discovery without
 * competing with primary content. Use sparingly at the bottom of paginated
 * lists; the current page is the sole emphasis (`bg-primary`), every other
 * control stays low-attention.
 * @trust-building Predictable navigation builds confidence: clear current-page
 * indication prevents disorientation, and disabled Previous/Next at the
 * boundaries prevents invalid actions the user would have to recover from.
 * @accessibility Complete ARIA: the root is a `nav[aria-label="Pagination"]`
 * landmark, the current page is a live link marked `aria-current="page"`,
 * Previous/Next carry descriptive `aria-label`s and project `aria-disabled` at
 * the boundaries, and the ellipsis is `aria-hidden="true"` with an sr-only
 * "More pages" label so assistive tech skips the decoration.
 * @semantic-meaning Page-based navigation system for large data sets. The
 * ellipsis indicates hidden pages; the active control is visually and
 * programmatically distinct from the inactive ones.
 *
 * @usage-patterns
 * DO: Place at the bottom of paginated content for natural flow
 * DO: Show the current page clearly with aria-current="page"
 * DO: Use the ellipsis to truncate large ranges (Miller's Law: 7+/-2 visible)
 * DO: Disable Previous/Next at the boundaries
 * NEVER: Use pagination for small datasets (prefer infinite scroll or full display)
 * NEVER: Hide the current page number from users
 * NEVER: Allow navigation to invalid page numbers
 *
 * @example
 * ```tsx
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
 * ```
 */
import { RaftersElement } from '../../primitives/rafters-element';
import { pagination } from './pagination.behavior';
import { paginationNavClasses } from './pagination.classes';

/**
 * The pure-static Web Component performance: no binding, no state. It renders
 * the `root` part, the labelled nav landmark, once, with a default slot for the
 * controls the consumer composes.
 */
export class RaftersPagination extends RaftersElement {
  // The host is a transparent wrapper so the nav inside the shadow root is the box.
  static override styles = ':host { display: contents; }';

  override render(): Node {
    const nav = document.createElement('nav');
    nav.setAttribute('data-part', 'root');
    nav.setAttribute('aria-label', 'Pagination');
    nav.className = paginationNavClasses;
    const projection = pagination.aria({}, {}, { root: '' }).root ?? {};
    for (const [name, value] of Object.entries(projection)) {
      if (value === undefined || value === false) continue;
      nav.setAttribute(name, String(value));
    }
    nav.appendChild(document.createElement('slot'));
    return nav;
  }
}

if (!customElements.get('rafters-pagination')) {
  customElements.define('rafters-pagination', RaftersPagination);
}
