# Component Spec — Alert

Status: DRAFT. Static score (imitates Container). No state, no actions, no
keymap, no effects, no motion block.

Files (`src/components/alert/`):

```
alert.classes.ts       alert.behavior.ts       alert.tsx
alert.astro            alert.element.ts
alert-title.astro       alert-description.astro alert-action.astro
```

Tests mirror into `test/components/alert/`. All three performances -- React,
Astro, Web Component -- are written and conformance-green.

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
| WC (`<rafters-alert>`, `variant` attribute only, title/description/action out of scope) | contract -- ported (#1806). The `variant` attribute and its silent fall-back to `default` on an unknown value carry over verbatim; the oracle's "subcomponents out of scope" limit does NOT, because the new tree gives every multi-region static named slot regions (card, empty) |
| Astro target | contract -- ported (#1805), extended under #2323 with the drop-in part files (`alert-title.astro`, `alert-description.astro`, `alert-action.astro`), matching card's model (`card.md`): each sub-component is an importable file, the parity surface. `alert.astro`'s named slots remain a convenience, rendered only when `Astro.slots.has` finds content |
| Oracle's `classy(base, variant, className)` composition in the Astro/WC targets | framework-affordance -- replaced by the shared `alertClasses` projection, so all three performances read one function |
| Oracle's hardcoded `role="alert"` attribute in the Astro/WC targets | framework-affordance -- replaced by painting `alert.aria({}, config, { root: '' })`, so the contract is stated once, in the score |

## Deltas from the oracle

1. Foreground token repointed per variant (`*-subtle-foreground` instead of
   `*-foreground`) -- see disposition table above.
2. `AlertTitle` renders a raw `h5` because the new tree's Typography
   component (H1-H6) does not exist yet (matrix: `typography`, pending);
   repointing at a typography role component is a follow-up, not an agent
   call to make now.
3. The React sub-components carry `data-slot="alert-title"` /
   `"alert-description"` / `"alert-action"` markers, matching card and empty.
   They are not parts -- they are the shared name the Astro and Web Component
   performances give the same region, so the three surfaces are assertable
   against one another.

## Performance notes

Alert composes two ways, matching card's model (`card.md`): the drop-in part
files (`AlertTitle`, `AlertDescription`, `AlertAction`, shipped for Astro
under #2323) are the parity surface, and three named-slot regions (title,
description, action) plus a default slot survive as a convenience.
`alert.astro` renders a named-slot region only when `Astro.slots.has` finds
content, exactly as `card.astro` does, so composing the part files inside
`<Alert>` never collides with an unfilled convenience wrapper. Two
consequences a reader should know about:

1. **The named-slot convenience renders its title region as a `div`, not the
   `h5` `AlertTitle` renders.** That is not an axe workaround forced by a
   bind-free static -- the `Astro.slots.has` guard means an unfilled region is
   simply absent, never an empty heading, so nothing here required the `div`.
   The convenience is a plain wrapper, not the parity surface: a consumer who
   wants the real heading composes `<AlertTitle>` instead, exactly as card's
   named-slot wrappers stay `div` regardless of the tag their matching part
   file renders. WC records a different disposition, for a different reason:
   its named slots are fixed (no runtime to check `Astro.slots.has` against),
   so `<rafters-alert>`'s title region stays a `div` unconditionally.
2. **The `[&>svg]` icon positioning does not reach a slotted SVG in the Web
   Component.** In the shadow DOM the root's child is the `<slot>` element, not
   the assigned SVG, so the absolute-positioning selectors never match. React
   and Astro position the icon; `<rafters-alert>` does not. Fixing it would
   mean a fourth region and a new class export in `alert.classes.ts`, and the
   disposition table above holds the icon as consumer-supplied layout rather
   than an authored part -- so it is dropped, exactly as empty dropped its
   oracle descendant CSS. Astro also loses the
   `[&>svg+div]:-translate-y-0.5` optical nudge, because the default slot
   trails the regions and so no div follows the SVG; the absolute positioning
   and the `[&:has(svg)]:pl-11` gutter, which are what actually place the icon,
   both hold.

## shadcn drop-in parity

shadcn's Alert exports `Alert`, `AlertTitle`, `AlertDescription`. The React
performance (`alert.tsx`) and, as of #2323, the Astro performance
(`alert.astro` plus `alert-title.astro`, `alert-description.astro`,
`alert-action.astro`) both match that surface (plus the oracle's
`AlertAction`), with the same `variant` prop shape shadcn/this workspace's
oracle already used. A consumer migrating a shadcn `<Alert
variant="destructive">` tree needs no prop or import-path changes beyond the
registry path, for either of those two performances. The Web Component
(`<rafters-alert>`) does not carry importable sub-components -- its fixed
named-slot regions are the honest cost of having no runtime (see the
disposition table above), so it is not a drop-in on this surface.

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
