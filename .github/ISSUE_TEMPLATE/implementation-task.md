---
name: Implementation Task
about: SOLID implementation task for AI agents
title: "Implement [Feature Name] - [Brief Description]"
labels: enhancement
assignees: ''
---

## Goal

**Single, focused objective this task achieves.**

## Exact Implementation Requirements

NO emoji anywhere

### Required Interface/Class Structure
```typescript
// Exact method signatures, class structure, or API expected
```

### Behavior Requirements
- Specific requirement 1 with clear success criteria
- Specific requirement 2 with measurable outcome
- Specific requirement 3 with validation method

### Error Handling
- What errors to throw and when
- Required error message format
- Recovery strategies if applicable

## Acceptance Criteria

### Functional Tests Required
```typescript
// Exact test cases that must pass
// Include setup, execution, and assertions
expect(result).toBe(expectedValue);
expect(() => invalidOperation()).toThrow('Specific error message');
```

### Performance Requirements
- Specific performance metrics if applicable
- Memory usage constraints if relevant
- Algorithmic complexity requirements if needed

### TypeScript Requirements
- TypeScript 5.9.3 strict mode enabled
- All strict flags: `strictNullChecks`, `strictFunctionTypes`, `noImplicitAny`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`
- No `any` types anywhere (Biome enforced)
- No `.forEach()` - use `for...of` loops instead
- No `.then()` chains - use `async/await` only
- No `var` - use `const` or `let` only
- No implicit returns in arrow functions with blocks
- No unused variables or parameters
- No non-null assertions (`!`) without explicit justification
- All external data validated with Zod schemas
- Types inferred from Zod schemas where possible

### Build Requirements
- Biome 2.3.2 for linting and formatting
- Biome rules enforced:
  - `noExplicitAny`: error - Disallow `any` type
  - `noForEach`: error - Disallow `.forEach()`, use `for...of` instead
  - `noThenProperty`: error - Disallow `.then()` chains, use `async/await`
  - `noVar`: error - Disallow `var`, use `const` or `let`
  - `useArrowFunction`: warn - Enforce arrow functions over function expressions
  - `useConst`: error - Prefer `const` over `let` when possible
  - `noUnusedVariables`: error - Error on unused variables
  - `noConsoleLog`: error - Disallow `console.log` (use proper logging)
  - `useExhaustiveDependencies`: error - Enforce exhaustive React hook dependencies
  - `noUndeclaredVariables`: error - Error on undeclared variables
  - `noUnusedImports`: error - Error on unused imports

## What NOT to Include

- Feature 1 that's out of scope (separate issue)
- Feature 2 that's not needed yet (future consideration)
- Complex feature that should be broken down further

## File Locations

- Implementation: `path/to/implementation.ts`
- Unit Tests: `path/to/tests.test.ts`
- Integration tests: `path/to/tests.spec.ts` (as needed)
- Playwright component test: `path/to/tests.spec.tsx` (as needed)
- Accessibility test: `path/to/tests.a11y.tsx` (MANDATORY for UI components)
- E2E test: `path/to/tests.e2e.ts` (as needed)
- Types: `path/to/types.ts` (if needed)
- Export from: `path/to/index.ts`

## Integration Requirements

### Dependencies
- Required packages or modules
- Integration points with existing code
- Compatibility requirements

### Usage Examples
```typescript
// Concrete examples of how this will be used
const example = new Implementation();
const result = example.method(parameters);
```

## Success Criteria

- [ ] All functional tests pass
- [ ] TypeScript compiles without errors (no `any` types)
- [ ] Performance requirements met
- [ ] Integration tests pass
- [ ] Documentation updated if required
- [ ] Exports added to index files

**This issue is complete when:** [Specific, measurable completion condition]

## Context & References

- Related issues: #123, #456
- Architectural documentation: Link to relevant specs
- External dependencies: Links to library docs if needed
