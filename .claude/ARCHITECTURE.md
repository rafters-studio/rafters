# Rafters Architecture

This document captures architectural decisions for AI agent context.

**Production domain:** `rafters.studio`

## Core Concept

**AI agents don't have taste. They need data.**

Rafters converts subjective design decisions into queryable intelligence across three registries:

1. **Token Registry** - What values exist (OKLCH, progressions, perceptual weights)
2. **Component Registry** - What patterns exist (cognitive load, semantic meaning)
3. **Designer Decisions** - Why choices were made (embedded in tokens, not separate)

## System Architecture

```
Registry (API + D1)          ←  Source of truth
        ↓
   ┌────┴────┬─────────┬──────────┐
   ↓         ↓         ↓          ↓
  CLI     Studio      MCP      llms.txt
   ↓         ↓         ↓          ↓
Project   Browser   AI Agents   Discovery
```

## API (apps/api)

### Stack

- **Hono** + `@hono/zod-openapi` for OpenAPI-first routes
- **Scalar** for API reference UI at `/reference`
- **stoker** for helpers (jsonContent, error schemas, http status codes)
- **D1** for color cache (exact OKLCH lookups)
- **Vectorize** for semantic search (real text embeddings from AI intelligence)
- **Workers AI** for color intelligence generation (slow, 10-20s cold)
- **Queues** for async AI generation

### Cross-Worker Communication

Use **Service Bindings** for worker-to-worker calls (e.g., uncertainty API):

```jsonc
// wrangler.jsonc
{ "services": [{ "binding": "UNCERTAINTY_API", "service": "api-realhandy" }] }
```

No HTTP auth needed - bindings are account-scoped.

### Color Endpoint Design

- **Cache hit** → Return full ColorValue immediately
- **Cache miss + default** → Return math-only data, `intelligence: null`
- **Cache miss + `?sync=true`** → Block and wait for AI generation (for curl)
- **Queue path** → Async AI generation, poll or webhook later

### Routes Structure

```
src/
├── routes/
│   ├── color/
│   │   ├── color.index.ts    # Router
│   │   ├── color.routes.ts   # OpenAPI route definitions
│   │   └── color.handlers.ts # Handler implementations
│   └── queue/
│       └── ...
├── lib/
│   ├── create-app.ts         # App factory
│   ├── configure-open-api.ts # OpenAPI + Scalar + llms.txt
│   ├── types.ts              # AppBindings, AppRouteHandler
│   └── color/
│       ├── intelligence.ts   # Workers AI calls
│       └── vector.ts         # Embedding generation
└── middleware/               # (empty for now, auth comes with rafters+)
```

## Token Format

### Rafters Native JSON (Source of Truth)

Tokens contain full intelligence + embedded decisions:

```typescript
{
  "primary": {
    "value": "oklch(0.65 0.28 250)",
    "scale": [/* 11 steps: 50-950 */],
    "perceptualWeight": { "weight": 0.65, "density": "medium", "balancingRecommendation": "..." },
    "atmosphericWeight": { "distanceWeight": 0.7, "temperature": "cool", "atmosphericRole": "foreground-advancing" },
    "harmonies": { "complementary": [...], "triadic": [...], /* 11 types */ },
    "accessibility": { "wcagAA": [...], "wcagAAA": [...], "apca": [...], "cvd": {...} },
    "semanticSuggestions": { "danger": [...], "success": [...], "warning": [...], "info": [...] },
    "intelligence": { "suggestedName": "...", "reasoning": "...", "emotionalImpact": "...", "culturalContext": "..." },
    "states": { "hover": "...", "focus": "...", "active": "...", "disabled": "..." },

    // Decision embedded, not separate file
    "override": {
      "from": "oklch(0.60 0.22 240)",
      "reason": "Brand requires higher saturation for digital presence",
      "impact": { "cognitiveLoad": "+0.5", "accessibilityDelta": "loses AAA on surface-100" },
      "decidedBy": "designer@company.com",
      "decidedAt": "2025-12-15T..."
    }
  }
}
```

### Exports (Lossy)

DTCG/CSS/Tailwind exports strip intelligence for tool interop:

```bash
rafters export --format dtcg      # W3C Design Tokens
rafters export --format css       # CSS custom properties
rafters export --format tailwind  # theme.extend config
```

## CLI (apps/cli) - TODO

Like shadcn CLI but multi-framework with intelligence:

```bash
npx rafters init              # Setup, detect framework
npx rafters add button        # Fetch from registry, copy to project
npx rafters tokens --format css   # Export tokens
npx rafters studio            # Launch customization UI
npx rafters mcp               # Start MCP server for AI agents
```

**Key principle:** CLI always queries registry. Never reads local `.rafters/` directly.

`.rafters/` is local cache/storage, not source of truth.

## Studio UX Vision

1. **Snow storm landing** - Blank white page, subtle animation
2. **Floating card** - "Describe the brand you're creating a design system for..."
3. **Dual input** - Natural language OR color picker icon
4. **Vectorize search** - Embed query, find matching seed color
5. **Full system generation** - Returns complete palette + spacing + motion + typography
6. **Decision capture** - When designer overrides, prompt "Why?" and store with token

## Primitives (packages/ui)

Vanilla TypeScript, framework-agnostic, SSR-safe:

- **slot** - asChild prop merging
- **modal** - Focus trap + dismissible layer
- **keyboard** - Type-safe key handling
- **escape-handler** - Layer-aware Escape coordination
- **aria** - ARIA attribute management
- **sr-manager** - Screen reader announcements
- **focus** - Focus trap + roving focus

React/Vue/Svelte wrappers are thin adapters (100-300 LOC).

## Token Generators - TODO

Previous generators deleted. Need redesign to:

- Generate from seed color via `generateColorValue()`
- Derive palette roles from harmonies + semanticSuggestions
- Apply dependency rules (calc, state, scale, contrast, invert)
- Store decisions with tokens

## Key Decisions

| Decision                        | Rationale                                           |
| ------------------------------- | --------------------------------------------------- |
| Service bindings over shared D1 | Clean separation, independent scaling               |
| Vectorize with real embeddings  | Trig functions were meaningless for similarity      |
| D1 for exact lookups            | Color picker = exact OKLCH, not semantic search     |
| Decisions embedded in tokens    | One graph, no merge complexity                      |
| DTCG as lossy export            | Rafters format has 10x more data than DTCG supports |
| CLI queries registry            | Registry is truth, local is cache                   |
| `?sync=true` for blocking AI    | Curl users want to wait, production clients don't   |
