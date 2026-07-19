# Component Spec — Hover Card

Status: DRAFT. Archetype `non-modal-overlay`. A rich preview that appears on
hover/focus intent, sharing the disclosure open axis (Spec 02) with a
client-composed hover-intent + positioning substrate that the score deliberately
does not carry. It is the `dialog`-identity sibling of `tooltip`: same
hover-driven mechanics, a `role="dialog"` preview surface instead of a
`role="tooltip"` label.

Files (`src/components/hover-card/`):

```
hover-card.classes.ts   hover-card.behavior.ts   hover-card.tsx   hover-card.element.ts   hover-card.astro
```

Tests mirror into `test/components/hover-card/`: behavior (pure), classes parity,
and conformance across React + WC + Astro through the shared harness.

## Composition

```
disclosable (lib)   state {open}, actions open/close, trigger/content parts
hover-card glue     aria-describedby + role=dialog, Escape dismiss keymap
```

`disclosable` is the reusable open/closed axis. Controlled/uncontrolled per
boundary 4: `config.open` is the consumer's controlled value, `state.open` is
intrinsic, projections and gates read `isOpen(state, config)`. The idempotence
gate (open only when effectively closed, close only when effectively open) makes
consumer callbacks fire once per real transition.

A hover card is a disclosure of *state* but not an ARIA disclosure *widget*: the
trigger describes its preview, it does not expand a controlled region. The glue
therefore suppresses the disclosable trigger projection
(`aria-expanded`/`aria-controls` -> `undefined`) and replaces it with
`aria-describedby`, the card's real link to its content. The content carries
`role="dialog"` (the oracle's identity for the rich-preview surface); the
consumer supplies its accessible name.

Hover-intent timing (the show/hide delays, the global skip-delay coordination
between neighbouring cards) and anchored positioning are DOM concerns the score
cannot express. They are composed directly by the clients from the `hover-delay`
and `collision-detector` primitives — not invented in a decorator. The
`hover-delay` primitive owns the global skip-delay timestamp (a re-hover soon
after a close opens instantly), so the oracle's module-global
`shouldSkipOpenDelay` is not reimplemented here. The placement decision lives
once, in `hoverCardPlacement` / `positionHoverCardContent` in the behavior file;
every client calls it.

## Config, state, actions

```ts
interface HoverCardConfig {
  open?: boolean;                    // controlled
  defaultOpen?: boolean;             // uncontrolled seed
  openDelay?: number;                // hover-open delay, default 700ms
  closeDelay?: number;               // hover-close delay, default 300ms
  disableHoverableContent?: boolean; // default false (content holds the card open)
  side?: 'top' | 'right' | 'bottom' | 'left'; // default 'bottom'
  align?: 'start' | 'center' | 'end';         // default 'center'
  sideOffset?: number;                          // default 4
}
interface HoverCardState { open: boolean } // intrinsic only
type HoverCardActions = { open: undefined; close: undefined };
```

No `toggle` action: hover/focus intent dispatches `open` or `close` computed
from the effective value, so intrinsic state can never drift from a controlled
consumer.

## State axis

| State | Meaning |
| --- | --- |
| open | the card is shown (content present and unhidden, `data-state="open"`) |
| delayed | the transient scheduling phase: intent has been registered but the `hover-delay` open timer has not yet fired. Owned by the `hover-delay` primitive, not the reducer — it never reaches `data-state` |

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `aria-describedby` (only while open, only to a real content id), `data-state`; `aria-expanded`/`aria-controls` suppressed (a card is not a disclosure widget) |
| content | while open (present-but-hidden in WC/Astro; mounted-on-open in React) | `role="dialog"`, `data-state`, `data-side`/`data-align` stamped by the positioner; accessible name supplied by the consumer (`aria-label`/`aria-labelledby`) |

Empty-id convention: when the content id is empty (`''`), the trigger projects
no `aria-describedby`. A dangling reference is an axe violation; absence is
honest. `role="dialog"` requires an accessible name — axe's `dialog-name` rule
flags a nameless dialog — so the consumer names the card (the same contract
popover carries); the conformance suite supplies `aria-label`.

## Keyboard and effects

- `keymap`: Escape on any part -> `close`. The clients also reset the
  `hover-delay` primitive on dismiss so a later re-hover can reopen the card.
- No effect vocabulary. Hover-intent and positioning are composed by the clients
  from the `hover-delay` and `collision-detector` primitives; dismissal is the
  `keymap` Escape contract dispatched directly. Enter-only: the exit animation
  waits on Presence (wave 0-B).

## Oracle dispositions (src/old/ui/hover-card.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onOpenChange | contract |
| openDelay (700) / closeDelay (300) | contract — moved from bespoke `setTimeout` refs into the shared `hover-delay` primitive |
| global skip-delay (`shouldSkipOpenDelay` / `globalOpenTimestamp` / `SKIP_DELAY_THRESHOLD`) | contract — absorbed by the `hover-delay` primitive, which owns the module-global skip timestamp; not reimplemented in the component |
| `resetHoverCardState()` test hook | dropped — replaced by the primitive's `resetHoverDelayState()`, shared by every hover-driven component |
| hover/focus open, leave/blur close; hoverable content holds it open; `isHoveringTrigger`/`isHoveringContent`/`isFocused` bookkeeping | contract — moved into the `hover-delay` primitive |
| `aria-describedby` links trigger to content while open | contract |
| `role="dialog"` on content | contract — carried faithfully; the consumer names it (Radix's HoverCard leaves the content role-less, a deliberate divergence recorded here) |
| collision-detected positioning (side/align/sideOffset/alignOffset, reposition on scroll/resize) | contract — composed from `collision-detector`, shared via `positionHoverCardContent`. `alignOffset` is not surfaced on the score config (matches tooltip; can be added when a consumer needs it) |
| default trigger renders an anchor `<a>`; `asChild` swaps in the consumer's element | contract (anchor default) + framework affordance (`asChild`, React) |
| HoverCardPortal / `container` / `forceMount` | contract (shadcn drop-in base + rafters explicit-portal surface). `HoverCardPortal` mirrors `TooltipPortal`; nested content skips its automatic portal |
| Escape dismiss (`onEscapeKeyDown` via the `escape-keydown` primitive) | contract — but dismissal is the score's `keymap` Escape dispatched directly by each client, not the `escape-keydown` primitive the oracle imported. keymap is the sanctioned direct-dismissal path (dialog + tooltip agree); the primitive import is the divergence |
| always-mounted content when closed | superseded — content mounts on open (React) / hides off the open axis (WC/Astro); enter-only, exit gated on Presence |

## Deltas from the oracle

1. `data-state` on both trigger and content stays `open`/`closed`; the delayed
   phase is the primitive's transient timer, not a projected state.
2. Positioning writes `data-side`/`data-align` onto the content for the
   enter-slide variants (the oracle set them via React state; the shared
   positioner sets them imperatively, identically across clients).
3. The exit (`data-[state=closed]`) fade/zoom-out classes are dropped: this ship
   is enter-only, pending the Presence adapter.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: `role="dialog"` and the `aria-describedby` link asserted against
  real DOM ids by the harness; the dialog's accessible name is the consumer's
  obligation (a nameless dialog is an axe `dialog-name` violation).
- 1.4.13 Content on Hover or Focus: the card is dismissable (Escape), hoverable
  (the pointer can move onto the content without dismissing it, unless
  `disableHoverableContent`), and persistent (it stays until intent ends or
  Escape).
- 2.1.1: focus opens the card; the trigger is a real link and keeps its own
  accessible name.
- 2.4.7: the trigger carries the design system's own focus affordances.
