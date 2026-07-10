# Component Spec — Dialog

Status: DRAFT. Second test article: the first composed score (slice +
structure slice + glue), the first effectful multi-part component, the
validation target Spec 01 named before freeze.

Files (`src/components/dialog/`):

```
dialog.classes.ts    dialog.behavior.ts    dialog.tsx    dialog.astro
```

Tests mirror into `test/components/dialog/`. WC performance not yet written
(same debt as button).

## Astro performance: closed-state markup only

`dialog.astro` renders the trigger, in the closed state, and nothing else.
It is not a scaled-down dialog -- it is the one state this tier can honestly
render.

The `open` state is not a static fact: it is the `content`/`overlay`/`close`
parts held up by `focus-trap`, `scroll-lock`, and `dismiss-on-outside` (all
effects, Spec 03) plus an Escape `keymap` dispatched through a loop this
tier does not have (no client runtime -- Spec 03). Rendering that structure
anyway -- `role="dialog" aria-modal="true"` with no real trap and no way
out for a keyboard or screen-reader user -- would be the same 4.1.2 lie
grid.md's dropped `role="grid"` was ruled against. Absent is the only
honest choice, so `content`, `overlay`, `title`, `description`, and `close`
are dropped for this tier, not merely un-rendered for some inputs.

Consequently `open`, `defaultOpen`, and `modal` are not exposed as props:
every one of them only affects parts this tier never renders, so a knob
that visibly does nothing is its own dishonesty. `dialog.initialState({})`
and `dialog.aria` still run for real (config `{}`, which is the score's own
closed default) so the closed-state aria projection is score-derived, not
hand-authored -- the same config-in/aria-out shape every other performance
uses, just with a config the consumer cannot perturb at this tier.

The projected trigger aria in the closed state never resolves an id
(`aria-controls` is only projected while open); empty-string `PartIds`
satisfy the signature the same way button.astro's do.

Conformance (`dialog.astro.conformance.test.ts`) ports only the React
suite's "closed" scenario. The open/trap/Escape/dismiss/veto scenarios drop
along with the state, not skip-registered.

## Composition

```
disclosable (lib)      state {open}, actions open/close, trigger/content parts
dialog-surface         parts only: overlay, title, description, close
dialog glue            role/aria-modal/labelledby/haspopup, Escape keymap, modal effects
```

`disclosable` is the reusable open/closed axis (popover, sheet, drawer,
accordion item will fold it). Controlled/uncontrolled per boundary 4:
`config.open` is the consumer's controlled value, `state.open` is intrinsic,
projections and gates read `isOpen(state, config)`. The idempotence gate
(open only when effectively closed, close only when effectively open) makes
consumer callbacks fire once per real transition.

## Config, state, actions

```ts
interface DialogConfig {
  open?: boolean;        // controlled
  defaultOpen?: boolean; // uncontrolled seed
  modal?: boolean;       // default true
}
interface DialogState { open: boolean } // intrinsic only
type DialogActions = { open: undefined; close: undefined };
```

No `toggle` action: the trigger dispatches `open` or `close` computed from
the effective value, so intrinsic state can never drift from a controlled
consumer.

## Parts and ARIA (the auditable table)

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (only while content is in the DOM), `data-state` |
| content | while open | `role="dialog"`, `aria-modal="true"` (modal only), `aria-labelledby`/`aria-describedby` (only when the part rendered), `data-state` |
| overlay | open + modal | `aria-hidden="true"`, `data-state` |
| title | consumer renders | referenced by labelledby via registration |
| description | consumer renders | referenced by describedby via registration |
| close | while open (default on) | `aria-label="Close"` |

Empty-id convention (new, needs ratification): a binding passes `''` as the
PartId of a part it did not render; projections emit `undefined` (attribute
absent) for references to empty ids. A dangling `aria-describedby` is an axe
violation; absence is honest.

## Keyboard and effects

- `keymap`: Escape on `content` -> `close`. Focus containment makes the
  content-scoped listener sufficient in modal mode; non-modal Escape works
  while focus is inside the dialog.
- `effects(state, config)`: open+modal ->
  `focus-trap(content)`, `scroll-lock`,
  `dismiss-on-outside(content, close, except trigger)`. Otherwise `[]`.

## Oracle dispositions (src/old/ui/dialog.tsx, boundary 9)

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onOpenChange | contract |
| modal prop (trap, lock, outside-dismiss gated on it) | contract |
| Escape closes | contract (moved from document listener to content keymap) |
| Trigger/Content/Header/Footer/Title/Description/Close surface | contract |
| asChild on Trigger and Close | framework affordance (React) |
| showCloseButton (default true) | contract; oracle's inside-portal default heuristic dropped |
| always-set `aria-controls`/`aria-describedby` | defect-do-not-port — dangling references when target absent; replaced by registration + empty-id convention |
| trigger pointerdown closes then click re-opens | defect-do-not-port — fixed via `exceptParts: ['trigger']` |
| `data-[state=open]` classes on close button | defect-do-not-port — dead selectors; no data-state was ever set on that element |
| explicit DialogPortal / DialogOverlay / `container` prop | contract (ruled 2026-07-03: shadcn surface is the floor). Content inside an explicit portal skips its automatic portal + overlay; close button defaults off there (oracle rule) |
| `forceMount` | contract, with a divergence: force-mounted closed layers carry `hidden` (a closed modal must be inert to AT and must not block the page). Animation tooling revisits this with the motion ruling |
| onEscapeKeyDown / onPointerDownOutside / onInteractOutside veto props | contract (oracle signatures: native event, preventDefault to veto). Outside-dismiss veto flows executor -> EffectHost.dispatch(action, payload, nativeEvent) -> the binding's vetoEffectDispatch, BEFORE the dispatch |
| non-modal pointer passthrough (container still blocks the page) | open defect in oracle AND new build — needs design ruling |
| sr-only "Close" span + aria-label together | simplified to aria-label only |

## Deltas that need Sean's eye

1. Close button sizing: oracle was a 16px icon with no touch target. New
   build applies the ratified CQ rule mechanically (`h-11 w-11` touch,
   `@md:h-8 @md:w-8` desktop, icon `h-5 -> @md:h-4`) — the specific desktop
   numbers are agent-picked and need a designer ruling.
2. Header/footer breakpoints moved from viewport (`sm:`) to container
   (`@md:`) per the CQ system rule.
3. `tabIndex={-1}` added to content so the score's Escape contract holds
   when a consumer renders no focusable children.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: role dialog, aria-modal, labelledby/describedby wiring
  asserted against real DOM ids by the harness.
- 2.1.1/2.1.2 (no keyboard trap in the WCAG sense): Tab cycles inside while
  open, Escape releases, focus restores to the trigger on close.
- 2.4.3 Focus Order: initial focus moves into the dialog (first focusable);
  restoration on close is the trap executor's cleanup.
- 2.4.7: token focus ring on the close button.
