# Component Spec — Alert Dialog

Status: DRAFT. Modal-overlay port (wave 4). Imitates `dialog`.

Alert dialog is `dialog` with three fixed divergences: it is ALWAYS modal (no
`modal` prop), its content carries `role="alertdialog"`, and it has NO
outside-pointerdown dismiss. It interrupts with a consequence-gated decision;
focus defaults to Cancel, the non-destructive choice, and the layer closes only
through Cancel, the action, or Escape. The modal overlay pair (focus-trap +
scroll-lock) is composed DIRECTLY -- a `startAlertDialogModalEffects({ content,
getCancel })` function in `alert-dialog.behavior.ts` starts `createFocusTrap` +
`preventBodyScroll` on open and tears them down on close, called by both
`bindAlertDialog` (WC/Astro) and a React `useEffect`. There is no effect list
and, unlike dialog, no `onPointerDownOutside`/`onInteractOutside` surface.

Files (`src/components/alert-dialog/`):

```
alert-dialog.classes.ts    alert-dialog.behavior.ts    alert-dialog.tsx
alert-dialog.element.ts     alert-dialog.astro
```

Tests mirror into `test/components/alert-dialog/` across React, WC, and Astro.

## Composition

```
disclosable (lib)        state {open}, actions open/close, trigger/content parts
alert-dialog-surface     parts only: overlay, title, description, cancel, action
alert-dialog glue        role=alertdialog, forced aria-modal, labelledby, Escape keymap
```

`disclosable` is the shared open/closed axis (dialog, popover, sheet fold it
too). Controlled/uncontrolled per boundary 4: `config.open` is the consumer's
controlled value, `state.open` is intrinsic, projections and gates read
`isOpen(state, config)`. The idempotence gate (open only when effectively
closed, close only when effectively open) makes consumer callbacks fire once per
real transition.

## Config, state, actions

```ts
type AlertDialogConfig = DisclosableConfig; // { open?; defaultOpen? } -- no modal
interface AlertDialogState { open: boolean } // intrinsic only
type AlertDialogActions = { open: undefined; close: undefined };
```

No `modal` prop: an alert dialog has no non-modal mode. No `toggle` action: the
trigger dispatches `open` or `close` computed from the effective value, so
intrinsic state can never drift from a controlled consumer.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (only while content is in the DOM), `data-state` |
| content | while open | `role="alertdialog"`, `aria-modal="true"` (always), `aria-labelledby`/`aria-describedby` (only when the part rendered) |
| overlay | while open | `aria-hidden="true"`, `data-state` |
| title | consumer renders | referenced by labelledby via registration |
| description | consumer renders | referenced by describedby via registration |
| cancel | consumer renders | none (plain button); receives initial focus |
| action | consumer renders | none (plain button); carries the destructive styling |

`aria-haspopup="dialog"` because there is no `alertdialog` haspopup token; it is
what the oracle projected. Empty-id convention (ratified 2026-07-08): a binding
passes `''` as the PartId of a part it did not render; projections emit
`undefined` for references to empty ids, so a dangling `aria-describedby` (an
axe violation) never appears.

## Keyboard and effects

- `keymap`: Escape on `content` -> `close`. Focus containment (the trap) makes
  the content-scoped listener sufficient.
- Modal overlay pair (composed directly, always on while open):
  `createFocusTrap(content)` then focus the `cancel` part (initial focus lands
  on the safer choice, overriding the trap's first-focusable default), plus
  `preventBodyScroll`. Torn down on close/unmount; focus restore rides the trap
  teardown (the trap captured the previously-focused element before the Cancel
  override). There is deliberately NO outside-dismiss.

## Oracle dispositions (src/old/ui/alert-dialog.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onOpenChange | contract |
| always modal (trap + scroll lock, no modal prop) | contract |
| `role="alertdialog"` + `aria-modal="true"` | contract |
| NO outside-click dismiss (intentional divergence from Dialog) | contract |
| focus defaults to Cancel | contract (re-expressed: trap focuses first focusable, the pair overrides to `cancel`) |
| Trigger/Portal/Overlay/Content/Header/Footer/Title/Description/Cancel/Action surface | contract |
| Escape closes | contract (moved from a document listener to the content keymap) |
| `onEscapeKeyDown` veto prop | contract (oracle signature: native event, preventDefault to veto) |
| asChild on Trigger/Cancel/Action/Title/Description | framework affordance (React) |
| `forceMount` | contract, with a divergence: force-mounted closed layers carry `hidden` (a closed modal must be inert to AT and must not block the page). The Presence adapter (wave 0-B) replaces this for exit animation |
| explicit AlertDialogPortal / AlertDialogOverlay / `container` prop | contract (shadcn surface is the floor) |
| always-set `aria-describedby` when no description | defect-do-not-port -- dangling reference; replaced by registration + empty-id convention |
| `onOpenAutoFocus` / `onCloseAutoFocus` | dropped -- underscore-prefixed and never wired in the oracle; focus-to-Cancel replaces the auto-focus surface |
| separate `AlertDialogRoot` alias + namespace object | dropped -- flat named exports only; the port ships one performance per framework |

## Deltas from the oracle

1. Decision-button sizing: `h-11` touch floor on both Cancel and the action.
2. Header/footer breakpoints moved from viewport (`sm:`) to container (`@md:`)
   per the CQ system rule; surface uses `bg-card`/`text-card-foreground`
   (card tokens) rather than the oracle's raw `bg-background`.
3. `tabIndex={-1}` on content so Escape works even before focus enters a child.

## Motion

Enter-only, mirroring dialog: the modal surface declares no enter animation
(only `data-[state=closed]:pointer-events-none`, the ratified taste residue).
Exit animation is gated on wave 0-B (Presence) and is not declared here.

Interaction motion on the Cancel/Action buttons (the hover colour transition the
oracle wrote as `transition-colors duration-150`) is LEFT UNDECLARED: the
semantic motion token for it does not exist yet (the motion token layer is being
rebuilt, #1899/#1902) and a raw numeric duration now is drift later. When
`motion-hover` (or its equivalent) lands, the buttons should adopt it.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: role alertdialog, aria-modal, labelledby/describedby wiring
  asserted against real DOM ids by the harness.
- 2.1.1/2.1.2 (no keyboard trap in the WCAG sense): Tab cycles inside while
  open, Escape releases, focus restores to the trigger on close.
- 2.4.3 Focus Order: initial focus moves to Cancel (the safer choice);
  restoration on close is the trap executor's cleanup.
- 2.4.7: token focus ring on both decision buttons.
- 3.2.4: the destructive action carries consistent destructive styling so its
  consequence is legible before the click.
