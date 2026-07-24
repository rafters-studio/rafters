# Component Spec — Sheet

Status: DRAFT. Archetype `modal-overlay`; imitates dialog (the overlay
reference, Spec 05). A sheet is an edge-anchored dialog: it slides in from a
side over a scrim and traps focus.

Files (`src/components/sheet/`):

```
sheet.behavior.ts    sheet.classes.ts    sheet.tsx    sheet.element.ts    sheet.astro
```

Tests mirror into `test/components/sheet/`: behavior (pure), classes (parity),
and conformance across React, WC, and Astro through the shared harness.

## Composition

```
disclosable (lib)      state {open}, actions open/close, trigger/content parts
sheet-surface          parts only: overlay, title, description, close
sheet glue             role=dialog/aria-modal/labelledby/haspopup, Escape keymap
```

The score is dialog's score. Effects-as-data is retired (Spec 03, 2026-07-19):
the modal overlay trio is composed DIRECTLY. `startSheetModalEffects({ content,
getTrigger, onDismiss })` starts `createFocusTrap` + `preventBodyScroll` +
`onPointerDownOutside` on the open+modal transition and tears them down on
close, called by both `bindSheet` (WC/Astro) and a React `useEffect`. Focus
restore rides the trap teardown. No effect list, no second memory cell:
`disclosable` is the one open/closed axis over the single `createBehavior` cell.

## Config, state, actions

```ts
interface SheetConfig {
  open?: boolean;        // controlled
  defaultOpen?: boolean; // uncontrolled seed
  modal?: boolean;       // default true
}
interface SheetState { open: boolean } // intrinsic only
type SheetActions = { open: undefined; close: undefined };
```

Controlled/uncontrolled per boundary 4: `config.open` is the consumer's
controlled value, `state.open` is intrinsic, projections and gates read
`isOpen(state, config)`. The idempotence gate makes `onOpenChange` fire once per
real transition. No `toggle` action: the trigger dispatches `open` or `close`
computed from the effective value, so intrinsic state can never drift from a
controlled consumer.

### side is decoration, not state

`side` (`top | right | bottom | left`, default `right`) selects which edge the
panel anchors to and, once motion tokens exist, the slide axis. It projects no
ARIA, claims no key, and never enters a reducer, so it is NOT score state: it is
a positional class variant. This preserves the shadcn surface, where `side` is a
prop of `SheetContent` — the React performance keeps it there; the Astro
performance takes it as a prop and the WC reads it from the authored class. The
matrix "states: open, side" line names the two axes of variation a sheet has;
only `open` is a transitioning reducer state.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (only while content is in the DOM), `data-state` |
| content | while open | `role="dialog"`, `aria-modal="true"` (modal only), `aria-labelledby`/`aria-describedby` (only when the part rendered), `data-state` |
| overlay | open + modal | `aria-hidden="true"`, `data-state` |
| title | consumer renders | referenced by labelledby via registration |
| description | consumer renders | referenced by describedby via registration |
| close | while open (default on) | `aria-label="Close"` |

Empty-id convention (ratified 2026-07-08): a binding passes `''` as the PartId
of a part it did not render; projections emit `undefined` for references to
empty ids. A dangling `aria-describedby` is an axe violation; absence is honest.

## Keyboard and effects

- `keymap`: Escape on `content` -> `close`. Focus containment makes the
  content-scoped listener sufficient in modal mode; non-modal Escape works while
  focus is inside the sheet.
- Modal overlay trio (open+modal): `focus-trap(content)`, `scroll-lock`,
  `dismiss-on-outside(content, close, except trigger)`. Composed directly by the
  bindings; otherwise nothing.

## Motion

Intent: `enter`/`exit` = slide along the anchored axis (x for left/right, y for
top/bottom). This is DECLARED here but left UNIMPLEMENTED: the semantic
slide-per-side motion tokens do not exist yet — the motion token layer is being
rebuilt (#1899), and a hardcoded `duration-*`/`animate-in` now is drift later
(docs/MOTION.md). The oracle's `animate-in/out slide-*` + `duration-500/300` utilities
are therefore DROPPED, not ported. Enter animation ships once the tokens land;
exit animation additionally waits on the Presence adapter (wave 0-B). Until
then, sheet is enter-only in the visual sense and correct at every state via
`data-state` + `hidden`.

## Oracle dispositions (src/old/ui/sheet.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onOpenChange | contract |
| modal prop (trap, lock, outside-dismiss gated on it) | contract |
| Escape closes | contract (moved from document listener to content keymap) |
| Trigger/Content/Header/Footer/Title/Description/Close surface | contract |
| `side` prop on Content (top/right/bottom/left, default right) | contract, re-expressed as a positional class variant (decoration), not score state |
| asChild on Trigger and Close | framework affordance (React) |
| showCloseButton (default true) | contract, faithful: the sheet oracle used `showCloseButton ?? true` and always rendered the close (including inside an explicit portal), matching shadcn. Kept exactly; dialog's `?? !isInsidePortal` divergence is NOT adopted here |
| always-set `aria-controls`/`aria-describedby` | defect-do-not-port — dangling references when target absent; replaced by registration + empty-id convention |
| trigger pointerdown closes then click re-opens | defect-do-not-port — fixed by sparing the trigger in the outside-dismiss |
| `data-[state=open]` classes on the close button | defect-do-not-port — dead selectors; no data-state was ever set on that element |
| explicit SheetPortal / SheetOverlay / `container` prop | contract (shadcn surface is the floor). Content inside an explicit portal skips its automatic portal + overlay; the close button is still rendered there (sheet keeps `showCloseButton ?? true`, unlike dialog) |
| forceMount | contract, with a divergence: force-mounted closed layers carry `hidden` (a closed modal must be inert to AT and must not block the page). Presence (wave 0-B) replaces this for exit animation |
| onEscapeKeyDown / onPointerDownOutside / onInteractOutside veto props | contract (oracle signatures: native event, preventDefault to veto) |
| `animate-in/out slide-*` + `duration-500/300` on content/overlay | defect-do-not-port — raw numeric durations; motion re-declared as intent, left to the token layer (#1899) |
| sr-only "Close" span + aria-label together | simplified to aria-label only |

## Deltas from the oracle

1. Close button sizing: `h-11 w-11` touch, `@md:h-8 @md:w-8` desktop.
2. Header/footer breakpoints moved from viewport (`sm:`) to container (`@md:`)
   per the CQ system rule; the left/right width cap moved to `@sm:max-w-sm`.
3. `tabIndex={-1}` on content so Escape works when the consumer renders no
   focusable children.
4. Motion utilities dropped (see Motion).

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: role dialog, aria-modal, labelledby/describedby wiring asserted
  against real DOM ids by the harness.
- 2.1.1/2.1.2 (no keyboard trap in the WCAG sense): Tab cycles inside while
  open, Escape releases, focus restores to the trigger on close.
- 2.4.3 Focus Order: initial focus moves into the sheet (first focusable);
  restoration on close is the trap teardown.
- 2.4.7: token focus ring on the close button.
