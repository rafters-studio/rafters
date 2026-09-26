# Component Spec — Drawer

Status: DRAFT. Wave-4 port. An edge-anchored dialog (archetype `modal-overlay`),
built by imitating `dialog` (Spec 05, the overlay reference).

> A drawer is a dialog positioned against a screen edge instead of centered.
> The behavior is dialog's exactly -- disclosable open/close, a directly-composed
> `focus-trap` + `scroll-lock` + outside-dismiss trio while open+modal, Escape
> closes and restores focus to the trigger. `startDrawerModalEffects({ content,
> getTrigger, onDismiss })` in `drawer.behavior.ts` composes those three
> primitives on the open+modal transition and tears them down on close, called
> by both `bindDrawer` (WC/Astro) and a React `useEffect`. No effect list; the
> retired effects-as-data layer (Spec 03) is not reintroduced.

Files (`src/components/drawer/`):

```
drawer.behavior.ts   drawer.classes.ts   drawer.tsx   drawer.element.ts   drawer.astro
```

Tests mirror into `test/components/drawer/`: behavior (pure), classes, and
conformance across React + WC + Astro through the shared harness.

## Composition

```
disclosable (lib)      state {open}, actions open/close, trigger/content parts
drawer-surface         parts only: overlay, title, description, close
drawer glue            role/aria-modal/labelledby/haspopup, Escape keymap
```

The surface and glue are dialog's, unchanged: a drawer earns no new score. The
only additive is the `side` config, and it is deliberately kept OUT of the score
-- an edge-anchored panel is still `role="dialog"`, so `side` reaches classes
only and the ARIA/keymap projections are edge-independent (asserted in the
behavior test).

`disclosable` is the shared open/closed axis (dialog, popover, sheet fold it).
Controlled/uncontrolled per boundary 4: `config.open` is the consumer's
controlled value, `state.open` is intrinsic, projections and gates read
`isOpen(state, config)`. The idempotence gate makes consumer callbacks fire once
per real transition.

## Config, state, actions

```ts
type DrawerSide = 'top' | 'right' | 'bottom' | 'left';
interface DrawerConfig {
  open?: boolean;        // controlled
  defaultOpen?: boolean; // uncontrolled seed
  modal?: boolean;       // default true
  side?: DrawerSide;     // default 'bottom' (touch); position classes only
}
interface DrawerState { open: boolean } // intrinsic only
type DrawerActions = { open: undefined; close: undefined };
```

No `toggle` action: the trigger dispatches `open` or `close` computed from the
effective value, so intrinsic state can never drift from a controlled consumer.

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (only while content is in the DOM), `data-state` |
| content | always (inert while closed) | `role="dialog"`, `aria-modal="true"` (modal only), `aria-labelledby`/`aria-describedby` (only when the part rendered), `data-state` |
| overlay | modal (inert while closed) | `aria-hidden="true"`, `data-state` |
| title | consumer renders | referenced by labelledby via registration |
| description | consumer renders | referenced by describedby via registration |
| close | inside content (default on) | `aria-label="Close"` |

The grab handle is a decorative div (`aria-hidden="true"`) inside content, not a
score part -- it signals a drag affordance whose gesture is not yet wired (see
dispositions). It renders as a horizontal top-center pill, tuned for the default
bottom edge; on the position-only top/left/right edges it is not re-oriented
(intentional, not an oversight), since the drag gesture it advertises is deferred. In Astro the title renders as a `div[role="heading"][aria-level]`
(not a raw `<h2 class>`) to satisfy the typography-component guard while keeping
heading semantics; React and the WC light-DOM use a real `<h2>`.

Empty-id convention (ratified 2026-07-08): a binding passes `''` as the PartId of
a part it did not render; projections emit `undefined` for references to empty
ids. A dangling `aria-describedby` is an axe violation; absence is honest.

## Keyboard and effects

- `keymap`: Escape on `content` -> `close`. The keymap is content-scoped, but
  the resolution is by CONTAINMENT, not by the event target's own `data-part`:
  the DOM-native `bindDrawer` treats any keydown landing inside the content
  element as `content` (mirroring the React decorator, which hardcodes
  `'content'`). This matters because the focus-trap gives initial focus to the
  first focusable DESCENDANT -- often the close button (`data-part="close"`) in a
  bare drawer -- and a target-scoped resolution would then classify Escape as
  `close` and drop it. Containment keeps Escape working from any focusable child;
  non-modal Escape works the same while focus is inside the drawer.
- Modal trio (open+modal): `createFocusTrap(content)`, `preventBodyScroll()`,
  `onPointerDownOutside(content, close)` sparing the trigger. Otherwise none.

## Motion

