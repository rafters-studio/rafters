# RFC: rafters_compose — the deterministic compose loop

- Status: **v1 design finalized — all 10 questions answered, taste-calls defaulted (overridable in review); ready to build**
- Date: 2026-06-18
- Supersedes the premature issue #1658 (filed and closed 2026-06-11 — "not designed at all")
- Source design: `vault-2026/projects/rafters/compose-design-2026-06-11.md` (direction sketch), `mcp-audit-2026-06-11.md` (audit)
- Gates: #1673 (composite I/O), #1677 (rules runtime-validation island), the Studio redesign, the MCP rework

## Why this RFC exists

#1658 was filed off a direction sketch and closed the same day with Sean's verdict: *it's not designed at all.* What was agreed then still holds — the **invariants** and the **loop shape**. What was missing was answers to **ten open questions**, and until they are answered the loop cannot be built without re-making the same mistake. This document answers those ten (plus two later-surfaced opens), grounds each answer in the code as it exists today, and marks clearly which answers are mine to propose versus which are Sean's taste calls to ratify.

This is the design gate. When the answers below are ratified, the v1 build issues fall out mechanically.

## What compose is *for* (the organizing principle)

rafters_compose is not primarily a convenience for generating composites. **It is the channel through which an agent is taught — and structurally constrained — to write only rafters code.** Generation is the side effect; the purpose is that the only UI an agent can successfully ship is rafters-correct UI. Invariant 3 ("the system designs, agents assemble") stops being a rule the agent is asked to follow and becomes the only path that works.

Three mechanisms, strongest first:

1. **Prevent.** Where intent is structured, the system *derives* the composite and the agent authors no code at all — it supplies intent and content, the system emits blocks. The `form-from-zod` path is the model: zero opportunity to write a wrong class because there is no writing. The agent cannot produce non-rafters code on this lane because it produces no code.
2. **Pre-teach.** On a miss, the **brief is a teaching artifact, not a data dump.** It hands the agent the exact rules it must satisfy, a *curated* candidate set (the sanctioned pieces, not "any component"), the budget, and this project's own ratified composites as worked examples. The agent drafts already shaped by what rafters will accept.
3. **Correct.** The gate's rejection is pedagogy. `{ rule, found, whatWouldSatisfy }` is not an error string — it is a lesson: *here is what you wrote, here is the rafters rule it broke, here is exactly what rafters-correct looks like.* The agent retries against the lesson and converges, over a session, on rafters-correct — because that is the only output that ships and renders.

The reward signal is what teaches: rafters-correct passes and renders; everything else is rejected with a lesson and never touches the project. An agent learns the rafters plane the way anything learns under a consistent reward — by finding the one path that works.

**Corollary — the side door must close.** This mission fails the moment another tool teaches the opposite. `rafters_component` today returns raw source (`packages/cli/src/mcp/tools.ts:370-412`), which trains the agent to think in utility classes and tokens — the wrong plane. While that door is open, compose teaches *assemble* and component teaches *imitate source*, every call undoing the other. So "only write rafters code" makes the MCP rework non-optional: the source-returning surfaces must close (return intelligence and paste-ready *usage*, never implementation), or compose is counter-taught on every component lookup. **Compose is the teacher; the rest of the MCP must stop being a counter-teacher.**

**The design test.** Every answer below is judged by one question: *does it widen or narrow the agent's opportunity to write non-rafters code?* Narrow wins. Where a side door must stay open (we cannot always derive), it is the place where teaching must be strongest.

## Invariants (Sean, non-negotiable — not re-litigated here)

1. **No metered API call may be required.** Generation runs through the *requesting agent's* model. The rafters MCP server stays fully deterministic: retrieve, brief, validate, install, write. No embedded agent, no PTY, no sampling dependency.
2. **Composites are taste.** The registry never delivers prebuilt composites. An agent-composed composite is *proposed* taste — `ratified: false` — until ratified in Studio.
3. **The system designs, agents assemble.** Compose must not open a side door for agent aesthetics. Where a choice is design, the system makes it; the agent only assembles what the system hands back.
4. **The PTY harness is beta, never a foundation.**

