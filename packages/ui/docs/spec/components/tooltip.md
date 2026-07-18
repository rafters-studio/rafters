# Component Spec — Tooltip

Status: DRAFT. Archetype `non-modal-overlay`. Validates disclosure composition
(Spec 02) with a client-composed hover-intent + positioning substrate that the
effect vocabulary (Spec 03) deliberately does not carry.

Files (`src/components/tooltip/`):

```
tooltip.classes.ts   tooltip.behavior.ts   tooltip.tsx   tooltip.element.ts   tooltip.astro
```

Tests mirror into `test/components/tooltip/`: behavior (pure), classes parity,
and conformance across React + WC + Astro through the shared harness.

## Composition

```
disclosable (lib)   state {open}, actions open/close, trigger/content parts
tooltip glue        aria-describedby + role=tooltip, Escape dismiss keymap, empty effects
```

`disclosable` is the reusable open/closed axis. Controlled/uncontrolled per
boundary 4: `config.open` is the consumer's controlled value, `state.open` is
intrinsic, projections and gates read `isOpen(state, config)`. The idempotence
gate (open only when effectively closed, close only when effectively open)
makes consumer callbacks fire once per real transition.

A tooltip is a disclosure of *state* but not an ARIA disclosure *widget*: it is
described, it does not expand. The glue therefore suppresses the disclosable
trigger projection (`aria-expanded`/`aria-controls` -> `undefined`) and replaces
it with `aria-describedby`, the tooltip's real link to its content.

Hover-intent timing (the show/hide delays, the skip-delay coordination between
neighbouring tips) and anchored positioning are DOM concerns that the closed
effect vocabulary cannot express. They are composed directly by the clients
from the `hover-delay` and `collision-detector` primitives — not invented in a
decorator. The placement decision lives once, in `tooltipPlacement` /
`positionTooltipContent` in the behavior file; every client calls it.

## Config, state, actions

```ts
interface TooltipConfig {
  open?: boolean;                    // controlled
  defaultOpen?: boolean;             // uncontrolled seed
  delayDuration?: number;            // hover-open delay, default 700ms
  skipDelayDuration?: number;        // hover-close delay, default 300ms
  disableHoverableContent?: boolean; // default false (content holds the tip open)
  side?: 'top' | 'right' | 'bottom' | 'left'; // default 'top'
  align?: 'start' | 'center' | 'end';         // default 'center'
  sideOffset?: number;                          // default 4
}
interface TooltipState { open: boolean } // intrinsic only
type TooltipActions = { open: undefined; close: undefined };
```

No `toggle` action: hover/focus intent dispatches `open` or `close` computed
from the effective value, so intrinsic state can never drift from a controlled
consumer.

## State axis

| State | Meaning |
| --- | --- |
| open | the tip is shown (content present and unhidden, `data-state="open"`) |
| delayed | the transient scheduling phase: intent has been registered but the `hover-delay` open timer has not yet fired. Owned by the `hover-delay` primitive, not the reducer — it never reaches `data-state` |

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `aria-describedby` (only while open, only to a real content id), `data-state`; `aria-expanded`/`aria-controls` suppressed (a tip is not a disclosure widget) |
| content | while open (present-but-hidden in WC/Astro; mounted-on-open in React) | `role="tooltip"`, `data-state`, `data-side`/`data-align` stamped by the positioner |

Empty-id convention: when the content id is empty (`''`), the trigger projects
no `aria-describedby`. A dangling reference is an axe violation; absence is
honest. The tip itself is never focusable and never in the tab order.

## Keyboard and effects

- `keymap`: Escape on any part -> `close`. The clients also reset the
  `hover-delay` primitive on dismiss so a later re-hover can reopen the tip.
- `effects(state, config)`: always `[]`. Hover-intent and positioning are
  composed by the clients from primitives, not run as vocabulary effects.

## Oracle dispositions (src/old/ui/tooltip.tsx + tooltip.astro, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onOpenChange | contract |
| TooltipProvider delay defaults (delayDuration/skipDelayDuration/disableHoverableContent) | contract (React affordance; WC/Astro read the same values off attributes) |
| hover/focus open, leave/blur close, hover-open delay + skip-delay coordination | contract — moved from bespoke `setTimeout` refs into the shared `hover-delay` primitive |
| hoverable content holds the tip open; `disableHoverableContent` opts out | contract |
| `aria-describedby` links trigger to content while open | contract |
| `role="tooltip"` on content | contract |
| collision-detected positioning (side/align/sideOffset, reposition on scroll/resize) | contract — composed from `collision-detector`, shared via `positionTooltipContent` |
| portal to `document.body` (React) | contract; WC/Astro keep the tip in light DOM, positioned `fixed`, so the primitive can read it |
| TooltipProvider / Trigger / Portal / Content surface + `Tooltip.*` namespace | contract (shadcn drop-in base + the rafters Radix-full surface). `TooltipPortal` is a thin explicit-portal wrapper mirroring `DialogPortal`; nested content skips its automatic portal |
| asChild on Trigger | framework affordance (React) |
| Escape dismiss | contract — the oracle React lacked it; added to satisfy the WAI-ARIA tooltip pattern the matrix accessibility note already promised |
| CSS-only Astro (`:hover`/`:focus-within` opacity) | superseded — the Astro performance now drives the same `bindTooltip` client as the WC, so behavior cannot drift between frameworks |
| always-set `aria-describedby` even while closed | defect-do-not-port — a closed tip must not describe; projected only while open |

## Deltas from the oracle

1. `data-state` on both trigger and content stays `open`/`closed` (the oracle's
   values), not Radix's `delayed-open`/`instant-open`; the delayed phase is the
   primitive's transient timer, not a projected state.
2. Positioning writes `data-side`/`data-align` onto the content for motion
   hooks (the oracle set them via React state; the shared positioner sets them
   imperatively, identically across clients).

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: `role="tooltip"` and the `aria-describedby` link asserted
  against real DOM ids by the harness; the trigger keeps its own accessible
  name (it is a real control, the tip only supplements it).
- 1.4.13 Content on Hover or Focus: the tip is dismissable (Escape), hoverable
  (the pointer can move onto the content without dismissing it, unless
  `disableHoverableContent`), and persistent (it stays until intent ends or
  Escape).
- 2.1.1: focus opens the tip; the tip is never focusable and never traps.
- 2.4.7: the trigger carries the design system's own focus affordances.

Region caveat: `role="tooltip"` is not a landmark boundary (unlike `role="dialog"`),
so a tip portaled to `document.body` in isolation trips axe's `region`
best-practice rule -- top-level content should sit inside a landmark. On a real
page the tip lands among the page's landmarks; in tests the tip is portaled into
a `<main>` (via `TooltipContent`'s `container`) so the harness stays axe-clean.
The default body portal is fine in a landmarked document.
