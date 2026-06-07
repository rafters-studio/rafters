# @rafters/composites

Pre-built block assemblies where the designer's judgment is already encoded. A composite is a JSON file that defines a block tree, a manifest of design intent, and typed I/O contracts. The system encodes decisions so construction does not require re-deriving them.

## What a composite is

A composite is a `.composite.json` file with four parts:

```json
{
  "manifest": {
    "id": "login-form",
    "name": "Login Form",
    "category": "form",
    "description": "Email and password login with validation rules",
    "keywords": ["login", "auth", "signin"],
    "cognitiveLoad": 5,
    "solves": "Authenticating users with minimal friction",
    "appliesWhen": ["sign-in flows", "gated content"],
    "usagePatterns": {
      "do": ["Support password managers with proper autocomplete"],
      "never": ["Disable paste in password fields"]
    }
  },
  "input": ["email", "password"],
  "output": ["credentials"],
  "blocks": [
    { "id": "heading", "type": "heading", "content": "Sign In", "meta": { "level": 2 } },
    { "id": "email", "type": "input", "meta": { "placeholder": "you@example.com", "inputType": "email" }, "rules": ["email", "required"] },
    { "id": "password", "type": "input", "meta": { "placeholder": "Password", "inputType": "password" }, "rules": ["password", "required"] },
    { "id": "submit", "type": "button", "content": "Sign In" }
  ]
}
```

**Manifest** carries the design judgment: what problem this solves, when to apply it, what to do and never do, and how much cognitive load it imposes (1-10). Agents read the manifest instead of guessing at the design surface.

**Input/output** are typed I/O contracts expressed as rule names. Rules are Zod schemas. `matchRules(producer, consumer)` checks whether a producer's output satisfies a consumer's input. Composites compose like typed functions.

**Blocks** are the visual structure. Each block has a type, optional content, optional children (for containers), optional meta (props), and optional rules (validation).

## Block types are dynamic

Block types are not a fixed set. A composite defines whatever types it needs. The `type` field is a string that maps to a component at render time. If a composite has `type: "pricing-card"`, the consumer provides a `PricingCard` component. The serializers resolve types against what the consumer provides, not against a hardcoded list.

The `composite:` prefix references another composite by ID. `type: "composite:login-form"` embeds the login-form composite's blocks inline.

## The block tree

Blocks are a flat array with parent-child relationships expressed through `children` (array of child IDs) and `parentId`. A grid block with three text children:

```json
{
  "blocks": [
    { "id": "grid", "type": "grid", "children": ["a", "b", "c"], "meta": { "columns": 3 } },
    { "id": "a", "type": "text", "content": "Feature one", "parentId": "grid" },
    { "id": "b", "type": "text", "content": "Feature two", "parentId": "grid" },
    { "id": "c", "type": "text", "content": "Feature three", "parentId": "grid" }
  ]
}
```

Root blocks (no `parentId`) render at the top level. Children render inside their parent. The walker handles the recursion, cycle detection, and depth limiting.

## Serializers

Three serializers convert the block tree into different output formats. All three use the same walker (`walkBlocks`) with a format-specific visitor.

### toMdx

Emits an MDX string. Block types map to JSX tags. Children render inline.

```typescript
import { toMdx } from '@rafters/composites';

const mdx = toMdx(composite.blocks);
// <Grid columns={3}>
// <Text>Feature one</Text>
// ...
// </Grid>
```

### toJsx

Emits React elements at runtime. Block types resolve against a consumer-provided components map. No hardcoded component knowledge in the serializer.

```tsx
import { toJsx, Composite, createComposites } from '@rafters/composites/client';

// Direct
const elements = toJsx(composite.blocks, {
  components: { heading: H2, button: Button, input: Input, grid: Grid }
});

// As a component
<Composite file={composite} components={components} />

// As named components
const { LoginForm, HeroBanner } = createComposites(
  { LoginForm: loginData, HeroBanner: heroData },
  { components }
);
<LoginForm />
```

### toAstro

Emits an Astro component string with imports in the frontmatter fence. Block types become PascalCase Astro component tags.

```typescript
import { toAstro } from '@rafters/composites';

const astro = toAstro(composite.blocks);
// ---
// import Heading from '../components/ui/heading.astro';
// import Button from '../components/ui/button.astro';
// ---
//
// <Heading level={2}>Sign In</Heading>
// <Button>Sign In</Button>
```

## The walker

`walkBlocks` is the shared tree traversal that all serializers consume. It builds a block map, filters root blocks, and recurses through children with cycle detection and a depth cap (50).

