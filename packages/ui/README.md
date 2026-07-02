# @rafters/ui

One component, defined once, presented by every framework.

## Rules

1. The behavior file IS the component. Not a helper it imports -- the identity, the contract, the thing that gets audited.
2. Framework files are implementations. They receive the behavior and put it on screen. No decisions, no identity of their own.
3. Every component uses container queries by default. Sizes respond to the container, not the viewport.
4. Classes are literal semantic-token strings. No arbitrary/bracket values.
5. Config is props. State is intrinsic. Props (disabled, loading, variant, size) pass fresh into every projection -- never mirrored into memory.
6. No useEffect for syncing props. If you need useEffect to make the behavior layer work with a framework, the behavior layer's API is wrong.
7. Primitives are the behavior building blocks. The composer folds them. Framework files are pure wiring.
8. No emoji. No `any`. `pnpm` only. `async`/`await` only. `pnpm preflight` before every commit.

## The component shape

A component is a behavior file and one implementation per framework target.

```
button.behavior.ts    # THE component — state, actions, aria, keymap, classes, effects
button.tsx            # React implementation
button.element.ts     # Web Component implementation
button.astro          # Astro implementation
```

The behavior file carries everything: types, config, state shape, action reducers, ARIA projection, keyboard map, class projection, effect descriptions. It is framework-agnostic, pure, and testable without a DOM.

Framework files render the declared parts, subscribe to memory, apply the behavior's projections, and map DOM events to actions. Any decision in a framework file is a bug.

## Config vs state

Config comes from props -- variant, size, disabled, loading, softDisabled, toggle. It is rebuilt every render and passed fresh to every projection function.

State is intrinsic -- only things that change from user interaction (pressed in toggle mode). State lives in a memory cell. Memory is the primitive; the framework does not own state.

`canDispatch` receives both state and config because suppression logic (disabled, loading) reads from config, not state.

## The composer

Primitives are a pile. The composer is a pure typed fold from slices to one behavior spec. `compose` returns everything except `classes` -- classes are component-level, added by the behavior file after composition.

```ts
const composed = compose('button', pressable<ButtonConfig>());
export const button: BehaviorSpec<...> = { ...composed, classes: (config, state) => ({ ... }) };
```

Collision rules: state key collision throws, duplicate action throws, two slices claiming the same key throws (resolve in the glue slice). Loud in dev, loud in prod, deterministic in tests.

## Dependency rule

```
primitives  <-  behavior  <-  framework files
```

Behavior depends on primitives. Framework files depend on behavior. Nothing depends back. Memory is a primitive.

## Testing

- `behavior.test.ts` -- unit, once. Pure functions, no DOM, exhaustive.
- Per-framework conformance -- one harness, N render adapters. The harness runs axe + contract-fulfillment + interaction against the behavior's declared parts/aria/keymap.

Tests live in `test/`, mirroring `src/`.

## Migration

Rewriting, not refactoring. Old components in `src/old/`, old tests in `test/old/`. Exports kept green via `index.ts` re-exports. Old components are oracles -- reference implementations to diff against, not code to preserve.

## Styling

- Tailwind CSS v4 and the Rafters token system.
- No arbitrary/bracket values. Use token keys.
- `classy` does not resolve Tailwind conflicts.
