# Component Spec — Spinner

Status: DRAFT. Static score (imitates Container and Alert). No state, no
actions, no keymap, no effects. One constant ARIA projection.

Files (`src/components/spinner/`):

```
spinner.classes.ts   spinner.behavior.ts   spinner.tsx   spinner.element.ts   spinner.astro
```

Tests mirror into `test/components/spinner/`: behavior (pure), classes parity,
and React + Web Component + Astro conformance through the shared harness.

## Purpose

A busy indicator. Signals that indeterminate work is in flight -- unlike
Progress, it measures nothing; unlike Skeleton, it does not stand in for
content. The spinning ring is the visible signal; `aria-label="Loading"` is
the accessible one.

## Composition

```
Spinner   root, <output>, aria-label="Loading", size + variant drive classes
```

There is exactly one part. Spinner takes no children and composes nothing --
it is a single self-contained indicator, typically placed inside a button, a
control, or a page-level wait region.

## Config, state, actions

```ts
type SpinnerSize = 'sm' | 'default' | 'lg';

type SpinnerVariant =
  | 'default' | 'primary' | 'secondary' | 'destructive'
  | 'success' | 'warning' | 'info' | 'accent' | 'muted';

interface SpinnerConfig {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}
type SpinnerState = Record<never, never>;
type SpinnerActions = Record<never, never>;
```

`size` selects the ring box and stroke; `variant` colours the ring over the
role vocabulary. Both default to `default` (which is the primary ring).

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `aria-label="Loading"` (unconditional, config-independent) |

The root is an `<output>`, whose implicit `role="status"` (a polite live
region) is NATIVE to the element -- so, exactly as Container leaves landmark
roles to the element choice, the score does NOT project a role and
`parts.root` declares none (the conformance suite asserts no explicit `role`
attribute is rendered). `aria-label`, by contrast, is NOT native, so the score
projects it -- the same native-vs-projected split Alert draws with its
non-native `role="alert"`. Projecting the label (rather than leaving it a
literal in each framework file) gives the conformance harness a real ARIA
contract to audit and keeps the "Loading" string defined in exactly one place.

## Keyboard and effects

None. A static score with a single unconditional ARIA projection has nothing
to dispatch, gate, or execute. There is no `bindSpinner`, no `useMemory`, and
the Astro performance ships no `<script>`.

## Motion

Intent: `feedback-loop`. The ring spins continuously to signal ongoing work.
The score declares intent only -- `animate-spin` (and its duration/easing)
resolves from the token-driven Tailwind utilities. `motion-reduce:animate-none`
honours `prefers-reduced-motion`: the ring stops, the semantics stay.

## Oracle dispositions (src/old/ui/spinner.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `size` (sm/default/lg) | contract |
| `variant` (9-way role enum) | contract |
| `<output>` root with implicit `role="status"` | contract -- native to the element, not projected |
| `aria-label="Loading"` on the root | contract -- projected by the score (non-native accessible name) |
| redundant `sr-only` "Loading" span alongside `aria-label` | dropped -- simplified to `aria-label` only, the same disposition Dialog draws ("sr-only Close span + aria-label together -> aria-label only") and Progress applies; the projected label is the single accessible name |
| `border-3` on the `lg` size (`h-8 w-8 border-3`) | ported VERBATIM -- `border-3` is not a Tailwind v4 default width token (the defaults are border-2/4/8); repointing it at a defined width is a designer/token pass, flagged, not an agent decision |
| separate exported `spinnerBaseClasses`/`spinnerSizeClasses`/`spinnerVariantClasses` maps + `composeSpinnerClasses` | folded into one `spinnerClasses(config, state)` projection, the card/alert classes shape; the maps are now module-internal |

## shadcn drop-in parity

N/A -- shadcn/ui ships no Spinner component (the idiom there is a `Loader2`
icon with `animate-spin`). `size`/`variant` is this workspace's own oracle
surface, carried forward unchanged; there is no shadcn API to match.

## WCAG 2.1 AA obligations

- 4.1.3 Status Messages: `<output>`'s implicit `role="status"` is an ARIA live
  region with implicit `aria-live="polite"` -- assistive tech announces the
  busy state without moving focus. The projected `aria-label="Loading"` gives
  the region an accessible name.
- 2.3.3 Animation from Interactions / prefers-reduced-motion:
  `motion-reduce:animate-none` stops the spin when the user requests reduced
  motion, without removing the status semantics.
- 1.4.1 Use of Color: the busy state is never colour-only -- the accessible
  name ("Loading") and the live-region role carry the meaning independent of
  the ring's variant colour.
