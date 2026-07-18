# Component Spec — Pagination

Status: DRAFT. Static score (imitates Card, Container, and Breadcrumb). No
state, no actions, no keymap, no effects, no motion block beyond the link's
hover-colour intent. The page-navigation archetype: a pure static performed
across all three frameworks (React, the `<rafters-pagination>` web component,
and Astro).

Files (`src/components/pagination/`):

```
pagination.behavior.ts   pagination.classes.ts   pagination.tsx
pagination.element.ts     pagination.astro
```

Tests mirror into `test/components/pagination/` (behavior, classes, React
conformance, Astro conformance, WC conformance).

## Purpose

Page-based navigation for large data sets: a `nav` landmark holding page links
and Previous/Next controls, with the current page marked and truncated ranges
collapsed to an ellipsis. Pagination is a secondary navigation aid -- place it
at the bottom of paginated content, use it sparingly, and never for small data
sets (prefer infinite scroll or a full display).

## The finding: a pure static needs no bind

Pagination is another data point for the card/container/breadcrumb finding. Its
score projects no ARIA, holds no state, and runs no effects. There is therefore
**nothing to bind**:

- `pagination.behavior.ts` is the score **only** -- there is no
  `bindPagination`. A DOM binding exists to run effects and apply projections
  imperatively; a static with an empty projection and no effects has neither.
- `pagination.tsx` uses **no** `useBehavior`/`useMemory` -- markup in, classes
  out, slots through.
- `pagination.astro` ships **no** `<script>` -- server-rendered markup with the
  fixed landmark and a default slot; nothing to hydrate.
- `pagination.element.ts` performs **no** binding -- the web component renders
  the nav landmark with a default slot, once.

The score is declared only so the conformance harness can assert the one real
contract (the `root` part renders and projects no ARIA) identically across every
framework.

The "current page" the matrix lists as a state is not a reducer state: it is a
per-item `isActive` prop the consumer sets on one `PaginationLink`, which the
component turns into `aria-current="page"`. There is no page-count arithmetic in
the score -- the consumer composes the exact controls it wants to show, exactly
as with the oracle.

## Where the accessibility contract lives

The earned semantics -- the nav landmark, the current-page marker, the
boundary-disabled controls, the hidden ellipsis -- are **native markup each
performance writes from its props**, NOT a projection the score computes (which
is why the score is empty, exactly as the port task specifies):

- The root is `nav[aria-label="Pagination"]`, a labelled landmark.
- The current page is a live link marked `aria-current="page"`. Unlike a
  breadcrumb's current page, it stays clickable -- pagination's current control
  keeps navigating.
- Previous and Next carry descriptive `aria-label`s ("Go to previous/next
  page") and project `aria-disabled="true"` (plus the native `disabled` on the
  button branch, plus a `pointer-events-none` dimmer) when the consumer passes
  `disabled` at a boundary.
- The ellipsis is `aria-hidden="true"` decoration pairing its glyph with an
  sr-only "More pages" label so assistive tech skips it.

Because none of that is score-computed, the conformance suites assert it with
**bespoke, per-framework DOM assertions** rather than the harness's projection
comparison: an empty projection plus an axe pass would otherwise be satisfied by
a pagination with its entire a11y contract stripped (axe does not require
`aria-current` or the boundary `aria-disabled`). The suites explicitly check the
landmark label, the live current-page marker, the boundary-disabled control, and
the hidden ellipsis against rendered DOM.

## Composition

```
Pagination           root (nav[aria-label="Pagination"]), the landmark
PaginationContent    ul, the flex row of controls (token gap)
PaginationItem       li, a single control slot
PaginationLink       a (href) or button (onClick, no href); isActive -> aria-current=page
PaginationPrevious   PaginationLink + "Go to previous page" label and a chevron
PaginationNext       PaginationLink + "Go to next page" label and a chevron
PaginationEllipsis   span[aria-hidden], collapsed-range marker + sr-only "More pages"
```

The family carries no behaviour of its own -- plain framework wrappers over
literal class strings, composed by the consumer inside a Pagination. Only
`Pagination` (the nav) is a declared part, because it is the only node with a
contract to project (an empty one, but a declared part) -- the same split Card,
Container, and Breadcrumb draw between "what the score projects" and "what the
consumer composes inside" (boundary 5).

### Framework slot model

React composes freely: the consumer nests the family by hand. The web component
and Astro performances own only the nav landmark and expose a single default
slot; the consumer composes plain semantic children (the `ul`/`li`/`a`/current
marker) into it. The visual rhythm lives on those slotted children via the
shared class strings in `pagination.classes.ts`, resolved from the compiled
utility sheet -- so there is no shadow-scoped descendant CSS to maintain.

