# Component Spec — Card

Status: DRAFT. Static score (imitates Container). No state, no actions, no
keymap, no effects, no motion block. The composition archetype: the first pure
static performed across all three frameworks (React, the `<rafters-card>` web
component, and Astro).

Files (`src/components/card/`):

```
card.behavior.ts   card.classes.ts   card.tsx   card.element.ts   card.astro
card-header.astro  card-title.astro  card-action.astro
card-content.astro card-footer.astro
```

`card-description.astro` is NOT YET PRESENT: the repo's typography guard denies
writing a raw `<p class=…>` in an `.astro` file, and the ruling that
`CardDescription` is a real `p` rules out its suggested remedy. Astro consumers
use `card.astro`'s `description` slot until the guard is given a card-family
exemption. `CardDescription` exists normally in React and the web component.

Tests mirror into `test/components/card/` (behavior, classes, React
conformance, WC conformance, Astro conformance, Astro sub-component parity).

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
CardHeader       div, header region -- a GRID (see below)
CardTitle        real heading (default h3, as = h1..h6)
CardDescription  real p, muted body text
CardContent      div, the body region
CardFooter       div, trailing controls row
CardAction       div, trailing action placed into the header grid
```

### Spacing: the root owns the rhythm

Per shadcn v4, the ROOT carries the vertical rhythm (`flex flex-col gap-6
py-6`) and each part carries only its horizontal inset (`px-6`). The older
per-part `p-6 pt-0` could only space the declared parts; with the rhythm on the
root, an arbitrary child dropped straight into a Card -- not wrapped in
`CardContent` -- picks up the same rhythm as everything else. The panel is
`rounded-xl`.

### The header is a grid, and that is what makes CardAction work

`CardHeader` is `grid auto-rows-min grid-rows-[auto_auto]`, with
`has-data-[slot=card-action]:grid-cols-[1fr_auto]` opening a second column only
when a `CardAction` is actually present. `cardActionClasses`
(`col-start-2 row-span-2 row-start-1 self-start justify-self-end`) were carried
forward from the oracle but were **inert** while the header was `flex flex-col`
-- placement utilities with no grid parent resolve against nothing. The grid is
the parent they always needed. `CardAction` must be a DIRECT CHILD of
`CardHeader`; anywhere else it places into no grid.

Container queries (`@container/card-header`) are deliberately **out** -- Tier B,
tracked separately.

`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`/
`CardAction` carry no behaviour of their own -- they are plain framework
wrappers over literal class strings, composed by the consumer inside a Card.
Only `Card` has a behavior file, because it is the only part with a contract
to project (an empty one, but a declared part) -- the same split Container and
Alert draw between "what the score projects" and "what the consumer composes
inside."

### Framework slot model

React composes freely: the consumer nests the sub-components by hand, so a
content-only card renders only the nodes it uses.

**Astro composes the same way.** Each sub-component is an importable file, so
an Astro tree is the React tree:

```astro
<Card as="article">
  <CardHeader>
    <CardTitle>Quarterly report</CardTitle>
    <CardAction><Button>Menu</Button></CardAction>
  </CardHeader>
  <CardContent>Revenue is up.</CardContent>
