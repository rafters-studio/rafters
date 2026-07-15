# Spec 00 — Boundaries

Status: FROZEN 2026-07-09. Rulings of 2026-07-08 applied.
The authority map every other spec is downstream of. Each
boundary names what sits on each side, the test for a violation, and who
rules on crossings. When a spec or an implementation contradicts this
document, this document wins until Sean amends it.

Most of these lines were discovered by crossing them during the button
prototype (2026-07-01). That is what prototypes are for; the sweep does not
get the same license.

## 1. Designer / agent — the authorship line

**Designers own:** every visual and experiential decision — glyphs, motion,
animation, sizing relationships, decoration, empty states, loading
affordances. Their decisions live as data: the token registry, ratified
components, the oracle, composites.

**Agents own:** selection and assembly from that ratified vocabulary, and
the machinery that carries decisions unchanged.

**Violation test:** any rendered content or style not traceable to the
oracle, the token registry, or a recorded designer decision. Traceability is
the test — "it looks reasonable" is exactly the failure mode.

**On crossing:** STOP AND ASK. An empty part is honest; an invented spinner
is counterfeit intent. (Found live: the prototype authored a spinner glyph,
stroke, size, and animation with no authority. Nothing tooling-side caught
it; this rule is the catch.)

## 2. Behavior / binding — the decision line

**Behavior owns:** state, actions, suppression (canDispatch), the ARIA
projection, the keymap, declared parts, effect descriptions. All of it pure,
all of it tested once.

**Bindings own:** no decisions. Mechanical execution in framework syntax.

**Violation test:** a conditional in a framework file that is not the
framework's own idiom. A keyboard branch, a derived attribute, an
if-disabled check in a binding is behavior that escaped.

## 3. Component binding / framework adapter — the repetition line

**Adapters own (one per framework, system-wide):** instance lifecycle,
subscription, the effects runner, config assembly, id supply, the
dispatch-and-callback protocol, aria/classes application, patch-in-place
(WC). Written once; every component inherits them.

**Per-component framework files own:** the framework-idiomatic surface only
— prop types, asChild, attribute names. A few lines over the adapter.

**Violation test:** two components' framework files sharing any line beyond
the adapter call. Shared substance moves DOWN into the adapter. (Found
live: ~70% of the three button bindings was the same wiring re-expressed;
the spinner SVG path was pasted three times.)

## 4. Intrinsic state / reflected inputs — the ownership-of-truth line

**The memory cell owns:** intrinsic state only — values the component
itself originates (uncontrolled pressed, uncontrolled open).

**The consumer owns:** controlled values. They pass through projections and
canDispatch FRESH, never stored, never mirrored.

**Violation test:** a controlled prop written into the store to be read
back out (sync effects, one-frame lag, double renders). Mirroring is not
synchronizing.

## 5. Declared structure / rendered structure — the parts line

**Behavior declares:** part names, roles, multiplicity, state-driven
presence. Structure data declares: tag, static attributes, slot points —
strictly static, no expressions.

**Frameworks fulfill:** exactly that structure, mechanically.

**Violation test (two-sided):** a binding inventing or moving structure;
OR the structure description growing logic. The moment structure data has a
conditional beyond declared part presence, we are building a template
framework — the thing this architecture exists to not be.

**Corollary — the truss rule (ruled 2026-07-08):** a Container is a claim
about a relationship, not a styling hook. Every rim names what it separates
— a zone, a group, a landmark. A Container that separates nothing should
not exist. Layout is Container and Grid, nothing else; nesting spends
subdivision steps and the scale floor makes gratuitous depth unrepresentable.

## 6. Token vocabulary / class selection — the styling line

**The registry owns:** the vocabulary — semantic tokens, state tokens,
decoration.

**classes.ts owns:** selection among literal strings. Never construction,
never arbitrary values, never named colors. Fill, never background (ruled
2026-07-08: fill is the only color-surface channel in the contract).

**Corollary — style the contract:** state-dependent looks key off the
PROJECTED attributes (disabled:, aria-disabled:, aria-busy:, data-state)
so a component cannot look right while announcing wrong.

## 7. Effect description / effect execution — the impurity line

**Behavior owns:** descriptions (EffectSpec, a closed vocabulary).
**Executors own:** performance (focus-trap, sr-announcer, the runner).

**Violation test:** a behavior touching the DOM, or a component needing an
effect the vocabulary cannot express and hacking it locally. A missing
effect kind is a Spec 03 change request — stop the line.

## 8. Registry delivery / workspace plumbing — the distribution line

**Consumers receive:** component SOURCE via the rafters CLI/registry, with
relative imports, into their own componentsPath. That is the product.

**The monorepo uses:** @rafters/* workspace aliases — internal plumbing,
never a public API, never in consumer-facing copy. There is no @rafters on
npm; the only published package is the rafters CLI.

## 9. Oracle / new grain — the migration line

**src/old owns:** the oracle role — behavior parity evidence and the
quarantine. Every oracle feature gets an explicit disposition: contract
(all frameworks), framework affordance (e.g. asChild), dropped, or
defect-do-not-port (e.g. loading label replacement).

**Violation test:** porting behavior without a disposition, or "improving"
without recording the delta. Exports flip one component at a time; src/old
dies only when out-proven.

**Scope rulings (2026-07-08/09):** the editor cluster is fully out of
behavior-layer scope — own-project scale. color-picker and color-inspector
are punted with it. The old controllers are rejected architecture: they get
dispositions, never transcription. The machine comes from the primitives and
the archetype article, never from src/old.

## 10. Spec / build — the process line

**Sean ratifies:** boundary changes, spec freezes, oracle dispositions,
design decisions.
**Agents propose:** amendments with evidence, and build strictly inside the
frozen spec.

**Change control:** a spec defect found mid-sweep stops the line — amend,
re-ratify, re-verify affected components. No agent patches around the spec
locally. Prototypes may cross boundaries to FIND them; the sweep may not.
