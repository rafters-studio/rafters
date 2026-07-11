# Simplify articulation -- feat/separator-astro

legion-simplify cannot run on stacked branches (legion#779: this branch's
parent, `feat/1817-navigation-menu-astro`, is itself unmerged into main).
This is the genuine per-file articulation against the real parent
(`origin/feat/1817-navigation-menu-astro`, merge-base
`9c95a6d6fca47005cb6f1d930597d4dde93f7917` == origin/main), written in its
place. NOT recorded to the quality-gate ledger per the workflow directive.

## Diff scope

```
$ git diff origin/feat/1817-navigation-menu-astro..HEAD --stat
 .../ui/src/components/separator/separator.astro    | 41 ++
 .../src/components/separator/separator.behavior.ts | 50 ++
 .../src/components/separator/separator.classes.ts  | 23 ++
 .../separator/separator.astro.conformance.test.ts  | 48 ++
 .../separator/separator.behavior.test.ts           | 46 ++
 .../components/separator/separator.classes.test.ts | 25 ++
 6 files changed, 233 insertions(+)
```

Plus doc/matrix/changelog updates staged after this articulation was
drafted (docs/spec/components/separator.md new;
docs/spec/matrix/components.jsonl, docs/spec/matrix/components.md,
CHANGELOG.md modified) -- prose/data files, not reviewed for code
simplification.

## packages/ui/src/components/separator/separator.behavior.ts

Checked: whether the aria projection duplicates logic already sitting in
a primitive, and whether the score carries any state/actions/keymap/effects
machinery it doesn't need.

Verdict: clean. No primitive exists for the "role is honest or absent"
pattern beyond what `grid.behavior.ts` inlines itself (grid's version is
`config.role === 'grid' ? 'grid' : undefined`; separator's is the same
shape, one config predicate away). Extracting a shared helper for two call
sites, each with a different predicate and different companion attribute
(`aria-label` vs `aria-orientation`), would be premature abstraction over a
three-line ternary. `initialState`, `actions: {}`, `canDispatch: () =>
true`, `keymap: () => null`, `effects: () => []` are the same boilerplate
`container.behavior.ts` and `grid.behavior.ts` carry for the same reason
(BehaviorSpec requires every field); not something this file can shrink
without changing the contract shape all three static scores share.

## packages/ui/src/components/separator/separator.classes.ts

Checked: whether `orientationClasses` duplicates the oracle's identical map
under a different name, and whether the base/orientation split is worth two
objects vs one combined lookup.

Verdict: clean. The oracle's map (`src/old/ui/separator.classes.ts`) is
NOT imported -- it's shared across three DIFFERENT framework targets in the
old tree by design (the "same classes, three renderers" old-tree
convention this port replaces with the score/classes split), so importing
it here would reach across the boundary line into rejected-tree code
(boundary 9). Re-declaring the two literal strings locally is the correct
move, matching how `container.classes.ts` and `grid.classes.ts` hold their
own literal maps rather than importing oracle equivalents. Two objects
(`baseClasses` string, `orientationClasses` record) rather than one
four-entry map: `orientation` is the only axis, so a single record keyed by
orientation already IS the minimal shape -- collapsing `baseClasses` into
it would just duplicate `shrink-0 bg-border` on both entries.

## packages/ui/src/components/separator/separator.astro

Checked: whether the aria-spread/attrs-spread ordering is redundant with
Props already omitting `role`, and whether `initialState`/`separator.aria`
calls add a layer the performance doesn't need over calling
`separatorClasses` directly with a literal object.

Verdict: clean. `Omit<HTMLAttributes<'div'>, 'role'>` and the
`{...aria.root} {...attrs}` spread order are BOTH load-bearing, not
redundant with each other: the Omit is a compile-time gate (a consumer
cannot even attempt `role=` in JSX/props); the spread order is the runtime
backstop for any attribute that reaches `attrs` outside the typed surface
(the same double-layer `grid.astro` uses for the identical reason, and
`container.astro`/`button.astro` establish the "config in, score's
projections out, one render" shape this file is a fourth instance of).
Calling `separator.initialState(config)` for a `Record<never, never>`
state that plays no role in `separator.aria`'s output looks skippable in
isolation, but every static-score performance in this tree
(`container.astro`, `grid.astro`, `button.astro`) calls
`x.initialState(config)` before `xClasses`/`x.aria` even when state is
empty -- the score's designed shape is config -> initialState -> (classes,
aria), not a per-performance shortcut. Diverging here would be the
inconsistency, not the fix.

## Tests (separator.behavior.test.ts, separator.classes.test.ts, separator.astro.conformance.test.ts)

Checked: overlap between the three files (is the same assertion made
twice at different layers for no reason), and whether the conformance
test could reuse a shared adapter instead of `container.astro.conformance.test.ts`'s
standalone-render pattern.

Verdict: clean, deliberately layered, not duplicated. `behavior.test.ts`
asserts the PURE projection (`separator.aria(...)` return value, no DOM);
`classes.test.ts` asserts the PURE class-string output
(`separatorClasses(...)`, no DOM); `astro.conformance.test.ts` asserts the
INTEGRATION (real rendered DOM attributes + axe) -- each catches a
different failure class (a wrong projection, a wrong class string, a
performance that computes the right values but fails to actually apply
them to the element). No shared `conformance-suite.ts` adapter was built
because none of button's/navigation-menu's reasons for one apply: those
suites exist to run the SAME scenario set across MULTIPLE framework
adapters (react + astro + wc); separator has exactly one performance in
this scope (astro-only), so the adapter indirection would be machinery
with a single caller -- the orchestrator's own instruction (item 3) points
at `container.astro.conformance.test.ts`'s standalone pattern for exactly
this reason, and that's what's here.
