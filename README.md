# Rafters

Rafters is a design system that carries its designer's judgment as data: tokens
derived from a few base values, components that encode how and when to use
them, and composites that bundle components into patterns. It ships as the
`rafters` CLI, which writes the tokens into your project, installs components
from the registry at rafters.studio, and serves the system to AI agents over
MCP.

The point is that an agent building an interface reads the designer's choices instead
of guessing at colours, spacing and hierarchy.

## Getting started

Rafters needs Tailwind CSS v4 and Node.js 24.12 or later.

```bash
pnpm dlx rafters init          # write .rafters/ and rafters.css into the project
pnpm dlx rafters add button    # install a component
pnpm dlx rafters mcp           # serve the system to an agent over stdio
```

`init` detects the framework (Next.js, Vite, Remix, React Router, Astro or
vanilla), reads the project's existing CSS, and produces a complete token
system that keeps your brand values and derives the rest. See the
[CLI README](packages/cli/README.md) for every command and flag.

## What you get

- **Tokens** in `.rafters/tokens/`, one file per namespace: colour, semantic
  roles, spacing, typography, radius, shadow, depth, motion, focus,
  breakpoints, typography composites and fills. A token derives from its
  parent, so changing a base such as `spacing-base` moves everything built on
  it. A designer's override is stored with its reason.
- **`rafters.css`**, which wires every token into Tailwind v4. Each token
  reaches its stock Tailwind utility through `var(--rafters-<token>)`, so
  `p-4`, `rounded`, `shadow`, `text-lg` and `bg-primary` read the registry.
- **Fills**: designer-authored background recipes stored in
  `fill.rafters.json` and exported as `bg-fill-<name>` utilities. Every
  existing surface (card, popover, sidebar and the rest) is also a generated
  fill, exported as `bg-surface-<name>`.
- **Components**: about 60, for React and Astro, copied into your project by
  `rafters add` so you own the code. Each carries its cognitive load,
  accessibility notes and do/never guidance. Components take token props
  instead of `className`: `variant`, `size`, `surface` (a named surface) and
  `fill` (one `bg-fill-*` token).
- **Composites**: JSON manifests that arrange components into a solution
  (a login form, a pricing section) with the designer's intent attached.
- **MCP tools** for agents: `rafters_workspaces`, `rafters_describe` and
  `rafters_generate`.

## Repository

```
apps/
  demo/            Demo application
  registry/        The registry served at rafters.studio
packages/
  cli/             The rafters CLI and MCP server
  color-utils/     OKLCH colour intelligence
  composites/      Composite manifests and their runtime
  design-tokens/   Generators, the TokenRegistry and the exporters
  math-utils/      Progressions and scales
  shared/          Schemas and types shared by every package
  ui/              Components, primitives and their specs
plugin/            The Claude Code plugin: the frontend skill and its hooks
docs/              How each token namespace works
```

## Development

```bash
git clone https://github.com/rafters-studio/rafters.git
cd rafters
pnpm install
pnpm test          # every package's tests
pnpm preflight     # typecheck, lint, format check, unit and a11y tests, build
```

Run `pnpm preflight` before committing. A change to CLI behaviour carries an
entry in `packages/cli/CHANGELOG.md`.

## Docs

- [Design philosophy](docs/DESIGN_PHILOSOPHY.md)
- Token namespaces: [colour](docs/COLOR.md), [spacing](docs/SPACING.md),
  [typography](docs/TYPOGRAPHY.md), [radius](docs/RADIUS.md),
  [shadow](docs/SHADOW.md), [depth](docs/DEPTH.md), [motion](docs/MOTION.md)
- [Cognitive load scoring](docs/COGNITIVE_LOAD_SCORING.md)
- [Project config](docs/CONFIG.md)
- [How the token cascade works](packages/design-tokens/docs/cascade.md)
- [rafters.studio](https://rafters.studio)

## License

MIT
