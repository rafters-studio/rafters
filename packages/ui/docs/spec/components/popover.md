# Component Spec — Popover

Status: DRAFT. Wave-1 non-modal overlay. Anchored floating panel; light-dismiss.
Shares the disclosable axis with dialog; diverges by being non-modal (no trap,
no scroll lock) and anchored (positioned against a trigger or explicit anchor).

Files (`src/components/popover/`):

```
popover.classes.ts   popover.behavior.ts   popover.tsx   popover.element.ts   popover.astro
```

Tests mirror into `test/components/popover/`: behavior (pure), classes parity,
and conformance across React + WC + Astro.

## Composition

```
disclosable (lib)      state {open}, actions open/close, trigger/content parts
popover-surface        parts only: anchor, close
popover glue           aria-haspopup, role=dialog, Escape keymap, non-modal dismiss effect
```

`disclosable` is the reusable open/closed axis (shared with dialog, sheet,
accordion item). Controlled/uncontrolled per boundary 4: `config.open` is the
consumer's controlled value, `state.open` is intrinsic, projections and gates
read `isOpen(state, config)`. The idempotence gate (open only when effectively
closed, close only when effectively open) makes consumer callbacks fire once per
real transition.

## Config, state, actions

```ts
type PopoverConfig = DisclosableConfig; // { open?; defaultOpen? }
interface PopoverState { open: boolean } // intrinsic only
type PopoverActions = { open: undefined; close: undefined };
```

No `toggle` action: the trigger dispatches `open` or `close` computed from the
effective value, so intrinsic state can never drift from a controlled consumer.

`side`/`align`/`sideOffset`/`alignOffset` are **not** score config. Resolved
placement is post-collision ephemeral DOM state (the roving-tabindex precedent),
so the pure score never projects `data-side`/`data-align`. They are
decorator/view options consumed by the positioning affordance and by the
enter-animation slide variants — carried on `PopoverContent` props (React) or as
attributes on the host element (WC/Astro).

## Parts and ARIA

| Part | Presence | ARIA |
| --- | --- | --- |
| trigger | always | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (only while content is in the DOM), `data-state` |
| content | while open | `role="dialog"`, `data-state`; resolved `data-side`/`data-align` set by the positioning affordance (not the score) |
| anchor | optional | none — structure-only positioning reference; defaults to the trigger when absent |
| close | optional | none — the consumer supplies its accessible name (visible text) |

The trigger identity (`aria-expanded`/`aria-controls`/`data-state`) comes from
`disclosable`; the glue adds only `aria-haspopup="dialog"` on the trigger and
`role="dialog"` on the content. `aria-controls` is open-guarded in disclosable
(empty-id convention, ratified 2026-07-08), so no dangling reference leaks on the
first paint of an initially-open panel.

## Keyboard and effects

- `keymap`: Escape on `content` -> `close`.
- `effects(state, config)`: open ->
  `dismiss-on-outside(content, close, except [trigger, anchor])`. Otherwise `[]`.
  Non-modal: **no** `focus-trap`, **no** `scroll-lock`. Both the trigger and the
  anchor are spared so a toggle gesture does not dismiss-then-reopen, and a
  distinct anchor does not self-dismiss.

## Framework-affordances (shared helpers, not decisions)

Two concerns fall outside the closed effect vocabulary and outside the pure
score; both are edge-triggered on the closed->open transition and driven by
helpers in `popover.behavior.ts` that every decorator calls (one impl, N call
sites — no drift):

- `positionPopover(anchor, content, options)` — composes the `collision-detector`
  primitive (`computePosition`) and applies the result with fixed positioning,
  writing the resolved `data-side`/`data-align` onto the content. Repositions on
  scroll/resize while open. This replaces the old `Float` substrate's positioning
  engine; the React decorator does **not** re-wrap `Float` (a second engine).
- `focusFirst(content)` — moves focus to the first focusable descendant on open.
  Non-modal, so this is initial focus only — **not** a trap.

## Oracle dispositions (src/old/ui/popover.tsx, boundary 9)

The old tree ships React only (`popover.tsx` + `popover.classes.ts`), built on
the `Float` primitive.

| Oracle feature | Disposition |
| --- | --- |
| controlled/uncontrolled + onOpenChange | contract |
| Trigger/Anchor/Portal/Content/Close surface + `PopoverRoot` alias + namespaced attach | contract (shadcn floor) |
| `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, `data-state` on trigger; `role="dialog"` on content | contract (aria-controls moved to the open-guarded empty-id convention) |
| Escape closes | contract (moved from Float's document listener to the content keymap) |
| pointer-down-outside / interact-outside dismissal | contract (moved to the `dismiss-on-outside` effect, sparing trigger + anchor) |
| focus first focusable inside content on open | framework-affordance (`focusFirst`) |
| side/align/sideOffset/alignOffset positioning + collision | framework-affordance (`positionPopover` over `collision-detector`) |
| auto-portal vs explicit `Popover.Portal` (double-wrap guard) | contract (React `PopoverPortalContext`); WC/Astro render content in light DOM present-but-hidden |
| `container` prop for the portal target | framework-affordance (React) |
| asChild on Trigger/Anchor/Close | framework-affordance (React) |
| onEscapeKeyDown / onPointerDownOutside / onInteractOutside veto props | contract (oracle signatures: native event, preventDefault to veto). Outside-dismiss veto flows executor -> EffectHost.dispatch(action, payload, nativeEvent) -> the binding's veto surface, BEFORE the dispatch |
| `forceMount` | contract, with the dialog divergence: force-mounted closed content carries `hidden`. The Presence adapter (wave 0-B) defers unmount for the exit animation |
| trigger pointerdown closes then click re-opens | defect-do-not-port — precluded via `exceptParts: ['trigger', 'anchor']` |

## Deltas from the oracle

1. Positioning uses **fixed** placement via `positionPopover` (faithful to the
   old `Float` behavior) rather than re-mounting the `Float` React tree, so the
   WC and Astro performances position through the same DOM-native helper.
2. Close button gains a shared visual affordance (`popover.classes` `close`/
   `closeIcon`) sized to the touch floor (`h-11`, `@md:h-8`) — the old tree had
   no close styling. The close remains optional and unlabeled by the score.
3. `tabIndex={-1}` on content so Escape works when the consumer renders no
   focusable children.

## WCAG 2.1 AA obligations

- 1.3.1/4.1.2: `role="dialog"`, `aria-haspopup`, `aria-expanded`/`aria-controls`
  wiring asserted against real DOM ids by the harness. A `role="dialog"` element
  **requires an accessible name** — the consumer supplies `aria-label` (or an
  `aria-labelledby` target) on `PopoverContent`, exactly as dialog requires a
  title. Conformance renders assert axe-clean with that name present.
- 2.4.3 Focus Order: initial focus moves into the panel (first focusable) on
  open. Popover is non-modal, so — unlike dialog — Tab is **not** trapped and
  focus is **not** restored to the trigger on close (faithful to the oracle; a
  known delta from the dialog pattern). Escape dismisses while focus is inside.
- 2.4.7: token focus ring on the optional close control.
```
