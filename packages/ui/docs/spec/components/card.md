# Component Spec — Card

Status: DRAFT. Static score (imitates Container). No state, no actions, no
keymap, no effects, no motion block. The composition archetype: the first pure
static performed across all three frameworks (React, the `<rafters-card>` web
component, and Astro).

Files (`src/components/card/`):

```
card.behavior.ts   card.classes.ts   card.tsx   card.element.ts   card.astro
```

Tests mirror into `test/components/card/` (behavior, classes, React
conformance, WC conformance).

## Purpose

A content surface for grouping related information on an elevated, bordered,
rounded panel. Card groups; it does not announce (unlike Alert) and it does
not interrupt (unlike Dialog). The surface is the contract; the composition
family is how a consumer fills it.

## The finding: a pure static needs no bind

Card is the data point this port exists to record. Its score projects no ARIA
(the surface's semantics are native to the element chosen by `as`), holds no
state, and runs no effects. There is therefore **nothing to bind**:

- `card.behavior.ts` is the score **only** -- there is no `bindCard`. A DOM
  binding exists to run effects and apply projections imperatively; a static
  with an empty projection and no effects has neither to run.
- `card.tsx` uses **no** `useBehavior`/`useMemory` -- config in, classes out,
  slots through, semantic element chosen by `as`.
- `card.astro` ships **no** `<script>` -- it is server-rendered markup with
  the shared class strings and named slots; there is nothing to hydrate.
- `card.element.ts` performs **no** binding -- the web component renders the
  surface markup with the shared classes and named slots, once.

The score is declared at all only so the conformance harness can assert the
one real contract (the `root` part renders and projects no ARIA) identically
across every framework.

## Composition

```
Card             root (div | article | section | aside), the surface; fill
CardHeader       div, header region (flex column, gap, padding)
CardTitle        raw heading (default h3, as = h1..h6)
CardDescription  p, muted body text
CardContent      div, the body region
CardFooter       div, trailing controls row
CardAction       div, trailing action positioned into the header grid
```

`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`/
`CardAction` carry no behaviour of their own -- they are plain framework
wrappers over literal class strings, composed by the consumer inside a Card.
Only `Card` has a behavior file, because it is the only part with a contract
to project (an empty one, but a declared part) -- the same split Container and
Alert draw between "what the score projects" and "what the consumer composes
inside."

### Framework slot model

React composes freely: the consumer nests the sub-components by hand, so a
content-only card renders only the nodes it uses. The web component and Astro
performances cannot nest arbitrary children into regions without a runtime, so
they expose fixed named slots (`header`, `title`, `description`, `action`
nested inside the header region; `content`, `footer` as root-level siblings;
plus a default slot). Title/description/action are nested inside the header
region so they inherit its `p-6`, matching React's `CardHeader` nesting -- the
rendered structure agrees across all three.

The one honest cost: a fixed slot region is always rendered, so an unfilled
region is empty padded space. Hiding it would require a `slotchange` listener
-- a bind -- which is precisely what a pure static must not carry. Pre-rendered
regions are the accepted price of a no-bind multi-region static.

## Config, state, actions

```ts
type CardElement = 'div' | 'article' | 'section' | 'aside';

interface CardConfig {
  as?: CardElement;
  fill?: string; // colour-vocabulary signature (#1637)
}
type CardState = Record<never, never>;
type CardActions = Record<never, never>;
```

`fill`, never a raw background. A resolved fill signature REPLACES the default
`bg-card` surface pairing (so the two never coexist and there is no reliance
on compiled source-order to pick a winner); an invalid or empty signature
keeps the default card surface. The oracle's deprecated `background` enum is
dropped.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none -- empty projection, semantics native to the element |

There is exactly one behavioral part. Header/title/description/content/footer/
action are structural composition, not ARIA-bearing parts of the score
(boundary 5: a binding rendering an undeclared part is structure the score
never authorized).

## Keyboard and effects

None. A static score with an empty ARIA projection has nothing to dispatch,
gate, or execute -- which is precisely why it needs no client.

## Oracle dispositions (src/old/ui/card.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `as` (div/article/section/aside) | contract |
| `fill` signature (#1637) | contract -- replaces the default surface when it resolves |
| Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter/CardAction surface | contract (shadcn v4 drop-in family) |
| `background` enum (none/muted/accent/card/primary/secondary) | dropped -- superseded by `fill`; a raw background prop is not the colour channel |
| `interactive` (hover/focus/motion, tabindex, role=button, activate event) | dropped -- Card is a surface, not a control; motion is none. Whole-card interactivity is a link or a Button inside |
| `size` (`sm` compact variant / `group/card-sm`) | dropped -- no consumer of the group utility survives; a compact card is a padding override via `className` |
| `editable`/`onTitleChange`/`onDescriptionChange` (contenteditable block-editor plumbing) | dropped -- editor/block props are out of scope for the surface |
| `CardTitle` rendering a raw heading | contract -- Typography's H1-H6 do not exist in the new tree yet (matrix: typography, pending); repointing at a typography role component is a follow-up |
| `cardActionClasses` grid placement (`col-start-2 row-start-1 …`) | contract, but inert -- the header is `flex flex-col` in every framework (React included), so the grid-placement utilities never take effect. Carried forward verbatim from the oracle rather than invented or dropped; a header that opts into a grid layout is a future disposition, not this port's |

## Deltas from the oracle

1. `fill` replaces `background`; a resolved fill swaps the whole surface
   pairing rather than layering a second `bg-*` over `bg-card`.
2. `interactive`, `size`, and the editable/block-editor props are dropped --
   Card is a static surface with no state and no motion.
3. `CardTitle`/`CardDescription` render raw heading/paragraph tags (via
   `createElement`) because the new tree's Typography component does not exist
   yet -- the same disposition Alert records.

## shadcn drop-in parity

shadcn v4's Card exports `Card`, `CardHeader`, `CardTitle`, `CardDescription`,
`CardContent`, `CardFooter`, and `CardAction`. This port matches that surface.
A consumer migrating a shadcn card tree needs no prop or import-path changes
beyond the registry path; the dropped props (`interactive`/`size`/editable)
were oracle extensions, not part of shadcn's surface.

## WCAG 2.1 AA obligations

- 1.3.1 Info and Relationships: the surface projects no role -- structure
  comes from the element (`as`) and from real headings inside. Use
  `CardTitle`'s `as` to place the heading at the correct outline level for the
  surrounding page; never skip levels.
- 2.1.1 Keyboard: a card is not interactive, so there is no keyboard contract
  to satisfy. When a whole-card action is wanted, wrap the card in a link or
  place a `Button` inside -- both carry their own keyboard semantics.
- 1.4.3 Contrast: the default `bg-card` / `text-card-foreground` pairing is a
  contrast-tuned token pair; a resolved `fill` over a frozen role word brings
  its own paired foreground, so the surface stays legible after the swap.
- Landmark containment: a card is a surface, not a landmark -- the page around
  it supplies the region. The conformance suites render inside a `<main>` so
  the axe best-practice `region` rule is satisfied by the page, not the card.
