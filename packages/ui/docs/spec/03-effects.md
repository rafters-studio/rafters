# Spec 03 — Effects

Status: DRAFT. Vocabulary v2, grown by the dialog test article (2026-07-02).

Behaviors describe impure work; executors perform it. A behavior returns
`EffectSpec[]` from `effects(state, config)` — pure data, computed from the
current state and config. The runner reconciles consecutive lists and the
executor maps each spec onto a primitive. A component that needs an effect
the vocabulary cannot express is a change request against THIS spec — stop
the line, never hack it locally (boundary 7).

## Temporal kinds

- **One-shot** (edge-triggered): fired once when the effect appears in the
  list. Effects present in the very first apply are baseline and are NOT
  fired — a component that mounts already-loading does not announce
  "Loading" to a screen reader that can already see it.
- **Ongoing** (level-triggered): started whenever present — including the
  first apply (a dialog that mounts open IS trapped) — and stopped when the
  effect leaves the list or the runner stops. Executors return the cleanup.

## Vocabulary v2

| Spec | Kind | Executor primitive |
| --- | --- | --- |
| `announce { message, politeness }` | one-shot | sr-announcer |
| `focus-trap { part }` | ongoing | focus-trap/createFocusTrap; stop restores focus |
| `scroll-lock` | ongoing | focus-trap/preventBodyScroll |
| `dismiss-on-outside { part, action, exceptParts? }` | ongoing | outside-click/onPointerDownOutside |

`dismiss-on-outside` dispatches `action` through the host on pointerdown
outside `part`. Events landing inside any `exceptParts` are ignored: a
layer's own trigger must not dismiss the layer and re-activate it on the
same gesture (live defect in the dialog oracle).

## The host

Executors reach the DOM only through an `EffectHost` supplied by the
framework binding:

```ts
interface EffectHost {
  getPart(part: string): HTMLElement | null; // resolve declared part -> element
  dispatch(action: string): void; // the binding's accepted-dispatch + callback protocol
}
```

The behavior stays element-free; the binding owns part registration (refs in
React, shadow-DOM queries in WC). Effects started in an earlier apply keep
their start-time host; `apply(effects, host)` takes the current host so new
effects capture fresh state.

## The runner

`createEffectRunner()` returns `{ apply(effects, host), stop() }` — a pure
diff over `effectKey` identity. Framework adapters own the lifecycle:

- React: `hooks/use-behavior-effects.ts` applies after every commit and
  stops on unmount.
- WC: apply after each patch, stop on disconnect. (Not yet written.)
- Astro: no client runtime, no effects; static tiers only.
