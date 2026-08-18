---
name: Implementation Task
about: SOLID implementation task for AI agents
title: "Implement [Feature Name] - [Brief Description]"
labels: enhancement
assignees: ''
---

## Goal

Single, focused objective this task achieves.

## Exact Implementation Requirements

NO emoji anywhere.

### Interface

```typescript
// Exact method signatures / types / API expected, with real file paths.
```

### Behavior

- Specific behavior with its rule and the assertion that will prove it
- Another specific, measurable behavior
- ...

### Error Handling

- What errors to throw or return, and when
- Required error message / shape

## Acceptance Criteria

One verifiable outcome per line. Each must be independently checkable by a test
or an observable behavior. This is the list the `pr-write` and `verify` gates
map against, so every line is a real, issue-specific outcome -- never a
coding-standard (those live under Code Standards below and are not criteria).

- [ ] Specific behavior 1, with the test or observable behavior that proves it
- [ ] Specific behavior 2, measurable
- [ ] Specific behavior 3, with its validation
- [ ] Unit tests for the above pass; `pnpm preflight` is green

### Functional Tests

```typescript
// Exact assertions that must pass. Include setup, execution, assertions.
expect(result).toBe(expectedValue);
expect(() => invalidOperation()).toThrow('Specific error message');
```

## What NOT to Include

- Out-of-scope concern (separate issue)
- Not-needed-yet feature (future consideration)

## File Locations

- Implementation: `path/to/impl.ts`
- Unit tests: `path/to/impl.test.ts` (tests live under `test/**` -- the vitest include)
- Types: `path/to/types.ts` (if needed)
- Export from: `path/to/index.ts`

## Integration Requirements

- Dependencies / integration points with existing code
- Usage example, if it clarifies the interface

## Code Standards

Repo invariants (see `CLAUDE.md`) apply to every issue and are enforced by
`pnpm preflight` (typecheck, oxlint, oxfmt, tests, build). They are NOT
per-issue acceptance criteria:

- TypeScript strict; no `any` (narrow from `unknown`)
- No `.then()` chains -- async/await only
- Zod for all external data; types inferred from the Zod schema where possible
- No emoji in code, comments, or docs

## Context & References

- Related issues:
- Design record (legion reflection id):