```typescript
import { walkBlocks, type BlockVisitor } from '@rafters/composites';

const visitor: BlockVisitor<string> = (block, children) => {
  return `<${block.type}>${children.join('')}</${block.type}>`;
};

const output = walkBlocks(blocks, visitor, (results) => results.join('\n'));
```

The visitor receives a block and its already-rendered children. It returns whatever the output format needs. The walker owns the traversal; the visitor owns the rendering. Adding a new output format means writing a visitor function, not a new tree walk.

## Slots

A composite can declare content holes for the consumer to fill. A block with `type: "slot"` marks where consumer-provided content renders.

```json
{
  "blocks": [
    { "id": "header", "type": "heading", "content": "Page Title" },
    { "id": "content", "type": "slot", "meta": { "name": "default" } },
    { "id": "footer", "type": "footer" }
  ]
}
```

Each serializer emits the slot in its framework's syntax:
- **Astro**: `<slot />` or `<slot name="content" />`
- **React/JSX**: `{children}` or `{props.content}`
- **MDX**: `{props.children}`

Slots turn composites from stamps (closed, static) into templates (open, composable). A layout composite with a `content` slot. A card composite with `header` and `body` slots. A page composite with `hero`, `main`, and `sidebar` slots.

Named slots use `meta.name`. The default slot has no name or `name: "default"`.

## Data binding

Blocks can declare that a prop comes from the consumer at render time rather than being a static value baked into the JSON.

A datatable composite might declare:

```json
{
  "id": "table",
  "type": "datatable",
  "meta": {
    "columns": { "$bind": "props.columns" },
    "data": { "$bind": "props.data" }
  }
}
```

Static meta values render as-is. Bound values (`$bind`) resolve against the consumer's props at render time. The serializers handle the resolution:
- **React/JSX**: passes the bound prop through `createElement`
- **Astro**: emits `{Astro.props.data}` in the template
- **MDX**: emits `{props.data}`

This separates the composite's structure (which blocks, in what arrangement) from the consumer's data (what fills those blocks). The composite author decides the shape. The consumer provides the content.

## Rules

Rules are Zod schemas that validate block content. Built-in rules:

- `email` -- `z.string().email()`
- `password` -- `z.string().min(8)`
- `required` -- `z.string().min(1)`
- `url` -- `z.string().url()`
- `credentials` -- `z.object({ email, password })`

A block declares its rules as an array of rule names:

```json
{ "type": "input", "rules": ["email", "required"] }
```

Rules compose through I/O contracts. A login-form declares `input: ["email", "password"]` and `output: ["credentials"]`. `matchRules(producer, consumer)` checks compatibility. `findCompatibleConsumers` and `findCompatibleProducers` search for composites that can connect.

## Installing

### Runtime only

```bash
rafters add composites
```

Installs the composites source files (walker, serializers, manifest types, bridge, registry, rules) into your project's composites directory. No default composites included.

### A specific composite

```bash
rafters add composites login-form
```

Installs the login-form composite data file plus the full dependency chain: the composites runtime, every component the composite's blocks reference (heading, input, button), and their primitives. The CLI resolves the chain automatically.

### Listing available composites

```bash
rafters add --list
```

## Bridge utilities

The bridge converts between composite data and editor/runtime representations.

- `instantiateBlocks(blocks, opts)` -- creates fresh copies with new IDs and remapped parent/child references. Expands nested `composite:*` types recursively.
- `toBridgeItems(composites)` -- converts composite files to editor palette items for the sidebar.
- `serializeToComposite(blocks, metadata)` -- saves editor blocks as a composite file, deriving ID, I/O rules, and keywords automatically.

## Registry

In-memory composite registry for runtime lookup.

```typescript
import { registerComposite, getComposite, searchComposites } from '@rafters/composites';

registerComposite(loginForm);
const form = getComposite('login-form');
const results = searchComposites('auth');
```

## File structure

```
packages/composites/src/
  manifest.ts      -- CompositeFile, CompositeBlock, and related types (Zod schemas)
  walk-blocks.ts   -- shared tree walker and BlockVisitor type
  to-mdx.ts        -- MDX string serializer
  to-jsx.tsx       -- React element serializer, Composite component, createComposites factory
  to-astro.ts      -- Astro component string serializer
  bridge.ts        -- instantiateBlocks, toBridgeItems, serializeToComposite
  registry.ts      -- in-memory composite registry
  rules.ts         -- rule matching (matchRules, findCompatible*)
  built-in-rules/  -- Zod schemas for email, password, required, url, credentials
```
