# Component Spec — Breadcrumb

Status: DRAFT. Static score (imitates Card and Container). No state, no actions,
no keymap, no effects, no motion block beyond the link's hover-colour intent.
The wayfinding archetype: a pure static performed across all three frameworks
(React, the `<rafters-breadcrumb>` web component, and Astro).

Files (`src/components/breadcrumb/`):

```
breadcrumb.behavior.ts   breadcrumb.classes.ts   breadcrumb.tsx
breadcrumb.element.ts     breadcrumb.astro
```

Tests mirror into `test/components/breadcrumb/` (behavior, classes, React
conformance, Astro conformance, WC conformance).

## Purpose

A hierarchical location trail: an ordered list of ancestor links expressing the
site hierarchy and the reader's current position within it. Breadcrumb is a
peripheral wayfinding aid -- it provides spatial context and never competes with
primary content. Not for primary actions, not for main navigation, and never
shown on a homepage (there is nothing to navigate back to).

## The finding: a pure static needs no bind

Breadcrumb is another data point for the card/container finding. Its score
projects no ARIA, holds no state, and runs no effects. There is therefore
**nothing to bind**:

- `breadcrumb.behavior.ts` is the score **only** -- there is no
  `bindBreadcrumb`. A DOM binding exists to run effects and apply projections
  imperatively; a static with an empty projection and no effects has neither.
- `breadcrumb.tsx` uses **no** `useBehavior`/`useMemory` -- markup in, classes
  out, slots through.
- `breadcrumb.astro` ships **no** `<script>` -- server-rendered markup with the
  fixed landmark and a default slot; nothing to hydrate.
- `breadcrumb.element.ts` performs **no** binding -- the web component renders
  the nav landmark with a default slot, once.

The score is declared only so the conformance harness can assert the one real
contract (the `root` part renders and projects no ARIA) identically across
every framework.

## Where the accessibility contract lives

The earned semantics -- the nav landmark, the current-page marker, the hidden
separators -- are **native markup each performance writes**, NOT a projection
the score computes (which is why the score is empty, exactly as the port task
specifies):

- The root is `nav[aria-label="Breadcrumb"]`, a labelled landmark.
- The current page is `role="link" aria-disabled="true" aria-current="page"` --
  it identifies the location and is deliberately non-clickable (a breadcrumb's
  current page is never a live link).
- Separators and the collapsed-path ellipsis are `aria-hidden="true"
  role="presentation"` so assistive tech skips the decoration; the ellipsis
  pairs its icon with an sr-only "More" label.

Because none of that is score-computed, the conformance suites assert it with
**bespoke, per-framework DOM assertions** rather than the harness's projection
comparison: an empty projection plus an axe pass would otherwise be satisfied by
a breadcrumb with its entire a11y contract stripped (axe does not require
`aria-current`). The suites explicitly check the landmark label, the
current-page marker, and the hidden separators against rendered DOM.

## Composition

```
Breadcrumb           root (nav[aria-label="Breadcrumb"]), the landmark
BreadcrumbList       ol, the flex-wrap trail (muted label text)
BreadcrumbItem       li, an inline-flex trail node
BreadcrumbLink       a (or asChild), an ancestor link with hover-colour + focus ring
BreadcrumbPage       span, the current page (role=link, aria-disabled, aria-current)
BreadcrumbSeparator  li[role=presentation aria-hidden], a decorative chevron
BreadcrumbEllipsis   span[role=presentation aria-hidden], collapsed-path marker + sr-only label
```

The family carries no behaviour of its own -- plain framework wrappers over
literal class strings, composed by the consumer inside a Breadcrumb. Only
`Breadcrumb` (the nav) is a declared part, because it is the only node with a
contract to project (an empty one, but a declared part) -- the same split Card
and Container draw between "what the score projects" and "what the consumer
composes inside" (boundary 5).

### Framework slot model

React composes freely: the consumer nests the family by hand. The web component
and Astro performances own only the nav landmark and expose a single default
slot; the consumer composes plain semantic children (the `ol`/`li`/`a`/current
marker) into it. The visual rhythm lives on those slotted children via the
shared class strings in `breadcrumb.classes.ts`, resolved from the compiled
utility sheet -- so there is no shadow-scoped descendant CSS to maintain.

