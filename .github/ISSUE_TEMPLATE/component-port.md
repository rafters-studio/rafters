---
name: Component Port
about: Port one component to the behavior layer
title: "Port [name] to the behavior layer"
labels: component-port
assignees: ""
---

## Goal

Port `[name]`. Deliverable: `[name].behavior.ts` + `[name].classes.ts` + `[name].tsx` + tests + `docs/spec/components/[name].md`.

## What it is

One sentence. From the matrix line.

## Pattern

Archetype: `[archetype]`. Imitate the reference article in `src/components/`.
Specs: `packages/ui/docs/spec/00-03` and the reference article's component doc.

## Compose these primitives

List from the matrix line (`packages/ui/docs/spec/matrix/components.jsonl`).
Primitives live in `packages/ui/src/primitives/`. Query with `legion sym hover <fn>`.
Never write machinery a primitive provides.

## States

From the matrix line.

## Motion

Declare intent only (enter/exit, axis, size). Durations and easing come from tokens.
Exit animation waits on the Presence adapter — enter-only until wave 0-B lands.

## Oracle

`src/old/ui/[name].*` — read for feature dispositions only:
`contract | framework-affordance | dropped | defect-do-not-port`.
Dispositions go in the component doc.
Controllers are rejected architecture. Never port their shape.

## Component doc

Model on dialog.md: composition, config/state/actions, parts + ARIA table,
keyboard + effects, oracle dispositions, WCAG obligations. Plain register.

## Intelligence

The `.tsx` JSDoc carries `@cognitive-load` (five dimensions, from the matrix line),
`@attention-economics`, `@trust-building`, `@accessibility`. The registry parses these.

## Acceptance criteria

- [ ] Component doc written
- [ ] JSDoc intelligence tags present
- [ ] Exported from the package as the articles are
- [ ] Behavior test (pure, no DOM)
- [ ] Classes parity test
- [ ] Conformance test via the shared harness (aria + keymap against rendered DOM)
- [ ] shadcn drop-in parity where the component exists in shadcn
- [ ] `pnpm --filter @rafters/ui test:unit` green, `pnpm preflight` green

## Rules

- Token props and semantic classes only. No raw spacing, z-index, or color utilities.
- Fill, not background. No editor props.
- The framework file is a thin wrapper. If it grows logic, stop.
- NO emoji anywhere.

## Workflow

Build on `feat/<issue#>-[name]` -> `/legion-simplify` -> `legion pr create` -> `/legion-review` + fix -> verify.

## Closing directives (same commit as the port)

1. Update your line in `packages/ui/docs/spec/matrix/components.jsonl` — files status, uses, states as built.
2. Add an entry to `packages/ui/CHANGELOG.md`.
