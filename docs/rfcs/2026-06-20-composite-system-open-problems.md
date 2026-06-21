# Composite System — Open Problems

Status: **working doc.** Each entry is a real design problem surfaced as pushback on the composite-system model (the typed-VB-in-a-design-system: rules-as-Zod, every-block typed I/O, `use_source` adapters, codegen-to-the-clean-line + agent engineering partner). Resolve them one at a time in chat; record the decision inline under each.

Companion: `docs/rfcs/2026-06-18-rafters-compose.md` (the compose loop) and legion reflection `019ee737` (the full editor model).

**Resolve before writing substrate code:** P1, P2, P3, P4.

---

## P1 — Structural type-matching: Zod can't compare schemas  `[BLOCKS BUILD]`

**Problem.** "Y→Y, can't wire it wrong" needs *does output schema satisfy input schema?* Zod validates a value against a schema; it has no schema-to-schema compatibility check. Current `matchRules` is **name-based** — two rules named `User` with different shapes match by name and connect wrongly.

**Why load-bearing.** The entire typed-connector promise rests on this. Name-matching ⇒ the safety is theater.

**The crux.** Nominal (by name) vs structural (by shape) typing for connections.

**Directions.**
- (a) **Nominal, registry-canonical.** A rule *name@version* is a type identity; the registry guarantees one name = one canonical shape. Name-matching becomes *safe* because names can't lie. Simple; leans on registry discipline + versioning (see P below-ish).
- (b) **Structural via Zod 4 → JSON Schema.** `z.toJSONSchema()` both sides, run a JSON-Schema assignability check. Bounded by what JSON Schema represents; reuses existing subtype tooling.
- (c) **Full structural subtyping over Zod ASTs.** Most precise, most work — reimplementing TS assignability for Zod.

**Lean.** (a) for v1 — nominal is honest and matches the registry model; the "names lie" critique dissolves if the registry enforces name→shape uniqueness + versioning. Structural (b) as a later precision upgrade behind the same `matchRules` contract.

**Decision (2026-06-20 — RESOLVED).** This is *why rafters has its own rules instead of raw Zod.* A rule is a **signature**; Zod is the validation implementation *behind* it, but the connector compares **signature identity**, not schemas. We compare sigs and **trust** — no structural diffing.

Signatures **compose**: `user = username + password`. Matching rule: an input signature is satisfied when its **named parts are covered** by available outputs.
- `username` out → attaches to a `username` in.
- `user` in (= `username` + `password`) → satisfied only when *both* a `username` and a `password` output are present; a lone `username` cannot satisfy a `user` in.

The registry makes a signature name **canonical** (one name = one signature), so names can't lie. `matchRules` evolves from exact-name array compare → **signature + composition matching** (cover the input signature's named parts from the available output signatures). No structural Zod comparison anywhere.

---

## P2 — Logic spaghetti: dataflow graphs rot worse than VB  `[BLOCKS BUILD]`

**Problem.** Types stop type errors, not logic errors. A fully-typed graph can still be an unreadable tangle that shows the wrong step. VB's real failure was *logic* spaghetti; node editors (Blueprints, Node-RED) spaghetti faster than text.

**Why load-bearing.** "Not VB" is a core claim; this is the way it becomes VB anyway.

**The crux.** What bounds per-view logic complexity?

**Framing.** A composite is **not a function** — it's a declarative **shape** (manifest + typed-I/O block graph). The *renderer* is the closure that renders the shape (over the design system + input data). Composite = noun, render = verb.

**Directions.**
- (a) **Signature-boundary encapsulation** (this is P1 again). A composite's I/O **signature** (derived from its blocks' open edges) is its interface. A nested composite appears to its parent **as its signature, not its internal graph** — you only ever see one level. Bounds per-view complexity structurally. Blocks, composites, rules unify: shapes with signatures composing at their boundaries.
- (b) Bias toward reusing ratified composites (parameterize) over hand-wiring sprawl.

