# @rafters/ui

One component, defined once, presented by every framework.

A component's styling and behavior are written a single time, framework-agnostic. Each framework — React, Web Components, Vue, whatever comes next — gets a thin binding that presents that shared definition in its own syntax and nothing more. The behavior file is the source of truth. The framework file is wiring.

This is not a React library with adapters bolted on. It is a framework-neutral definition with framework-shaped edges, and the edges are as small as they can possibly be.

## Why this shape

Every design system that ships to more than one framework faces the same fork: reuse the styling and reimplement the behavior per framework (Carbon, Spectrum, Shoelace), or don't ship to more than one framework. Reimplemented behavior drifts — two keyboard handlers, two ARIA state machines, two audit surfaces that agree until they don't.

Rafters refuses the fork. The behavior — state, actions, the ARIA contract, the keyboard map — is one pure, typed definition. The accessibility contract is therefore one artifact you can test once and certify once, and every framework binding is proven to honor it. That single property is what makes the behavior portable **and** what makes WCAG 2.1 AA / Section 508 conformance provable. They are the same property: a declared contract is inspectable; an imperative one is not.

## The four files

A component is exactly these files. No more shapes, no exceptions.

```
button.classes.ts     # presentation      — framework-agnostic
button.behavior.ts    # behavior          — framework-agnostic
button.tsx            # React binding     — framework syntax only
button.element.ts     # Web Component     — framework syntax only
button.vue            # Vue binding       — framework syntax only
```

`.classes.ts` and `.behavior.ts` are written once. There is one framework file per framework, and it does nothing but present the other two.

## behavior.ts — the source of truth

The behavior owns **state**, **actions**, the **ARIA projection**, the **keyboard map**, and the component's declared **parts**. It imports primitives and nothing framework-shaped. It is built by folding primitives through the one composer.

The pieces that are naturally pure stay pure typed functions — not a runtime, not a paradigm:

```ts
aria:   (state) => AriaAttrs        // the auditable contract
classes // lives in classes.ts (below), same idea: a projection of state
keymap: (event, state) => Action | null
```

State lives here (a memory cell). Actions mutate it. Effects that a component genuinely needs — focus, timers, announcements — are handled at the framework boundary or by small primitives; they are never smuggled into a data-command runtime. Idiomatic TypeScript, not an effect monad.

## The composer — a pure typed fold

Primitives are a pile. There is exactly **one** composer, and it is a pure function. A component declares its mix; the composer folds it. Nothing owns collaborators.

```ts
const select = compose(selection, disclosure, typeahead, selectGlue)
// compose(...slices): Merge<slices>  — the intersection type IS the documentation
```

Rules that keep this the good version and not mixin roulette:

- **It is a fold, never a class.** `compose` has no lifecycle and no registry. The moment it grows either, it is a god-object framework and it is wrong. It is Rust traits, not Ruby `method_missing`: the Rust soul (explicit, typed, no hidden control flow), never the Ruby body (dynamic dispatch that the type system can't see and a newcomer can't debug).
- **Merged state is a TypeScript intersection.** The fold is checked by the compiler. Slices are typed interfaces; a collision is a type error, not a runtime surprise.
- **Collisions resolve explicitly.** When two slices touch the same key (both `selection` and `disclosure` bind `Enter`), the resolution is an explicit rule plus a final **glue slice** — the last entry in the fold, which sees the merged state and breaks the ties. Cross-component behavior ("`Enter` commits when open, toggles when closed") lives in that glue slice, a pure function over the whole, not in a coordinator object.

## classes.ts — a projection of state

`classes` is a pure function `(state) => ClassSet`. It imports the behavior's state **type** and nothing else. It does not own state and does not know a framework. The dependency runs one way: `classes` depends on `behavior`'s state shape; `behavior` never imports `classes`.

## Parts — the structural contract

Behavior declares its named **parts** and their roles (`trigger`, `panel`, `item[]`). ARIA and the keyboard map bind to **parts**, not to elements. Framework files **fulfill** parts — they render "the trigger" in their own syntax — but they may not invent structure or move where a role lives.

This is the seam that would otherwise let the accessibility contract drift per framework. It does not drift, because the structure is declared once and the framework files only satisfy it.

## Framework files — wiring, and nothing else