## The loop (agreed shape)

```
rafters_compose(intent, content)            // probe
  → reuse-first: search project composites
      hit  → return the composite WITH FULL BLOCKS (no model involved)
      near → partial-reuse outcome (see Q8)
      miss → return a COMPOSITION BRIEF (schema, candidates, budget, taste examples, rules)

rafters_compose(intent, content, draft)     // submit
  → deterministic GATE
      reject → structured violations { rule, found, whatWouldSatisfy } as retry context
      accept → write .rafters/composites/<name>.composite.json with provenance,
               install missing components, return full blocks ready to render
```

The gate is the only door. A draft never touches the project until it passes. The caller's model only ever fills the gap between brief and draft — and only when derivation is not fully determined (see Q1).

---

## The ten questions, answered

### Q1 — API shape: structured or prose intent?

**Answer (proposed): hybrid, structured where derivation depends on it.**

```
intent: {
  need: string                      // prose: "a login form", "two mapped data tables"
  kind?: 'form'|'list'|'detail'|'layout'|'nav'|...   // enum hint, optional
  schema?: <zod-json>               // when present, enables deterministic derivation
  io?: { input?: string[], output?: string[] }       // rule-name contracts
}
content: <the data/blocks the composite operates over>
```

Rationale: the no-API invariant is satisfied *structurally* only when derivation is fully determined. `form-from-zod` is the canonical case — fields → named rules → components via rule contracts → grid preset, with **no model involved**. The structured fields (`schema`, `io`, `kind`) are what make that determinism reachable. A bare prose `need` is valid but routes to the brief → draft → gate path, where the caller's model assembles (still no API requirement *for rafters*).

Through the design test: the structured lane is the **Prevent** mechanism (no authorship, no chance to err) and the prose lane is the widest side door (the agent free-writes a draft). The design response is not to forbid prose — we cannot always derive — but to make structured intent the path of least resistance (it is also the fast lane, so the incentive aligns) and to make the prose lane the place where teaching is *strongest*: the brief pre-teaches hardest and the gate's lessons are most detailed there. The agent is nudged toward Prevent and, when it must free-write, is corrected toward rafters-correct.

### Q2 — Candidate selection is taste-adjacent. How is it owned and inspectable?

**Answer (proposed): a deterministic, inspectable ranking function — never an opaque heuristic, never a model call.**

The brief's candidate set is ranked by, in order:
1. **Capability match** — component intelligence (role/kind tags, `appliesWhen`) vs `intent.kind`.
2. **Rule-contract compatibility** — component I/O against `intent.io` (Q on chaining).
3. **Cognitive-load fit** — when budget is tight, cheaper components rank up.
4. **Project consistency** — components already used by *ratified* composites in this project are boosted.

The function returns candidates **with the ranking rationale per candidate** (why it scored where it did), so selection is inspectable and testable. The system owns the ranking (in code); it returns "here are the plausible pieces and why," never "here is the answer." Aesthetic taste stays in Studio (ratified composites as examples); selection is *capability*, not aesthetics. This keeps invariant 3 intact.

### Q3 — Manifest contract: is `CompositeFileSchema` the right output?

**Answer: yes — extend it, do not replace it.**

Current schema (`packages/composites/src/manifest.ts:49-76`) already carries everything the loop produces: `manifest` (id, name, category, `cognitiveLoad`, `solves`, `appliesWhen`, `usagePatterns.{do,never}`), `input[]`/`output[]` (I/O rule names), and `blocks[]` (each with `content`, `children`, `rules[]`). The only gap is **provenance**. Add an optional block:

```typescript
provenance?: {
  composedBy: string         // agent identifier
  ratified: boolean          // false until Studio blesses it
  composedAt: string         // ISO timestamp
  intentHash: string         // hash of (intent, content) — powers reuse + near-dup (Q6)
  forkedFrom?: string        // composite id, when this is a fork (Q8)
}
```

