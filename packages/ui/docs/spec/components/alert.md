# Component Spec — Alert

Status: DRAFT. Static score (imitates Container). No state, no actions, no
keymap, no effects, no motion block.

Files (`src/components/alert/`):

```
alert.classes.ts    alert.behavior.ts    alert.tsx
```

Tests mirror into `test/components/alert/`. WC and Astro not yet written.

## Purpose

Inline status banner with severity variants. Displays feedback content in
flow -- unlike Dialog, it never interrupts; unlike Toast (not yet ported),
it never times out. `role="alert"` is the whole behavioral contract: an
assertive live region that announces its content the moment it mounts, with
no user action required.

## Composition

```
Alert              root, role=alert, severity variant drives classes
AlertTitle         h5, config-independent literal classes
AlertDescription   div, config-independent literal classes
AlertAction        div, optional trailing slot (dismiss/undo control)
```

`AlertTitle`/`AlertDescription`/`AlertAction` carry no behavior of their own
-- they are plain framework wrappers over literal class strings, composed by
the consumer inside `Alert`. Only `Alert` itself has a behavior file, because
it is the only part with a contract to project (`role="alert"`).

## Config, state, actions

```ts
type AlertVariant =
  | 'default' | 'primary' | 'secondary' | 'destructive'
  | 'success' | 'warning' | 'info' | 'muted' | 'accent';

interface AlertConfig { variant?: AlertVariant }
type AlertState = Record<never, never>;
type AlertActions = Record<never, never>;
```

Nine severity variants -- the same vocabulary the button prototype uses --
but Alert is not an action trigger: the variant selects a subtle
background/foreground/border triple, never the solid button treatment.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| root | always | `role="alert"` (unconditional, config-independent) |

There is exactly one behavioral part. Title/description/action are
structural composition, not ARIA-bearing parts of the score -- the same
split Container draws between "what the score projects" and "what the
consumer composes inside."

## Keyboard and effects

None. A static score with a single unconditional ARIA projection has
nothing to dispatch, gate, or execute.

## Oracle dispositions (src/old/ui/alert.{tsx,astro,element.ts}, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| `variant` (9-way severity enum) | contract |
| `role="alert"` on the root | contract |
| Alert/AlertTitle/AlertDescription/AlertAction surface | contract (shadcn's public surface is Alert/AlertTitle/AlertDescription; `AlertAction` is an oracle addition, carried forward as it predates this port and composes cleanly) |
| `bg-*-subtle` paired with the SOLID `text-*-foreground` | defect-do-not-port -- the solid foreground is contrast-tuned against the solid fill, not the subtle one. Repointed to each variant's own `*-subtle-foreground` token |
| `muted` variant (flat `bg-muted`/`text-muted-foreground`/`border-border`) | contract -- `muted` has no subtle tier in the registry, so it keeps its existing flat pairing rather than inventing one |
| icon slot via `[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4`, description shift via `[&>svg+div]:-translate-y-0.5` | contract -- decorative icon positioning is a selector against a child SVG the consumer supplies, not an authored glyph (boundary 1: no invented icon, only layout for one the consumer brings) |
| WC (`<rafters-alert>`, `variant` attribute only, title/description/action out of scope) | not ported this wave -- behaviorLayer WC target is `missing`, tracked in the matrix |
| Astro target | not ported this wave -- behaviorLayer Astro target is `missing`, tracked in the matrix |

## Deltas from the oracle

1. Foreground token repointed per variant (`*-subtle-foreground` instead of
   `*-foreground`) -- see disposition table above.
2. `AlertTitle` renders a raw `h5` because the new tree's Typography
   component (H1-H6) does not exist yet (matrix: `typography`, pending);
   repointing at a typography role component is a follow-up, not an agent
   call to make now.

## shadcn drop-in parity

shadcn's Alert exports `Alert`, `AlertTitle`, `AlertDescription`. This port
matches that surface (plus the oracle's `AlertAction`), with the same
`variant` prop shape shadcn/this workspace's oracle already used. A consumer
migrating a shadcn `<Alert variant="destructive">` tree needs no prop or
import-path changes beyond the registry path.

## WCAG 2.1 AA obligations

- 4.1.3 Status Messages: `role="alert"` is an ARIA live region with
  implicit `aria-live="assertive"` -- announces on mount without requiring
  focus to move. Reserved for feedback that needs immediate notice; alerts
  that can wait for the user to notice them should not use this role.
- 1.4.1 Use of Color: severity is never color-only by contract -- the
  variant must be reinforced by an icon or by the text itself carrying the
  meaning (`@trust-building` note on the component).
- 1.4.3 Contrast: each variant's subtle background is paired with its own
  subtle-foreground token, tuned for that pairing (see the defect fix
  above) rather than borrowed from the solid variant.
