# Component Spec — Empty

Status: DRAFT. Static score (imitates Card, which imitates Container). No state,
no actions, no keymap, no effects, no motion block. A pure static performed
across all three frameworks (React, the `<rafters-empty>` web component, and
Astro).

Files (`src/components/empty/`):

```
empty.behavior.ts   empty.classes.ts   empty.tsx   empty.element.ts   empty.astro
```

Tests mirror into `test/components/empty/` (behavior, classes, React
conformance, WC conformance, Astro conformance).

## Purpose

An empty-state placeholder for when there is no content to show. Empty
communicates absence honestly -- empty search results, no items yet, a cleared
list, a filter that matched nothing -- and, where it can, points at the next
step. It fills a void without demanding attention; it is read once, briefly,
and then the content it stands in for takes over.

## The finding: a pure static needs no bind

Empty is another data point on the finding the card port recorded. Its score
projects no ARIA (the placeholder carries no role of its own; the heading inside
supplies structure), holds no state, and runs no effects. There is therefore
**nothing to bind**:

- `empty.behavior.ts` is the score **only** -- there is no `bindEmpty`. A DOM
  binding exists to run effects and apply projections imperatively; a static
  with an empty projection and no effects has neither to run.
- `empty.tsx` uses **no** `useBehavior`/`useMemory` -- config in, classes out,
  children through.
- `empty.astro` ships **no** `<script>` -- it is server-rendered markup with the
  shared class strings and named slots; there is nothing to hydrate.
- `empty.element.ts` performs **no** binding -- the web component renders the
  placeholder markup with the shared classes and named slots, once.

The score is declared at all only so the conformance harness can assert the one
real contract (the `root` part renders and projects no ARIA) identically across
every framework.

## Composition

```
Empty             root (div), the centered column
EmptyIcon         div, the illustrative icon slot (muted, sized)
EmptyTitle        raw heading (default h3, as = h1..h6)
EmptyDescription  p, muted body text explaining the absence
EmptyAction       div, the next-step control slot
```

`EmptyIcon`/`EmptyTitle`/`EmptyDescription`/`EmptyAction` carry no behaviour of
their own -- they are plain framework wrappers over literal class strings,
composed by the consumer inside an Empty. Only `Empty` has a behavior file,
because it is the only part with a contract to project (an empty one, but a
declared part) -- the same split Card and Container draw between "what the score
projects" and "what the consumer composes inside."

### Framework slot model

React composes freely: the consumer nests the sub-components by hand, so a
title-only placeholder renders only the nodes it uses. The web component and
Astro performances cannot nest arbitrary children into regions without a
runtime, so they expose fixed named slots (`icon`, `title`, `description`,
`action`) as direct children of the centered column, plus a default slot. The
structure is flat -- unlike Card, there is no header region nesting -- so all
four regions are siblings, matching React's flat composition.

The one honest cost: a fixed slot region is always rendered, so an unfilled
region is empty space. Hiding it would require a `slotchange` listener -- a bind
-- which is precisely what a pure static must not carry. Pre-rendered regions
are the accepted price of a no-bind multi-region static.

## Config, state, actions

```ts
type EmptyConfig = Record<never, never>;
type EmptyState = Record<never, never>;
type EmptyActions = Record<never, never>;
```

Empty takes no config: it is a fixed placeholder shape. There is no surface to
fill (the placeholder is transparent -- fill, never background) and the root is
always a `div`, so there is no `as`. The classes function is constant.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none -- empty projection, structure comes from the heading inside |

There is exactly one behavioral part. Icon/title/description/action are
structural composition, not ARIA-bearing parts of the score (boundary 5: a
binding rendering an undeclared part is structure the score never authorized).

## Keyboard and effects

None. A static score with an empty ARIA projection has nothing to dispatch,
gate, or execute -- which is precisely why it needs no client. Any interactivity
comes from a real control the consumer places in `EmptyAction`, which carries
its own keyboard semantics.

## Oracle dispositions (src/old/ui/empty.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `Empty`/`EmptyIcon`/`EmptyTitle`/`EmptyDescription`/`EmptyAction` surface | contract -- the rafters placeholder family, ported whole |
| Centered-column structure + muted sub-part classes | contract -- ported verbatim from `empty.classes.ts` |
| `EmptyTitle` rendering a raw heading | contract -- Typography's H1-H6 do not exist in the new tree yet (matrix: typography, pending); repointing at a typography role component is a follow-up |
| `EmptyTitle` hard-coded `<h3>` | contract, extended -- an optional `as` (h1..h6, default h3) is added so the heading takes its correct outline level; the default keeps oracle output byte-identical (see Deltas) |
| Old WC's deferred `<rafters-empty-icon/title/description/action>` subcomponents | framework-affordance -- the sub-components are React/Astro composition and WC named-slot regions, not separate custom elements; the deferred sub-elements are not resurrected |
| Old WC's parallel hand-written descendant CSS map | dropped -- it never applied to light-tree slotted children (shadow-scoped descendant rules do not cross the slot boundary); the shared utility classes on the region wrappers carry the rhythm instead |

## Deltas from the oracle

1. `EmptyTitle` gains an optional `as` (h1..h6) defaulting to `h3`, so a
   consumer can place the placeholder heading at the correct outline level
   without skipping levels. The default is byte-identical to the oracle's fixed
   `<h3>`.
2. The web component renders four fixed named-slot regions
   (`icon`/`title`/`description`/`action`) plus a default slot, superseding the
   oracle's dropped descendant CSS map.
3. `EmptyTitle`/`EmptyDescription` render raw heading/paragraph tags (via
   `createElement`) because the new tree's Typography component does not exist
   yet -- the same disposition Card and Alert record.

## shadcn drop-in parity

shadcn's own `Empty` (added Sep 2025) ships a different surface --
`Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent`
-- than this component. The rafters `Empty` predates and diverges from it:
rafters exports `Empty`/`EmptyIcon`/`EmptyTitle`/`EmptyDescription`/`EmptyAction`.
Per the port contract, `old/ui` is rafters' own shadcn-compatible base plus
rafters extensions; this port preserves that rafters surface rather than
renaming to chase shadcn's later, incompatible names. So parity here is
**rafters-original, not a shadcn drop-in** -- a consumer migrating from shadcn's
`Empty` remaps `EmptyMedia` -> `EmptyIcon` and drops `EmptyHeader`/`EmptyContent`
wrappers (rafters composes flat). The `EmptyTitle`/`EmptyDescription` names do
line up across both.

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships: the placeholder projects no role -- structure
  comes from `EmptyTitle` rendering a real heading. Use its `as` to place the
  heading at the correct outline level for the surrounding page; never skip
  levels.
- 2.1.1 Keyboard: the placeholder is not interactive, so there is no keyboard
  contract to satisfy. The next-step control in `EmptyAction` must be a real,
  keyboard-reachable element (a `Button` or link), never a styled div.
- 1.4.3 Contrast: the `text-muted-foreground` / `text-foreground` pairings are
  contrast-tuned token pairs, so the muted description and the title stay
  legible against the page surface.
- 1.1.1 Non-text Content: the icon in `EmptyIcon` is decorative -- mark it
  `aria-hidden` (or give it a title only when it carries meaning the text does
  not), so it adds no noise for assistive technology.
- Landmark containment: a placeholder is not a landmark -- the page around it
  supplies the region. The conformance suites render inside a `<main>` so the
  axe best-practice `region` rule is satisfied by the page, not the placeholder.
