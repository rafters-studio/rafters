# Spec 01 — The Behavior Contract

Status: DRAFT (not ratified). Validated by: button (walking skeleton), then one
effectful multi-part component before freeze.

This document defines the export shape of every `x.behavior.ts`. The
conformance harness, the classes layer, and every framework binding compile
against this contract. A behavior file that satisfies this contract is a valid
component behavior regardless of how it was produced (hand-written or composed
via Spec 02).

## The pattern name (ratified 2026-07-02)

The behavior file is a **score**: it describes and never executes. Framework
files are **performances** of it -- mechanical renditions in each framework's
idiom, with no decisions of their own. `classes.ts` is **decoration**. The
behavior IS the component; everything else is implementation and decoration.

## Vocabulary

- **Config** — static, per-instance choices made by the consumer (variant,
  size, toggle mode). Config does not change in response to user interaction.
- **State** — the dynamic part. Changes only through actions.
- **Parts** — the named structural pieces a framework binding must render.
- **Actions** — the only way state changes. Pure reducers.
- **Effects** — declarative descriptions of DOM-world work (Spec 03). The
  behavior returns descriptions; framework executors perform them.

## The contract types

```ts
/** Normalized keyboard input. Framework bindings translate their native
 *  events into this shape; the behavior never sees a framework event. */
export interface KeyInput {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

export type AriaValue = string | boolean | undefined;
/** role, aria-*, data-state and friends. Values of `undefined` mean
 *  "attribute absent" -- bindings must remove, not render, them. */
export type AriaAttrs = Record<string, AriaValue>;

export interface PartDecl {
  /** ARIA role this part must carry, if any. The harness asserts it. */
  role?: string;
  /** Part occurs zero-or-more times (item[]). */
  many?: boolean;
  /** Part is present only in some states (e.g. spinner while loading). */
  optional?: boolean;
}

/** SSR-stable element ids, supplied by the framework binding
 *  (React useId, WC instance counter). Behavior never generates ids. */
export type PartIds<P extends string> = Record<P, string>;

export interface BehaviorSpec<
  Config,
  State,
  Actions extends Record<string, unknown>, // action name -> payload type
  Part extends string,
> {
  name: string;
  parts: Record<Part, PartDecl>;
  initialState: (config: Config) => State;

  /** Pure reducers. No DOM, no timers, no callbacks. */
  actions: {
    [K in keyof Actions]: (state: State, payload: Actions[K]) => State;
  };

  /** Pure gate: may this action fire in this state, under this config?
   *  Frameworks consult it before applying the reducer AND before invoking
   *  consumer callbacks (onClick and friends). Suppression logic (disabled,
   *  loading, soft-disabled) lives here, never in a framework file. Config
   *  is a parameter because suppression reads from config, not state. */
  canDispatch: (state: State, action: keyof Actions, config: Config) => boolean;

  /** The auditable ARIA contract, keyed by part. */
  aria: (
    state: State,
    config: Config,
    ids: PartIds<Part>,
  ) => Partial<Record<Part, AriaAttrs>>;

  /** Keyboard contract, keyed by the part that receives the event.
   *  Returns the action to dispatch, or null (event not claimed). Config is
   *  a parameter because key claims can be config-dependent (amended by the
   *  navigation-menu article: ArrowDown opens only when the roving axis is
   *  horizontal). */
  keymap: (
    event: KeyInput,
    state: State,
    part: Part,
    config: Config,
  ) => keyof Actions | null;

  /** Declarative effect requests for the current state (Spec 03).
   *  Executors diff consecutive results and start/stop accordingly. */
  effects: (state: State, config: Config) => EffectSpec[];
}
```

## The instance

`createBehavior(spec, config)` returns the two things a performance holds --
nothing more:

```ts
{
  memory: Memory<State>; // primitives/memory.ts -- the one cell
  /** Applies the reducer iff canDispatch(state, action, config) allows it.
   *  Returns whether the action was accepted. */
  dispatch<K extends keyof Actions>(action: K, ...payload): boolean;
}
```

There is no instance object and no bound passthroughs: projections (`aria`,
`keymap`, `effects`) are called directly on the spec as pure functions, with
config passed fresh each time. One instance owns exactly one memory cell.
State merged from slices (Spec 02) still lives in this single cell.

## Rules

1. `behavior.ts` imports primitives and sibling behavior types only. Nothing
   framework-shaped, no `classes.ts` import.
2. Reducers, `canDispatch`, `aria`, `keymap`, `effects` are pure. Anything
   impure is an effect and must be expressed as an `EffectSpec`.
3. Ids are inputs. The behavior never generates them.
4. Consumer callbacks (`onClick`, `onOpenChange`) are a framework-binding
   concern, fired only for **accepted** dispatches. This is the ratified
   controlled/uncontrolled pattern: the binding reflects controlled props in
   via a programmatic action, fires the callback on user-initiated accepted
   actions, and contains no other logic.
5. `keymap` declares the semantic contract even when a native element
   fulfills it (a native `<button>` fires click on Enter/Space itself). The
   harness tests the observable behavior, not the mechanism.

## classes.ts against this contract

`x.classes.ts` exports:

```ts
export const xClasses: (
  config: Config,
  state: State,
) => Partial<Record<Part, string>>;
```

- Every class string in the file is a **literal**. The function selects among
  literals; it never constructs them. (Tailwind's scanner must see every
  emitted class verbatim in source -- see the tree-shake finding.)
- Composition uses `classy`, which concatenates and dedupes but never
  resolves utility conflicts.
- Only semantic token classes (`bg-primary`, `ring-destructive-ring`,
  `text-label-small`). No named colors, no arbitrary values, no `var()`.

## Testing obligations (harness interface)

For any behavior satisfying this contract the shared harness can run:

1. **axe** on each binding's rendered DOM, per interesting state.
2. **contract fulfillment** -- every declared part present (respecting
   `optional`/`many`), rendered ARIA equals `aria(state, config, ids)` for
   every state in the component's state table.
3. **interaction** -- for each keymap entry: dispatch the key to the part,
   assert the accepted action and the resulting state/DOM.
4. **effects** -- for each EffectSpec type the component declares, the
   executor-level assertion defined in Spec 03.

Open items for ratification:

- Exact `Merge`/disjointness typing arrives with Spec 02.
- EffectSpec vocabulary arrives with Spec 03; this contract only fixes the
  `effects()` signature.