`PaginationEllipsis` renders its `span` via `React.createElement` rather than JSX
-- the same raw-element disposition Card, Alert, and Breadcrumb record while the
new tree's Typography component does not exist yet; a navigation marker is not
prose, so no typography role component fits it either.

## Config, state, actions

```ts
type PaginationConfig = Record<never, never>;
type PaginationState = Record<never, never>;
type PaginationActions = Record<never, never>;
```

Nothing configurable on the landmark: the label is fixed, the trail is composed.
`PaginationLink` accepts `isActive` (current page), `disabled` (boundary),
`size` (default/sm/lg/icon), `href` (anchor) or `onClick` (button), and
`asChild` to merge onto a router link (via `mergeProps`); `PaginationPrevious`
and `PaginationNext` accept a custom `label`.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none projected -- the `aria-label="Pagination"` landmark label is fixed native markup, not a score projection |

There is exactly one behavioral part. Content/item/link/previous/next/ellipsis
are structural composition, not ARIA-bearing parts of the score (boundary 5).

## Keyboard and effects

None. A static score with an empty ARIA projection has nothing to dispatch,
gate, or execute -- which is precisely why it needs no client. Page links are
native anchors (native focus + activation); button-style controls are native
`<button>`s (native Enter/Space); a disabled control is either a native
`disabled` button or an `aria-disabled` anchor with `pointer-events-none`.

## Oracle dispositions (src/old/ui/pagination.{tsx,astro}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `Pagination` nav[aria-label="Pagination"] landmark | contract |
| `PaginationContent/Item/Link/Previous/Next/Ellipsis` family | contract (shadcn drop-in surface) |
| `PaginationLink` anchor-or-button (onClick + no href -> button) | contract -- preserved verbatim |
| `PaginationLink asChild` (mergeProps onto a router link) | contract -- preserved verbatim |
| `PaginationLink isActive` -> aria-current=page on a live link | contract -- the current page stays clickable |
| `PaginationLink disabled` -> aria-disabled + native disabled + pointer-events-none | contract |
| `PaginationLink size` default/sm/lg/icon presets | contract |
| `PaginationPrevious/Next` aria-label + chevron + label | contract |
| `PaginationEllipsis` aria-hidden + sr-only "More pages" | contract |
| `transition-colors duration-150 motion-reduce:transition-none` on the link | contract -- the sole motion intent (hover colour), recorded as `motion.current` in the matrix |
| inline `ChevronLeft`/`ChevronRight`/`MoreHorizontal` SVGs (no icon dependency) | contract -- carried verbatim |
| old Astro `Props extends HTMLAttributes<'nav'>` markup-only performance | contract -- Pagination is a genuine static, so markup-only is correct here (not the deferred-behavior defect) |

## Deltas from the oracle

1. `data-part="root"` added to the nav across all three performances so the
   conformance harness can locate the single declared part.
2. A `<rafters-pagination>` web component performance is added (the oracle
   shipped only React + Astro); its host is `display: contents` so the nav
   landmark inside the shadow is the box, matching React and Astro (Container's
   disposition).
3. `PaginationEllipsis` renders its span via `createElement`
   (Typography-pending disposition), semantics unchanged; the sr-only label is
   carried verbatim as "More pages".
4. The disabled dimmer moves from an inline `disabled && '...'` string to the
   named `paginationDisabledClasses` in `pagination.classes.ts`; the resolved
   classes are identical.

## shadcn drop-in parity

shadcn's Pagination exports `Pagination`, `PaginationContent`, `PaginationItem`,
`PaginationLink`, `PaginationPrevious`, `PaginationNext`, and
`PaginationEllipsis`. This port matches that surface, including `isActive` and
`size` on `PaginationLink`, the anchor/button split, `asChild`, and a custom
`label` on Previous/Next. A consumer migrating a shadcn pagination tree needs no
prop or import-path changes beyond the registry path.

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships: the controls are a `nav` landmark wrapping a
  list; the current location is conveyed with `aria-current="page"`, not by
  colour alone.
- 2.4.5 Multiple Ways: pagination is one of the ways a user reaches a specific
  page within a large data set.
- 2.1.1 Keyboard: page links are native anchors and button-style controls are
  native buttons -- both focusable and activatable; a boundary-disabled button
  uses native `disabled`.
- 2.4.4 Link Purpose: Previous/Next carry descriptive `aria-label`s ("Go to
  previous/next page") so their purpose is clear out of context.
- 1.4.3 Contrast: the `bg-primary`/`text-primary-foreground` current page and
  the `text-foreground` inactive links are contrast-tuned role tokens; the
  hover colour is an intent, not the sole state signal.
- Decoration is hidden: the ellipsis glyph is `aria-hidden="true"` with an
  sr-only "More pages" label, so assistive tech reads the trail, not its
  punctuation.
- Landmark: the `nav` is its own landmark and supplies the region; the
  conformance suites render it standalone and assert axe cleanliness.
