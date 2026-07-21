# Authoring guide: building a component on the behavior layer

The contract lives in specs 00-04. This is the **how** -- the pattern proven
across the seven control-group components, the reference the sweep follows.
Read a reference implementation alongside this: `navigation-menu` (compound)
and `dialog` (overlay) are the richest; `container`/`card` are the simplest.

## The one rule: a behavior, and its decorators

Per component, three kinds of file and nothing else:

- **`x.behavior.ts` = the model.** The pure score -- reducers, aria/keymap
  projections -- AND `bindX(root)`, the DOM-native client, plus (when the
  component does impure work) a small composition function. The score's
  projections never *perform*; they describe -- a total function from state to
  attributes, so they survive contact with any framework. Impure work (focus
  trap, dismiss, roving, announce) is COMPOSED from primitives in a function in
  this file that each framework boundary calls -- see `bindX` below.
- **`x.classes.ts` = the view.** Class strings. No logic.
- **`x.tsx` / `x.element.ts` / `x.astro` = decorators over the behavior.**
  Each is a thin wrapper that adds exactly two things around the invariant
  behavior core, and nothing else: the **view** (`x.classes.ts`) and the
  framework **wiring** (the runtime adapter). React reads the projections
  declaratively via `useMemory`; the WC decorates with the custom-element
  lifecycle, Astro with SSR markup -- both call the *same* `bindX`. One
  behavior, three decorators, zero drift, because there is only one behavior
  file.

  Decorator in *spirit*, not GoF-strict -- read the word as the shape, not the
  taxonomy. The framework file **adapts one runtime to the one behavior** and
  paints on the classes; it does NOT re-implement the behavior's interface, and
  decorators never stack (you never wrap a framework file in another). If you
  find yourself putting a decision -- a reducer, an aria rule, a keymap -- in
  the framework file, it belongs in the behavior; the decorator only wires and
  views.

  Reconciled with the frozen contract: Spec 01 ratified these three roles as
  **score** (the behavior), **performances** (the framework files), and
  **decoration** (`classes.ts`). "Decorator" is not a rename -- it is the
  *shape* a performance takes: a performance decorates the score with its
  decoration (the classes) plus the framework wiring. The role names are frozen
  in Spec 01; the pattern name is this guide's teaching lens on top of them.

There is no `useBehavior`, no `behavior-element`, no per-component adapter, no
shared "binder". The substrate the score composes is in `lib/` and
`primitives/`; **check the primitives matrix (`docs/spec/matrix/primitives.jsonl`)
before writing any primitive** -- `aria-manager`, `focus-trap`, `roving-focus`,
`memory` etc. already exist.

**Never put a wrapper between a behavior and a primitive.** No effect vocabulary,
no `EffectSpec` union, no runner, no executor slot, no registry. A behavior that
needs a capability COMPOSES the primitive directly; a behavior that needs a
capability no primitive has EXTENDS or ADDS a primitive -- never a local
half-solution. A shared executor slot is a honeypot: it is exactly what once let
`grid-roving` and `hover-intent` reimplement `roving-focus`/`hover-delay` instead
of composing them. (The retired effects-as-data layer -- Spec 03 -- was removed
for precisely this reason.)

**Canonical dismissal path (the port wave).** An overlay composes its dismissal
DIRECTLY: `outside-click` for pointerdown-outside, and Escape via the score's
keymap (as `dialog` does) or the `escape-keydown` primitive -- the shape `dialog`
proves in `startDialogModalEffects` (dismiss on pointerdown outside `content`,
sparing the trigger). The overlay ports -- alert-dialog, drawer, sheet, hover-card,
dropdown-menu, command, context-menu, combobox -- reach for those primitives, NOT
for `dismissable-layer`'s module-global `layerStack`. The standalone stack stays
for existing consumers, but a port never reaches for it: one dismissal path, not a
three-way "which mechanism?" fork.

## The substrate you compose (never rewrite)

- `lib/contract.ts` -- `createBehavior(spec, config)` -> `{ memory, dispatch }`.
- `primitives/*` -- the behavior primitives you compose directly: `sr-announcer`,
  `focus-trap`, `roving-focus`, `outside-click`/`dismissable-layer`, `hover-delay`,
  `typeahead`, `disclosure`, `selection-group`, `collision-detector`, ... Check the
  primitives matrix; every impure capability is one of these.
- `primitives/aria-manager.ts` -- `updateAriaAttribute(el, name, value, { validate: false })`
  applies a resolved projection to an element.