</Card>
```

`card.astro`'s named slots (`header`, `title`, `description`, `action`,
`content`, `footer`, plus a default slot) remain as a **convenience**, not the
parity surface: shadcn parity is a floor, not a ceiling, and slot syntax
already exists in the wild. A named-slot REGION is rendered only when that slot
actually has content (`Astro.slots.has`), so the two ways of filling a Card
never collide -- composing sub-components yields the React tree with no phantom
empty regions wrapped around it. That is a server-side check, not a
`slotchange` listener: still no client JavaScript, still no bind.

The web component cannot nest arbitrary children into regions without a
runtime, so it keeps the fixed named slots and pays the honest cost: an
unfilled region is empty space. Hiding it would require a `slotchange` listener
-- a bind -- which is precisely what a pure static must not carry.

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

## No `className`. Design travels through token props.

**`className` is not supported, on `Card` or on any of the seven
sub-components. `class` is not supported on the Astro files.** This is the one
deliberate API break in the drop-in contract, and it is the thesis rather than
an oversight.

A component that accepts a class string is a component that invites design to
be re-decided at every call site. The whole system exists so design travels
through **token props** -- `fill` over the colour vocabulary, `as` over the
semantic element -- which are checkable, cascade with the token layer, and
cannot express an arbitrary value. A class escape hatch is the hole through
which every one of those guarantees leaks: an agent asked to adjust a card
would reach for `className="mt-8 bg-[#f5f5f5]"` and quietly undo the
accessibility and rhythm work the tokens encode. **Agents do not do design.**
Removing the hatch is what makes that true rather than aspirational.

It is enforced twice, because a type alone is not enforcement:

- the props types `Omit` `className` from the HTML attributes they extend, so a
  TypeScript caller is refused at compile time;
- every performance strips it at runtime before the rest spreads onto the
  element, so a JavaScript caller (or a `{...props}` object the types never
  saw) cannot smuggle it through either.

Consequences a migrating consumer should expect, stated plainly:

- a shadcn card tree that passes `className` compiles with an error, and the
  class silently stops applying if the error is suppressed;
- there is no compact-card escape hatch. A card that needs different spacing
  needs a token prop, which means it needs an issue.

Everything else about the swap is unchanged: same component names, same
composition, same `data-slot` selectors, same children.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none -- empty projection, semantics native to the element |

### `data-slot` and `data-part` are different contracts

Every node emits shadcn's `data-slot` (`card`, `card-header`, `card-title`,
`card-description`, `card-action`, `card-content`, `card-footer`) in all three
performances. `data-slot` is the **swap contract**: a consumer's
`has-data-[slot=card-action]` or `[data-slot=card]` selectors have to keep
matching after the import swap, and the header's own grid variant depends on
it. `data-part` stays the **internal binding contract** and remains root-only
(boundary 5) -- the two never merge, and the sub-components declare no part.

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
| `size` (`sm` compact variant / `group/card-sm`) | dropped -- no consumer of the group utility survives. NOT replaceable by a class override: `className` is not supported (see above). A compact card needs a token prop, which means it needs an issue. Tier B tracks a real `size` prop |
| `editable`/`onTitleChange`/`onDescriptionChange` (contenteditable block-editor plumbing) | dropped -- editor/block props are out of scope for the surface |
| `CardTitle` rendering a real heading | contract -- the ratified AAA divergence (see below). NOT a Typography-pending placeholder: `H1`-`H6` and `P` do exist in the new tree; card renders native tags deliberately, because repointing would swap card's own role tokens for typography's and drag a cross-component dependency into card's registry closure |
| `cardActionClasses` grid placement (`col-start-2 row-start-1 …`) | contract, and now LIVE -- the header is a grid, so the placement utilities take effect. They were inert under the previous `flex flex-col` header |

## Deltas from the oracle

1. `fill` replaces `background`; a resolved fill swaps the whole surface
   pairing rather than layering a second `bg-*` over `bg-card`.
2. `interactive`, `size`, and the editable/block-editor props are dropped --
   Card is a static surface with no state and no motion.
3. `CardTitle`/`CardDescription` render real heading/paragraph tags -- the
   ratified AAA divergence, not a placeholder.
4. `className`/`class` are not accepted anywhere in the family.
5. Spacing moves to the v4 model: rhythm on the root, insets on the parts.

## shadcn drop-in parity

shadcn v4's Card exports `Card`, `CardHeader`, `CardTitle`, `CardDescription`,
`CardContent`, `CardFooter`, and `CardAction`. This port matches that surface:
same names, same composition, same `data-slot` attributes, and in Astro the
same importable per-part files. The dropped props
(`interactive`/`size`/editable) were oracle extensions, not part of shadcn's
surface.

Two intentional differences, both stated here rather than discovered:

1. **`className` is not supported** -- the one deliberate API break. See the
   section above. Everything else about the swap is literal.
2. **`CardTitle` is a real heading and `CardDescription` a real `p`**, where
   shadcn renders `div`/`div`. This is the accepted AAA divergence and it is
   **behavior-additive, not API-changing**: same component name, same children,
   same `data-slot`, one added `as` prop on the title. A swapped tree renders
   identically to the eye and better to a screen reader -- the title enters the
   document outline and the heading list (1.3.1 Info and Relationships, 2.4.10
   Section Headings at AAA), and description prose is announced as a paragraph.
   Nothing a shadcn consumer wrote stops working.

## WCAG 2.2 AAA obligations

The bar for this component is **AAA**, not AA: the product is shadcn's API with
AAA underneath, and that is the whole value over shadcn itself.

- 1.3.1 Info and Relationships: the surface projects no role -- structure
  comes from the element (`as`) and from real headings inside. Use
  `CardTitle`'s `as` to place the heading at the correct outline level for the
  surrounding page; never skip levels.
- 2.1.1 Keyboard: a card is not interactive, so there is no keyboard contract
  to satisfy. When a whole-card action is wanted, wrap the card in a link or
  place a `Button` inside -- both carry their own keyboard semantics.
- 2.4.10 Section Headings (AAA): `CardTitle` is a real heading, so a card's
  title is a navigable section heading rather than styled text. This is the
  divergence from shadcn's `div` and it is why the divergence is worth having.
- 1.4.6 Contrast (Enhanced) (AAA, 7:1): the default `bg-card` /
  `text-card-foreground` pairing clears it in both themes. Measured on a
  canonical near-zero-chroma neutral family through
  `calculateWCAGContrast`: **light 18.11:1** (`card-foreground` = neutral-950
  on `card` = neutral-50), **dark 8.36:1** (neutral-50 on neutral-700). Dark is
  the tighter of the two but clears 7:1 with margin. A resolved `fill` over a
  frozen role word brings its own paired foreground, so the surface stays
  legible after the swap. Note the ratio is a function of the project's chosen
  neutral family; the token *positions* are what this component fixes.
- Landmark containment: a card is a surface, not a landmark -- the page around
  it supplies the region. The conformance suites render inside a `<main>` so
  the axe best-practice `region` rule is satisfied by the page, not the card.
