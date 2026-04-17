# rafters

## 0.0.50

### Patch Changes

- fix(ui): `classy` no longer warns on every layout utility. It had no runtime way to distinguish Rafters-internal class maps (Container, Grid, Card internals) from user slop -- both arrive as strings -- so SSR builds flooded logs with hundreds of false positives from `cardHeaderClasses`, `cardContentClasses`, etc. File-aware enforcement belongs in the pre-edit hook and a future build-time source scanner, not in classy. Removes `LAYOUT_UTILITY_PATTERNS`, `isLayoutUtility`, the consumer-mode warning, the dead component-mode strip path, and `ClassyOptions.component`. Keeps arbitrary-value blocking (unambiguous) and token resolution.

## 0.0.49

### Minor Changes

- feat(onboard): `rafters init` now detects existing design tokens (Tailwind v4 `@theme`, shadcn, generic CSS custom properties) and prompts the user to import them. On confirmation, writes `.rafters/import-pending.json` for review. New `rafters import` command runs the same flow standalone with `--force` and `--importer` options. Import flow moved out of MCP -- agents assemble from pre-made decisions, onboarding is a designer/developer operation. Closes #1271.
- feat(onboard): Tailwind v4 importer detects `@theme` blocks and extracts all design token namespaces (color, spacing, typography, radius, shadow, motion, opacity). Maps Tailwind `--ease-*` and `--duration-*` to rafters `motion-ease-*` and `motion-duration-*` namespace. Skips viewport-only tokens (breakpoint, container). Priority 90 (highest) since `@theme` is unambiguous. Closes #1259.
- feat(onboard): orchestrator coordinates the import pipeline. `onboard()` detects the best importer (shadcn or generic-css), checks confidence thresholds, and runs the import. `previewOnboard()` returns all compatible importers sorted by confidence for analysis without importing. Closes #1270.

### Breaking Changes

- refactor(mcp): removed `rafters_onboard` MCP tool. Token import moved to `rafters init` / `rafters import` CLI commands. MCP now has 4 focused tools (composite, rule, pattern, component) for agent assembly.

### Patch Changes

- fix(mcp): `rafters_pattern` no longer returns hardcoded patterns. Now queries composites by their `solves` and `appliesWhen` fields. Patterns are design intelligence captured in composite manifests, not static data in the MCP server. Search by what the pattern solves (e.g., "hierarchy", "authentication") or use `query` for fuzzy search. Closes #1280.
- refactor(plugins): schema-first plugin protocol replaces the class-based `GenerationRuleExecutor`. Each plugin is now a `Plugin<I,O>` with a Zod input schema, a Zod output schema, and a pure `transform` function -- no registry access, no name regex, no implicit side effects. `resolveInput` is the single registry-aware layer that builds the typed input struct from token state; `regenerate` calls it per-node; `cascade` does the topological walk and collects all failures into one aggregate error (`cause.code === 'cascade-aggregate'`). `GenerationRuleExecutor`, `rule-engine.ts`, and `validators/typography-a11y.ts` are deleted. All six built-in plugins (scale, state, contrast, invert, calc, example) are rewritten as `definePlugin` default exports. Closes #1232, #1243.
- fix(schema): `TokenSchema.userOverride` is now required + nullable instead of optional. `null` is the explicit signal that no designer override exists (generated baseline); a populated object signals a documented designer override. Every generator emits `userOverride: null` explicitly -- the field can no longer be accidentally omitted. Patch schemas (`TokenPatchSchema`) keep `userOverride` optional so PATCH payloads do not have to include it. The `onboard.test.ts` sentinel updated from `!== undefined` to `!== null` to match the new contract. Closes #1227.

## 0.0.48

### Patch Changes

