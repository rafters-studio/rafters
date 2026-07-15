# Component Spec — Badge

Status: DRAFT. Wave-2 static score, second after Container/Grid. Imitates
Container: no state, no actions, no keymap, no effects, no motion block.

Files (`src/components/badge/`):

```
badge.classes.ts    badge.behavior.ts    badge.tsx
```

Tests mirror into `test/components/badge/`. WC and Astro not yet written.

## Purpose

Small label chip. Displays a short status/count label inline.

## The structure contract

- Renders one part, `root`, a `<span>` carrying the composed classes and the
  consumer's children as its accessible name. No role is projected: a badge
  is a piece of inline text, not a widget, so the harness asserts presence
  and class selection only -- there is no ARIA contract beyond "the label
  text is the entire payload."
- `variant` selects a token class pair (`bg-<word> text-<word>-foreground`)
  for the semantic fills, or a structural treatment (`outline`, `ghost`,
  `link`) for the shadcn-compatible non-fill variants. Selection only --
  every string is a literal in `badge.classes.ts`; no `fill` prop, no
  `resolveFillName` (that primitive is for Container's free-form signature;
  Badge has a closed variant enum, same pattern as `button.classes.ts`).
- `size` selects the label-text scale (`text-label-small` /
  `text-label-medium`), never a raw font-size utility.

## Config, state, actions

```ts
type BadgeVariant =
  | 'default' | 'primary' | 'secondary' | 'destructive' | 'success'
  | 'warning' | 'info' | 'muted' | 'accent' | 'outline' | 'ghost' | 'link';
type BadgeSize = 'sm' | 'default' | 'lg';

interface BadgeConfig {
  variant?: BadgeVariant;
  size?: BadgeSize;
}
type BadgeState = Record<never, never>;
type BadgeActions = Record<never, never>;
```

No dynamic behavior: a badge does not toggle, open, or dispatch. Config in,
classes out.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | none projected -- the rendered text is the accessible name |

## Keyboard and effects

None. `keymap` returns `null` unconditionally; `effects` returns `[]`
unconditionally; `canDispatch` returns `true` unconditionally (there is
nothing to gate). All three are asserted directly in
`badge.behavior.test.ts` -- the explicit "nothing happens" contract, per
the issue's acceptance criteria, even though Container (the imitation
target) has no behavior test file at all because its projections are
equally empty and nobody wrote one down.

## Oracle dispositions (src/old/ui/badge.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `variant` (12-value vocabulary, all three targets) | contract |
| `size` (`sm \| default \| lg`) | contract |
| Base shape: `inline-flex items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none` | contract |
| `forwardRef<HTMLSpanElement>` | contract -- badges are frequently wrapped by Tooltip/Popover anchors; ref forwarding is load-bearing, not decoration |
| `asChild` | deferred, not framework affordance yet. shadcn's Badge supports `asChild` via Slot; the oracle React/Astro/WC targets never did. Every asChild implementation in this tree so far (`DialogTrigger`, `DialogClose`, `NavigationMenuLink`) is a plain function component using `mergeProps`; none combines `forwardRef` with `asChild`, and Badge needs the ref. Bespoke ref-composition for one leaf component would be new shared machinery grown outside the adapter layer (boundary 00 rule 3) -- out of scope for this port. Revisit once a `composeRefs` primitive exists, or once a second forwardRef+asChild component forces the adapter to grow one. |
| `link` variant present in React/Astro but absent from the oracle's WC (`badge.element.ts`) | not ported forward as a gap -- the React target here carries the full 12-value vocabulary; the WC binding (not yet written) should carry it too when built, closing the drift rather than repeating it |
| WCAG/JSDoc block (`@cognitive-load`, `@attention-economics`, `@trust-building`, `@accessibility`) | contract, carried into `badge.tsx` verbatim as the recorded designer decision (boundary 1: traceable, not agent-invented) |
| `@semantic-meaning` / `@usage-patterns` / `@example` JSDoc tags | dropped from `badge.tsx` -- the issue's four required tags (`@cognitive-load`, `@attention-economics`, `@trust-building`, `@accessibility`) are the registry's parsed surface; the extra tags were prose, not contract, and are recoverable from the oracle file if a future pass wants them |
| `data-icon` slot support (shadcn v4's `Badge` accepts icon children with `data-icon="inline-start\|inline-end"`) | dropped -- absent from the oracle across all three targets; not a migration regression, a feature the oracle never had |

## classes.ts

- Shape per Spec 01: `badgeClasses(config, state) => { root }`.
- Content ported verbatim from `src/old/ui/badge.classes.ts`, typed against
  the closed `BadgeVariant`/`BadgeSize` enums instead of loose
  `Record<string, string>`.
- Every string literal; classy composes the tuple in `badge.tsx`.

## WCAG 2.1 AA obligations

- 1.4.1 Use of Color: variant classes always pair a background/border
  treatment with the label text; color is never the sole signal (the
  oracle's multi-sensory intent -- color + text -- survives as the
  variant/label combination, since Badge carries no icon slot to add a
  third channel).
- 1.4.3 Contrast: token-registry responsibility; each `bg-<word>
  text-<word>-foreground` pair is drawn from the frozen paired-surface-role
  contract, so contrast is a registry guarantee, not a per-component check.
- 4.1.2 Name, Role, Value: no role is asserted because none is projected;
  the rendered text is the accessible name by construction (a `<span>` with
  visible text content needs nothing else).

## Open

- WC + Astro performances (same debt as the other articles).
- `asChild` (see dispositions table above).
- Static-score conformance is thinner than interactive articles: element +
  classes assertions + axe, scoped to the render container rather than
  `document.body` (a bare inline chip with no landmark ancestor trips axe's
  document-level `region` rule; scoping to the RTL container -- the same
  fix `button.element.a11y.tsx` already documents -- keeps the assertion
  about the component, not about the test page).