Optional so every existing hand-authored / system composite stays valid and is treated as **ratified by default**. Compose writes `ratified: false`; Studio flips it. This is the single schema change the loop requires.

### Q4 — Cognitive-load budget: where does the budget come from, and how is a composition's load computed?

**Answer (proposed): budget from `.rafters/config.rafters.json`; composition load = sum of block loads; the gate flags hotspots.**

Two facts about the code today (both confirmed):
- The budget is a **single hardcoded `15`** for every component type (`packages/ui/src/primitives/intelligence-integration.ts:56,171`). The `focused/page/app = 15/30/45` tiers referenced in older notes came from the `rafters_cognitive_budget` tool, which **no longer exists** — they are not in the code. Per-component load is stored at `packages/cli/src/registry/types.ts:40` (from JSDoc); composite manifest load is `manifest.ts:58` (`cognitiveLoad`, int 1-10).
- **There is no composition-level aggregation function.** Nothing sums block loads into a composition total.

So this question has two parts, both of which the design must settle:

1. **Aggregation (newly surfaced, must be answered):** a composition's load = **the sum of its blocks' loads**, not max and not weighted. Sum is the only model that makes "budget" mean what a designer expects (more on screen = more load) and the only one that makes splitting an over-budget ask meaningful. The gate additionally reports **hotspots** — individual blocks whose load is a large share of the total — so an over-budget result is actionable ("this block is the cost"), mirroring the old budget tool's hotspot output.

2. **Source:** the budget is a **designer decision** stored in config, set later in Studio onboarding via a density slider over a simulated screen. Canonical config field (see "Config contract" below):

```jsonc
{
  "intent": { "personality": "elegant company", "constraints": [] },
  "attentionBudget": { "focused": 15, "page": 30, "app": 45 }   // designer-tunable; numbers are placeholders for Sean
}
```

v1 decoupling: compose reads `config.attentionBudget[tier]`, **falling back to a hardcoded default when the field is absent** (so compose does not wait on Studio onboarding). The cogload gate scores the *request* against this budget **before any design** (the "cogload ya/nah") and can refuse or split an infeasible ask up front. The tier (`focused`/`page`/`app`) is a per-request selector, defaulting to `page`.

3. **Cognitive load is a *derived* principle, not a dial.** The budget is never set in a vacuum: it derives from `intent + the need served`. Two scopes: at **onboarding**, the declared `intent` derives the project baseline `attentionBudget` (the density slider *expresses* intent; the budget is the consequence — a zine tolerates load a banking task cannot); at **compose time**, that baseline + the *specific need* of the request derives the target the gate checks. This is exactly why the loop does cogload *first* — it cannot score until the budget is derived from need + intent, and cannot derive that until intent is declared. It is the same derivation pattern as the token DAG, applied to attention. (See the Studio doc-architecture: cognitive load is a Principle, downstream of intent, not a Foundation.)

### Q5 — Ratification mechanics: Studio doesn't exist yet. Can unratified composites ship?

**Answer (proposed): yes. Unratified composites are fully functional; ratification is a later Studio action.**

`provenance.ratified = false` is **metadata, not a gate.** An unratified composite renders and is returned by reuse exactly like any other — it is *proposed* taste, not *blocked* taste. The flag does two things: (1) it marks the composite for Studio's ratification queue, and (2) it weights the brief's taste examples (ratified composites are stronger examples; unratified ones still count but lower). System composites — the typography built-ins `Container as=article` depends on — are `ratified: true` by default (the one sanctioned "system composite" exception). This satisfies invariant 2 (agent-composed = proposed until ratified) **without** requiring Studio to exist for v1.