- fix(mcp): `rafters_token set` on a semantic family slot (primary, accent, destructive, etc.) now cascades to all derivatives (-foreground, -hover, -active, -border, -ring, -focus, -subtle) in one call. Previously the cascade only fired from `rafters_onboard map`, so `set` would write the single token and exit, leaving derivatives pointing at the previous family. The cascade machinery from #1152/#1205/#1206 was already correct downstream — only the trigger was missing. Closes #1211.
- fix(mcp): `dependsOn[0]` on semantic family tokens is now correctly preserved as the bare family name (e.g. `"dim-honest-plum"`) on `set` instead of being overwritten with a family-position string (e.g. `"dim-honest-plum-900"`). Restores the convention enforced everywhere else after #1205's review fix.
- The `set` response now includes a `familyCascade` array listing the names of derivatives cascaded (empty for non-family targets), so callers can verify the cascade fired.

## 0.0.47

### Minor Changes

- feat(tokens): wire semantic tokens into dependency graph for auto-cascade. Semantic tokens had dependsOn but no generationRule, making them invisible to the DAG. Now every semantic token has a generationRule (contrast:auto for foregrounds, state:hover/active/focus/disabled for states, scale:N for direct positions). State/contrast/invert executors connect to real plugins instead of returning stubs. Invert plugin rewritten to use WCAG AAA/AA pair matrix. Shared scale-positions module extracted from 3 duplicate maps.
- feat(tokens): fill token namespace -- composite visual recipes (color + opacity + backdrop-blur + gradients) as designer-configurable tokens. Fills resolve differently based on context: surface components get background classes, typography gets text color or gradient text via bg-clip-text. Seven default fills: surface, panel, overlay, glass, primary, muted, hero. Use `fill="surface"` on Container/Card or `color="hero"` on Typography for gradient text.
- feat(tokens): fill token CSS export -- fill tokens appear in generated CSS as custom properties with JSON metadata for runtime resolution by the fill-resolver primitive.

### Patch Changes

- fix: onboard family name collision. When onboarding a color to a semantic family like "primary", the enriched ColorValue was stored under "primary" -- overwriting the semantic token and breaking the CSS exporter. Now the ColorValue is stored under its perceptual name (e.g., "dim-honest-plum") and the semantic token keeps its ColorReference pointing at the new family.
- fix(tokens): preserve family token in dependsOn[0]. regenerateToken was overwriting dependsOn[0] from the family token to a position token, breaking subsequent cascades. dependsOn[0] must stay as the family name so plugins can access ColorValue WCAG data on every cascade.
- fix(tokens): tagged RuleResult union (CssResult | RefResult) for exhaustive switch. State plugin reads base token's actual position instead of hardcoded 500. Contrast plugin uses INDEX_TO_POSITION. Silent fallbacks replaced with proper errors. 24 new tests added.

## 0.0.46

### Patch Changes

- fix(tailwind): radius tokens in @theme block now use var(--radius-base) references instead of hardcoded values. Setting radius-base to 0 now cascades to all derived radius tokens (sm, md, lg, xl, etc.) via CSS custom properties. Run `rafters init --rebuild` to regenerate.

## 0.0.45

### Minor Changes

- feat(registry): `rafters add typography` now bundles all Astro sub-components (H1-H6, P, Code, etc.) in a single install. Sub-components that import the parent's shared .classes.ts file are automatically detected and included. Standalone components like alert-dialog (which have their own .classes.ts) remain independent.
- fix(registry): `rafters add typography-h1` resolves shared files from actual imports instead of name matching. typography-h1 now correctly bundles typography.classes.ts.

## 0.0.44

### Patch Changes

- fix(cli): create palette position tokens when map enriches a color. When onboard map maps a color family to a semantic role, palette position tokens (e.g., primary-500, primary-600) are now created automatically so downstream scale references resolve correctly.
- fix(registry): sub-components like typography-h1 now bundle parent shared files (typography.classes.ts) correctly. Previously the registry only looked for same-named shared files, breaking `rafters add typography-h1`.

## 0.0.43

