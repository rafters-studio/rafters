# Component Spec — Skeleton

Status: DRAFT. A static score, same tier as Container and Grid: no state,
no actions, no keymap, no effects. The narrowest possible contract in this
tier — one part, one always-on ARIA fact.

Files (`src/components/skeleton/`):

```
skeleton.classes.ts    skeleton.behavior.ts    skeleton.astro
```

Astro-only in this port. No React performance yet (same debt as button's
WC performance).

## Purpose

Loading shimmer. Occupies the layout a piece of content will fill once it
arrives, so the page does not jump when data lands. Pure decoration — it
never carries content and never accepts a slot.

## The structure contract

- One part (`root`), one element, no children. A skeleton stands in FOR
  content; it does not wrap it — the oracle across all three old-tree
  targets (astro/react/wc) agrees on this, and none of them ever rendered
  a `<slot />`.
- `variant` selects a surface from the semantic color vocabulary. Every
  variant is a **subtle** surface (`bg-<name>-subtle`, or `bg-muted` for
  `default`/`muted`) — a skeleton is meant to recede, not compete for
  attention the way a solid-fill button or badge does.
- No paired `*-foreground` class is ever emitted for any variant. The part
  renders no text, so there is nothing for a foreground token to color;
  emitting one would be a class the DOM never uses.
- `aria-hidden="true"` is unconditional — not state-derived, not
  config-derived, always present. `skeleton.behavior.ts` projects it the
  same config-in/aria-out shape every other score uses, it just never
  varies, because a skeleton has no state to vary it with.
- Motion is CSS-only and always on: `animate-pulse`, with
  `motion-reduce:animate-none` for the reduced-motion opt-out. This is not
  a Spec 04 `MotionDecl` (no state transition to animate — Spec 04's
  statics "declare nothing"); it is a continuous ambient loop expressed as
  a literal decoration class, the same way `button.classes.ts` bakes in
  `transition-colors` without a motion block.

## Parts and ARIA (the auditable table)

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `aria-hidden="true"` (unconditional) |

## Oracle dispositions (src/old/ui/skeleton.{astro,tsx,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `variant` enum (default/primary/secondary/destructive/success/warning/info/muted/accent) | contract |
| `bg-*-subtle` surface per variant | contract |
| `animate-pulse motion-reduce:animate-none` | contract |
| `rounded-md` base shape | contract |
| Astro docblock claims "aria-hidden decorative" but the render never sets the attribute | defect-do-not-port — a skeleton a screen reader announces is the exact failure the new projection closes; fixed by making `aria-hidden` part of the behavior's ARIA contract, asserted by the harness, not left to a comment |
| WC's `aria-hidden` on the rendered div | contract — the WC oracle got this right; the new score generalizes it across every framework target instead of leaving it to be repeated (or missed) per binding |
| React oracle's JSDoc `@cognitive-load`/`@attention-economics`/etc. tags | not carried into this tier — Container and Grid's Astro/React performances on this branch do not carry them either; the matrix line (`is`/`does`/`states`) is the machine-readable surface those tags fed |

## WCAG obligations

- 4.1.2 / 1.3.1: `aria-hidden="true"` keeps the placeholder out of the
  accessibility tree entirely — it is furniture, not a status region, so
  it makes no announcement claim to violate. (A skeleton that wants to
  announce "loading" is a different component — a status/live-region
  pattern — not this one.)
- 2.3.3 / motion: `prefers-reduced-motion` stops the pulse via
  `motion-reduce:animate-none`; the placeholder's shape and surface still
  communicate the loading affordance without the animation.

## Open

- WC and React performances (same debt as button/container/grid/dialog on
  this branch — Astro ships first).
- Static-score conformance is thinner than interactive articles: element
  contract + classes assertions + axe, matching container.md's and
  grid.md's note. No interaction tier exists to run.
