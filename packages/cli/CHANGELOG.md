# rafters

## 0.0.11

### Patch Changes

- 929242e: Fix @dependencies JSDoc tag parser to stop at parenthetical descriptions instead of treating them as package names
- 26c68ff: Fix transitive dependency resolution: sibling component imports now auto-installed, types.ts included as registry primitive

## 0.0.10

### Patch Changes

- a50a8ae: Fix framework detection for Astro projects: add config file fallback detection (astro.config.mjs, etc.) and refresh framework/paths on rebuild

## 0.0.9

### Patch Changes

- Add system preamble to MCP tools with layout rules, spacing ownership, and Container/Grid guidance
- Overhaul `rafters_vocabulary` to use config + registry for accurate component/token listings
- Add `rafters_cognitive_budget` MCP tool for attention-budget-aware component selection
- Add installed component tracking to `RaftersConfig` and `rafters add`
- Wire `rafters add` to auto-install npm dependencies declared via `@dependencies` JSDoc tags
- Add `--update` and `--update-all` flags to `rafters add` for updating previously installed components
- Deduplicate `RegistryItemType` into shared `rafters/registry/types` import
- Parse `@dependencies` and `@devDependencies` JSDoc tags in MCP component intelligence

## 0.0.8

### Patch Changes

- 79df2e0: Fix CLI error handling and Tailwind CSS detection. Updated component CSS with accent-foreground fix for container headings. Added color-swatch primitive and gamut-aware color utilities.

## 0.0.7

### Patch Changes

- Add --reset flag and rename --force to --rebuild
  - Added `--reset` flag for re-running generators fresh (clears previous output before regenerating)
  - Renamed `--force` to `--rebuild` for clarity (breaking change for CLI users)
  - Compiled CSS export moved to `@rafters/design-tokens` (`registryToCompiled`)
  - PersistenceAdapter simplified to load/save API
  - MCP tools updated for simplified userOverride fields with COMPUTED symbol for override clearing

## 0.0.6

### Patch Changes

- 252865a: Add Studio Design Intelligence Recorder with visual-first token editing, OKLCH color picker, why-gate reasoning enforcement, and 6 namespace workspaces
