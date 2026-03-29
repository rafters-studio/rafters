# rafters

## 0.0.32

### Minor Changes

- `rafters init` writes `.claude/skills/rafters-frontend/SKILL.md` to consumer project -- agents see Container, Grid, and typography examples every session
- Configurable dark mode: `darkMode: 'class'` (default, `.dark` class toggle) or `'media'` (OS preference) in config.rafters.json

### Patch Changes

- `classy` detects layout utilities (`flex`, `gap-*`, `p-*`, `m-*`): strips on components, warns on consumer code
- Fix `@/` import paths doubling `src/` prefix in Astro/Vite projects

## 0.0.31

### Patch Changes

- Radius and spacing tokens now cascade via CSS `calc()` expressions -- changing `radius-base` or `spacing-base` updates all dependent tokens instantly

## 0.0.30

### Patch Changes

- Fix achromatic color crash: grays (#9D9D9D, #808080, black, white) no longer produce NaN hue in OKLCH conversion
- Fix Astro projects installing react from .tsx variant dependencies during `rafters add`
- 11 new color-utils conversion tests (gray handling, rgb/hsl/oklch parsing)

## 0.0.29

### Minor Changes

- Human confirmation gate on `rafters_onboard map`: tool refuses without `confirmed: true`, instructs agent to ask the designer first
- Color enrichment pipeline: hex/rgb/hsl/oklch parsed via colorjs.io, enriched through `buildColorValue()` + api.rafters.studio intelligence
- Scale pattern detection in analyze: detects existing 11-step color families (e.g., --color-blaze-50 through --color-blaze-950)
- Family checklist in analyze: shows all 11 semantic families with status (default/designer/unmapped) and coverage fraction
- `rafters_onboard status` action: completeness tracking for onboarding progress
- @theme block properties now extracted into customProperties (previously only captured as raw strings)
- 20 onboard integration tests with real designer decision fixtures (legal requirements, colorblind testing, art director intent)

## 0.0.28

### Minor Changes

- MCP write access: `rafters_token` tool now supports set, create, and reset actions with mandatory why-gate reasoning
- `rafters_onboard` MCP tool: analyze existing CSS for design decisions, map them to tokens with the designer in the loop
- Init stripped to scaffold-only: no more automatic shadcn color mapping, detects existing design decisions and directs to MCP onboarding
- System preamble updated with intentional onboarding guidance
- 22 Astro components: Alert, Avatar, Breadcrumb, Empty, Image, Item, Pagination, Progress, Spinner, Table, Tabs, Tooltip (with shared .classes.ts for React/Astro parity)

## 0.0.27

### Minor Changes

- POST /api/tokens/:name creates arbitrary color families when token does not exist (201 response)
- Async color enrichment via WebSocket: fires api.rafters.studio fetch before local math, intelligence fills in live via `rafters:color-enriched` event
- Client-side `onColorEnriched()` listener in @rafters/studio for async intelligence data

## 0.0.26

### Patch Changes

- Fix GET /api/ info route: was only in apps/api (Hono), now in the Vite studio plugin where rafters studio actually runs

## 0.0.25

### Minor Changes

- Correct token API contract: getters return full Token data, setters take value + reason, return { ok: true }
- GET / returns structured API info: system metadata, rules, endpoint docs
- RAFTERS_VERSION constant in @rafters/shared for version consistency
- POST /api/shutdown for graceful studio server stop
- POST /color/build: OKLCH in, full ColorValue out

## 0.0.24

### Patch Changes

- `rafters studio` now works for all consumers: Vite dev server with HMR token API, bundled via tsup
- Studio plugin from @rafters/studio bundled into CLI dist (source-only, like @rafters/shared)
- Vite is a runtime dependency (external, not bundled) for proper native binding resolution
- No more path resolution hacks -- uses programmatic `createServer()` API

## 0.0.23

### Patch Changes

- Remove stale hono and @hono/node-server from runtime dependencies (leaked from earlier embedded server approach)
- Studio command now uses the Vite-powered @rafters/studio package with HMR

## 0.0.22

### Patch Changes

- Studio command uses Vite dev server with HMR for instant token updates
- Fix workspace TS module resolution via tsx/esm
- Fix pre-existing biome lint errors across color-utils, serializer-text, document-editor
- Falls back to generating 535 default tokens if no token files exist
- Standalone Hono server on port 8787, no wrangler dependency

## 0.0.21

### Patch Changes

- Fix `rafters studio` command path resolution for monorepo development
- Add nodejs_compat flag to API wrangler config for design-tokens node:fs support
- Initialize token registry with full 535-token default system on first API access

## 0.0.20

### Minor Changes

- Add token registry API endpoints: getters, setters with why-gate enforcement, namespace reset
- GET /tokens, /tokens/:namespace, /tokens/:namespace/:name for reading the full 536-token system
- PUT /tokens/:namespace/:name with mandatory reason (why-gate) for every override, cascades through dependency graph
- POST /tokens/:namespace/reset to regenerate a namespace with new config (e.g., switch spacing progression)
- DELETE /tokens/:namespace/:name/override to clear overrides and restore computed values
- Add Astro-native components: Container, Grid, Typography, Kbd, Label, Input (zero client JavaScript)
- Extract shared .classes.ts files for React/Astro visual parity
- 25 API tests against a real token registry

## 0.0.19

### Patch Changes

- Fix repository URL for npm provenance verification (ezmode-games -> rafters-studio)

## 0.0.18

### Patch Changes

- Re-release with OIDC trust policy updated for rafters-studio org

## 0.0.17

### Patch Changes

- Fix shared auxiliary files (.classes.ts, .types.ts, .constants.ts) incorrectly listed as primitive dependencies in registry responses
- Add CLI integration test suite: 39 tests covering init workflows, config persistence, MCP tools, and project root discovery
- Separate integration tests from unit tests in CI (integration tests run after build)

## 0.0.16

### Patch Changes

- Fix config exports not persisting on rebuild/reset when config file is missing

## 0.0.15

### Patch Changes

- Framework-aware file routing for `rafters add` -- selects .tsx, .astro, .vue, or .svelte files based on detected framework

## 0.0.14

### Patch Changes

- MCP server discovers project root by walking up from cwd to find .rafters/config.rafters.json instead of assuming process.cwd() is the project root
- Add --project-root flag for explicit override
- Replace silent catch blocks in MCP tool handler with clear error messages
- Cache config loading (one read per handler lifetime)

## 0.0.13

### Patch Changes

- Fix component target detection for Astro projects with React integration
- Add componentTarget field to RaftersConfig

## 0.0.12

### Patch Changes

- 929242e: Fix @dependencies JSDoc tag parser to stop at parenthetical descriptions instead of treating them as package names
- 26c68ff: Fix transitive dependency resolution: sibling component imports now auto-installed, types.ts included as registry primitive

## 0.0.11

### Patch Changes

- fix(resizable): correct handleIndex for multi-panel layouts (#930)
- fix(select): display label text instead of raw value in SelectValue (#931)
- fix(shared): harden JSDoc intelligence parsing with validateComponentIntelligence() and 21 new tests (#932)
- refactor(ui): add displayName to 110+ subcomponents, forwardRef to 5 components (#933)
- refactor(ui): remove dead underscore-prefixed props from 6 components (#934)
- refactor(ui): standardize asChild on slot primitive's mergeProps (#935)
- feat(design-tokens): add designer intent and relationship fields to DTCG export (#918)
- feat(design-tokens): add AI intelligence metadata to DTCG export (#919)
- feat(ui): add rule-drop-zone leaf primitive (#904)

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
