# Authoring guide: building a component on the behavior layer

The contract lives in specs 00-04. This is the **how** -- the pattern proven
across the seven control-group components, the reference the sweep follows.
Read a reference implementation alongside this: `navigation-menu` (compound)
and `dialog` (overlay) are the richest; `container`/`card` are the simplest.

## The one rule: model, view, controllers

Per component, three kinds of file and nothing else:

- **`x.behavior.ts` = the model.** The pure score -- reducers, aria/keymap
  projections, effects-as-data -- AND `bindX(root)`, the DOM-native client.
  The score never *performs*; it describes. It is a total function from state
  to attributes, so it survives contact with any framework.
- **`x.classes.ts` = the view.** Class strings. No logic.
- **`x.tsx` / `x.element.ts` / `x.astro` = the controllers.** As thin as the
  framework allows. React reads the projections declaratively; the WC and Astro
  performances import the *same* `bindX`. One binding, three performances, zero
  drift -- because there is only one behavior file.

There is no `useBehavior`, no `behavior-element`, no per-component adapter, no
shared "binder". The substrate the score composes is in `lib/` and
`primitives/`; **check the primitives matrix (`docs/spec/matrix/primitives.jsonl`)
before writing any primitive** -- `aria-manager`, `focus-trap`, `roving-focus`,
`memory` etc. already exist.

## The substrate you compose (never rewrite)

- `lib/contract.ts` -- `createBehavior(spec, config)` -> `{ memory, dispatch }`.
- `lib/effects.ts` -- `createEffectRunner()`; effects are a closed data union
  run by the existing primitives (focus-trap, roving, hover, dismiss).
- `primitives/aria-manager.ts` -- `updateAriaAttribute(el, name, value, { validate: false })`
  applies a resolved projection to an element.
- `hooks/use-memory.ts` -- `useMemory` (the one surviving React hook,
  `useSyncExternalStore`); `hooks/use-behavior-effects.ts` runs the runner in a
  React effect.
- `primitives/rafters-element.ts` -- the shadow-DOM WC base (for pure statics).

## `bindX` -- the DOM-native controller (WC + Astro share it)

Lives in the behavior file. Shape (see `bindNavigationMenu`, `bindDialog`):

1. Read config from the root's `data-*`/attributes.
2. `getPart` -- `root.querySelector('[data-part="x"]')` (or `getElementById`
   when a part portals out, as dialog's content does).
3. `createBehavior` + `createEffectRunner`; an `EffectHost` of `{ getPart, dispatch }`.
4. Read part ids from the server markup -- never generate them.
5. `render()` = apply the aria projection with `aria-manager` (`validate: false`),
   toggle `hidden` on presence parts, `runner.apply(spec.effects(...))`.
6. `memory.subscribe(render)` (fires immediately: first paint).
7. Wire events (`click` -> dispatch; `keydown` -> `spec.keymap` -> dispatch),
   return a teardown.

## Per-archetype shape

| archetype | reference | shape |
|---|---|---|
| pure static | `container`, `card` | no `bindX`, no `useBehavior`/`useMemory`; controllers are markup + classes + slots only. WC = `RaftersElement` shadow + `<slot>`. |
| simple-interactive | `button` | `bindButton`; native `<button>` fulfils Enter/Space, so wire `click` only. One-shot `announce` effect is edge-triggered. |
| static + effect | `grid` | static except a conditional effect (grid-roving when `role=grid`). |
| text-input | `input` | primary state is a **value**; `setValue` gated by disabled/readonly; native input owns caret/IME/selection -- do not re-implement. |
| overlay + presence | `dialog` | presence (content mounts/unmounts in React, `hidden`-toggles in the bind) + the ongoing effects runner (focus-trap, scroll-lock, dismiss). Effect-observed parts stay light DOM. |
| compound | `navigation-menu` | many-part instances (trigger/content per value), roving + hover-intent + dismiss effects. |

## The three gotchas (encode all three)

1. **Controlled callback**: compare the *effective* value before against the
   *intrinsic* state after -- a controlled component's effective value never
   moves, but the consumer callback must still report the value to set.
2. **`aria-manager` coerces**: apply a resolved projection with `{ validate: false }`,
   or the string `'false'` is read as truthy and flips to `'true'`.
3. **WC bind deferred**: `connectedCallback` can fire before light-DOM children
   parse -- bind on the next microtask.

## Honest costs (do not pretend these away)

- **React compound controllers carry real hook weight.** A static (button,
  badge) is a couple lines; a compound controlled component is ~40-50 lines of
  genuine wiring (instance, ids, the dispatch protocol, effect host). That is
  retained-mode's floor, not fat.
- **Portaled overlays need presence tracking** -- but only for the *unguarded*
  cross-ref sources (`aria-labelledby`/`describedby`, which lack the `open`
  guard `aria-controls` has). Everything else keeps a stable id.
- **Two WC shapes.** Behavior-carrying components are **light-DOM enhancers**
  (the bind reads real document DOM for effects). Pure statics are **shadow +
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
*outside* `BehaviorSpec.aria` as bespoke functions the controllers call by
name, because `aria` returns one `AriaAttrs` per part *name* and cannot express
N instances. First-class them (`instanceAria(part, value, state, config, ids)`)
so the many-part loop goes generic -- before tabs/accordion/menubar/select.