**Where ratification happens (settled this session): the ratification queue *is* the Composites section of the project's design-system docs.** Post-onboarding, Studio renders the design system as a bespoke, principles-first document, and proposed composites appear in its Composites section; the designer ratifies or reworks them with the same right-click primitive that tunes tokens. So Q5's "Studio = the queue" resolves concretely to: the docs are the queue. v1 ships the `ratified` flag and the metadata; the docs surface that consumes it is the Studio doc-architecture track (see reflection 019edd92), not a compose-v1 dependency.

### Q6 — Near-duplicate refusal: what measure, what threshold, what override?

**Answer (proposed): deterministic structural similarity, banded, with an explicit override.**

Similarity is computed on structure, not prose:
- component-set Jaccard, + block-structure shape, + `intent.kind` match, + `intentHash` exact-match shortcut.

Banded outcome:
- **≥ high (default 0.85)** → refuse-new; return the existing composite as a reuse hit, annotated `matchedExisting: <id>, score`.
- **mid band** → partial-reuse candidate (Q8): return the close composite as a fork/parameterize starting point.
- **< low** → brief path (genuinely new).

Override (v2): `intent.force = true` (or `variant: <label>`) creates a deliberate sibling; provenance records `forkedFrom`. In v1 the mid-band is a *parameterize* candidate (fork is deferred — see v1 defaults). The score and the matched id are always returned, so the refusal is inspectable. Thresholds live in config (default high `0.85` / low `0.60`, tunable).

### Q7 — The actual rule set (not "a TS port of the greps")

