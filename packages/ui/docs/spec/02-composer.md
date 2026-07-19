# Spec 02 — Slices and the Composer

Status: FROZEN 2026-07-09. Validated by dialog and navigation-menu.

What component authors need: slices are data. `compose` folds them. State-key
collisions don't compile. Cross-slice coordination goes in the glue slice,
nowhere else. Everything below is reference for maintaining the machinery.

## What a slice is

A slice is **data**, not a live object. It is a fragment of a
`BehaviorSpec` (Spec 01) covering one concern:

```ts
export interface Slice<
  Config,
  State,
  Actions extends Record<string, unknown>,
  Part extends string,
> {
  name: string;
  parts?: Partial<Record<Part, PartDecl>>;
  initialState: (config: Config) => State;
  actions?: { [K in keyof Actions]: (state: State, payload: Actions[K]) => State };
  canDispatch?: (state: State, action: keyof Actions, config: Config) => boolean;
  aria?: (state: State, config: Config, ids: PartIds<Part>) => Partial<Record<Part, AriaAttrs>>;
  keymap?: (event: KeyInput, state: State, part: Part, config: Config) => keyof Actions | null;
  effects?: (state: State, config: Config) => EffectSpec[]; // RETIRED -- see below; removed by teardown #1867
}
```

> **`effects` is retired (Spec 03 retired 2026-07-19).** Slices no longer contribute
> effect lists; behaviors compose primitives directly. The composer stops synthesizing
> `.effects` in the teardown (issue #1867). Do not declare `effects` on a new slice.

Slices do NOT own memory cells. `compose` produces one `BehaviorSpec` whose
`createBehavior` instance owns the single cell of the merged state type.

The existing primitives are not slices and are not rewritten. Stateful
primitives (disclosure, selection-group) get thin slice adapters (~10 lines
re-expressing their state shape and reducers over the shared cell). Effectful
primitives (focus-trap, dismissable-layer, sr-announcer) stay exactly as they
are: they are the **executors** that EffectSpecs (Spec 03) name.

## The composer

```ts
export function compose<...>(...slices: [...Slices, GlueSlice?]): BehaviorSpec<...>
```

A pure fold. No lifecycle, no registry, no runtime dispatch tricks
(constitution: Rust traits, never Ruby method_missing).

### Merge semantics, per field

| Field        | Merge rule |
| ------------ | ---------- |
| initialState | Object spread in fold order; key collisions are a TYPE error (below). |
| actions      | Union of action maps; a duplicate action name is a TYPE error. |
| canDispatch  | Logical AND of all contributors (every slice must allow). |
| aria         | Per-part shallow merge; a duplicate aria attribute on the same part is a RUNTIME (dev-mode) error unless the glue slice overrides it. |
| keymap       | First slice in fold order that claims the event wins; if two non-glue slices claim the same (part, key) pattern, compose throws in dev mode -- the component must resolve the tie in its glue slice. |
| parts        | Union; duplicate part names must carry identical PartDecls or compose throws. |
| effects      | Concatenation. |

### Collision typing

TypeScript intersections do not error on key collisions (`{open: boolean} &
{open: string}` silently yields `never`; same-type collisions merge with no
signal). The constitution's "a collision is a type error" is therefore
implemented with an explicit disjointness check, not a plain intersection.

PROTOTYPE FINDING (button, 2026-07-01): the check must live on the
PARAMETER, not the return type -- an unresolved conditional in an overload's
return type is unrelatable to the implementation signature (TS2394). The
working shape:

```ts
type DisjointFrom<A, B> = [Extract<keyof A, keyof B>] extends [never]
  ? unknown
  : { __stateKeyCollision: Extract<keyof A, keyof B> };

// overload: the second slice must be disjoint from the first
compose(name, first: Slice<C, S1, ...>, second: Slice<C, S2, ...> & DisjointFrom<S2, S1>)
  : BehaviorSpec<C, S1 & S2, ...>
```

A collision surfaces as an impossible parameter type at the `compose` call
site, naming the colliding keys. `compose` is typed via per-arity overloads
(the pipe() pattern); the runtime additionally throws on state-key
collisions at initialState time, so untyped call paths fail loudly too.
Two further findings: state generics are constrained `extends object`, NOT
`extends Record<string, unknown>` (interfaces have no index signature and
would be rejected); and with `exactOptionalPropertyTypes`, slice config
optionals must be declared `?: T | undefined` or bindings cannot construct
configs from destructured props.

### The glue slice

The last slice in the fold. It is the only slice permitted to:

- read the **merged** state type,
- override aria attributes contributed by earlier slices,
- claim keymap entries that earlier slices contest.

Cross-concern behavior ("Enter commits when open, toggles when closed") lives
here as pure functions over the whole, never in a coordinator object.

## What stays out

- No slice may reference another slice by name. Coordination is glue-only.
- No effect execution in `compose` or in any slice. Descriptions only.
- `compose` is total and synchronous; it never touches the DOM, so it runs
  identically under SSR, tests, and every framework.
