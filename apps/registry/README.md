# @rafters/registry

Static JSON registry for the Rafters design system. Serves component, primitive, and composite metadata at `rafters.studio/registry/*`.

## Build

```bash
pnpm build
```

Outputs static JSON to `dist/`. Astro SSG reads `packages/ui` source at build time and generates 118+ JSON files.

## Deploy

Deployed to Cloudflare Workers via `wrangler deploy`. Auto-deploys on push to main.

**Cloudflare Pages/Workers config:**
- Root directory: `apps/registry`
- Build command: `pnpm build`
- Output directory: `dist`

## Endpoints

- `GET /registry/index.json` - Component index
- `GET /registry/components/{name}.json` - Component details
- `GET /registry/primitives/{name}.json` - Primitive details
- `GET /registry/composites/{name}.json` - Composite details

## How it works

The registry reads raw `.tsx` source files from `packages/ui` at build time, extracts JSDoc intelligence metadata (cognitive load, accessibility, usage patterns), and outputs static JSON. The CLI (`pnpx rafters add`) fetches from these endpoints.
