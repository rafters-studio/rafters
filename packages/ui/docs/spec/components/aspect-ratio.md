# Component Spec — AspectRatio

Status: DRAFT. A static score, the archetype at its thinnest: no state, no
actions, no keymap, no effects, and an empty aria projection. The one
non-structural datum is `ratio`, and it is config painted through the single
inline style channel, never a class.

Files (`src/components/aspect-ratio/`):

```
aspect-ratio.classes.ts   aspect-ratio.behavior.ts   aspect-ratio.tsx
aspect-ratio.element.ts    aspect-ratio.astro
```

## Purpose

A ratio-locked box. It constrains its content to a fixed width/height ratio so
an image, video, or embed reserves its space before it loads — no layout shift.
The box owns proportion and nothing else.

## Composition

- One wrapper part (`root`) plus a default slot. There is no sub-family: a
  consumer places any single element inside and it fills the box.
- The box is a layout utility, not a landmark or a region. Place it inside a
  landmark the surrounding page supplies.

## Config, state, actions

| Channel | Value |
| --- | --- |
| `ratio` (config) | width ÷ height. Defaults to `1` (square). React takes a `number`; the Web Component takes a string attribute (`"16/9"`, `"1.778"`, `"1"`). |
| state | none — a static score has nothing to remember. |
| actions | none. |

`parseRatio` (the score) normalises any input to a positive number: it divides a
fraction string, reads a decimal or integer, and falls back to `1` for missing,
empty, non-numeric, or non-positive input. `resolveRatio(config)` applies that
parse to `config.ratio`. Both are pure and shared by all three performances.

## Parts + ARIA

| Part | role | ARIA |
| --- | --- | --- |
| `root` | none | none — the box projects an empty contract; the slotted content (`<img>`, `<iframe>`, `<video>`) carries its own name and role. |

The conformance harness asserts the empty projection identically across React,
the Web Component, and Astro.

## Keyboard + effects

None. The box claims no keys and runs no effects, so there is no
`bindAspectRatio`: the React performance uses no `useBehavior`/`useMemory`, the
Astro performance ships no `<script>`, and the Web Component performs no binding.

## The one style channel

`ratio` is a data-driven value, and an arbitrary `aspect-ratio` cannot be a
literal utility class, so it rides the inline `style` — the same narrow channel
Container uses for its `container-name`. React serialises `aspectRatio` unitless
(`aspect-ratio: 1.777`, no `px`); Astro writes the same string; the Web
Component sets it on the inner wrapper via `style.setProperty('aspect-ratio', …)`.

## Fill across the shadow boundary

React and Astro fill the box with `aspectRatioChildFillClasses`
(`[&>*]:absolute [&>*]:inset-0 [&>*]:h-full [&>*]:w-full`) — Tailwind child
selectors on the wrapper. Those selectors cannot cross the shadow boundary, so
the Web Component encodes the same fill natively as a `::slotted(*)` rule in
`static styles`. All three leave `object-fit` to the consumer.

## Oracle dispositions (src/old/ui/aspect-ratio.{tsx,element.ts,classes.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `ratio` prop / attribute (number, decimal string, fraction string, fallback to 1) | contract |
| `parseRatio` fraction/decimal/fallback parsing | contract — moved verbatim into the score as an earned semantic |
| React child fill via `[&>*]` utilities; WC fill via `::slotted(*)` | contract — unified: both fill absolute/inset-0/full, object-fit left to the consumer |
| old WC `::slotted(*) { object-fit: cover }` | dropped — a forced fit mode the box does not own; React and Astro never applied it, and shadcn/Radix leave object-fit to the child (its own example passes `object-cover` on the image). Unified down for drop-in parity. |
| old WC per-instance `CSSStyleSheet` for the ratio | framework-affordance — replaced by the inner wrapper's inline `aspect-ratio` style, matching Container's one-style-channel precedent and dropping the per-instance-sheet machinery |
| old React `style` spread letting a consumer override `aspect-ratio` | contract, tightened — the component ratio is applied last so the box's proportion always wins; consumer style otherwise merges |

## shadcn parity

shadcn's AspectRatio is a thin re-export of Radix with a single `ratio?: number`
prop and div passthrough. The React surface here matches exactly: `ratio` plus
`HTMLAttributes<HTMLDivElement>` spread.

## WCAG obligations

The box carries no semantics of its own, so the obligation is entirely on the
content: an `<img>` needs an `alt`, an `<iframe>` a `title`. The conformance
suites render real content inside a landmark and assert axe cleanliness.

## Open

- The child-fill Tailwind selectors are ported raw, not repointed at any
  role-token utilities — consistent with the other statics (a designer pass, not
  an agent decision).
