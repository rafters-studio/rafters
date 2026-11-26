# Copilot Implementation Instructions

## MANDATORY REQUIREMENTS - READ FIRST

### BEFORE ANY CODE - RUN THIS COMMAND:

```bash
pnpm preflight
```

**NEVER commit if preflight fails**
**NEVER skip this step to "save time"**  
**NEVER expect CI to catch what you should fix locally**
**Preflight MUST pass before commit - NO EXCEPTIONS**

## REACT 19 PURITY REQUIREMENTS - MANDATORY:

**ALL COMPONENTS MUST BE PURE - NO EXCEPTIONS**

- NO `Math.random()`, `Date.now()`, or `console.log()` in render
- NO side effects during component execution
- NO mutations of props or external state
- ALL functions must be deterministic (same inputs → same outputs)
- Use `useState(() => value)` for one-time random/time values
- Use `useEffect()` for ALL side effects
- React 19 concurrent rendering WILL BREAK impure components

### React 19 Pattern Requirements:

```tsx
// ✅ CORRECT - Direct ref prop (React 19)
function Button({ ref, children, onClick }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <button ref={ref} onClick={onClick}>
      {children}
    </button>
  );
}

// ❌ WRONG - forwardRef pattern (React 18)
const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <button ref={ref} {...props} />;
});
```

## TYPESCRIPT REQUIREMENTS - MANDATORY:

**STRICT TYPESCRIPT - NO EXCEPTIONS**

- NEVER use `any` type - EVER
- NEVER use `unknown` without proper type guards
- ALWAYS use explicit return types for functions
- ALWAYS validate external data with Zod schemas
- NO array indices as React keys - use stable IDs
- NO `.then()` chaining - ALWAYS use `await`

## ITERATION REQUIREMENTS - MANDATORY:

**NEVER USE .forEach() - CI WILL FAIL**

- Use `for...of` loops instead of `.forEach()`
- Use `for...in` for object iteration
- Use `.map()`, `.filter()`, `.reduce()` for functional transforms
- forEach violates our linting rules and breaks CI

```typescript
// ✅ CORRECT
for (const item of items) {
  processItem(item);
}

// ❌ WRONG - Will fail CI
items.forEach((item) => processItem(item));
```

## MSW TESTING PATTERNS - MANDATORY:

**ALL network mocking uses MSW - NO manual fetch mocks**

- NO `global.fetch = vi.fn()` or `vi.mock()` for network calls
- NO `mockResolvedValue` or `mockRejectedValue` for fetch
- Use MSW handlers at the network layer
- Generate mock data from Zod schemas using zocker

### MSW Architecture:

- **Shared utilities only** in packages/shared/lib/test-utils/
- **Each app owns** its own MSW setup in app/test/msw/
- **Factories** generate data from Zod schemas using zocker
- **Handlers** intercept HTTP requests and return factory data

### File Structure Per App:

```
apps/{app}/
  test/
    msw/
      handlers/
        {domain}.handlers.ts    # HTTP handlers for this app
      factories/
        {model}.factory.ts      # Zocker-based mock generators
        index.ts
      index.ts                  # MSW server setup
      browser.ts               # MSW browser worker (if needed)
```

### Creating Factories with Zocker:

```typescript
// Use zocker directly with Zod schemas
import { zocker } from "zocker";
import { userSelectSchema } from "@realhandy/shared/db/schema";

export function createTestUser(overrides?: Partial<User>): User {
  let generator = zocker(userSelectSchema);

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (key in userSelectSchema.shape) {
        generator = generator.supply(
          userSelectSchema.shape[key as keyof typeof userSelectSchema.shape],
          value,
        );
      }
    }
  }

  return generator.generate();
}
```

### Creating Handlers:

```typescript
// Mock at HTTP layer, not function layer
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://api.example.com/users", () => {
    return HttpResponse.json({ users: [createTestUser()] });
  }),
];
```

### Error Scenarios:

```typescript
// Override handlers per test
import { use } from "../msw";

test("handles API errors", () => {
  use(
    http.get("https://api.example.com/users", () => {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }),
  );
  // Test error handling
});
```

### Anti-Patterns to NEVER Use:

- DON'T mock functions: `vi.mock('./lib/api')`
- DON'T mock fetch: `global.fetch = vi.fn()`
- DON'T create manual mocks: `const mockUser = { id: '123', ... }`
- DON'T use zod-schema-faker (outdated, use zocker for Zod v4)
- DON'T use MSW in E2E tests (test against real localhost API)

### When to Use MSW:

- Unit tests that make HTTP requests
- Component tests that fetch data
- Mocking external services (Resend, GitHub OAuth)

### When NOT to Use MSW:

- E2E tests (use real API on different port)
- Testing internal functions (no network calls)
- Pure utility functions

## DEVELOPMENT WORKFLOW:

### 1. Package Management

- ALWAYS use `pnpm` - never npm, yarn, or other managers
- Use `pnpm install`, `pnpm add`, `pnpm test`, `pnpm build`

### 2. Testing

- Write tests FIRST (TDD required)
- Use `vitest run` to see results (not watch mode)
- All tests must pass before committing

### 3. Code Quality

- Run `pnpm preflight` before every commit
- Fix ALL biome check violations
- Fix ALL TypeScript errors
- Ensure ALL tests pass

### 4. Error Handling

- Use structured error handling with recovery strategies
- Validate all external data with Zod schemas
- Provide clear, actionable error messages

## SIMPLICITY PRINCIPLES:

**ALWAYS prioritize simplicity over sophistication:**

- Immediate Need Only - Never implement anything that doesn't solve an immediate, concrete problem
- Simplest Form - Choose the most basic implementation that works
- No "Nice to Have" - Ruthlessly cut features that aren't essential
- Prefer Built-ins - Use standard library functions over custom utilities
- Avoid Premature Abstraction - Don't create patterns until you have 3+ concrete use cases
- Speed to Market - Working functionality is better than perfect code that's not done

### Red Flags to Avoid:

- Multiple implementations of the same thing
- Complex error handling patterns for simple operations
- Generic/abstract classes with single implementations
- Utilities that wrap built-in functionality without clear benefit
- Network/async code for local file operations

## COLLABORATION:

### When in Doubt, Ask

- If unsure about any aspect of the task, ask for clarification
- Do not make assumptions about requirements or implementation details
- This is a partnership - collaboration is essential

### Issue Implementation

- Follow GitHub issue specifications exactly
- Implement ONLY what's specified in the issue
- Do not add features beyond the issue scope
- Mark issues complete when ALL acceptance criteria are met

### Bug Discovery During Implementation

**FIX ALL BUGS - EVEN IF NOT IN ISSUE SCOPE**

- If you discover a bug while implementing an issue, FIX IT
- CI will fail if bugs remain - there's no "not my problem"
- Examples:
  - Linting violations (forEach, type errors, etc.)
  - Failing tests caused by your changes
  - Import errors or type mismatches
  - Configuration issues that break the build
- Document the fix in your commit message
- NEVER commit knowing a bug exists that will break CI
- "It wasn't in the issue" is not an excuse - fix it anyway

## NEVER USE EMOJIS

- NEVER use emojis in any code, comments, documentation, or responses
- Use clear, descriptive text instead of visual symbols
- Focus on semantic meaning through words, not visual decoration
