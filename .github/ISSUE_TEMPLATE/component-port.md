---
name: Component Port
about: Port one component to the behavior layer
title: "Port [name] to the behavior layer"
labels: component-port
assignees: ""
---

## Goal

Port `[name]`. Deliverable: one behavior, three decorators.

- `[name].behavior.ts` — the score: pure reducers, aria/keymap projections, plus
  `bind[Name](root)` (the DOM-native client).
- `[name].classes.ts` — the view. Class strings, no logic.
- `[name].tsx` (React) + `[name].element.ts` (WC) + `[name].astro` (Astro) — three thin
  decorators over the one behavior, all driving the same `bind[Name]`.
- Tests + `docs/spec/components/[name].md`.

Build all three performances. Spec 05 states the three-framework mandate with no
per-component carve-out; it is independent of what the old tree happened to ship.

## What it is

One sentence.

## Pattern

Archetype: `[archetype]`. Imitate the reference article in `src/components/`.
Specs: `packages/ui/docs/spec/00-03` and the reference article's component doc.

## Compose these primitives

Primitives live in `packages/ui/src/primitives/`; the matrix is
`packages/ui/docs/spec/matrix/primitives.jsonl`. Query with `legion sym hover <fn>`.
Never write machinery a primitive provides.

Verify a primitive is actually composable before planning on it. A matrix description
states intent; `legion sym importers packages/ui/src/primitives/<name>.ts` states fact.
If every importer is under `src/old/`, it belongs to the rejected architecture and does
not compose into the behavior layer.

**Cell-owning primitives do not compose.** `createBehavior` owns *the* single memory cell
for a component and `Slice` reducers are pure `(state, payload) => state` over that one
cell, so a primitive returning its own cell has no seam. `createSelectionGroup` and
`createDisclosure` are both this shape — radio-group, toggle-group, accordion and tabs
each rejected them and re-expressed the semantics as a reducer. Do the same; do not wire
in a second cell.

**What composes:** container-in / cleanup-out primitives (`roving-focus`, `focus-trap`,
`outside-click`, `hover-delay`, `aria-manager`, `sr-announcer`) and pure primitives that
are just functions (`dialog-aria`, `classy`).

**Two primitives are commonly mis-suggested for input-family components:**

- `input-events` is the **editor's** contenteditable/IME handler, not a general input
  primitive. It is a naming collision. `input`, `input-group` and `input-otp` all
  refused it. A component with a native `<input>` does not need it.
- `form-value` builds a hidden mirror `<input>` for controls that are **not** native
  form fields (slider's divs). A component with a real native input is form-associated
  already; the mirror would submit the field twice.

## States

The state axes the component actually owns. A component that wraps a control which
already owns its value does not own a second copy of it.

## Motion

Declare intent only (enter/exit, axis, size). Durations and easing come from tokens —
see `docs/MOTION.md` for the scale, curves and semantic motion tokens.

Do **not** write raw numeric durations (`duration-300`). If the semantic motion token
you need does not exist yet, say so in the component doc and leave the motion
undeclared rather than hardcoding a number. The motion token layer is being rebuilt
(#1899); a hardcoded value now is drift later.

## Oracle

`src/old/ui/[name].*` — read for feature dispositions only:
`contract | framework-affordance | dropped | defect-do-not-port`.
Dispositions go in the component doc.
Controllers are rejected architecture. Never port their shape.

## Component doc

Model on dialog.md: composition, config/state/actions, parts + ARIA table, keyboard,
oracle dispositions, WCAG obligations. Plain register.

## Intelligence

The `.tsx` JSDoc carries `@cognitive-load` (five dimensions), `@attention-economics`,
`@trust-building`, `@accessibility`. The registry parses these.

## Acceptance criteria

- [ ] Component doc written
- [ ] JSDoc intelligence tags present
- [ ] Behavior test (pure, no DOM)
- [ ] Classes parity test
- [ ] Conformance GREEN across React + WC + Astro via the shared harness (aria + keymap
      against rendered DOM)
- [ ] shadcn drop-in parity where the component exists in shadcn
- [ ] `pnpm --filter @rafters/ui test:unit` green, `pnpm preflight` green

## Rules

- Token props and semantic classes only. No raw spacing, z-index, or color utilities.
- Fill, not background. No editor props.
- The framework file is a thin wrapper. If it grows logic, stop.
- Do NOT add `package.json` export entries or any export namespace. The deliverable is
  the component folder; distribution is the registry (#1896). The `./next/` namespace
  was removed for this reason — do not recreate it.
- Do NOT edit shared files: no `components.jsonl` (deleted), no `components.md`, no
  `CHANGELOG.md`. A port PR touches its own component folder and its own tests. This is
  what makes ports parallel-safe.
- NO emoji anywhere.

## Workflow

Build on `feat/<issue#>-[name]` -> `/legion-simplify` -> `legion pr create` ->
`/legion-review` + fix -> verify.

`legion-review` is a **skill**, not a `legion` CLI subcommand — `legion review` does not
exist and its absence is not a reason to skip the stage. Load it with the Skill tool
(`legion:legion-review`). It runs from a subagent context. If you genuinely cannot run
it, say so explicitly in your report and do the pass by hand against the acceptance
criteria above; never report a review stage you did not run.

`legion quality-gate check` resolves its diff base from the local `main` ref, which is
often stale in a worktree. If it reports coverage gaps for files you never touched, pass
`--base origin/main` rather than writing entries for them.
