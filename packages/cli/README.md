# rafters

Design Intelligence CLI. Encodes a designer's judgment into queryable data so AI agents read decisions instead of guessing at colors, spacing, hierarchy.

→ [rafters.studio](https://rafters.studio)

**60+ components across React and Astro.** Two-target parity from one design system — the same Button, Card, Dialog, Combobox, Editor, etc. as a React component and an Astro component. Component code is installed into your project via `rafters add` (shadcn-style copy), not imported as a dependency, so you own and can fork what ships.

**Composite manifests sit above components.** A composite is a designer-authored JSON manifest that bundles components into reusable patterns (login-form, copy-button, heading, paragraph) with designer intent baked in: `solves`, `appliesWhen`, do/never rules, cognitive load rating, I/O contracts, and a typed block tree. Agents query the composite registry via MCP and assemble pre-made decisions instead of inventing new ones.

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
- **Motion is intentionally untouched** — rafters' motion system is research-backed (perceptual response curves, cognitive thresholds, reduced-motion accommodations); arbitrary `--duration-base` declarations in source are NOT auto-applied.
- **Surfaces** — init writes one fill per surface (37 of them: `card`, `popover`, `primary`, `sidebar` and the rest) into `.rafters/tokens/fill.rafters.json` as `surface-<name>`, exported as the `bg-surface-<name>` utility. Each one references that surface's own colour tokens, so it follows them.

### Modes

```bash
pnpm dlx rafters init              # Interactive prompts for role assignments
pnpm dlx rafters init --agent      # Non-interactive; auto-assigns; emits JSON events
pnpm dlx rafters init --rebuild    # Regenerate output files from existing .rafters/tokens
pnpm dlx rafters init --reset      # Re-run generators from defaults, replacing tokens
pnpm dlx rafters init --scripts Latn,Arab   # Writing systems to support (ISO 15924 codes)
pnpm dlx rafters init --css-import theme.css --map primary=--brand   # Import by explicit mapping
```

`--rebuild` keeps every stored token and designer override, including your fills. It adds any surface fill the project lacks (a project made before 0.5.0 has none) and never changes one that exists.

### Importing a stylesheet by mapping

`--css-import <path>` with one or more `--map` entries imports a stylesheet by naming which custom property feeds which rafters token, instead of sensing the source CSS. `rafters import --css-import <path> --map ...` does the same into an existing project. `--map` is repeatable, as `target=--property` or one JSON object.

A role mapped to a palette step, such as `primary=--color-mud-500`, or to a property whose `var()` chain reaches one (`--primary: var(--brand)`, `--brand: var(--color-mud-500)`), points at that step: `primary` becomes `{ family: "mud", position: "500" }`, and the `mud` palette is defined once from your `--color-mud-*` declarations. `rafters init` reads its detected CSS the same way. A colour that is no palette step gets a one-off `imported-<property>` family, seeded at 500. Running `rafters import` again on a project an older version imported repoints the mapped roles; it leaves the old `imported-*` families in place, to delete once nothing reads them.

`--map color:<name>=--property` adds a colour family named `<name>` that no role points at: the resolved colour seeds an 11-step scale, pinned at 500. `--map color:<name>=--prefix-*` takes a complete scale instead, `--prefix-50` through `--prefix-950`, kept as given; a missing step fails before anything is written. `<name>` is lowercase kebab-case and cannot be one of the 11 family role names. The family gets `bg-<name>-500`, `text-<name>-700` and the other colour utilities at every step, generated whether or not a source file uses them.

### Detected frameworks

Next.js, Vite, Remix, React Router, Astro, vanilla.

### Export formats

| Format | File | Default | Description |
|--------|------|---------|-------------|
| Tailwind CSS | `rafters.css` | Yes | CSS custom properties with `@theme` |
| TypeScript | `rafters.ts` | Yes | Type-safe constants with JSDoc intelligence |
| DTCG JSON | `dtcg/light.tokens.json`, `dtcg/dark.tokens.json` | No | W3C Design Tokens 2025.10, one file per mode, in the form Figma's Variables panel imports; every rafters field rides in `$extensions.rafters` |
| Standalone CSS | `rafters.standalone.css` | No | Pre-built, no Tailwind required |
| Documentation CSS | `rafters.documentation.css` | No | Complete utility surface for docs and previews |

Standalone CSS and Documentation CSS are built with `@tailwindcss/cli`, which rafters does not depend on. With Standalone CSS chosen, init installs it into your project (it asks first, or installs straight away with `--agent`). Documentation CSS needs it installed in your project already: `pnpm add -D @tailwindcss/cli`.

Requires Tailwind v4. `rafters init` refuses a project with no `tailwindcss` dependency, writing nothing and naming the Tailwind v4 install guide for its framework; Tailwind v3 projects are rejected too. Init does not install Tailwind for you.

## Other commands

### `rafters add [components...]`

Add components from the rafters registry to your project.

```bash
pnpm dlx rafters add button dialog    # Add specific components
pnpm dlx rafters add --list           # List available components
pnpm dlx rafters add --overwrite      # Replace existing files
```

Each component carries embedded design intelligence (cognitive load, accessibility, do/never guidance, variant patterns). Dependencies resolve automatically.

`--update <names...>` re-fetches named components from the registry; `--update-all` re-fetches every installed one; `--registry-url <url>` points at another registry.

### `rafters remove <name>`

Remove one installed item: deletes the files `rafters add` installed for it and takes it off the `installed` list in `.rafters/config.rafters.json`. Items it depended on stay installed. A name that is not installed fails and changes nothing. Outputs are not regenerated, and emptied folders are left in place.

```bash
pnpm dlx rafters remove dialog
```

### `rafters import`

Import a stylesheet into an existing project by mapping its custom properties. Takes `--css-import <path>` and `--map`, as described under init.

### `rafters agents`

Write or update the rafters contract block in `AGENTS.md`, for agent hosts other than Claude Code.

### `rafters studio`

Start a local server at `http://127.0.0.1:7777` (`--port` to change it) for changing the project's design tokens. It has no page yet; its API is one call.

```bash
pnpm dlx rafters studio
curl -X POST http://127.0.0.1:7777/__rafters/set \
  -H 'Content-Type: application/json' \
  -d '{"name": "fill-glass", "value": {"foreground": {"family": "zinc", "position": "900"}, "background": {"color": {"family": "zinc", "position": "100"}, "alpha": 70}, "backdrop": {"blur": "md"}}, "why": "frosted panels"}'
```

`POST /__rafters/set { name, value?, why }` sets a token, records your reason, cascades, saves `.rafters/tokens/` and regenerates `rafters.css`. A name starting `fill-` that does not exist yet creates a designer fill, exported as `bg-fill-<name>`; a fill needs a `foreground`. Add `"clip": "text"` to a fill to paint its background or gradient through the glyphs, with the foreground as the colour where clipping is unsupported; every Typography component takes `fill="bg-fill-<name>"`. Any other new kebab-case name with a colour value, in any CSS format (`#c8a24b`, `rgb()`, `hsl()`, `oklch()`, a named colour) or as `{l, c, h}`, creates a colour family pinned at 500 with steps 50 to 950; add `"utilities": true` to emit its `bg-<name>-<step>` utilities before any role uses it. A colour value on an existing family rebuilds it from the new seed, dropping step overrides and keeping its utilities. A name, or any step or fill it would occupy, that already exists is refused as taken. With no value it undoes one step, which removes a fill or colour family `set` created; on a token with nothing to undo it answers 409. A value with no `why` is refused, and so is an invalid value, with the field it names. Colours in a fill are always references (`{family, position}` or `{token}`), never literals. `GET /__rafters/tokens` lists every token by namespace with its override and chain. Requests must be JSON, from no origin or the server's own. Running it again while it runs prints the existing URL.

`DELETE /__rafters/set { name, why }` removes a whole fill, or a colour family with its eleven steps, whoever made it (`set`, `rafters import` or `init`), saves and regenerates as POST does, and answers `{ "deleted": [names] }`. It refuses a step (`gold-500`), naming the family to delete instead, and any token the system makes (spacing, typography, a role, a semantic colour). While any other token reads the fill or family (`{ family }`, `{ token }` or `dependsOn`), it answers 409 naming every reader, and changes nothing. A `why` is required.

```bash
curl -X DELETE http://127.0.0.1:7777/__rafters/set \
  -H 'Content-Type: application/json' \
  -d '{"name": "imported-color-gold", "why": "read by nothing"}'
```

Every change Studio makes appends one JSON line to `.rafters/studio.log`: `at`, `action` (`set`, `undo` or `delete`), `name`, `before` (null when created), `after` (null when removed), `why` (null for undo) and, for a colour family, `tokens`, every name it touched. A refused request writes nothing. Studio only ever appends to the log; git holds the history.

Every refusal answers `{ "error": { "code", "message", ...details } }`. `code` is one of `STUDIO_ERROR_CODES` from `@rafters/shared`, `message` is a sentence for a person, and the details are exactly the fields listed for the code. A `path` is dotted (`value.background.color`).

| code | status | details | Studio's response |
|---|---|---|---|
| `method-not-allowed` | 405 | `allowed: string[]` | bug in the client |
| `origin-refused` | 403 | `origin` | bug in the client |
| `unsupported-media-type` | 415 | `expected: 'application/json'` | bug in the client |
| `body-not-json` | 400 | none | bug in the client |
| `body-invalid` | 400 | `field` (`name`, `why`, `utilities`, or `body` when the body is not an object) | bug in the client |
| `reason-required` | 422 | `name`, `action: 'set' \| 'delete'` | ask for a why |
| `unknown-token` | 404 | `name` | refresh the token list |
| `token-invalid` | 422 | `name`, `issues: {path, message}[]` | show the field errors |
| `literal-color` | 422 | `name`, `path` | offer to create a colour token |
| `name-rejected` | 422 | `name`, `reason` | show the naming rule |
| `name-taken` | 409 | `name`, `takenBy` | offer to edit the existing token |
| `token-in-use` | 409 | `name`, `readers: string[]` | list the readers |
| `token-undeletable` | 409 | `name`, `reason` | explain why it stays |
| `circular-dependency` | 409 | `cycle: string[]` | show the cycle |
| `nothing-to-undo` | 409 | `name` | disable undo |
| `color-out-of-gamut` | 422 | `requested`, `nearest`, `deltaE`, `limit` (OKLCH) | offer the nearest colour |
| `internal` | 500 | none | report a bug |

`GET /__rafters/tokens` only refuses with `method-not-allowed`. `color-out-of-gamut` is reserved: nothing raises it yet.

### `rafters mcp`

Start the MCP server for AI agent access via stdio transport.

```bash
pnpm dlx rafters mcp
```

## MCP tools

Three tools for agent ASSEMBLY (not design). Agents read the designer's choices; they do not author them.

- `rafters_workspaces` -- lists the rafters workspaces and which is the default; call it first in a monorepo. With fields, it updates a workspace's wiring config.
- `rafters_describe` -- walks the component and composite intel graph. `describe()` for the installed surface, `describe(button)` for a node, `describe(button.*)` for every prop, `describe(button.props.variant)` to drill into one.
- `rafters_generate` -- a component name in, that component's verbatim snippet for the project's target out, with its open slots and whether it is installed.

`rafters_component`, `rafters_composite` and `rafters_pattern` are deprecated aliases for `rafters_describe`.

## Architecture

Four layers, stacked:

- **Tokens** — primitive design values (color OKLCH, semantic roles, spacing scale, radius, typography, motion, focus, shadow, depth, breakpoints, fills). 12 token files, one per namespace; dependency graph with human override tracking. Override a base (`spacing-base`, `radius-base`, `font-size-base`) and dependents recompute. Override a leaf and the override anchors the subtree.
- **Primitives** — 62 framework-agnostic building blocks (clipboard, focus-trap, portal, roving-focus, selection, serializer, slot, token-sheet, typeahead, etc.). Headless behaviors components compose against.
- **Components** — 60+ React + 71 Astro. Two-target parity. Each component carries embedded intelligence metadata: cognitive load rating, accessibility level, do/never, variant semantics, attention economics. Installed into your project via `rafters add` — you own the code.
- **Composites** — designer-authored JSON manifests that bundle components into reusable patterns (login-form, copy-button, heading, paragraph, etc.). Each manifest carries `solves`, `appliesWhen`, `usagePatterns` (do/never), `cognitiveLoad`, I/O contracts, and a typed block tree. The composite owns the variant/size decisions — agents render blocks verbatim instead of choosing aesthetics.

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
    breakpoint.rafters.json
    semantic.rafters.json
    fill.rafters.json         # Fills and the generated surface-* fills
    typography-composite.rafters.json
  output/
    rafters.css               # Tailwind v4 CSS variables and utilities
    rafters.ts                # TypeScript constants
```

## Requirements

- Node.js ≥ 24.12.0
- Tailwind CSS v4
- React ≥ 19.0.0 (when using React components)

## License

MIT
