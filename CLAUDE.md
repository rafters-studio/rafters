# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## STOP - Read This First

**Rafters is NOT a component library.** It's a Design Intelligence Protocol for AI agents.

AI agents don't have taste. They guess at colors, spacing, hierarchy. Rafters encodes a designer's judgment into queryable data so AI doesn't guess - it reads decisions.

**Three layers:**
- **What** (Components) - `packages/ui` with JSDoc intelligence metadata
- **Where** (Tokens) - `packages/design-tokens` with dependency graph and human override tracking
- **Why** (Decisions) - Do/never patterns, cognitive load scores, trust patterns, accessibility requirements

**Four MCP tools** (the primary interface - docs are secondary):
1. `rafters_vocabulary` - What's available (colors, spacing, components)
2. `rafters_pattern` - How to implement scenarios (destructive-action, form-validation, etc.)
3. `rafters_component` - Full intelligence for a specific component
4. `rafters_token` - Token dependency graph, derivation rules, and human override context

The AI learns **what** to do, **because of how** it works, **and why** it matters. The decisions are already made by the designer.

**Read the `what_rafters_is` memory for the complete explanation.** Also see `docs/DESIGN_PHILOSOPHY.md` for the Jobs/Ive/Rams, Joshua Davis, Jakob Nielsen balance.

## Essential Commands

### Primary Development Commands
```bash
# Start development across all apps/packages
pnpm dev

# Build entire monorepo
pnpm build

# Run complete test suite
pnpm test

# CRITICAL: Run before any commit (enforced by lefthook)
pnpm preflight

# Type checking across workspace
pnpm typecheck

# Linting and formatting
pnpm lint
pnpm format
```

### Testing Commands
```bash
# Unit tests only
pnpm test:unit

# E2E tests
pnpm test:e2e

# Accessibility tests (vitest-axe)
pnpm test:a11y

# Quick feedback (unit + a11y)
pnpm test:quick

# Full CI (preflight + e2e)
pnpm test:all

# Watch mode for development
pnpm test:watch
```

### Package-Specific Commands
```bash
# Run command in specific package
pnpm --filter=@rafters/cli build
pnpm --filter=@rafters/design-tokens test
# Test specific package
pnpm --filter=@rafters/shared test
```

## Project Architecture

### Monorepo Structure
- **Apps**: 3 main applications
  - `apps/api/` - Hono backend for design system services
  - `apps/website/` - Documentation and marketing site (Astro)
  - `apps/demo/` - Demo application

- **Packages**: 6 core packages
  - `packages/cli/` - AI-first design intelligence CLI with MCP server
  - `packages/design-tokens/` - Dependency-aware design token system
  - `packages/ui/` - React components (55 total, 52 shadcn-compatible, 17 primitives)
  - `packages/shared/` - Consolidated utilities, types, and schemas
  - `packages/color-utils/` - OKLCH color intelligence
  - `packages/math-utils/` - Mathematical progressions and scales

### Design Token System Architecture
The `@rafters/design-tokens` package implements a sophisticated dependency graph system:

- **Archive-Based Distribution**: Design systems distributed as ZIP archives (SQIDs)
- **Dependency Engine**: 5 rule types for automatic token transformations
  - `calc()` - Mathematical calculations
  - `state:hover` - Color state transformations
  - `scale:600` - Scale position extraction
  - `contrast:auto` - Automatic contrast generation
  - `invert` - Lightness inversion for dark mode
- **TokenRegistry**: Runtime intelligence engine managing 240+ tokens
- **ColorValue Objects**: AI-powered color analysis with complete OKLCH scales

### Tech Stack
- **Package Manager**: pnpm workspaces (NEVER use npm/npx)
- **TypeScript**: Strict configuration, no `any` types allowed
- **Testing**: Vitest + Playwright for comprehensive coverage
- **Linting**: Biome (enforces no explicit any, no emoji)
- **Pre-commit**: Lefthook enforces code quality

## Critical Rules

