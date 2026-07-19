import type { BehaviorSpec } from '../../lib/contract';

/**
 * Pagination: page-based navigation for large data sets. The wayfinding
 * archetype -- a static score with NO state, NO actions, NO keymap, NO effects,
 * and (like Card, Container, and Breadcrumb) an EMPTY, structural aria
 * projection. Its semantics are carried NATIVELY by the markup each performance
 * renders: the root is a `nav` landmark labelled `Pagination`, page links are
 * plain `a`/`button` elements, the current page is a live link marked
 * `aria-current="page"` (it stays clickable -- unlike a breadcrumb's current
 * page), the Previous/Next controls project `aria-disabled="true"` at the
 * boundaries, and the ellipsis is an `aria-hidden="true"` decoration pairing a
 * glyph with an sr-only "More pages" label. None of that is a projection the
 * score computes; it is markup the decorators write from their own props, so
 * the score projects nothing.
 *
 * Because the projection is empty and there is nothing to react to, Pagination
 * needs NO client at all: there is no `bindPagination`, the React controller
 * uses no `useBehavior`/`useMemory`, the Astro performance ships no `<script>`,
 * and the Web Component performs no binding. Navigation is native (an anchor's
 * href, or a consumer-supplied `onClick` on a button); the "current page" is a
 * per-item prop, not a reducer state, so there is no machine to run. A pure
 * static's framework files are the thinnest possible: markup + classes + slots,
 * nothing more. The score is declared only so the conformance harness can
 * assert the one real contract (the `root` part renders and projects no ARIA)
 * identically across React, the Web Component, and Astro.
 *
 * The composition family (PaginationContent, PaginationItem, PaginationLink,
 * PaginationPrevious, PaginationNext, PaginationEllipsis) carries no behaviour
 * of its own -- those are plain framework wrappers over literal class strings,
 * composed by the consumer inside a Pagination. Only `root` (the nav landmark)
 * is a declared part, because it is the only node with a contract to project
 * (boundary 5: a binding rendering an undeclared part is structure the score
 * never authorized).
 */

export type PaginationConfig = Record<never, never>;
export type PaginationState = Record<never, never>;
export type PaginationActions = Record<never, never>;
export type PaginationPart = 'root';

export const pagination: BehaviorSpec<
  PaginationConfig,
  PaginationState,
  PaginationActions,
  PaginationPart
> = {
  name: 'pagination',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // The nav landmark, the current-page marker, the boundary-disabled controls,
  // and the hidden ellipsis are native to the markup each performance renders
  // from its props; the score projects nothing and the harness asserts the
  // empty contract across every framework.
  aria: () => ({ root: {} }),
  keymap: () => null,
};