### Minor Changes

- feat(ui): Astro typography tag components. Individual .astro files for each HTML element (H1-H6, P, Code, Blockquote, Codeblock, Small, Mark, Abbr) with zero client JavaScript. Each uses shared tokenPropsToClasses from typography.classes.ts. Token-level props (size, weight, color, line, tracking, family) for surgical overrides. Installable via `rafters add typography-h1`, `rafters add typography-p`, etc.

## 0.0.42

### Minor Changes

- feat(tokens): typography intelligence system with composite generator. One composite token per typography role (display-large, title-medium, body-small, etc.) bundles font-family, font-size, font-weight, line-height, and letter-spacing into a single token. Font-family role tokens (font-heading, font-body, font-code) added as first-class token type. Typography composite type definitions integrated into the token registry.
- feat(ui): typography tag components with token-level props. Individual HTML element components (H1-H6, P, Code, Blockquote, Small, Mark, Abbr) replace the unified Typography component. Each renders its own HTML element with designer-controlled defaults from typography composite roles. Token-level props (size, weight, color, line, tracking, family) allow surgical override of any dimension while staying within the token system. Removed Lead, Large, Muted as separate components -- they are now P with explicit props. 27 component .classes.ts files migrated to semantic role utilities.

### Patch Changes

- fix(tailwind): remove double-prefix on spacing and radius :root custom properties. The exporter was emitting --rafters-spacing-base and --rafters-radius-base in :root but --spacing-base and --radius-base in @theme, breaking the variable chain. Now emits consistent unprefixed names in :root so @theme references resolve correctly.

## 0.0.41

### Patch Changes

- fix(tailwind): spacing scale variables in @theme block now reference var(--spacing-base) instead of var(--rafters-spacing-base). The @theme block defines --spacing-base but the token values referenced --rafters-spacing-base (the :root namespace), causing all gap-*, p-*, m-* utilities to resolve to empty values. Tailwind generated the CSS rules but they computed to zero because the variable chain was broken.

## 0.0.40

### Minor Changes

- feat(mcp): semantic cascade on onboard map. When a color is mapped to a semantic family (primary, secondary, destructive, etc.), all surface tokens for that family (foreground, hover, active, border, ring, focus) are automatically remapped to the new color. Positions are verified against precomputed WCAG AAA accessibility pairs (falls back to AA). Human overrides on surface tokens are preserved. Neutral cascade updates background, foreground, card, popover, and surface tokens. One map call now cascades to 10+ surface tokens automatically instead of requiring manual light/dark remapping for each.

## 0.0.39

### Patch Changes

- fix(mcp): dark mode semantic tokens now persist correctly after onboard map. The map handler was mutating dependsOn in memory after registry.set() had already persisted, so dark mode CSS output still referenced neutral defaults. Now uses registry.setToken() to atomically persist value and dependsOn together.
- fix(mcp): rafters_token set on semantic tokens now parses "family-position" strings into ColorReference objects. Previously, setting a semantic token stored a plain string which the CSS exporter skipped, falling back to DEFAULT_SEMANTIC_COLOR_MAPPINGS. Now auto-parses and updates both value and dependsOn for correct dark mode output.
- fix(mcp): validate dark param and reject invalid semantic token values. The dark parameter is now validated through parseColorRef (rejects garbage like "purple"), rejected for non-semantic tokens (was corrupting dependsOn on spacing/font tokens), and unparseable string values for semantic tokens return an actionable error instead of silently succeeding.

## 0.0.38

### Minor Changes

