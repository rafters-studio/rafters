# @rafters/shared

> The data model the rest of Rafters is built on: W3C DTCG token schemas, base types, and the utilities that read a component's own intelligence.

Everything in Rafters that describes a token, a color, or a component agrees on
one set of shapes. This package holds them. It is Zod-first, so every schema is
both a runtime validator and a TypeScript type. Parse external data through the
schema and you get a typed value or a clear error, never an unchecked `any`.

## Install

Published as TypeScript source; consumers need a bundler or tsx/vite. Plain
`node` cannot import it.

```bash
pnpm add @rafters/shared
```

Import from another package:

```ts
import {
  OKLCHSchema,
  DTCGColorTokenSchema,
  oklchToDTCG,
  parseJSDocIntelligence,
  parseFillSignature,
  ImportPendingSchema,
  RAFTERS_VERSION,
} from '@rafters/shared';
```

Types live at the same entry, plus a narrow `./types` subpath for the schema
layer on its own:

```ts
import type { OKLCH, DTCGColorToken, ComponentIntelligence } from '@rafters/shared/types';
```

## What's inside

### Token schemas (`types.ts`)

The W3C Design Token Community Group spec, expressed as Zod schemas Rafters can
validate against.

- `OKLCHSchema` / `OKLCH` — the color primitive. Every color in the system is
  OKLCH before it is anything else.
- `DTCGTokenBaseSchema`, `DTCGColorTokenSchema`, `DTCGGroupSchema`,
  `DTCGFileSchema` — a token, a color token, a group, and a whole `.tokens.json`
  file, following the DTCG shape.
- `oklchToDTCG(oklch)` / `dtcgToOKLCH(dtcg)` — cross the line between the color
  primitive and the on-disk token value.
- `ComponentIntelligenceSchema`, `ColorIntelligenceSchema`, `IntelligenceSchema`
  and friends — the shapes the MCP and Studio read when they describe a
  component or a color.
- `COMPUTED` — a sentinel symbol. Set a token to it and the system reverts that
  token to its computed value instead of a hardcoded override.

### Component intelligence (`component-intelligence.ts`)

A component carries its own design guidance in a JSDoc block. This module reads
it back out.

- `parseJSDocIntelligence(source)` — pull the six-tag intelligence block out of a
  component's source into a structured object.
- `extractVariants`, `extractSizes`, `extractDependencies`,
  `extractPrimitiveDependencies`, `extractJSDocDependencies` — targeted reads for
  one facet at a time.
- `findComponentCategory(registry, name)` — look up a category by name in a
  registry. `DEFAULT_COMPONENT_CATEGORIES` is the registry Rafters ships.
- `validateComponentIntelligence(...)` — check a parsed block and return warnings
  for what's missing or malformed.
- `toDisplayName(name)` — turn a component id into its display name.

### Fill signatures (`fill-signature.ts`)

`fill=` is a compact color vocabulary, not a styling grammar. `fill="muted/50"`
is the muted color at 50% alpha; `fill="barbie-pink-to-ken-brown"` is a two-stop
gradient. `to`, `via`, and `from` are reserved segments.

- `parseFillSignature(input)` — parse a fill string into stops and alpha.
- `validateFillSignature(signature, hasWord)` — check every stop word against a
  vocabulary predicate; returns the first unresolvable word, or `null`.
- `expandFillSignature(signature, context, hasWord?)` — expand a signature into
  the classes it sets, for the given context (`surface` or `text`).
- `foregroundWordFor(...)` — pick the readable foreground word for a surface fill.

### Import pending (`import-pending.ts`)

The schema for tokens found during `rafters init` detection and left awaiting
review. Written to `.rafters/import-pending.json`, read by the CLI prompts and
the Studio review UI.

- `ImportPendingSchema` and its parts (`PendingTokenSchema`,
  `PendingPaletteSchema`, `ImportOriginalSchema`, `ImportModificationsSchema`).
- `ImportDecisionSchema` — `pending`, `accepted`, `rejected`, or `modified`.

Each pending entry keeps the original source variable, the proposed Rafters
token, the user's decision, and the confidence and rationale behind the mapping.

### Version (`version.ts`)

- `RAFTERS_VERSION` — the lockstep suite version, written by
  `packages/cli/scripts/sync-version.ts` from the CLI's own version at build
  time. Read by the API root endpoint and anywhere else that reports it.

## Testing

```bash
pnpm --filter @rafters/shared test
```

## Notes

- Everything external is parsed through a schema. That is the rule the whole
  design system leans on, so this package is where it starts.
- Schemas and their inferred types share a name (`OKLCHSchema` validates,
  `OKLCH` is the type). Import the schema to check data, the type to annotate it.
- Published as TypeScript source. It gains nothing from a build step, but a
  consumer needs a bundler or tsx/vite to import it — plain `node` cannot.
