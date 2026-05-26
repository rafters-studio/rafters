# rafters

Design Intelligence CLI. Encodes a designer's judgment into queryable data so AI agents read decisions instead of guessing at colors, spacing, hierarchy.

→ [rafters.studio](https://rafters.studio)

## Quick Start

```bash
pnpm dlx rafters init
```

`init` detects your framework, reads your existing CSS (shadcn or Tailwind v4 `@theme` blocks), and produces a complete token system that imports your brand decisions and derives the rest mathematically.

## What `init` does

On the first run against an existing project, `init` runs an import flow that lifts brand decisions out of your CSS into the token system. Every step emits a discrete event you can read with `--agent`:

- **Pre-generation base detection** — reads `--spacing` / `--spacing-base`, `--radius` / `--radius-base`, `--text-base` / `--font-size-base`, `--ring-width` / `--focus-ring-width` and threads them into the token generator BEFORE construction. The cascade flows correctly from the first generation; derived namespaces (spacing scale, shadow numerics, radius scale, focus tokens) all match the imported base.
- **Color import** — walks `:root` semantic declarations (`--primary`, `--background`, etc.) AND `@theme { ... }` multi-palette blocks (Tailwind v4 brand palette convention). Detects ramps (palette-0 through palette-950), runs a designer-driven role-walk in interactive mode or auto-assigns in `--agent` mode.
- **Font role-walk** — detects every font family loaded by the source (`@import url(google fonts)`, `@font-face`, named `--font-*` declarations) and assigns each to a typography role (`font-heading`, `font-body`, `font-code`). Custom fonts that don't fit a canonical role become their own tokens (`font-aurabesh`, `font-mydisplay`, etc.) so consumers can reference them via Tailwind utilities.
- **Motion is intentionally untouched** — rafters' motion system is research-backed (perceptual response curves, cognitive thresholds, reduced-motion accommodations); arbitrary `--duration-base` declarations in source are NOT auto-applied. Use `rafters set motion-duration-base ...` if you specifically need to override.

### Modes

```bash
pnpm dlx rafters init              # Interactive prompts for role assignments
pnpm dlx rafters init --agent      # Non-interactive; auto-assigns; emits JSON events
pnpm dlx rafters init --rebuild    # Regenerate output files from existing .rafters/tokens
pnpm dlx rafters init --reset      # Re-run generators from defaults, replacing tokens
```

### Detected frameworks

Next.js, Vite, Remix, React Router, Astro, Web Components, vanilla.

### Export formats

| Format | File | Default | Description |
|--------|------|---------|-------------|
| Tailwind CSS | `rafters.css` | Yes | CSS custom properties with `@theme` |
| TypeScript | `rafters.ts` | Yes | Type-safe constants with JSDoc intelligence |
| DTCG JSON | `rafters.json` | No | W3C Design Tokens standard format |
| Standalone CSS | `rafters.standalone.css` | No | Pre-built, no Tailwind required |

Requires Tailwind v4. Tailwind v3 projects are rejected.

## Other commands

### `rafters add [components...]`

Add components from the rafters registry to your project.

```bash
pnpm dlx rafters add button dialog    # Add specific components
pnpm dlx rafters add --list           # List available components
pnpm dlx rafters add --overwrite      # Replace existing files
```

Each component carries embedded design intelligence (cognitive load, accessibility, do/never guidance, variant patterns). Dependencies resolve automatically.

### `rafters set <name> <value>`

Override a token value with a recorded reason. The previous value and the why-gate land as `userOverride` metadata so future agents can read your intent.

```bash
pnpm dlx rafters set spacing-base 0.5rem --reason "denser layout for data-heavy UI"
```

### `rafters mcp`

Start the MCP server for AI agent access via stdio transport.

```bash
pnpm dlx rafters mcp
```

### `rafters studio`

Launch Studio for visual token editing.

```bash
pnpm dlx rafters studio
```

## MCP tools

Four tools for agent ASSEMBLY (not design). Token design lives in Studio; import lives in `rafters init`. Agents read pre-made decisions; they do not author them.

### `rafters_composite`

Query composites by ID, search term, or category. Returns designer intent (solves, appliesWhen, do/never), I/O rules, and block structure.

```json
{ "id": "login-form" }        // Get a specific composite
{ "query": "form" }           // Fuzzy search across composites
{ "category": "typography" }  // Filter
```

### `rafters_pattern`

Design pattern guidance by querying composites. Search by what the page or section SOLVES.

```json
{ "solves": "authentication" }
{ "solves": "data entry" }
{ "query": "navigation" }
```

Returns composites with usagePatterns (do/never), cognitive load, and intent.

### `rafters_rule`

Query validation rules or create new ones. Rules are named patterns composites apply to inputs.

```json
{}                    // List all rules
{ "name": "email" }   // Get a specific rule
```

Built-in: `required`, `email`, `password`, `url`, `credentials`.

### `rafters_component`

Full intelligence for a specific component: cognitive load, accessibility level, variants, sizes, do/never.

```json
{ "name": "button" }
```

## Architecture

Three layers:

- **What (Components)** — React components with embedded intelligence metadata
- **Where (Tokens)** — token dependency graph with human override tracking
- **Why (Decisions)** — composite manifests, do/never patterns, cognitive load scores, trust-building patterns

The token system uses OKLCH color space, modular scales based on musical ratios, and a dependency engine that derives related values from primitive bases. Override a base — `spacing-base`, `radius-base`, `font-size-base` — and dependents recompute. Override a leaf (`primary` color, `spacing-4`) and the override anchors the subtree against future upstream changes.

When a designer overrides a computed value, the system records the reason. Agents read the why before they read the what.

## Project structure

```
.rafters/
  config.rafters.json         # Framework paths and export settings
  tokens/
    color.rafters.json
    spacing.rafters.json
    typography.rafters.json
    radius.rafters.json
    shadow.rafters.json
    focus.rafters.json
    motion.rafters.json
    depth.rafters.json
    elevation.rafters.json
    breakpoint.rafters.json
    semantic.rafters.json
    fill.rafters.json
    typography-composite.rafters.json
  output/
    rafters.css               # Tailwind v4 CSS variables
    rafters.ts                # TypeScript constants
```

## Requirements

- Node.js ≥ 24.12.0
- Tailwind CSS v4
- React ≥ 19.0.0 (when using React components)

## License

MIT
