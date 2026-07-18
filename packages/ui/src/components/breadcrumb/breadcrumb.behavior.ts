import type { BehaviorSpec } from '../../lib/contract';

/**
 * Breadcrumb: a hierarchical location trail. The wayfinding archetype -- a
 * static score with NO state, NO actions, NO keymap, NO effects, and (like
 * Card and Container) an EMPTY, structural aria projection. The trail's
 * semantics are carried NATIVELY by the markup each performance renders: the
 * root is a `nav` landmark labelled `Breadcrumb`, ancestor links are plain
 * `a` elements, the current page is a `role="link" aria-disabled="true"
 * aria-current="page"` node (not a link -- the current page is never
 * clickable), and separators/ellipses are `aria-hidden="true"
 * role="presentation"` decorations. None of that is a projection the score
 * computes; it is fixed markup the decorators write, so the score projects
 * nothing.
 *
 * Because the projection is empty and there is nothing to react to, Breadcrumb
 * needs NO client at all: there is no `bindBreadcrumb`, the React controller
 * uses no `useBehavior`/`useMemory`, the Astro performance ships no `<script>`,
 * and the Web Component performs no binding. A pure static's framework files
 * are the thinnest possible: markup + classes + slots, nothing more. The score
 * is declared only so the conformance harness can assert the one real contract
 * (the `root` part renders and projects no ARIA) identically across React, the
 * Web Component, and Astro.
 *
 * The composition family (BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
 * BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis) carries no
 * behaviour of its own -- those are plain framework wrappers over literal
 * class strings, composed by the consumer inside a Breadcrumb. Only `root`
 * (the nav landmark) is a declared part, because it is the only node with a
 * contract to project (boundary 5: a binding rendering an undeclared part is
 * structure the score never authorized).
 */

export type BreadcrumbConfig = Record<never, never>;
export type BreadcrumbState = Record<never, never>;
export type BreadcrumbActions = Record<never, never>;
export type BreadcrumbPart = 'root';

export const breadcrumb: BehaviorSpec<
  BreadcrumbConfig,
  BreadcrumbState,
  BreadcrumbActions,
  BreadcrumbPart
> = {
  name: 'breadcrumb',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // The nav landmark, the current-page marker, and the hidden separators are
  // native to the markup each performance renders; the score projects nothing
  // and the harness asserts the empty contract across every framework.
  aria: () => ({ root: {} }),
  keymap: () => null,
  effects: () => [],
};