`BreadcrumbPage` and `BreadcrumbEllipsis` render their `span` nodes via
`React.createElement` rather than JSX -- the same raw-element disposition Card
and Alert record while the new tree's Typography component does not exist yet; a
navigation marker is not prose, so no typography role component fits it either.

## Config, state, actions

```ts
type BreadcrumbConfig = Record<never, never>;
type BreadcrumbState = Record<never, never>;
type BreadcrumbActions = Record<never, never>;
```

Nothing configurable on the landmark: the label is fixed, the trail is
composed. `BreadcrumbLink` accepts `asChild` to merge onto a router link (via
`mergeProps`); `BreadcrumbSeparator` accepts custom `children` in place of the
default chevron.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none projected -- the `aria-label="Breadcrumb"` landmark label is fixed native markup, not a score projection |

There is exactly one behavioral part. List/item/link/page/separator/ellipsis are
structural composition, not ARIA-bearing parts of the score (boundary 5).

## Keyboard and effects

None. A static score with an empty ARIA projection has nothing to dispatch,
gate, or execute -- which is precisely why it needs no client. Links are native
anchors (native focus + activation); the current page is intentionally
non-interactive.

## Oracle dispositions (src/old/ui/breadcrumb.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `Breadcrumb` nav[aria-label="Breadcrumb"] landmark | contract |
| `BreadcrumbList/Item/Link/Page/Separator/Ellipsis` family | contract (shadcn drop-in surface) |
| `BreadcrumbLink asChild` (mergeProps onto a router link) | contract -- preserved verbatim |
| `BreadcrumbPage` role=link + aria-disabled + aria-current=page | contract -- the current page is a non-clickable marker |
| `BreadcrumbSeparator` role=presentation + aria-hidden, default chevron | contract |
| `BreadcrumbEllipsis` role=presentation + aria-hidden + sr-only "More" | contract |
| `transition-colors duration-150 motion-reduce:transition-none` on the link | contract -- the sole motion intent (hover colour), recorded as `motion.current` in the matrix |
| inline `ChevronRight`/`MoreHorizontal` SVGs (no icon dependency) | contract -- carried verbatim |
| old WC `:host { display: block }` | changed to `:host { display: contents }` so the nav landmark is the box, matching the React/Astro roots (the Container disposition) |

## Deltas from the oracle

1. `data-part="root"` added to the nav across all three performances so the
   conformance harness can locate the single declared part.
2. The WC host moves from `display: block` to `display: contents` -- the nav
   landmark inside the shadow is the box, not the custom element, matching
   React and Astro (Container's disposition).
3. `BreadcrumbPage`/`BreadcrumbEllipsis` render their spans via
   `createElement` (Typography-pending disposition), semantics unchanged.

## shadcn drop-in parity

shadcn's Breadcrumb exports `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`,
`BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, and
`BreadcrumbEllipsis`. This port matches that surface, including `asChild` on
`BreadcrumbLink` and custom `children` on `BreadcrumbSeparator`. A consumer
migrating a shadcn breadcrumb tree needs no prop or import-path changes beyond
the registry path.

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships: the trail is a `nav` landmark wrapping an
  ordered list; the current location is conveyed with `aria-current="page"`,
  not by colour alone.
- 2.4.8 Location: the breadcrumb IS the location cue -- it tells the user where
  they are within the site hierarchy.
- 2.1.1 Keyboard: ancestor links are native anchors (focusable, activatable);
  the current page is intentionally non-interactive, so it carries no keyboard
  obligation.
- 1.4.3 Contrast: the `text-muted-foreground` trail and `text-foreground`
  current page are contrast-tuned role tokens; the link's `hover:text-foreground`
  is a colour intent, not the sole state signal.
- Decoration is hidden: separators and the ellipsis glyph are
  `aria-hidden="true"`, so assistive tech reads the trail, not its punctuation.
- Landmark: the `nav` is its own landmark and supplies the region; the
  conformance suites render it standalone and assert axe cleanliness.
```
