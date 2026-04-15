# rafters

Design Intelligence CLI. Scaffold tokens, add components, and serve an MCP server so AI agents build UIs with designer-level judgment instead of guessing.

## Quick Start

```bash
pnpm dlx rafters init
```

This detects your framework, scaffolds `.rafters/` with a complete token system, and generates output files.

## Commands

### `rafters init`

Initialize a project with design tokens.

```bash
pnpm dlx rafters init              # Interactive setup
pnpm dlx rafters init --rebuild    # Regenerate output files from existing tokens
pnpm dlx rafters init --reset      # Re-run generators fresh, replacing persisted tokens
pnpm dlx rafters init --agent      # JSON output for CI/machine consumption
```

**Detected frameworks:** Next.js, Vite, Remix, React Router, Astro

**Export formats** (configured during init):

| Format | File | Default | Description |
|--------|------|---------|-------------|
| Tailwind CSS | `rafters.css` | Yes | CSS custom properties with `@theme` |
| TypeScript | `rafters.ts` | Yes | Type-safe constants with JSDoc intelligence |
| DTCG JSON | `rafters.json` | No | W3C Design Tokens standard format |
| Standalone CSS | `rafters.standalone.css` | No | Pre-built, no Tailwind required |

Automatically detects and migrates existing shadcn/ui color values. Requires Tailwind v4.

### `rafters add [components...]`

Add components from the Rafters registry to your project.

```bash
pnpm dlx rafters add button dialog    # Add specific components
pnpm dlx rafters add --list           # List all available components
pnpm dlx rafters add --overwrite      # Replace existing files
```

Components include embedded design intelligence: cognitive load ratings (1-7), accessibility requirements, do/never guidance, and trust-building patterns. Dependencies are resolved automatically.

### `rafters mcp`

Start the MCP server for AI agent access via stdio transport.

```bash
pnpm dlx rafters mcp
```

### `rafters studio`

Launch Studio for visual token editing. Spawns a local Vite dev server from the `@rafters/studio` package.

```bash
pnpm dlx rafters studio
```

## MCP Tools

Four tools give AI agents complete design system access:

### `rafters_composite`

Query composites by ID, search term, or category. Returns designer intent (solves, appliesWhen, do/never), I/O rules for chaining, and block structure.

```json
{ "id": "heading" }           // Get specific composite
{ "query": "form" }           // Fuzzy search
{ "category": "typography" }  // Filter by category
```

### `rafters_pattern`

Design pattern guidance by querying composites. Search by what the pattern solves or use fuzzy search.

```json
{ "solves": "hierarchy" }      // Find patterns for document hierarchy
{ "solves": "authentication" } // Find patterns for auth flows
{ "query": "form" }            // Fuzzy search across composites
```

Returns composites with usagePatterns (do/never rules), cognitive load, and designer intent.

### `rafters_rule`

Query validation rules or create new ones. Rules are named validation patterns that composites can apply.

```json
{}                    // List all rules
{ "name": "email" }   // Get specific rule
{ "query": "pass" }   // Search rules
```

**Built-in rules:** `required`, `email`, `password`, `url`, `credentials`

### `rafters_component`

Full intelligence for a specific component. Cognitive load rating, attention economics, accessibility requirements, trust-building patterns, variants, sizes, and primitives.

```json
{ "name": "button" }
```

## How It Works

Rafters is a Design Intelligence Protocol. AI agents don't have taste -- they guess at colors, spacing, hierarchy. Rafters encodes a designer's judgment into queryable data so AI reads decisions instead of guessing.

Three layers:

- **What** (Components) -- 55 React components with embedded intelligence metadata
- **Where** (Tokens) -- 240+ tokens with dependency graph and human override tracking
- **Why** (Decisions) -- Do/never patterns, cognitive load scores, trust patterns, accessibility requirements

The token system uses OKLCH color space, modular scales based on musical ratios, and a dependency engine that automatically derives related values. When a designer overrides a computed value, the system records the reason so AI agents respect the intent.

## Project Structure

```
.rafters/
  config.rafters.json         # Framework paths and export settings
  tokens/
    color.rafters.json        # Color tokens with OKLCH values
    spacing.rafters.json      # Spacing scale
    typography.rafters.json   # Type scale
  output/
    rafters.css               # Tailwind CSS export
    rafters.ts                # TypeScript constants
```

## Requirements

- Node.js >= 24.12.0
- Tailwind CSS v4
- React >= 19.0.0

## License

MIT