- `hooks/use-memory.ts` -- `useMemory` (the one surviving React hook,
  `useSyncExternalStore`). React runs a behavior's composed primitives in a plain
  `useEffect` that calls the same composition function `bindX` does.
- `primitives/rafters-element.ts` -- the shadow-DOM WC base (for pure statics).

## `bindX` -- the DOM-native client (WC + Astro share it)

Lives in the behavior file. Shape (see `bindDialog`, `bindRadioGroup`). Two
composition shapes: a **direct call** when it is one primitive (`radio-group`:
`createRovingFocus` inline in both `bindRadioGroup` and the React `useEffect`),
and a **colocated composition function** when more than one (`dialog`'s
`startDialogModalEffects({ content, getTrigger, onDismiss })`, called by both the
bind and the React `useEffect`):

1. Read config from the root's `data-*`/attributes.
2. `getPart` -- `root.querySelector('[data-part="x"]')` (or `getElementById`
   when a part portals out, as dialog's content does).
3. `createBehavior` -> `{ memory, dispatch }`.
4. Read part ids from the server markup -- never generate them.
5. `render()` = apply the aria projection with `aria-manager` (`validate: false`)
   and toggle `hidden` on presence parts. For impure work, call the behavior's
   composition function on the relevant state transition and hold its cleanup:
   ongoing primitives (focus-trap, dismiss, roving) start when their condition
   becomes true (including a component that mounts already-open) and tear down on
   the reverse transition/unbind; one-shot ones (announce) fire only on the edge,
   never on baseline mount.
6. `memory.subscribe(render)` (fires immediately: first paint).
7. Wire events (`click` -> dispatch; `keydown` -> `spec.keymap` -> dispatch),
   return a teardown.

## Per-archetype shape

| archetype | reference | shape |
|---|---|---|
| pure static | `container`, `card` | no `bindX`, no `useBehavior`/`useMemory`; the decorators are markup + classes + slots only. WC = `RaftersElement` shadow + `<slot>`. |
| simple-interactive | `button` | `bindButton`; native `<button>` fulfils Enter/Space, so wire `click` only. Composes `sr-announcer` on the loading edge (one-shot). |
| static + composed | `grid` | static except it composes `roving-focus` (2D, `{ columns }`) when `role=grid`. |
| text-input | `input` | primary state is a **value**; `setValue` gated by disabled/readonly; native input owns caret/IME/selection -- do not re-implement. |
| overlay + presence | `dialog` | presence (content mounts/unmounts in React, `hidden`-toggles in the bind) + a composition function that starts `focus-trap` + `scroll-lock` (`preventBodyScroll`) + `outside-click` on open and tears them down on close. Composed parts stay light DOM. |
| compound | `navigation-menu` | many-part instances (trigger/content per value); composes `roving-focus` + `hover-delay` + `outside-click`. |

## Motion: semantic tokens only, never raw numerics

A component's `classes.ts` reaches for a **semantic motion token** and nothing
else. The token layer (`packages/design-tokens`, #1902/#1903/#1904) generates
thirteen `motion-*` @utility classes -- `motion-hover`, `motion-focus`,
`motion-press`, `motion-toggle`, `motion-dropdown-in`/`-out`,
`motion-modal-in`/`-out`, `motion-sheet-in`/`-out`, `motion-expand`,
`motion-collapse`, `motion-page` -- each of which encodes the complete
transition: which properties animate, the perceptually-derived duration tier,
the named easing curve, and the `prefers-reduced-motion` degradation. The
duration is `f(size, distance)` already applied; the semantic name carries the
use case so you inherit the principle (modal is `normal`, dropdown is
`moderate`, exits are shorter than entrances) without re-deriving it.

**Raw numeric durations and hand-picked easings are prohibited.** Never write
`duration-300`, `duration-[350ms]`, `ease-[cubic-bezier(...)]`, or a
`transition-duration`/`transition-timing-function` literal in a component. Those
are the exact guesses this layer exists to prevent -- a class whose timing no one
can enforce or audit. If no `motion-*` token fits, that is a token-layer gap:
raise it, do not paper over it with a numeric.

The token encodes timing + property set; the **from/to values are the
component's concern**. Consumption has a shape per category:

- **Interaction** (`motion-hover`/`focus`/`press`/`toggle`): the class defines
  the timing; a variant triggers the change. `class="motion-press active:scale-95
  active:bg-primary-active"` -- the transition rides the `active:` swap.
- **Enter/exit** (`motion-*-in`/`-out`): the token carries only
  property/duration/easing. The component declares the closed rest state and the
  open active state and toggles via `data-state`, AND keeps the exiting node
  mounted (presence management, Spec 04) so the out transition can play:
  `class="motion-modal-in opacity-0 scale-95 data-[state=open]:opacity-100
  data-[state=open]:scale-100"`. Slapping `motion-modal-in` on a conditionally
  *rendered* element animates nothing and errors nowhere -- the silent no-op.
- **Expand/collapse** (`motion-expand`/`collapse`): the animated property is
  `grid-template-rows` (`0fr`<->`1fr`), never `height` (`height:auto` is not
  transitionable). Wrap in a grid container with the motion class; the child
  needs `min-h-0 overflow-hidden` or the `0fr` row still shows its content.

## The three gotchas (encode all three)

1. **Controlled callback**: compare the *effective* value before against the
   *intrinsic* state after -- a controlled component's effective value never
   moves, but the consumer callback must still report the value to set.
2. **`aria-manager` coerces**: apply a resolved projection with `{ validate: false }`,
   or the string `'false'` is read as truthy and flips to `'true'`.
3. **WC bind deferred**: `connectedCallback` can fire before light-DOM children
   parse -- bind on the next microtask.

## Composing motion (combination constraints)

When a component animates, the duration and easing come from motion tokens --
but *which parameters you combine* is governed by cross-parameter rules that no
single token can hold. They are not prose to remember; they are queryable data
plus a validator in `@rafters/design-tokens`
(`generators/motion-constraints.ts`), so an agent composing motion is told the
rule before it writes the wrong thing. The full rationale is `docs/MOTION.md`;
the authoring shape is:

- **`MOTION_COMBINATION_CONSTRAINTS`** and **`MOTION_GOVERNING_RULE`** -- the
  five constraints and the governing rule as structured metadata (read them
  when you need the *why*).
- **`validateMotionComposition(composition)`** -- describe the animation by the
  parameters it engages (`translate` axes, `scale`, `opacity`, `rotate`,
  `elementSize`, `timing`, `answers`) and get back the violations. Empty means
  legal; `isLegalMotionComposition` is the boolean form.

Enforcement is **mechanical** for the three prohibitions and advisory for the
rest, and the split is recorded in the data:

- **Rejected** (mechanical): diagonal movement (both axes at once); rotation
  combined with any other parameter, or on a large element; simultaneous timing
  across co-occurring elements; a composition that declares no answered
  question.
- **Blessed** (permission, never rejected): scale combined with movement,
  opacity combined with movement -- `fade + slide` is the standard enter/exit.
- **Advisory**: the governing rule checks that you *declared* which question the
  motion answers (what happened / where am I / what next); whether that answer
  is genuinely true is your judgment, not the validator's.

## Honest costs (do not pretend these away)

- **React compound decorators carry real hook weight.** A static (button,
  badge) is a couple lines; a compound controlled component is ~40-50 lines of
  genuine wiring (instance, ids, the dispatch protocol, the composed primitives
  in a `useEffect`). That is retained-mode's floor, not fat.
- **Portaled overlays need presence tracking** -- but only for the *unguarded*
  cross-ref sources (`aria-labelledby`/`describedby`, which lack the `open`
  guard `aria-controls` has). Everything else keeps a stable id.
- **Two WC shapes.** Behavior-carrying components are **light-DOM enhancers**
  (the bind reads real document DOM for the primitives it composes). Pure statics are **shadow +
  slots** (`RaftersElement`) -- simpler, but they render every region, so
  unfilled slots become empty padded space. Accepted cost of a no-bind static.
- `card`/`alert` render raw heading/`<p>` via `createElement` because Typography
  H-tags do not exist yet -- a tracked disposition, not the pattern.

## Testing (three frameworks drive the one score)

- React + WC conformance run under `vitest.config.ts` via the shared harness
  (`test/harness/conformance.ts`).
- Astro conformance runs under `vitest.config.astro.ts`: `AstroContainer`
  renders SSR markup; the container does **not** run the `<script>`, so the test
  calls `bindX(root)` directly (that *is* the script's job) then drives. A
  `DOMException` about a failed script module load is happy-dom refusing to
  auto-run the SSR script -- expected, harmless.
- A component is `verified` in the matrix only when its framework's conformance
  is green. Reconcile the matrix against the files, never against a report.

## Open contract gap (settle before the next compound wave)

Many-part instance projections (`navTriggerAria`/`navContentAria`) live
*outside* `BehaviorSpec.aria` as bespoke functions the decorators call by
name, because `aria` returns one `AriaAttrs` per part *name* and cannot express
N instances. First-class them (`instanceAria(part, value, state, config, ids)`)
so the many-part loop goes generic -- before tabs/accordion/menubar/select.