### ZERO TOLERANCE POLICIES
1. **NEVER start, stop, restart, or interact with dev servers** - User manages servers in terminal. Starting/stopping servers creates process zombies and orphaned processes. ALWAYS ask user if server action needed.
2. **ALWAYS run `pnpm preflight` before commits** - Build WILL fail otherwise
3. **NEVER commit broken tests** - ALL tests must pass, NO skipping tests to make CI pass
4. **NEVER use `npm` or `npx`** - Only pnpm in this workspace
5. **NO `any` types** - Biome config causes build failure
6. **NO emoji anywhere** - Code, comments, commits, documentation
7. **Use Zod for all external data** - Required for type safety
8. **NO `.then()` chains** - Use async/await only
9. **React 19 purity** - No impure functions in components
10. **NEVER use `/tmp` directory** - All work files MUST be in workspace subdirectories to prevent data loss

### Development Workflow
1. Make changes
2. Run tests: `pnpm test`
3. Run preflight: `pnpm preflight` (MANDATORY)
4. Commit changes
5. Lefthook automatically runs pre-commit checks

### Testing Requirements
- Unit tests: `src/component.test.ts`
- E2E tests: `test/component.e2e.ts` (Playwright)
- Accessibility tests: MANDATORY for UI components (`.a11y.tsx`, vitest-axe)
- Mock typing: Use `vi.mocked(func).mockReturnValue()`, never `as any`
- Fixtures: Use `zocker` v3.0.0 for test fixture generation from Zod schemas
- Test data: Import fixtures from `@rafters/shared/test/fixtures`

## Monorepo Operations

### Working with Dependencies
```bash
# Add dependency to specific package
pnpm --filter=@rafters/ui add lucide-react

# Add dev dependency to root
pnpm add -D typescript

# Update all dependencies
pnpm update -r
```

### Key Architecture Decisions

#### Design Token System
- Uses sophisticated dependency graphs with 5 transformation rule types
- 240+ tokens generated from mathematical relationships
- Archive-based distribution with SQID identifiers
- AI-powered color intelligence with OKLCH color space
- TokenRegistry manages runtime token relationships and transformations

#### CLI Architecture
- AI-first design intelligence with MCP server integration
- Component library with embedded cognitive load ratings
- Supports Next.js, Vite, Remix, CRA frameworks

#### Component System
- React 19 with strict purity requirements
- Cognitive load intelligence embedded in component metadata
- Tailwind v4 integration with CSS variables
- shadcn drop-in compatibility: Overlay components include Portal/Overlay internally

#### Primitive Categories
- **Leaf primitives**: Zero external dependencies, callback injection for state. Examples: block-canvas, keyboard-handler, focus-trap, escape-keydown, drag-drop, history, clipboard.
- **Composition primitives**: Orchestrate multiple leaf primitives with shared reactive state via nanostores atoms. Examples: block-handler, color-picker. Registry type remains `registry:primitive`.
- **Rule**: Only composition primitives may import nanostores. Leaf primitives must remain zero-dep.

### Environment Requirements
- Node.js >= 24.12.0
- pnpm >= 10.25.0
- React >= 19.0.0
- TypeScript 5.9.x (strict)

## Common Tasks

### Running Single Tests
```bash
# Test specific file
pnpm --filter=@rafters/design-tokens test dependencies.test.ts

# Test pattern
pnpm test --run "dependency graph"

# A11y test specific component
pnpm --filter=@rafters/ui test:a11y
```

### Adding New Packages
1. Create package directory under `packages/` or `apps/`
2. Add to `pnpm-workspace.yaml` (should auto-discover)
3. Set up package.json with proper naming: `@rafters/package-name`
4. Run `pnpm install` to link workspace dependencies

### Design Token Development
```bash
# Generate complete token system
pnpm --filter=@rafters/design-tokens test default-system

# Test dependency graph
pnpm --filter=@rafters/design-tokens test dependencies

# Test individual generators
pnpm --filter=@rafters/design-tokens test generators
```

The architecture emphasizes intelligent automation, mathematical precision, and AI integration throughout the design system pipeline.