**Two axes — do NOT conflate (this was a category error in the first draft).**
- **Authoring/maintenance complexity** (the spaghetti concern) → bounded by (a) **signature-boundary encapsulation**. You never face the expanded graph; a hairy-but-clean-signature pipeline is fine (nobody reads inside `lodash.sortBy`). This is the real answer.
- **Rendered attention cost** → bounded by `attentionBudget`. This is a *different* axis (a heavy pipeline can render to one number — low load, high graph complexity), so the budget is **not** a graph cop. It does its own job.

**Lean.** Encapsulation (signature boundary) is the spaghetti answer. The budget stays out of it. Residual within-composite tangle is acceptable precisely because it's encapsulated; if a single composite's *authoring* complexity needs a limit later, that's a *separate* graph metric, not the render budget.

**Decision (2026-06-20 — RESOLVED).** Composites are **shapes**, not functions; the renderer is the closure. Spaghetti is bounded by **signature-boundary encapsulation** (you only ever see one level; nested composites are their signatures; a hairy-but-clean-signature pipeline is fine because nobody reads inside it). The `attentionBudget` is a **separate axis** (rendered attention cost, not graph density) and per **C1** is a designer-suggestion / agent-gate — *not* a spaghetti cop. Any future authoring-complexity limit is a separate graph metric.

---

## P3 — Runtime story for the logic layer  `[BLOCKS BUILD]`

**Problem.** `visibleIf(field)`, `scrollPast(x)` are inherently runtime — they need client JS. In a zero-JS Astro form they can't work without a runtime, which we said we wouldn't ship. The "HTML5, no client Zod" resolution only covered *validators*; the logic layer (the differentiator) has no runtime story.

**Why load-bearing.** Conditionals/environmental are the whole "real logic" pitch. If they don't run in static targets, the differentiator is broken.

**The crux.** How does live conditional/environmental logic run without a heavy runtime or breaking zero-JS targets?

**Directions.**
- (a) **Native-first.** Push to the platform: CSS scroll-driven animations / `scroll-timeline` literally *are* `scrollPast`; `:has()` covers a class of field-conditionals; `<details>`, popover API, `:checked` patterns. Zero JS for the subset CSS/HTML now expresses.
- (b) **Tiny opt-in runtime.** A few-KB vanilla reactive interpreter, loaded *only* when a composite uses conditionals CSS can't express. Honest: we ship a runtime, but minimal and on-demand.
- (c) Per-conditional vanilla codegen (no shared runtime; each emits its own listener).

**Lean.** (a)+(b), mirroring the validator story: native-first, tiny opt-in runtime for the remainder. Accept that a runtime exists; keep it minimal and pay-as-you-use.

**Decision (2026-06-20 — RESOLVED).** The premise was a wrong assumption: Astro is **not** a zero-JS dumb terminal. Astro `<script>` is first-class (TS, bundled, npm imports, DOM/`addEventListener`, **custom elements**, `data-*` → `dataset` for server→client, deduped per component; docs recommend custom elements for reusable behavior). So:

- Conditional/environmental behavior runs via rafters **primitives** (the framework-agnostic behavior layer that already exists), wired per target through its **native client-script mechanism** — Astro `<script>` + custom element + `data-*`; React island/hook; WC directly. "Use primitives like elsewhere."
- **Nothing ships Zod; no novel runtime.** The primitive *is* the runtime, already how rafters does interactivity. Server passes compiled condition / initial state via `data-*`; the primitive reads `dataset` and toggles.
- **Native-first** still preferred where it maps (CSS `scroll-timeline` = `scrollPast`, `:has()`) — zero JS for that subset.

Not a build-blocker — the mechanism exists. Per-target codegen emits the wiring (Astro custom element + script + `data-*` / React hook / WC) around the same primitive.

---

## P4 — ~~Zod isn't a query engine: transforms aren't schemas~~  `[VOID — not a real problem]`

