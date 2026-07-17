# Component Spec — Progress

Status: DRAFT. Wave-1 static port (#1786). A static score with a LIVE ARIA
projection -- the counterpart to Container/Card (empty projection) and Grid
(projection + conditional effect). Progress projects, but runs no effect.

Files (`src/components/progress/`):

```
progress.classes.ts   progress.behavior.ts   progress.tsx
progress.element.ts    progress.astro
```

Tests mirror into `test/components/progress/`: behavior (pure), classes
parity, and conformance across React + WC + Astro.

## Composition

```
static score           no state, no actions, no keymap, no effects
progress glue          resolveProgress (the one computation) + the progressbar
                       ARIA projection (role, valuemin/max/now/text, busy)
bindProgress(root)     the DOM-native client the WC + Astro decorators share
```

`value` is CONFIG, not state: it is the consumer's datum, immutable from the
score's view. The React decorator re-renders on prop change; the WC re-derives
on attribute change; both flow through the same `resolveProgress`.

`resolveProgress(config)` is the single source: `aria()`, `progressClasses`,
and `bindProgress` all read it. It clamps `value` into `[0, max]`, falls a
non-positive/non-finite `max` back to `100`, treats an absent/non-finite
`value` as indeterminate, and formats the default `${percent}%` label (a
supplied `valueText` overrides it).

## Config, state, actions

```ts
interface ProgressConfig {
  value?: number;       // undefined / non-finite = indeterminate
  max?: number;         // default 100; non-positive falls back to 100
  valueText?: string;   // accessible label; overrides `${percent}%`
  variant?: ProgressVariant; // default | primary | secondary | destructive
                             // | success | warning | info | accent
  size?: ProgressSize;       // sm | default | lg
}
type ProgressState = Record<never, never>;   // static: no state
type ProgressActions = Record<never, never>; // static: no actions
```

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax`, `aria-valuenow` (determinate only), `aria-valuetext` (determinate only), `aria-busy="true"` (indeterminate only). The consumer supplies the accessible name (`aria-label`/`aria-labelledby`) as a native passthrough. |
| indicator | always | `aria-hidden="true"` (decorative fill; the progressbar ancestor owns the value semantics). Inline `width: ${percent}%` when determinate; no width and the indeterminate animation class when not. |

Host === root in the Web Component: the custom element itself is the
progressbar, so the authored `aria-label` sits on the progressbar and the
projection leaves it untouched. React/Astro render a `div[data-part="root"]`
as the progressbar.

Indeterminate is signalled the ARIA-native way: `role="progressbar"` with
`aria-valuenow` ABSENT (plus `aria-busy="true"`). WCAG requires a progressbar
to have an accessible name; a name-less progressbar fails axe
(`aria-progressbar-name`), asserted by a negative conformance case.

## Keyboard and effects

- `keymap`: none. Progress is not a widget -- no keyboard interaction.
- `effects(state, config)`: `[]`. There is nothing ongoing to run.

`bindProgress` therefore does the minimum: subscribe once (first paint), apply
the resolved projection to root + indicator with `aria-manager`
(`{ validate: false }`), and set the indicator's inline fill width. Motion
intent is `value-change` -- the width transition (`transition-all duration-300`)
and the indeterminate slide (`animate-progress-indeterminate`) are class-level,
with `motion-reduce` opt-outs; durations/easing come from tokens.

## Oracle dispositions (src/old/ui/progress.*, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `value` / `max` / determinate + indeterminate | contract |
| `variant` (8 role fills) + `size` (sm/default/lg) | contract (rafters extensions over the shadcn base) |
| `getValueLabel(value, max)` accessible label | contract (React affordance; feeds `config.valueText`, which the WC/Astro `value-text` attribute also feeds) |
| shadcn-compat base `<Progress value max />` | contract (the floor) |
| React/Astro sr-only native `<progress>` + visual div | contract, unified: replaced by the WC oracle's `role="progressbar"` + `aria-value*` on one node -- the equivalent SR semantic without a duplicate element |
| WC oracle `role="progressbar"` on a track div | contract (became the cross-framework projection; host === root in the new WC) |
| WC oracle `data-indeterminate` attribute on the indicator | dropped -- the indeterminate animation is a class (`progressIndeterminateClasses`); no selector keyed off the attribute |
| `aria-busy` on the outer container | contract, moved onto the progressbar root (host === root) |
| passthrough `aria-label`/`aria-labelledby`/`aria-describedby` | contract (native passthrough; not routed through the score) |

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2 (Name, Role, Value): `role="progressbar"` with
  `aria-valuemin`/`aria-valuemax`/`aria-valuenow` and an accessible name,
  asserted against real DOM by the harness across all three frameworks.
  Indeterminate omits `aria-valuenow` (the honest ARIA signal) and sets
  `aria-busy`.
- 1.4.1 (Use of Colour): status is never colour-only -- the fill LENGTH and the
  `aria-valuetext` label carry the value; the variant is reinforcement.
- 2.3.3 / prefers-reduced-motion: the width transition and the indeterminate
  slide both carry `motion-reduce` opt-outs.
- Honesty (intelligence layer, not a WCAG line): never fake the fill and never
  park at 99% -- an indeterminate meter is the honest choice for an unknown
  duration.
