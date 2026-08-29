# Component Spec — Skeleton

Status: DRAFT. Wave-2 port. A pure static (Spec 02 composition, no Spec 03
effects) -- the Container/Card family.

Files (`src/components/skeleton/`):

```
skeleton.classes.ts   skeleton.behavior.ts   skeleton.tsx
skeleton.element.ts    skeleton.astro
```

Tests mirror into `test/components/skeleton/`: behavior (pure, no DOM), classes
parity, and conformance across React + WC + Astro.

## Composition

```
skeleton score      static: no state, no actions, no keymap, no effects; a CONSTANT aria-hidden
skeleton classes    a single constant string: rounded, muted surface that pulses
```

Skeleton is a loading placeholder: it reserves the layout a piece of content
will occupy while that content loads, shown as a shimmer. It is a pure static
-- there is no `bindSkeleton`, no `useBehavior`/`useMemory`, no Astro
`<script>`, and the Web Component performs no binding. It is also a decorative
LEAF: no slot, no children.

Unlike Container, Card, and ScrollArea -- whose aria projections are EMPTY
because the semantic element they choose carries the contract -- Skeleton has no
element that marks it decorative. A bare `div` is exposed to assistive tech, so
Skeleton's one real contract is a CONSTANT `aria-hidden="true"` on its root.
That lives in the score, not in the markup, so the conformance harness enforces
it identically across React, the Web Component, and Astro. This is the one
static whose projection is non-empty.

## Config, state, actions

```ts
type SkeletonConfig = Record<never, never>;  // nothing to configure
type SkeletonState = Record<never, never>;   // nothing to remember
type SkeletonActions = Record<never, never>; // nothing to dispatch
```

Skeleton takes no config props. Consumers size and shape the placeholder
through `className` (`h-4 w-48`, `h-12 w-12 rounded-full`, ...), the shadcn
drop-in surface. Multiple skeletons compose a list or card placeholder.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `aria-hidden="true"` -- decorative; the placeholder is absent from the accessibility tree so a screen reader reads the real content, not the shimmer |

The root carries `data-part="root"` (the declared part, asserted by the harness)
and `data-slot="skeleton"` (the shadcn drop-in marker). It is the only part.

## Keyboard and effects

- `keymap`: none. A decorative placeholder is not interactive and claims no
  keys.
- `effects(state, config)`: `[]`. No focus-trap, no dismiss, no announce; the
  shimmer is CSS-only.

## Motion

Intent: `feedback-loop`. The shimmer is `animate-skeleton-root-waiting`, the
generated consumption of the `skeleton / root / waiting` cell
(`packages/ui/docs/spec/matrix/motion.jsonl`, period `shimmer`); duration comes
from the `period-shimmer` token. Unlike a duration-tier transition, a
period-kind cell carries no `prefers-reduced-motion` media block at all -- the
shimmer runs at the same period regardless of the user's preference (#2155). A
stopped work loop would say the work stopped, which is false while content is
still loading.

## Oracle dispositions (src/old/ui/skeleton.*, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `animate-pulse` shimmer | contract, then migrated onto `animate-skeleton-root-waiting` once #2154 gave the cell a utility to consume (#2155) |
| `motion-reduce:animate-none` reduced-motion opt-out | contract at port time, REMOVED by #2155: period-kind cells are exempt from the reduced-motion zeroing law by design, so the loop never stops |
| `rounded-md` + `bg-muted` default surface | contract (verbatim decoration; `bg-muted` is a semantic token, not a raw colour utility) |
| `variant` prop (default/primary/secondary/destructive/success/warning/info/muted/accent -> `bg-*-subtle`) | dropped (a background channel; the port rule is "fill, not background", and the sanctioned `fill-resolver` primitive is not in this component's `uses`; superseded by `className`/fill, and shadcn's Skeleton has no variant) |
| `aria-hidden="true"` on the placeholder (Web Component only in the oracle) | contract, promoted to the score so React + WC + Astro all project it (closes the oracle's cross-framework drift) |
| `{...props}` / `{...attrs}` spread on the root | framework affordance (React/WC/Astro pass consumer attributes through) |
| `className` sizing surface (`h-4 w-48`, `rounded-full`) | contract (the shadcn drop-in surface; the component owns its base classes, the consumer sizes and shapes) |

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: the root projects a constant `aria-hidden="true"`; the harness
  asserts it against real DOM across React, WC, and Astro, so the decorative
  placeholder is reliably absent from the accessibility tree.
- 1.4.13 Animation from interactions / 2.3.3: the shimmer runs continuously
  and does NOT stop under `prefers-reduced-motion` (#2155) -- a work loop is
  exempt from the reduced-motion zeroing law by design, the same ruling
  `packages/ui/src/primitives/intelligence-integration.ts:106-121` and
  `REDUCED_MOTION_ZEROED` in `packages/design-tokens/src/exporters/tailwind.ts`
  record. This is a deliberate exception to 2.3.3, not an oversight.
- 4.1.2 Name, Role, Value: a placeholder carries no accessible name or role by
  design -- it is decorative and hidden; the real content, once loaded, carries
  the semantics.