A framework file is the only thing permitted to be framework-shaped, and it is permitted to be nothing else. It:

- renders the declared parts in framework syntax,
- holds/subscribes the behavior's state (`useMemory` in React, a `<script>` subscribe in Astro, the same import in a Web Component),
- runs state through `classes` for `className`,
- spreads the behavior's `aria`,
- maps framework events to behavior actions.

Anything that looks like a decision — a conditional class, a keyboard branch, a derived ARIA attribute — is a bug in the framework file. It belongs in `classes` or `behavior`.

## The dependency rule

```
primitives  <-  behavior  <-  { classes, framework files }
```

Behavior is the hub. `classes` depends on behavior's types; framework files depend on both; behavior depends only on primitives. Nothing depends back into a framework file or into `classes`. If an arrow points the other way, it is wrong.

## Testing

Two seams, two kinds of test.

- **`behavior.test.ts` — unit, once.** The behavior is pure and framework-free, so the contract is proven a single time: `aria(state)` produces the right attributes for every state, `keymap` maps every key to the right action, the reducer folds correctly. No DOM, exhaustive, fast. The accessibility contract is verified as pure functions before anything renders.
- **Per-framework conformance — one harness, N render adapters.** Do not hand-write accessibility tests per framework; that rebuilds the drift this architecture exists to kill. Write **one** conformance harness, driven by the behavior's declared parts / `aria` / `keymap`, and run it against each framework through a small render adapter (~10 lines: "render this component to a DOM node"). The harness runs three tiers against that DOM:
  1. **axe** — static violations (labels, roles, contrast).
  2. **contract-fulfillment** — every declared part present; the DOM's ARIA matches `behavior.aria(state)` across states.
  3. **interaction** — dispatch the keymap's keys; assert the state and DOM moved.

Adding a framework means writing its render adapter and inheriting the entire conformance suite for every component, automatically. The result is a claim you can make truthfully and in CI: **every framework target is independently axe-verified and contract-conformant against one declared accessibility spec.**

**Tests live in `test/`, mirroring `src/`.** Tests are not co-located with source; the `test/` tree mirrors the `src/` tree path-for-path, so a component at `src/components/button/` has its tests at `test/components/button/`:

```
src/components/button/button.behavior.ts    ->  test/components/button/button.behavior.test.ts    (unit, once)
src/components/button/button.classes.ts     ->  test/components/button/button.classes.test.ts     (unit, once)
src/components/button/button.tsx            ->  test/components/button/button.conformance.test.tsx (React adapter + harness)
src/components/button/button.vue            ->  test/components/button/button.conformance.test.vue (Vue adapter + harness)
```

Both framework-agnostic files are unit-tested once: `behavior` for the contract, `classes` for the projection (state X produces class set Y). The shared conformance harness is one module the per-framework tests import; each per-framework test is just its render adapter plus a harness call.

## Migration

We are rewriting, not refactoring — one consistent grain beats reconciling ten dialects. The old components live in `src/old/`, and their tests move to `test/old/` — the mirror holds even in quarantine. This is a quarantine, not a deletion. `index.ts` keeps re-exporting from `src/old/` so every consumer stays green and `main` never reds. Each component's export flips from `src/old/` to its new four-file implementation one at a time, diffed against the old one as the oracle so no keyboard case or ARIA state is dropped. `src/old/` (and `test/old/`) is deleted only when the new set has fully replaced and out-proven it.

The primitives you already have — `memory`, `disclosure`, `selection-group`, `aria-manager` — are **not** old. They are the pile the composer folds. They stay.

## Styling rules (unchanged, and they still bind)

- Tailwind CSS v4 and the Rafters token system are required.
- No arbitrary/bracket values (`w-[10px]`, `bg-[#fff]`, `p-[var(--x)]`). Use token keys — `p-4`, `text-primary`, `bg-surface`. If you need a value, add it to the token registry.
- `classy` does not resolve Tailwind conflicts. `p-4 p-8` keeps both, so overrides are explicit in the DOM. If you fight utility conflicts often, fix the design system, do not paper over it with merge logic.

## Repo rules

No emoji. No `any` — narrow from `unknown`. `pnpm` only. `async`/`await`, never `.then()` chains. `pnpm preflight` before every commit.