**Voided (2026-06-20).** "Transform" was an invented category — the system has no such concept. It's all **rules**. A rule is a **Zod schema** that is *both* a **signature** (its I/O type — what we match on, P1) *and* a **behavior** (what it does to the data: validate / sort / filter / condition). Not two kinds — two aspects of one rule.

`sortBy` is a rule: `z.array(T).transform(sort)` — signature `array<T> → array<T>`, behavior = sort, via **Zod 4's `.transform`/`.pipe`**. The original worry ("Zod can't do transforms") also underestimated Zod 4, which does exactly this. No separate node kind; no query language; no problem.

---

## P5 — Codegen ⇄ agent-code round-trip

**Problem.** Generated code + agent-written custom code + designer edits the graph and regenerates = overwrite/merge hell. Every codegen tool dies here.

**Why load-bearing.** "Agent writes the complex parts" collapses the first time the graph changes if there's no ownership/round-trip story.

**The crux.** How do generated and hand/agent code coexist across regeneration?

**Directions.**
- (a) **Eject / copy-in (rafters already does this).** Components are copied into the project and *owned*. Apply the same: compose generates owned code into the project; re-running produces a **diff for review**, never a silent overwrite. Sidesteps round-trip by not round-tripping.
- (b) Strict file separation: generated files (never hand-edited) + agent files at stable extension points the generated code calls.
- (c) Graph is sole source of truth; agent code only at defined hooks; always regenerated.

**Lean.** (a) — it's the existing rafters copy-in philosophy. Generate → own → done; graph changes regenerate to a reviewable diff, not a clobber. Matches the registry model the whole product is built on.

**Decision.** _open_

---

## P6 — Agent dependency undercuts "designer builds it"

**Problem.** If anything non-trivial needs the agent to write real code, the designer isn't autonomous — they're drawing specs for an agent. That's a different product than VB-for-designers, and every non-trivial app costs tokens.

**Why load-bearing.** Positioning + cost honesty; affects who the user is and how we pitch it.

**The crux.** Two-tier use, named honestly.

**Directions.**
- (a) Accept the pairing: designer composes the **vetted palette autonomously** for the covered cases (the real 80%); the **agent engineering partner** handles the novel/complex remainder. Palette breadth = how far the designer goes alone. Pitch = "designer + agent pair," not "designer replaces engineer."

**Lean.** (a), and treat **palette breadth as a product metric** — the more stock rules/components/composites/adapters, the more the designer does without an agent.

**Decision.** _open_

---

## P7 — Scope is 4–5 products; MVP undefined

**Problem.** Design system + token Studio + dataflow editor + codegen + type engine + adapter framework + Tauri app + smugglr/eavesdrop. "Build the substrate" is itself enormous.

**Why load-bearing.** Risk of broad-and-unshipped.

**The crux.** The smallest slice that proves the thesis end-to-end.

**Directions.**
- (a) **One vertical, no editor UI yet.** A form composite with typed I/O rules (a few atoms + validators) → JSON via `use_source` → build-time HTML5 validation emit → rendered by the existing `Composite.astro` engine → shipping real code, driven by the agent/CLI through the MCP. Proves: rules → typed blocks → validation codegen → render. No editor canvas, no + adapters, no Studio.

**Lean.** (a). Prove the substrate vertical headless first; the visual editor is a later surface over a working spine.

**Decision.** _open_

---

## P8 — The adapter paywall leaks

**Problem.** Open `DataAdapter` interface → the community clones the `d1`/`iceberg` adapters for free. Open interface + paid implementations is a weak moat.

**Why load-bearing.** It's the revenue model.

**The crux.** What's actually defensible?

**Directions.**
- (a) **Sell the service, not the shim.** The moat is the hosted multi-site store (smugglr), the Tauri app, and the eavesdrop corpus — the *service*, which can't be cloned. Adapter code can be open; the managed backend the premium adapters talk to is the product. Open-core done right.