- feat(tokens): four-corner radius tokens (#1130). Emits radius-base, radius-tl/tr/bl/br per-corner base tokens, and per-corner per-scale tokens (e.g., radius-lg-tl) that cascade via calc() from the corner base. Override one corner and it propagates through all scale positions.
- feat(tokens): decomposed shadow tokens (#1130). Each shadow scale emits 5 decomposed tokens (offset-x, offset-y, blur, spread, color) plus a composite that references them via var(). Colored variants (shadow-primary, shadow-destructive) reuse DEFAULT geometry and swap color via color-mix. Inner shadows baked into composite.
- feat(mcp): semantic token remapping in rafters_onboard (#1130). The map action now accepts "light" and "dark" fields (format: "family-position") to remap which color family a semantic surface token (background, foreground, card, etc.) references for light/dark mode. Fixes the gap where mapping color families didn't update semantic tokens that still pointed at neutral defaults.

### Patch Changes

- fix(mcp): rafters_token set now persists userOverride metadata to disk. Previously, set modified the local token object but called registry.set() which only persisted the value, discarding userOverride. Now uses registry.setToken() to persist the full token object including override tracking. Fixes #1111.
- fix(mcp): semantic remapping in onboard map now persists dependsOn atomically with value. Previously, registry.set() persisted value then dependsOn was set after persist, so dark mode references were lost on reload. Fixes dark mode CSS still outputting neutral defaults after onboard map with dark fields.
- feat(mcp): rafters_token set now accepts a "dark" parameter for semantic tokens. Sets dependsOn[1] so the CSS dark mode layer uses the specified color reference instead of falling back to the light value.
- fix(tailwind): filter decomposed shadow parts from Tailwind utility generation. Shadow offset-x/y, blur, spread, color tokens are emitted as --rafters-* custom properties only, not as --shadow-* Tailwind utilities.
- fix(tailwind): skip breakpoint tokens with media query values (e.g., prefers-reduced-motion conditions) that would generate invalid Tailwind CSS.
- fix(mcp): onboard analyze now detects .dark/prefers-color-scheme CSS and guides agents to remap semantic surface tokens after mapping color families.

## 0.0.37

### Patch Changes

- fix(mcp): resolve component files by framework target instead of hardcoding .tsx (#1146). MCP tools now find .astro, .vue, and .svelte components using componentTarget from config. Also reads .classes.ts companions for variant/size data. Fixes rafters_component returning null in all non-React consumer projects.

## 0.0.36

### Patch Changes

- Fix init --rebuild spinner bugs: orphaned spinner on rebuild path, spinner not nulled on complete, stdin not released after inquirer prompts

## 0.0.35

### Patch Changes

- Fix init --rebuild hang: spinner was hiding @tailwindcss/cli install prompt
- Revert: rebuild re-prompts for export formats (intentional behavior)

## 0.0.34

### Minor Changes

- Motion system applied to all components: duration tokens, easing curves, motion-reduce on everything
- Hover, active, disabled states applied per component spec
- Size variants added to component spec (28 components get sm/md/lg)
- Design system docs: MOTION, COLOR, SPACING, TYPOGRAPHY, DEPTH, RADIUS, SHADOW rewritten with intent
- 20 internal research docs archived to vault

### Patch Changes

- Fix compiled CSS export hang: 30s timeout on @tailwindcss/cli execFileSync
- docs-site excluded from biome linting

## 0.0.33

### Minor Changes

- All 44 components use shared `.classes.ts` files -- single source of truth for styling across React and Astro variants
- Tailwind utilities (`p-4`, `rounded-md`, `shadow-md`) now read from rafters token system via `@theme` -- change a base token, every component updates
- Component spec (COMPONENT_SPEC.json): complete visual specification for 46 components with color mappings, state tokens, motion specs, shadow specs, radius specs. WCAG AAA + Section 508 target.
- Component audit (COMPONENT_AUDIT.json): current state matrix documenting every gap

### Patch Changes

- Astro component fixes: focus-visible on breadcrumb-link, motion tokens on tooltip, viewport-to-CQ on breadcrumb/typography, classy on image internals, margin-to-gap on empty sub-components
- Editor a11y test updated for post-rewrite structure
- Studio vite-plugin test updated for create endpoint behavior

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