**Answer (proposed): a principled four-tier gate, owned as data, implemented in TS now and swappable for rafters-lint (#1413) behind an unchanged structured-violation contract.**

The gate enforces, in order:

1. **Structural** — `CompositeFileSchema` validity; every referenced component + variant exists in the registry; I/O chaining resolves (`matchRules` — today exact name match; see chaining note).
2. **Budget** — block cognitive-load sum ≤ `config.attentionBudget[tier]` (Q4).
3. **Token discipline ("classy is the law")** — no arbitrary values (no hex, no `[Npx]`, no Tailwind arbitrary brackets); no raw layout/spacing classes (`flex`, `grid`, `gap-`, `p-`, `m-`…); `classy()` not `cn()`/`twMerge()`. This tier is **where invariant 3 is enforced** — agent aesthetics get rejected here. The concrete checks are the formalization of `.claude/hooks/pre-edit-rafters.sh:40-74`, ported to structured violations and with the known grep bypass holes closed.
4. **Composition** — component `usagePatterns.do/never`, no wrapper divs around complete components, required confirmations on destructive actions (`consequence`/`trustLevel`), a11y-required pairings.

Every violation is `{ rule, found, whatWouldSatisfy }`. Per the design test, this rule set **is the curriculum** — `whatWouldSatisfy` must be authored as a lesson (the rafters-correct form), not a terse code, because it is the agent's teaching feedback on every rejection. The same engine has three eventual consumers — the compose gate, the plugin pre-edit hook (replacing the bash greps), and CI — which is why **rafters-lint (#1413) must expose a library call returning structured violations from day one** (CLI-only output is a dead end for this loop).

> **Chaining note for #1673:** `matchRules` currently matches I/O rule *names* exactly, with no structural type comparison (`rules.ts`). #1673 (typed-function chaining) is the work that makes I/O contracts structural. The gate's tier-1 chaining check is name-based in v1 and tightens when #1673 lands — same contract, stronger validation.

### Q8 — Partial reuse: close composite, different content (the most common real case)

**Answer (proposed): a three-way outcome driven by the Q6 bands — parameterize first, fork second, new last.**

- **PARAMETERIZE** — if the close composite already exposes the varying point (content differs, shape identical), bind the new content and return it. **No new composite.** This is the default success path and the reason composites should be parameterized over content; it keeps the composite count low and taste consistent.
- **FORK** — if shape genuinely differs, the brief includes the close composite as the *starting point* ("fork of `<id>`, here is the delta"); the caller drafts only the difference; accept writes a new composite with `provenance.forkedFrom`.
- **NEW** — no close match → full brief.

This makes parameterization, not generation, the common case — which is the whole point of a taste system. It implies the manifest must support content-binding/slots; that is a manifest requirement feeding back into Q3 and is called out in v1 scope.

### Q9 — Page-level composition: compose's concern or the caller's?

**Answer (proposed): compose composes *composites* (including nesting); the caller composes *pages*.**

Compose's unit is one composite, which may embed ratified child composites (structural `composite:*` nesting, distinct from I/O chaining). A **page** is the caller arranging composites inside a `Container`/`Grid` — routing, data-fetching, and placement stay with the caller. The page-tier cognitive budget covers the sum of what is placed. This keeps compose's contract bounded and avoids compose owning application concerns.

### Q10 — Install-on-accept failure state

**Answer (proposed): accept is transactional; the manifest write is the commit point.**

Order of operations on accept:
1. Gate passes.
2. Resolve install order (`resolveDependencies`).
3. Install all missing components + their special primitives to their config paths.
4. **Write the manifest last.**

If any install step fails (network — the component plane is a remote registry fetch — or fs), **nothing is written** and accept returns `{ phase: 'install', component, reason, partial: <installed so far> }`. Because a manifest referencing an uninstalled component is invalid, manifest-last guarantees the project is never left half-composed. Offline is an explicit, clean failure ("N components uninstallable offline"), not a partial write. Re-running accept with the same draft is idempotent and completes the install.

The install logic exists but is **entangled in the CLI `add()` command** (`packages/cli/src/commands/add.ts:488`) — it mixes dependency resolution, file I/O, CLI logging, and config mutation. The accept path cannot shell out to an interactive command, so v1 extracts a callable `installComponents(items, targetDir, config): Promise<InstallResult>` from the existing pieces, all of which are already reusable: `resolveDependencies` (`packages/cli/src/registry/client.ts:206-228`), `installItem` (`add.ts:355-422`), `collectDependencies` (`add.ts:428`), `installRegistryDependencies` (`add.ts:702`), `trackInstalled` (`add.ts:221-241`).

---

## Two later-surfaced opens

### `rafters_rule` fate — **settled (already cut)**

`rafters_rule` was removed in commit `0777d36c` (2026-06-16). Rules are no longer a query tool; agents discover them through `rafters_composite`'s `blockRules`. The gate + the rule set (Q7) are where rules live. No action — recorded here so the design reflects code reality.

### Derivation tie-breaking

When deterministic derivation leaves more than one valid component for a slot (two components satisfy the rule contract equally), tie-break deterministically: cheapest cognitive load → most project-ratified usage → registry-canonical default. If still tied, *that* — and only that — is where the brief hands a small, bounded candidate set to the caller's model. Never an open-ended choice; the model picks among system-sanctioned options, which keeps invariant 3.

---

## What compose resolves (from the MCP audit)

- **HIGH-1, blocks withheld** — both reuse and accept return full blocks *by construction*; the assembly model finally has the one payload it must render.
- **Install-on-demand "original sin"** — accept installs missing components from the full registry instead of the MCP only reading what is already installed.
- **Studio gets a real job** — the ratification queue of proposed composites.
- **Intelligence inversion** — callers stop needing prompt-side training to "use rafters right"; the brief + gate carry the intelligence. Today `rafters_component` (`packages/cli/src/mcp/tools.ts:370-412`) returns `files: RegistryFile[]` — raw source — which pulls agents onto the token/utility plane (the leak we are *not* patching directly). The compose loop is the structural fix: an agent asks for a composite and gets blocks to render, never source to imitate. `rafters_compose` is a new (5th) MCP tool; the 4 existing tools (`workspaces`, `composite`, `pattern`, `component`) stay until the broader MCP rework, which this loop's contract informs.

## Config contract (canonical field names — settled 2026-06-18)

Two project-level fields are recorded by Studio onboarding into `.rafters/config.rafters.json` and read by both the compose loop and the `rafters-frontend` skill. These names are the single source of truth — onboarding (writer), the `RaftersConfig` schema, the skill (reader), and this RFC must all use them:

```jsonc
{
  "intent": {                 // the designer's declared character; agents honor, never substitute
    "personality": "string",  // e.g. "elegant company" | "tech product" | "personal blog" | "zine"
    "constraints": ["string"] // optional; onboarding may extend this object
  },
  "attentionBudget": {        // the project's cognitive-load budget, in points
    "focused": 15,            // per-request tier selector; numbers are placeholders for Sean
    "page": 30,
    "app": 45
  }
}
```

Naming rationale: `attentionBudget` (not `attentionEconomics`) because the component-intelligence layer already uses `attentionEconomics` as a per-component descriptor — *each component has attention economics; the project has an attention budget.* Both fields are optional; absence means onboarding has not run, and readers fall back to defaults (never invent values). Neither field exists in `RaftersConfig` today; adding them is onboarding's build work, gated on this contract.

## v1 scope (TS, no new infra)

1. `compose` tool with the reuse / brief / gate / accept paths (Q1, Q6, Q8).
2. The gate behind an interface whose contract is structured violations; TS implementation now (zod + load math + the ported, hole-closed rule checks of Q7); rafters-lint (#1413) swaps in later via N-API without changing the tool contract.
3. Provenance fields on `CompositeFileSchema` (Q3).
4. Config `intent` + `attentionBudget` fields (see Config contract) with defaults + a fallback reader, **and a new composition-load aggregation function** (sum of block loads + hotspot report) — neither exists today (Q4).
5. Extract `installComponents(items, targetDir, config)` from the entangled `add()` command for the accept path (Q10).
6. Manifest content-binding/parameterization support (Q8) — scope-check against current block `content`/`children`.
7. Single-root scoping — workspace machinery stays cut (Sean's ruling; shingle/shared multi-root unsupported in normal rafters).

## v1 defaults for the taste-calls (chosen — override in review)

To finish the design rather than leave it open, each taste-adjacent knob has a v1 default. None blocks the build; all are tunable, most via config.

- **Q4 — budget numbers / density mapping.** v1 default: `focused 15 / page 30 / app 45`. The density-slider → budget *mapping* is onboarding's design, not compose's; compose only reads the value. So the mapping does not gate compose.
- **Q5 — is unratified marked to the agent?** v1 default: **no — silently functional**, carrying the `ratified: false` flag. The flag is surfaced by the docs/ratification gallery, not to the building agent. (An agent treating ratified vs proposed differently would be exercising taste.)
- **Q6 — near-duplicate threshold.** v1 default: high `0.85`, low `0.60`, in config, tunable.
- **Q8 — fork in v1?** v1 default: **parameterize-or-new only; FORK deferred to v2.** Forking multiplies taste surface; v1 proves parameterize (the common case) and new (the brief path) first. This makes Q6's mid-band a *parameterize* candidate, and the `force`/`forkedFrom` override a v2 feature.
- **Q2 — candidate ranking weights.** v1 default: **lexicographic in the stated order** (capability → contract → cogload-fit → consistency), no numeric weights yet. Tunable to weighted scoring later without changing the contract.

These are the spots most likely to draw a different call from Sean; flag any in review and I will adjust before the build.

## Dependencies

- **#1413 rafters-lint** — library API returning structured violations, day one. Hard dependency for swapping the gate engine later.
- **#1673 composite I/O** — turns `matchRules` from name-based to structural (Q7 chaining note). Unblocked by this RFC.
- **#1677 rules runtime-validation island** — the runtime (web-component) counterpart of the build-time gate. Unblocked by this RFC.
- **Studio redesign** — owns ratification (Q5) and budget elicitation (Q4); compose is designed to not require it for v1.
- **MCP rework** — not just informed by this loop but *required by its purpose*: while `rafters_component` returns raw source it counter-teaches the agent off the rafters plane (see "What compose is for" → corollary). Compose can ship v1 alongside the old tools, but "only write rafters code" is not achieved until the source-returning surfaces close.