Motion follows docs/MOTION.md and the drawer rows in docs/spec/matrix/motion.jsonl.
The overlay and content stay present and `inert` while closed; `data-state`
drives CSS transitions on the generics the rows assign (drawer.classes.ts).

- Content slides from its anchoring edge: closed, it sits one full panel past
  that edge; open, it translates to 0. Enter is `duration-normal ease-spring-smooth`,
  exit `duration-moderate ease-exit`. The rows name the y axis; the left and
  right sides slide on x with the same timing.
- Overlay fades: enter `duration-normal ease-enter`, exit
  `duration-moderate ease-exit`.
- Visibility is on the exit transition only, so a closing panel stays visible
  until its slide ends, and an opening panel is visible at once so the focus
  trap can place initial focus inside it.
- Dragging and settle on release wait on the deferred drag gesture.

## Oracle dispositions (src/old/ui/drawer.tsx, boundary 9)

Disposition vocabulary: `contract | framework-affordance | dropped | defect-do-not-port`.

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onOpenChange | contract |
| modal prop (trap, lock, outside-dismiss gated on it) | contract |
| Escape closes | contract (moved from a document listener to the content keymap) |
| Trigger/Content/Header/Footer/Title/Description/Close surface | contract |
| Portal / Overlay / `container` prop | contract (shadcn surface is the floor; Content inside an explicit portal skips its automatic portal + overlay, close defaults off there) |
| `forceMount` | contract, kept for API compatibility: the parts are always present, closed ones inert, so it has nothing left to force |
| `showCloseButton` (default true) | contract |
| onEscapeKeyDown / onPointerDownOutside / onInteractOutside veto props | contract (oracle signatures: native event, preventDefault to veto) |
| asChild on Trigger and Close | framework affordance (React) |
| `side` prop (top/right/bottom/left, default bottom) | contract, but edge-only: it drives position/rounding/border classes, never the score. bottom is the plain stated case; each edge slides from itself |
| decorative drag handle | contract as decoration (aria-hidden); the drag GESTURE it advertises is deferred -- see below |
| drag-to-dismiss (`draggable`, `dismissThreshold`, touch/mouse pointer math) | dropped (deferred). The named `drag-drop` primitive is LIVE (importers under `hooks/`, `block-wrapper` -- not old/) but the WRONG SHAPE: `createDraggable` injects `role="button"` + `aria-grabbed` + `draggable="true"`, drives HTML5 drag events, a 300ms touch long-press, and a drop-zone registry -- sortable/drop-target semantics that would corrupt the `role="dialog"` ARIA and fail axe. Follow-pointer-threshold dismissal is a different gesture, and its release transform is exit-presence motion (wave 0-B) plus a raw-numeric `translateY(px)` the token rules prohibit. The issue marks it "optional"; dismissal stays via overlay tap, Escape, and the close button |
| snap points (partial-height detents) | dropped (deferred). The oracle ships NO snap-point behavior to extract; snap points need the same deferred drag gesture plus exit-presence machinery (wave 0-B). Recorded here so the issue's `States: open, snap point` is answered, not silently dropped |
| namespaced `Drawer.Trigger` / `Drawer.Content` aliases | dropped -- `dialog` is the reference and exports named parts only; shadcn drop-in parity is met by the named `Drawer*` exports (`DrawerTrigger`, `DrawerContent`, ...) |
| inline `transform`/`transition` style + `animate-in`/`slide-in-from-*` + `duration-300`/`duration-200` | defect-do-not-port -- raw numeric motion the token/motion rules now prohibit; replaced by transitions on the generics the drawer rows assign (see Motion) |
| `data-[state=open]:bg-secondary` on the close button | defect-do-not-port -- dead selector; no data-state is set on that element |

## Deltas from the oracle

1. Close button sizing: `h-11 w-11` touch floor, `@md:h-8 @md:w-8` desktop (the
   dialog ruling), replacing the oracle's fixed `h-4 w-4` icon-only hit area.
2. Header/footer breakpoints on the container (`@md:`), not the viewport
   (`sm:`), per the CQ system rule.
3. `tabIndex={-1}` on content so Escape works when the consumer renders no
   focusable children.
4. Title token is `text-title-medium` (was `text-lg font-semibold`);
   description is `text-body-small text-muted-foreground`.

## WCAG 2.1 AA obligations

- 1.3.1 / 4.1.2: role dialog, aria-modal, labelledby/describedby wiring asserted
  against real DOM ids by the harness.
- 2.1.1 / 2.1.2 (no keyboard trap in the WCAG sense): Tab cycles inside while
  open, Escape releases, focus restores to the trigger on close.
- 2.4.3 Focus Order: initial focus moves into the drawer; restoration on close
  is the trap teardown's cleanup.
- 2.4.7: token focus ring on the close button.
- 2.5.5 (target size): close button meets the 44px touch floor by default.