**Lean.** (a) — drop "rule registry is the paywall"; the paywall is the **+** app/service (smugglr-as-managed-store + eavesdrop). Adjust the business framing accordingly.

**Decision.** _open_

---

## Cross-cutting decisions

### C1 — Budget enforcement is actor-dependent (2026-06-20)

Overriding a cognitive-load budget is a *taste decision* (invariant 3: agents don't get taste). So the same `attentionBudget` enforces differently by actor:
- **Designer (editor):** **suggestion** — surfaced as guidance, **overridable**; the override is **recorded** (token-override style, deliberate and visible), never blocked.
- **Agent (compose/MCP):** **hard gate** — the cogload ya/nah refuses; **no override** (overriding would be the agent exercising taste).

Same number, two modes. This is the concrete line between the compose gate (agent, hard) and the editor (designer, soft).

---

## P9 — Two rule sources: resolution, collisions, change  `[ENABLES P1]`

**Problem.** Rules come from two places: **rafters built-ins** (registry, installed, tracked in `config.installed.rules`) and **userland** (the user's own files in `rulesPath`). `rafters.config` must know both are present and which is which. On save/change, two failures must be prevented: (1) **name collisions** — a userland `user` redefining the built-in `user`, or two userland rules clashing; (2) **silent signature change** — a rule's signature changing (rafters update or user edit) under composites already wired against the old one.

**Why load-bearing.** P1's canonicity ("a name = one signature, so names can't lie") is only true if collisions across the two sources are caught. This is the enforcement P1 assumes. It also gates safe rule evolution.

**The crux.** Collision policy + change/version handling across built-in and userland sources.

**Directions.**
- **Resolution.** Effective rule set = built-ins (`config.installed.rules`) ∪ userland (`rulesPath` discovery). Config records both presence and **provenance** (which source each name came from).
- **Collision policy.** (a) **Error/block** same-name at save. (b) **Namespace** userland (a prefix) so clashes are impossible. (c) **Tracked override** — local-wins but *loud and recorded*, like token human-overrides; never silent (paths' silent local-wins is wrong for type identities).
- **Change/versioning.** Version signatures; a changed signature **flags affected wired composites for review/migration** rather than silently re-validating against a new shape.

**Lean.** Catch collisions **at save**, surface loudly; default = **error unless an override is explicitly declared and recorded** (token-style, not path-style). Version signatures so changes are detectable; a changed signature flags its dependents. Config tracks both sources + provenance and notices when either changes.

**Decision (2026-06-20 — RESOLVED).**

**Primary mechanism — prevent by folder namespace.** The folder path *is* the namespace and is part of the signature identity:
- built-ins live at the rules root — `src/lib/rules/user.ts` → signature `user` (canonical);
- userland **defaults into a project-named folder** — `src/lib/rules/<project>/user.ts` → signature `<project>/user`.

So built-in-vs-userland collisions are **impossible by construction**, and the filesystem enforces uniqueness within a namespace. `config` knows root = rafters built-ins, `<project>/` = userland; provenance falls out of the path. Namespace name defaults to the project (shared rules namespace under the shared package). **Path = identity ⇒ moving a rule = renaming = a refactor (rewire refs).**

**Fallback — error/notify/rename** (the rare case: a rule deliberately dropped at the root colliding with a built-in, or a true within-namespace clash). Collisions are **errors** (override dropped). On collision: **error → notify → rename**. The system **suggests** the rename:
- default suggestion is a **namespaced / provenance-prefixed name** (`@project/user`), not `user2` — encodes whose it is and teaches the right model;
- **accept-or-edit, never forced / never silent**;
- a rename is a **refactor**, not a relabel (the name is the signature identity): trivial when the rule is new (no refs — the common save-time case), a **tracked rewire** when refs exist (show impact, update wiring on accept);
- deterministic default = the namespace prefix; the **agent partner may offer a semantic suggestion**.

Config tracks both sources + provenance; signatures are versioned so a *change* flags dependent composites.
